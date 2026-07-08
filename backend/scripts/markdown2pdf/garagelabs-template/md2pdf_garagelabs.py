#!/usr/bin/env python3
"""
md2pdf_garagelabs.py — Convierte un Markdown en un PDF con la identidad
corporativa Garage Labs (portada Navy/Teal, tablas, listas, callouts).

Uso:
    ./md2pdf_garagelabs.py --input archivo.md [--output archivo.pdf]
                            [--eyebrow "TEXTO"] [--prepared-for "Cliente"]
                            [--prepared-by "Garage Labs"] [--date "Julio 2026"]
                            [--logo /ruta/logo.svg]
"""
import argparse
import datetime
import importlib.util
import os
import re
import subprocess
import sys
from xml.sax.saxutils import escape as xml_escape

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as canvas_mod
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, NextPageTemplate, PageBreak,
    PageTemplate, Paragraph, Table, TableStyle,
)

# --------------------------------------------------------------------------
# Constantes de identidad corporativa (validadas contra los PDFs de referencia
# Reporte_Mensual_SERCOM_Junio_2026_GarageLabs.pdf y
# Estimacion_Levantamiento_SERCOM_Peru_GarageLabs.pdf)
# --------------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LOGO_SVG_DEFAULT = os.path.join(SCRIPT_DIR, "Imagenes", "logo-garage-labs.svg")
# Intentar rutas comunes de Inter, con fallback a Helvética
_INTER_CANDIDATES = [
    "/usr/share/fonts/truetype/inter-zorin-os",
    "/usr/share/fonts/inter",
    "/usr/share/fonts/truetype/inter",
    "/usr/local/share/fonts/inter",
    os.path.join(SCRIPT_DIR, "fonts"),
]
FONT_DIR = next((d for d in _INTER_CANDIDATES if os.path.isdir(d)), "")
_FONT_FALLBACK = False

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm
AVAIL_WIDTH = PAGE_W - 2 * MARGIN

NAVY = HexColor("#10101C")
TEAL = HexColor("#37ECBA")
WHITE = HexColor("#FFFFFF")
TEXT_LIGHT = HexColor("#F2F2F5")
TEXT_BODY = HexColor("#D6D6E2")
TEXT_MUTED = HexColor("#9A9AAE")
BORDER = HexColor("#333340")
HEADER_ROW_BG = HexColor("#2A2A3A")
ROW_BG_1 = HexColor("#1B1B29")
ROW_BG_2 = HexColor("#202030")
CALLOUT_BG = HexColor("#181826")
GLOW_TEAL = HexColor("#37ECBA")

LOGO_W, LOGO_H = 163.2518, 31.1811
LOGO_X, LOGO_Y = MARGIN, 745.5118
TITLE_BASE_Y = 440.7874
TITLE_LINE_H = 26.9291
EYEBROW_GAP = 34.0
DIVIDER_GAP = 24.0945
DIVIDER_W = 170.0787
META_LABEL_W = 90.7087
META_GAP_TOP = 34.0157
META_ROW_GAP = 19.8426
FOOTER_DIVIDER_Y = 43.93701
FOOTER_TEXT_Y = 34.01575

MESES_ES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def register_fonts():
    global _FONT_FALLBACK
    if os.path.isdir(FONT_DIR):
        variants = {
            "Inter": "Regular",
            "Inter-Bold": "Bold",
            "Inter-Italic": "Italic",
            "Inter-BoldItalic": "BoldItalic",
            "Inter-Medium": "Medium",
            "Inter-SemiBold": "SemiBold",
            "Inter-ExtraBold": "ExtraBold",
        }
        missing = False
        for name, variant in variants.items():
            path = os.path.join(FONT_DIR, f"Inter-{variant}.ttf")
            if os.path.isfile(path):
                pdfmetrics.registerFont(TTFont(name, path))
            else:
                missing = True
                break
        if not missing:
            pdfmetrics.registerFontFamily(
                "Inter", normal="Inter", bold="Inter-Bold",
                italic="Inter-Italic", boldItalic="Inter-BoldItalic",
            )
            return
    _FONT_FALLBACK = True


def _inline_svg_css(svg_text):
    """Inline simple `.class{fill:#xxx}` CSS rules as fill= attributes.

    MuPDF's SVG renderer (used by the PyMuPDF fallback below) does not
    apply class-based CSS from <style> blocks, so shapes fall back to the
    SVG default fill (black). rsvg-convert handles this natively.
    """
    css_map = {}
    for block in re.findall(r'<style[^>]*>(.*?)</style>', svg_text, re.S):
        for sel, body in re.findall(r'\.([\w-]+)\s*\{([^}]*)\}', block):
            props = css_map.setdefault(sel, {})
            for decl in body.split(';'):
                if ':' in decl:
                    k, v = decl.split(':', 1)
                    props[k.strip()] = v.strip()

    def repl_tag(m):
        tag = m.group(0)
        if 'fill=' in tag:
            return tag
        cls_match = re.search(r'class="([\w-]+)"', tag)
        if not cls_match:
            return tag
        props = css_map.get(cls_match.group(1))
        if not props or 'fill' not in props:
            return tag
        return tag.replace(
            f'class="{cls_match.group(1)}"',
            f'class="{cls_match.group(1)}" fill="{props["fill"]}"', 1)

    return re.sub(
        r'<(?:path|polygon|circle|rect|ellipse|polyline|line)\b[^>]*>',
        repl_tag, svg_text)


def rasterize_logo(svg_path, width_px=2400):
    import shutil
    import tempfile
    tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    tmp.close()
    if shutil.which("rsvg-convert"):
        subprocess.run(
            ["rsvg-convert", "-w", str(width_px), "--keep-aspect-ratio",
             "-o", tmp.name, svg_path],
            check=True,
        )
    elif importlib.util.find_spec("cairosvg") is not None:
        import cairosvg
        cairosvg.svg2png(url=svg_path, write_to=tmp.name, output_width=width_px)
    else:
        import fitz
        with open(svg_path, 'r', encoding='utf-8') as f:
            svg_text = f.read()
        doc = fitz.open(stream=_inline_svg_css(svg_text).encode('utf-8'),
                         filetype="svg")
        page = doc[0]
        zoom = width_px / page.rect.width
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=True)
        pix.save(tmp.name)
    return tmp.name


# --------------------------------------------------------------------------
# Parseo de Markdown a bloques
# --------------------------------------------------------------------------
def parse_markdown(text):
    lines = text.replace("\r\n", "\n").split("\n")
    blocks = []
    i, n = 0, len(lines)

    def is_table_sep(line):
        return bool(re.match(
            r'^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$', line))

    while i < n:
        stripped = lines[i].strip()
        if not stripped:
            i += 1
            continue

        m = re.match(r'^```(\w*)\s*$', stripped)
        if m:
            i += 1
            code_lines = []
            while i < n and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            i += 1
            blocks.append(('code', '\n'.join(code_lines)))
            continue

        m = re.match(r'^(#{1,6})\s+(.*)$', stripped)
        if m:
            blocks.append((f'h{len(m.group(1))}', m.group(2).strip()))
            i += 1
            continue

        if stripped.startswith('>'):
            quote_lines = []
            while i < n and lines[i].strip().startswith('>'):
                quote_lines.append(re.sub(r'^\s*>\s?', '', lines[i]))
                i += 1
            blocks.append(('blockquote', ' '.join(
                l.strip() for l in quote_lines).strip()))
            continue

        if '|' in stripped and i + 1 < n and is_table_sep(lines[i + 1].strip()):
            header = [c.strip() for c in stripped.strip('|').split('|')]
            i += 2
            rows = []
            while i < n and '|' in lines[i] and lines[i].strip():
                rows.append([c.strip() for c in
                             lines[i].strip().strip('|').split('|')])
                i += 1
            blocks.append(('table', header, rows))
            continue

        def is_continuation(line):
            s = line.strip()
            return bool(
                s
                and not re.match(r'^(#{1,6})\s+', s)
                and not re.match(r'^[-*]\s+', s)
                and not re.match(r'^\d+\.\s+', s)
                and not s.startswith('>')
                and not s.startswith('```')
                and '|' not in s)

        def _peek_next_nonblank(start):
            j = start
            while j < n and not lines[j].strip():
                j += 1
            return j

        if re.match(r'^[-*]\s+', stripped):
            items = []
            while i < n:
                line_s = lines[i].strip()
                if re.match(r'^[-*]\s+', line_s):
                    items.append(re.sub(r'^[-*]\s+', '', line_s))
                    i += 1
                elif items and is_continuation(lines[i]):
                    items[-1] += ' ' + line_s
                    i += 1
                elif not line_s:
                    j = _peek_next_nonblank(i + 1)
                    if j < n and re.match(r'^[-*]\s+', lines[j].strip()):
                        i = j
                    else:
                        break
                else:
                    break
            blocks.append(('ul', items))
            continue

        if re.match(r'^\d+\.\s+', stripped):
            items = []
            while i < n:
                line_s = lines[i].strip()
                raw_indent = len(lines[i]) - len(lines[i].lstrip())
                if re.match(r'^\d+\.\s+', line_s):
                    items.append(('top', re.sub(r'^\d+\.\s+', '', line_s)))
                    i += 1
                elif raw_indent >= 2 and re.match(r'^[-*]\s+', line_s) and items:
                    items.append(('sub', re.sub(r'^[-*]\s+', '', line_s)))
                    i += 1
                elif items and is_continuation(lines[i]):
                    k, t = items[-1]
                    items[-1] = (k, t + ' ' + line_s)
                    i += 1
                elif not line_s:
                    j = _peek_next_nonblank(i + 1)
                    if j < n:
                        next_s = lines[j].strip()
                        next_indent = len(lines[j]) - len(lines[j].lstrip())
                        if (re.match(r'^\d+\.\s+', next_s) or
                                (next_indent >= 2 and re.match(r'^[-*]\s+', next_s))):
                            i = j
                            continue
                    break
                else:
                    break
            blocks.append(('ol', items))
            continue

        para_lines = [stripped]
        i += 1
        while (i < n and lines[i].strip()
               and not re.match(r'^(#{1,6})\s+', lines[i].strip())
               and not re.match(r'^[-*]\s+', lines[i].strip())
               and not re.match(r'^\d+\.\s+', lines[i].strip())
               and not lines[i].strip().startswith('>')
               and not lines[i].strip().startswith('```')
               and '|' not in lines[i]):
            para_lines.append(lines[i].strip())
            i += 1
        blocks.append(('p', ' '.join(para_lines)))

    return blocks


def inline_markup(text):
    fn = _fn('Inter')
    # Strip [text](url) links before xml_escape so the brackets don't appear literally
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', text)
    text = xml_escape(text)
    text = re.sub(
        r'`([^`]+)`',
        lambda m: f'<font face="{fn}" size="9" color="#37ECBA">{m.group(1)}</font>',
        text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<b>\1</b>', text)
    text = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<i>\1</i>', text)
    return text


NUMERIC_RE = re.compile(
    r'^-?\d+([.,]\d+)?(\s*-\s*\d+([.,]\d+)?)?$')


def is_numeric_cell(value):
    v = value.strip()
    v = re.sub(r'\s*(hrs?|horas?|h|d[ií]as?\s+h[aá]biles|d[ií]as?|%)\.?\s*$',
                '', v, flags=re.IGNORECASE).strip()
    return bool(NUMERIC_RE.match(v))


# --------------------------------------------------------------------------
# Estilos de párrafo
# --------------------------------------------------------------------------
def _fn(name):
    """Font name with fallback if Inter fonts are unavailable."""
    if _FONT_FALLBACK:
        return 'Helvetica'
    return name

def build_styles():
    styles = {}
    styles['body'] = ParagraphStyle(
        'body', fontName=_fn('Inter'), fontSize=10, leading=15,
        textColor=TEXT_BODY, spaceAfter=8)
    styles['h2'] = ParagraphStyle(
        'h2sec', fontName=_fn('Inter-SemiBold'), fontSize=14.5, leading=18,
        textColor=WHITE, spaceBefore=22, spaceAfter=10)
    styles['h3'] = ParagraphStyle(
        'h3sec', fontName=_fn('Inter-SemiBold'), fontSize=11.5, leading=15,
        textColor=TEAL, spaceBefore=14, spaceAfter=6)
    styles['h4'] = ParagraphStyle(
        'h4sec', fontName=_fn('Inter-SemiBold'), fontSize=10.5, leading=14,
        textColor=TEXT_BODY, spaceBefore=10, spaceAfter=4)
    styles['list_item'] = ParagraphStyle(
        'list_item', parent=styles['body'], leftIndent=16, bulletIndent=0,
        bulletFontName=_fn('Inter-SemiBold'), bulletFontSize=10, spaceAfter=5)
    styles['list_item'].bulletColor = TEAL
    styles['list_sub_item'] = ParagraphStyle(
        'list_sub_item', parent=styles['body'], leftIndent=32, bulletIndent=18,
        bulletFontName=_fn('Inter'), bulletFontSize=10, spaceAfter=3, spaceBefore=0)
    styles['list_sub_item'].bulletColor = TEXT_MUTED
    styles['table_header'] = ParagraphStyle(
        'th', fontName=_fn('Inter-SemiBold'), fontSize=9.3, textColor=WHITE,
        leading=12)
    styles['table_header_r'] = ParagraphStyle(
        'thr', parent=styles['table_header'], alignment=TA_RIGHT)
    styles['table_cell'] = ParagraphStyle(
        'td', fontName=_fn('Inter'), fontSize=9.3, textColor=TEXT_BODY,
        leading=12.5)
    styles['table_num'] = ParagraphStyle(
        'tdn', parent=styles['table_cell'], alignment=TA_RIGHT)
    styles['quote'] = ParagraphStyle(
        'quote', fontName=_fn('Inter-Italic'), fontSize=9.8, leading=14.5,
        textColor=TEXT_BODY)
    styles['code'] = ParagraphStyle(
        'code', fontName=_fn('Inter-Medium'), fontSize=9.3, leading=16,
        textColor=TEXT_LIGHT)
    return styles


def compute_col_widths(header, rows, ncols, numeric_cols, avail_width):
    fn = 'Inter' if not _FONT_FALLBACK else 'Helvetica'
    fs = 9.3
    pad = 22  # left + right padding per cell

    # Minimum width = widest unbreakable token in each column
    min_w = []
    for c in range(ncols):
        all_texts = [header[c]] + [r[c] for r in rows if c < len(r)]
        max_tok = 0
        for t in all_texts:
            for tok in re.split(r'\s+', t.strip()):
                if tok:
                    max_tok = max(max_tok, stringWidth(tok, fn, fs))
        min_w.append(max_tok + pad)

    # For numeric columns use full measured content width (values don't wrap)
    for c in range(ncols):
        if numeric_cols[c]:
            all_texts = [header[c]] + [r[c] for r in rows if c < len(r)]
            full_w = max(stringWidth(t, fn, fs) + pad for t in all_texts)
            min_w[c] = max(min_w[c], full_w)

    total_min = sum(min_w)
    if total_min >= avail_width:
        scale = avail_width / total_min
        return [m * scale for m in min_w]

    # Distribute extra space to text columns, weighted by average content length
    extra = avail_width - total_min
    text_cols = [c for c in range(ncols) if not numeric_cols[c]]
    if not text_cols:
        scale = avail_width / total_min
        return [m * scale for m in min_w]

    weights = []
    for c in text_cols:
        cell_texts = [r[c] for r in rows if c < len(r)]
        avg_len = (sum(len(t) for t in cell_texts) / len(cell_texts)) if cell_texts else 10
        weights.append(max(avg_len, 10))
    weight_sum = sum(weights)

    result = list(min_w)
    for i, c in enumerate(text_cols):
        result[c] += extra * weights[i] / weight_sum
    return result


def build_table(header, rows, styles):
    ncols = len(header)
    numeric_cols = [
        bool(rows) and all(is_numeric_cell(r[c]) for r in rows if len(r) > c)
        for c in range(ncols)
    ]
    col_widths = compute_col_widths(header, rows, ncols, numeric_cols, AVAIL_WIDTH)

    data = [[
        Paragraph(inline_markup(h),
                  styles['table_header_r'] if numeric_cols[idx]
                  else styles['table_header'])
        for idx, h in enumerate(header)
    ]]
    for row in rows:
        cells = []
        for idx in range(ncols):
            val = row[idx] if idx < len(row) else ''
            style = styles['table_num'] if numeric_cols[idx] else styles['table_cell']
            cells.append(Paragraph(inline_markup(val), style))
        data.append(cells)

    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), HEADER_ROW_BG),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, BORDER),
        ('LINEBELOW', (0, -1), (-1, -1), 1, TEAL),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    for r in range(1, len(data)):
        bg = ROW_BG_1 if r % 2 == 1 else ROW_BG_2
        style_cmds.append(('BACKGROUND', (0, r), (-1, r), bg))

    t = Table(data, colWidths=col_widths, repeatRows=1,
              cornerRadii=[6, 6, 6, 6], spaceBefore=10, spaceAfter=16)
    t.setStyle(TableStyle(style_cmds))
    return t


def build_callout(text, styles, mono):
    if mono:
        # One row per line so the table can split across pages (fixes LayoutError
        # when a code block is taller than the available frame height)
        def _code_cell(l):
            if not l.strip():
                return '&nbsp;'
            n_indent = len(l) - len(l.lstrip(' '))
            return '&nbsp;' * n_indent + xml_escape(l[n_indent:])

        lines = text.split('\n')
        rows = [[Paragraph(_code_cell(l), styles['code'])]
                for l in lines]
        n = len(rows)
        t = Table(rows, colWidths=[AVAIL_WIDTH], splitByRow=1,
                  spaceBefore=10, spaceAfter=16)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), CALLOUT_BG),
            ('LINEBEFORE', (0, 0), (0, -1), 3, TEAL),
            ('LEFTPADDING', (0, 0), (-1, -1), 18),
            ('RIGHTPADDING', (0, 0), (-1, -1), 16),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, n - 1), (-1, n - 1), 14),
        ]))
        return t
    else:
        content = inline_markup(text)
        p = Paragraph(content, styles['quote'])
        t = Table([[p]], colWidths=[AVAIL_WIDTH], cornerRadii=[6, 6, 6, 6],
                   spaceBefore=10, spaceAfter=16)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), CALLOUT_BG),
            ('LINEBEFORE', (0, 0), (0, -1), 3, TEAL),
            ('TOPPADDING', (0, 0), (-1, -1), 14),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
            ('LEFTPADDING', (0, 0), (-1, -1), 18),
            ('RIGHTPADDING', (0, 0), (-1, -1), 16),
        ]))
        return t


def render_block(block, styles, counters):
    kind = block[0]
    if kind in ('h1', 'h2'):
        counters['sec'] += 1
        heading_text = re.sub(r'^\d+[.)]\s+', '', block[1])
        markup = (f'<font color="#37ECBA">{counters["sec"]}.</font> '
                   f'{inline_markup(heading_text)}')
        p = Paragraph(markup, styles['h2'])
        p._is_heading = True
        return [p]
    if kind == 'h3':
        p = Paragraph(inline_markup(block[1]), styles['h3'])
        p._is_heading = True
        return [p]
    if kind in ('h4', 'h5', 'h6'):
        p = Paragraph(inline_markup(block[1]), styles['h4'])
        p._is_heading = True
        return [p]
    if kind == 'p':
        return [Paragraph(inline_markup(block[1]), styles['body'])]
    if kind == 'ul':
        return [Paragraph(inline_markup(item), styles['list_item'],
                           bulletText='•') for item in block[1]]
    if kind == 'ol':
        result = []
        counter = 0
        for item in block[1]:
            item_kind, text = item if isinstance(item, tuple) else ('top', item)
            if item_kind == 'sub':
                result.append(Paragraph(inline_markup(text), styles['list_sub_item'], bulletText='–'))
            else:
                counter += 1
                result.append(Paragraph(inline_markup(text), styles['list_item'], bulletText=f'{counter}.'))
        return result
    if kind == 'table':
        return [build_table(block[1], block[2], styles)]
    if kind == 'blockquote':
        return [build_callout(block[1], styles, mono=False)]
    if kind == 'code':
        return [build_callout(block[1], styles, mono=True)]
    return []


def build_story(blocks):
    styles = build_styles()
    counters = {'sec': 0}

    sections = []
    for block in blocks:
        if not sections or block[0] in ('h1', 'h2'):
            sections.append([])
        sections[-1].append(block)

    story = []
    for section_blocks in sections:
        section = []
        for block in section_blocks:
            flowables = render_block(block, styles, counters)
            if not flowables:
                continue
            is_heading = block[0] in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6')
            if (not is_heading and section
                    and getattr(section[-1], '_is_heading', False)):
                heading = section.pop()
                section.append(KeepTogether([heading, flowables[0]]))
                section.extend(flowables[1:])
            else:
                section.extend(flowables)
        # Keep each ## section on one page when it reasonably fits;
        # KeepTogether falls back to normal splitting for long sections
        # (it can't force something bigger than a page to stay together).
        story.append(KeepTogether(section))
    return story


# --------------------------------------------------------------------------
# Portada y páginas interiores
# --------------------------------------------------------------------------
def wrap_text(text, font, size, max_width):
    words = text.split()
    lines, current = [], ''
    for w in words:
        trial = (current + ' ' + w).strip()
        if stringWidth(trial, font, size) <= max_width or not current:
            current = trial
        else:
            lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines or ['']


def _cfn(name):
    """Canvas font name with fallback."""
    if _FONT_FALLBACK:
        return 'Helvetica'
    return name

def make_cover_drawer(logo_png, meta):
    def _draw(canv, doc):
        canv.saveState()
        canv.setFillColor(NAVY)
        canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        canv.radialGradient(PAGE_W * 0.80, PAGE_H * 0.82, 380,
                             [HexColor("#1E9875"), HexColor("#158060"), HexColor("#0C5840"), HexColor("#082015"), NAVY],
                             [0, 0.12, 0.30, 0.55, 1], extend=True)
        canv.drawImage(logo_png, LOGO_X, LOGO_Y, width=LOGO_W, height=LOGO_H,
                        mask='auto', preserveAspectRatio=True)

        title_lines = wrap_text(meta['title'], _cfn('Inter-ExtraBold'), 27,
                                 AVAIL_WIDTH)
        n = len(title_lines)
        top_y = TITLE_BASE_Y + (n - 1) * TITLE_LINE_H
        eyebrow_y = top_y + EYEBROW_GAP

        canv.setFont(_cfn('Inter-Medium'), 10.5)
        canv.setFillColor(TEAL)
        canv.drawString(MARGIN, eyebrow_y, meta['eyebrow'].upper())

        canv.setFont(_cfn('Inter-ExtraBold'), 27)
        canv.setFillColor(WHITE)
        for idx, line in enumerate(title_lines):
            canv.drawString(MARGIN, top_y - idx * TITLE_LINE_H, line)

        divider_y = TITLE_BASE_Y - DIVIDER_GAP
        canv.setStrokeColor(TEAL)
        canv.setLineWidth(1.6)
        canv.line(MARGIN, divider_y, MARGIN + DIVIDER_W, divider_y)

        y = divider_y - META_GAP_TOP
        rows = []
        if meta['prepared_for']:
            rows.append(('Preparado para:', meta['prepared_for']))
        rows.append(('Preparado por:', meta['prepared_by']))
        for label, value in rows:
            canv.setFont(_cfn('Inter'), 11.5)
            canv.setFillColor(TEXT_LIGHT)
            canv.drawString(MARGIN, y, label)
            canv.setFont(_cfn('Inter-SemiBold'), 11.5)
            canv.setFillColor(WHITE)
            canv.drawString(MARGIN + META_LABEL_W, y, value)
            y -= META_ROW_GAP
        if meta['date']:
            canv.setFont(_cfn('Inter'), 11.5)
            canv.setFillColor(TEXT_MUTED)
            canv.drawString(MARGIN, y, meta['date'])

        canv.restoreState()
    return _draw


def make_interior_drawer(logo_png):
    lw = 85.0
    lh = lw * (LOGO_H / LOGO_W)

    def _draw(canv, doc):
        canv.saveState()
        canv.setFillColor(NAVY)
        canv.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        lx = PAGE_W - MARGIN - lw
        ly = PAGE_H - 55 - lh
        canv.drawImage(logo_png, lx, ly, width=lw, height=lh,
                        mask='auto', preserveAspectRatio=True)
        canv.restoreState()
    return _draw


def draw_footer(canv, page_num, total):
    canv.saveState()
    canv.setStrokeColor(BORDER)
    canv.setLineWidth(0.6)
    canv.line(MARGIN, FOOTER_DIVIDER_Y, PAGE_W - MARGIN, FOOTER_DIVIDER_Y)
    canv.setFont(_cfn('Inter'), 8)
    canv.setFillColor(TEXT_MUTED)
    canv.drawString(MARGIN, FOOTER_TEXT_Y, "Garage Labs — Confidencial")
    canv.drawRightString(PAGE_W - MARGIN, FOOTER_TEXT_Y,
                          f"Página {page_num} de {total}")
    canv.restoreState()


class NumberedCanvas(canvas_mod.Canvas):
    def __init__(self, *args, **kwargs):
        canvas_mod.Canvas.__init__(self, *args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            draw_footer(self, self._pageNumber, total)
            canvas_mod.Canvas.showPage(self)
        canvas_mod.Canvas.save(self)


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def build_pdf(input_path, output_path, eyebrow, prepared_for, prepared_by,
              date, logo_svg):
    register_fonts()
    logo_png = rasterize_logo(logo_svg)
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            text = f.read()
        blocks = parse_markdown(text)

        title = None
        for idx, block in enumerate(blocks):
            if block[0] == 'h1':
                title = block[1]
                blocks.pop(idx)
                break
        if title is None:
            base = os.path.splitext(os.path.basename(input_path))[0]
            title = re.sub(r'^\d+[-_]*', '', base).replace('_', ' ').replace('-', ' ').strip().title()

        meta = {
            'title': title,
            'eyebrow': eyebrow,
            'prepared_for': prepared_for,
            'prepared_by': prepared_by,
            'date': date,
        }

        story = build_story(blocks)
        story = [NextPageTemplate('Interior'), PageBreak()] + story

        doc = BaseDocTemplate(
            output_path, pagesize=A4,
            leftMargin=MARGIN, rightMargin=MARGIN,
            topMargin=MARGIN, bottomMargin=MARGIN,
        )

        cover_frame = Frame(MARGIN, MARGIN, 1, 1, id='cover')
        interior_top = PAGE_H - 95
        interior_bottom = 70
        interior_frame = Frame(
            MARGIN, interior_bottom, AVAIL_WIDTH,
            interior_top - interior_bottom, id='interior',
            leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
        )

        doc.addPageTemplates([
            PageTemplate(id='Cover', frames=[cover_frame],
                         onPage=make_cover_drawer(logo_png, meta)),
            PageTemplate(id='Interior', frames=[interior_frame],
                         onPage=make_interior_drawer(logo_png)),
        ])

        doc.build(story, canvasmaker=NumberedCanvas)
    finally:
        if os.path.exists(logo_png):
            os.remove(logo_png)


def default_date():
    now = datetime.date.today()
    return f"{MESES_ES[now.month - 1].capitalize()} {now.year}"


def main():
    parser = argparse.ArgumentParser(
        description="Convierte un Markdown en PDF con identidad corporativa Garage Labs.")
    parser.add_argument('--input', required=True, help="Archivo .md de entrada")
    parser.add_argument('--output', help="Archivo .pdf de salida (por defecto, mismo nombre)")
    parser.add_argument('--eyebrow', default="DOCUMENTO TÉCNICO",
                         help="Etiqueta superior de portada")
    parser.add_argument('--prepared-for', default="", help="Cliente/destinatario")
    parser.add_argument('--prepared-by', default="Garage Labs", help="Autor")
    parser.add_argument('--date', default=None, help="Fecha de portada (por defecto mes/año actual)")
    parser.add_argument('--logo', default=LOGO_SVG_DEFAULT, help="Ruta al SVG del logo")
    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"Error: no existe el archivo de entrada: {args.input}", file=sys.stderr)
        sys.exit(1)

    output = args.output or (os.path.splitext(args.input)[0] + '.pdf')
    date = args.date if args.date is not None else default_date()

    build_pdf(args.input, output, args.eyebrow, args.prepared_for,
              args.prepared_by, date, args.logo)
    print(f"PDF generado: {output}")


if __name__ == '__main__':
    main()

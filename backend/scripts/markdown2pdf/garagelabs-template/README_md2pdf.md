# md2pdf_garagelabs.py

**Convierte Markdown en PDF corporativo con identidad visual Garage Labs.**

Script definitivo y reutilizable para generar documentos PDF premium (estimaciones, reportes, propuestas) con portada Navy/Teal, logotipo Ultra-HD, tablas estilizadas, callouts y paginación automática — manteniendo exactamente el estándar validado en los documentos de referencia (`Reporte_Mensual_SERCOM_Junio_2026_GarageLabs.pdf` y `Estimacion_Levantamiento_SERCOM_Peru_GarageLabs.pdf`).

---

## Identidad Corporativa Aplicada

| Elemento | Especificación |
|---|---|
| **Fondo** | Navy `#10101C` full-bleed |
| **Acento** | Teal `#37ECBA` |
| **Destello portada** | Gradiente radial de 5 paradas sobrias (`#1E9875` → `#158060` → `#0C5840` → `#082015` → Navy) |
| **Logotipo** | SVG rasterizado a 2400 px (Ultra-HD) con `rsvg-convert`, canal alfa, `preserveAspectRatio` |
| **Tipografía** | Inter (ExtraBold, SemiBold, Medium, Regular, Italic) con fallback a Helvética |
| **Tablas** | Cabecera `#2A2A3A`, filas alternadas `#1B1B29`/`#202030`, borde inferior Teal |
| **Callouts** | Barra lateral izquierda Teal 3 pt sobre fondo `#181826` |
| **Paginación** | `"Garage Labs — Confidencial \| Página X de Y"` sin títulos huérfanos |

---

## Argumentos CLI

```
--input   ARCHIVO   (obligatorio)  Ruta al archivo .md de entrada
--output  ARCHIVO   (opcional)     Ruta del .pdf de salida. Por defecto, mismo nombre que el .md
--eyebrow TEXTO     (opcional)     Etiqueta superior de portada. Por defecto: "DOCUMENTO TÉCNICO"
--prepared-for TEXTO (opcional)    Nombre del cliente/destinatario
--prepared-by TEXTO (opcional)     Nombre del autor. Por defecto: "Garage Labs"
--date    TEXTO     (opcional)     Fecha de portada. Por defecto: mes y año actual
--logo    RUTA      (opcional)     Ruta al SVG del logotipo. Por defecto: Imagenes/logo-garage-labs.svg
```

---

## Formato Markdown Esperado

El script parsea las siguientes estructuras de Markdown y las convierte automáticamente:

| Sintaxis Markdown | Salida en PDF |
|---|---|
| `# Título` (H1) | Título de **portada** (se extrae el primer H1 del documento) |
| `## Sección` (H2) | Encabezado de sección numerado (1., 2., 3.…) |
| `### Subsección` (H3) | Encabezado de subsección en Teal |
| Párrafo simple | Texto corporal en gris claro (`#D6D6E2`) |
| `- item` / `* item` | Lista con viñetas Teal |
| `1. item` | Lista numerada |
| `\| Celda \| Celda \|` | Tabla corporativa con cabecera oscura y filas alternadas |
| `> Cita` | Callout con barra lateral Teal (italics) |
| `` ```código``` `` | Callout con fuente monoespaciada (bloque de código) |
| `**negrita**` | Texto en negrita |
| `*cursiva*` | Texto en cursiva |
| `` `código` `` | Texto monoespaciado en Teal (inline) |

**Recomendaciones:**
- Usa **un solo `# H1`** al inicio del documento — ese será el título de la portada.
- Organiza el contenido con `##` para secciones principales y `###` para subsecciones.
- Las tablas deben tener al menos una fila de cabecera y una fila de separación (`|---|---|`).

---

## Ejemplos de Uso

### Uso básico (mínimo)

```bash
python3 md2pdf_garagelabs.py --input documento.md
```
Genera `documento.pdf` en el mismo directorio.

### Uso completo (recomendado)

```bash
python3 md2pdf_garagelabs.py \
  --input "/home/juanca/Descargas/mi-propuesta.md" \
  --output "/home/juanca/Descargas/mi-propuesta_GarageLabs.pdf" \
  --eyebrow "PROPUESTA TÉCNICA" \
  --prepared-for "Cliente S.A." \
  --prepared-by "Garage Labs" \
  --date "Julio 2026"
```

### Con logotipo personalizado

```bash
python3 md2pdf_garagelabs.py \
  --input propuesta.md \
  --logo "/ruta/personalizado.svg"
```

---

## Requisitos del Sistema

- **Python 3.8+**
- **Paquetes pip:** `reportlab`, `svglib`, `pypdf`
- **Paquetes del sistema:** `librsvg2-bin` (para `rsvg-convert`)
- **Fuentes:** Inter (opcional, detecta `/usr/share/fonts/truetype/inter-zorin-os/`)

Instalación de dependencias del sistema:

```bash
sudo apt install -y librsvg2-bin
```

---

## Arquitectura Interna

```
md2pdf_garagelabs.py
├── parse_markdown()      — Tokeniza el .md en bloques (h1-h3, p, ul, ol, table, blockquote, code)
├── inline_markup()       — Aplica formato inline (negrita, cursiva, código, escape XML)
├── build_story()         — Construye la lista de flowables de ReportLab
│   ├── render_block()    — Convierte cada bloque en uno o más flowables
│   ├── build_table()     — Genera tabla estilizada con colores corporativos
│   ├── build_callout()   — Genera callout con barra lateral Teal
│   └── KeepTogether     — Previene títulos huérfanos (heading + párrafo siguiente)
├── make_cover_drawer()   — Dibuja la portada (fondo + gradiente + logo + texto + línea divisoria)
├── make_interior_drawer()— Dibuja páginas interiores (fondo + logo en esquina superior derecha)
├── NumberedCanvas        — Canvas personalizado para paginación X de Y
└── build_pdf()           — Orquesta todo: register_fonts → parse → logo raster → doc.build
```

---

## Mantenimiento

- Los colores, coordenadas y dimensiones están definidos como constantes al inicio del script (líneas 49–77), documentadas con referencia a los PDFs de origen.
- El gradiente de portada usa `radialGradient()` con 5 paradas de color para un difuminado suave y orgánico.
- El logo se rasteriza temporalmente con `rsvg-convert` y se elimina automáticamente al finalizar (`finally`).
- Para cambiar el estilo de portada, modifica las constantes `LOGO_*`, `TITLE_*`, `DIVIDER_*` y `META_*`.

---

## Histórico

| Versión | Cambio |
|---|---|
| 1.0 | Script inicial con portada, tablas, callouts, listas y paginación |
| 1.1 | Gradiente de portada calibrado a 5 paradas sobrias y sutiles |
| 1.2 | Logo Ultra-HD a 2400 px con canal alfa y preserveAspectRatio |

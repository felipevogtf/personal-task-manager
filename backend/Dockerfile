FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache python3 py3-reportlab py3-cairosvg \
    && (apk add --no-cache font-inter 2>/dev/null || true)

ENV DOCUMENTS_PATH=/documents

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

CMD ["node", "dist/main"]

# syntax=docker/dockerfile:1
#
# Dockerfile = la "receta" para empaquetar la API en una caja (imagen)
# que funciona igual en cualquier computador o servidor.
#
# Usamos varias ETAPAS (multi-stage): una cocina grande para preparar todo,
# y una lonchera pequeña con solo lo necesario para ejecutar.

# ── Etapa base: el sistema operativo + Node.js ──────────────────────────────
FROM node:24-alpine AS base
WORKDIR /app

# ── Etapa build: instala TODO y compila TypeScript → JavaScript ─────────────
FROM base AS build
# Primero solo los archivos de dependencias: si no cambian, Docker reutiliza
# esta capa (caché) y no vuelve a descargar node_modules en cada build.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Etapa runtime: la imagen final, pequeña y sin herramientas de desarrollo ─
FROM base AS runtime
ENV NODE_ENV=production
# Puerto por defecto; plataformas como Render lo cambian con su propia variable PORT.
ENV PORT=4000
COPY package.json package-lock.json ./
# Solo dependencias de producción; sin scripts (el cliente de Prisma ya viene compilado en dist).
# --omit=optional: @prisma/client declara la CLI de Prisma y TypeScript como dependencias
# "par" opcionales, y npm las marca "devOptional". Solo se excluyen si omitimos dev Y optional.
# Sin esto la imagen arrastra ≈250 MB que no se usan (CLI de Prisma, Studio, TypeScript...).
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist

# No ejecutamos como administrador (root): si alguien rompe la app, tiene menos poder.
USER node
EXPOSE 4000

# Docker pregunta cada 15 s "¿estás vivo?" usando nuestro /api/health.
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}/api/health" || exit 1

CMD ["node", "dist/server.js"]

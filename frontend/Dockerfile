# Dockerfile para el Frontend (Next.js)
# Multi-stage build para optimizar el tamaño de la imagen final

# Etapa 1: Dependencias
FROM node:20-alpine AS deps
# Añadir libc6-compat para compatibilidad con algunas dependencias nativas
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Etapa 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias desde la etapa anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar todo el código fuente
COPY . .

# Variables de entorno para el build
# Next.js recopila datos de telemetría anónimos, puedes desactivarlo
ENV NEXT_TELEMETRY_DISABLED=1

# Build de la aplicación
RUN npm run build

# Etapa 3: Runner (imagen final)
FROM node:20-alpine AS runner

WORKDIR /app

# Variables de entorno de producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar package files para node_modules de producción
COPY package.json package-lock.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos de configuración
COPY --from=builder /app/next.config.mjs ./

# Copiar el build de Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Cambiar propietario de todos los archivos
RUN chown -R nextjs:nodejs /app

# Cambiar a usuario no-root
USER nextjs

# Exponer el puerto
EXPOSE 3000

# Configurar variable de entorno del puerto
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando para iniciar la aplicación
CMD ["npm", "start"]

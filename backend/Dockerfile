# Dockerfile para el Backend (Django)
# Multi-stage build para optimizar el tamaño de la imagen final

# Etapa 1: Builder
FROM python:3.14-slim AS builder

# Instalar dependencias del sistema necesarias para compilar paquetes Python
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instalar uv para gestión de dependencias (más rápido que pip)
RUN pip install --no-cache-dir uv

# Copiar archivos de dependencias
COPY pyproject.toml uv.lock ./

# Crear virtualenv e instalar dependencias
RUN uv venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN uv pip install -r pyproject.toml

# Etapa 2: Runner (imagen final)
FROM python:3.14-slim AS runner

# Instalar dependencias runtime de PostgreSQL
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Crear usuario no-root para seguridad
RUN groupadd -r django && useradd -r -g django django

# Copiar el virtualenv desde el builder
COPY --from=builder /opt/venv /opt/venv

# Copiar el código de la aplicación
COPY restApi ./restApi

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH="/opt/venv/bin:$PATH"
ENV USE_POSTGRES=true

# Cambiar propietario de los archivos
RUN chown -R django:django /app

# Cambiar a usuario no-root
USER django

# Exponer el puerto
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python restApi/manage.py check || exit 1

# Script de inicio que ejecuta migraciones y luego inicia el servidor
CMD cd restApi && \
    python manage.py migrate --noinput && \
    python manage.py runserver 0.0.0.0:8000

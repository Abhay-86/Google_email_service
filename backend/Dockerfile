FROM python:3.13-slim

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# System dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       postgresql-client \
       build-essential \
       libpq-dev \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /app/requirements.txt \
    && pip install --no-cache-dir gunicorn uvicorn

# Copy Django project
COPY . /app/

# Create required directories & user
RUN mkdir -p /app/staticfiles /app/logs /app/media \
    && useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app

# Switch to non-root user
USER app

EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD curl -f http://localhost:8000/admin/ || exit 1

# Run Django
# Run Django (WSGI – correct)
CMD ["bash", "-lc", "\
if [ -f /app/.env ]; then export $(grep -v '^#' /app/.env | xargs); fi && \
python manage.py collectstatic --noinput || true && \
python manage.py migrate --noinput && \
exec gunicorn --bind 0.0.0.0:${PORT:-8000} \
--workers 3 \
google_email_service.wsgi:application \
"]

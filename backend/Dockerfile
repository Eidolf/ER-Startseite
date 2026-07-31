FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=1000 \
    POETRY_VERSION=1.8.2 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    POETRY_REQUESTS_TIMEOUT=1000 \
    POETRY_HTTP_TIMEOUT=1000

# Install system deps
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install --no-install-recommends -y \
    curl \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="$POETRY_HOME/bin:$PATH"

# Copy dependencies
COPY pyproject.toml ./

# Install defaults
RUN poetry config installer.max-workers 1 && poetry install --no-root --only main

# Runtime stage
FROM python:3.11-slim AS runtime

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

COPY --from=builder /app/.venv ./.venv
COPY . .

# Create non-root user
RUN addgroup --gid 1001 appuser && \
    adduser --uid 1001 --gid 1001 --disabled-password --gecos "" appuser

# Install gosu and nodejs (for Varco Server Sidecar)
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends gosu nodejs npm && rm -rf /var/lib/apt/lists/*
RUN npm install @varco/client ws --no-save

# Create uploads directory and set permissions
WORKDIR /app
RUN mkdir -p /app/uploads /app/data && chown -R appuser:appuser /app/uploads /app/data

# Copy entrypoint script
COPY entrypoint.sh .
RUN sed -i 's/\r$//' entrypoint.sh
RUN chmod +x entrypoint.sh

EXPOSE 13000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "13000"]

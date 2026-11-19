FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

COPY engine/ /app/engine/
COPY app/api/ /app/app/api/

WORKDIR /app/app/api
RUN uv sync --frozen --no-dev

EXPOSE 8080
CMD ["uv", "run", "uvicorn", "shockt_api.main:app", "--host", "0.0.0.0", "--port", "8080"]

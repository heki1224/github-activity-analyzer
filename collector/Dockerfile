FROM python:3.14-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_SYSTEM_PYTHON=1

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

ENTRYPOINT ["uv", "run", "python", "main.py"]

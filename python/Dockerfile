FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /opt/stilowo/python

COPY pyproject.toml alembic.ini ./
COPY src ./src
COPY alembic ./alembic

RUN pip install --no-cache-dir -e .

EXPOSE 8000

CMD ["uvicorn", "stilowo_desk.app:app", "--host", "0.0.0.0", "--port", "8000"]

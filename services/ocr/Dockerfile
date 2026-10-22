# syntax=docker/dockerfile:1
# Queenix OCR service. Builds natively on linux/arm64 and linux/amd64 (all deps ship manylinux wheels for both).
#   docker build -t queenix-ocr .                       # production image (default = last stage)
#   docker build --target test -t queenix-ocr:test .    # + pytest, fonts, tests; `docker run --rm queenix-ocr:test`

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000
WORKDIR /srv
COPY requirements.txt .
# --no-deps: the file is the full pinned closure (swaps rapidocr's opencv-python for the headless build).
# The PP-OCRv6 ONNX models ship inside the rapidocr wheel, so they are baked into this layer;
# the import+load below fails the build if anything is missing, and proves no download is needed at runtime.
RUN pip install --no-deps -r requirements.txt \
 && python -c "from rapidocr import RapidOCR; RapidOCR(params={'Global.log_level': 'warning'})" \
 && useradd --system --uid 10001 --create-home ocr
COPY app ./app
USER 10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/health' % os.environ.get('PORT','8000'), timeout=4)" || exit 1
# Railway injects PORT. WEB_CONCURRENCY (read by uvicorn) sets worker processes; ~300 MB RSS each.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

FROM runtime AS test
USER root
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
COPY requirements-dev.txt .
RUN pip install --no-deps -r requirements-dev.txt
COPY tests ./tests
USER 10001
CMD ["python", "-m", "pytest", "-q", "-p", "no:cacheprovider"]

FROM runtime

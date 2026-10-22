"""Queenix OCR service: FastAPI wrapper around PP-OCR + per-document field extractors."""

from __future__ import annotations

import hmac
import io
import logging
import os
import time
import warnings
from contextlib import asynccontextmanager

import pillow_heif
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, Response, UploadFile
from fastapi.responses import JSONResponse
from PIL import Image, ImageOps, UnidentifiedImageError

from . import engine
from .extractors import EXTRACTORS

log = logging.getLogger("ocr")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

MAX_BYTES = 10 * 1024 * 1024
FORMATS = {"JPEG", "PNG", "WEBP", "HEIF"}  # HEIF covers .heic via pillow-heif
Image.MAX_IMAGE_PIXELS = 50_000_000
warnings.simplefilter("error", Image.DecompressionBombWarning)
pillow_heif.register_heif_opener()


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not os.environ.get("OCR_API_KEY"):
        raise RuntimeError("OCR_API_KEY is not set; refusing to start")
    t = time.perf_counter()
    engine.load()
    log.info("engine loaded in %.2fs: %s", time.perf_counter() - t, engine.VERSION)
    yield


app = FastAPI(title="Queenix OCR", version="1.0.0", lifespan=lifespan)


@app.middleware("http")
async def reject_oversized(request: Request, call_next):
    # Cheap early reject before the multipart body is parsed. Chunked bodies without
    # Content-Length still get the exact per-file check in /v1/scan.
    cl = request.headers.get("content-length")
    if cl and cl.isdigit() and int(cl) > MAX_BYTES + 64 * 1024:
        return JSONResponse({"detail": "file too large (max 10 MB)"}, status_code=413)
    return await call_next(request)


@app.get("/health")
def health():
    return {"ok": True, "engine": engine.ENGINE, "version": engine.VERSION}


@app.post("/v1/scan")
def scan(
    response: Response,
    file: UploadFile | None = File(None),
    kind: str | None = Form(None),
    x_ocr_key: str | None = Header(None),
):
    expected = os.environ["OCR_API_KEY"]
    if not x_ocr_key or not hmac.compare_digest(x_ocr_key.encode(), expected.encode()):
        raise HTTPException(401, "invalid or missing X-OCR-Key")
    if kind not in EXTRACTORS:
        raise HTTPException(400, f"kind must be one of: {', '.join(EXTRACTORS)}")
    if file is None:
        raise HTTPException(400, "multipart field `file` is required")

    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "file too large (max 10 MB)")
    try:
        img = Image.open(io.BytesIO(data))
        if img.format not in FORMATS:
            raise HTTPException(400, f"unsupported image format {img.format}; use jpeg, png, webp or heic")
        img = ImageOps.exif_transpose(img).convert("RGB")
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning, OSError, SyntaxError, ValueError):
        raise HTTPException(400, "file is not a readable jpeg, png, webp or heic image")

    t = time.perf_counter()
    lines, rotated = engine.run(img)
    fields, warns = EXTRACTORS[kind](lines)
    ms = (time.perf_counter() - t) * 1000
    if rotated:
        warns.insert(0, f"image was not upright; OCR ran on it rotated {rotated} degrees counter-clockwise (boxes refer to the rotated image)")
    if not lines:
        warns.insert(0, "no text detected")
    response.headers["X-Elapsed-Ms"] = f"{ms:.0f}"
    log.info("scan kind=%s size=%dx%d lines=%d ms=%.0f", kind, img.width, img.height, len(lines), ms)  # no PII in logs

    return {
        "kind": kind,
        "fields": fields,
        "lines": [{"text": l.text, "confidence": l.confidence, "box": l.box} for l in lines],
        "confidence": round(sum(l.confidence for l in lines) / len(lines), 4) if lines else 0.0,
        "warnings": warns,
    }

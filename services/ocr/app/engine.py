"""PP-OCR (PP-OCRv6 small det + rec, mobile cls) on ONNX Runtime via RapidOCR.

The ONNX models ship inside the pinned `rapidocr` wheel, so they are part of the image layer:
nothing is downloaded at runtime (verified with `docker run --network none`)."""

from __future__ import annotations

import os
import threading
from importlib.metadata import version

from PIL import Image, ImageDraw

from .extractors.common import Line

ENGINE = "rapidocr/onnxruntime (PaddleOCR PP-OCRv6 small det+rec)"
VERSION = f"rapidocr {version('rapidocr')}; onnxruntime {version('onnxruntime')}"

_ocr = None
_cls: list[tuple[str, float]] = []  # per-line orientation from the last call (filled by the spy below)
# ponytail: one inference at a time per process (ORT already uses every core it's given).
# Scale with WEB_CONCURRENCY workers or more replicas, not threads.
_lock = threading.Lock()


def load() -> None:
    global _ocr
    from rapidocr import RapidOCR

    threads = int(os.environ.get("OCR_THREADS", "0")) or -1  # -1 = ORT default (all visible cores)
    _ocr = RapidOCR(params={
        "Global.log_level": "warning",
        "EngineConfig.onnxruntime.intra_op_num_threads": threads,
    })

    # RapidOCR doesn't expose the text-orientation classifier's verdicts; record them so we can
    # detect a fully upside-down photo. Relies on RapidOCR.cls_and_rotate (rapidocr==3.9.2, pinned).
    orig = _ocr.cls_and_rotate

    def spy(imgs):
        out = orig(imgs)
        _cls[:] = out[1].cls_res or []
        return out

    _ocr.cls_and_rotate = spy
    warm = Image.new("RGB", (320, 64), "white")
    ImageDraw.Draw(warm).text((10, 20), "WARM UP 123", fill="black", font_size=24)
    run(warm)  # first inference allocates ORT buffers; do it before accepting traffic


def _ocr_once(img: Image.Image) -> tuple[list[Line], bool]:
    _cls.clear()
    r = _ocr(img)
    flipped = sum(1 for label, score in _cls if label == "180" and score > 0.9)
    lines = [] if r.boxes is None or r.txts is None else [
        Line(text, round(float(score), 4), [[round(float(x)), round(float(y))] for x, y in box])
        for box, text, score in zip(r.boxes, r.txts, r.scores)
    ]
    return lines, len(_cls) >= 2 and flipped > len(_cls) / 2


def _sideways(lines: list[Line]) -> bool:
    tall = sum(1 for l in lines if len(l.text) >= 3 and l.h > 1.5 * (l.x1 - l.x0))
    return len(lines) >= 2 and tall > len(lines) / 2


def run(img: Image.Image) -> tuple[list[Line], int]:
    """OCR lines + the counter-clockwise rotation (0/90/180/270) applied to get upright text.
    EXIF orientation is applied before this; this catches photos that are still sideways/upside down.
    When rotation != 0, boxes refer to the rotated image."""
    if _ocr is None:
        raise RuntimeError("engine not loaded")
    rot = 0
    with _lock:
        lines, upside_down = _ocr_once(img)
        if _sideways(lines):
            rot = 90
            lines, upside_down = _ocr_once(img.rotate(rot, expand=True))
        if upside_down:
            rot = (rot + 180) % 360
            lines, _ = _ocr_once(img.rotate(rot, expand=True))
    return lines, rot

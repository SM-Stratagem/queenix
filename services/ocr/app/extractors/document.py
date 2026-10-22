"""Generic documents (e.g. signed paper forms): full reading-order text + signature-label detection."""

from __future__ import annotations

import re

from .common import Line, full_text

_SIGNED = re.compile(r"\bsignature\b|\bsigned\b|\bsign\s*here\b|التوقيع", re.I)


def extract(lines: list[Line]) -> tuple[dict, list[str]]:
    text = full_text(lines)
    return {"text": text, "signed_by_detected": any(_SIGNED.search(l.text) for l in lines)}, []

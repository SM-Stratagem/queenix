"""UAE vehicle number plates: emirate + code (letters or small number) + 1-5 digit number."""

from __future__ import annotations

import re

from .common import Line, row_text, rows

# (canonical name, short code, regex over upper-cased text incl. Arabic names)
EMIRATES = [
    ("ABU DHABI", "AUH", r"ABU\s*DHABI|\bA\.\s?D\b\.?|أبو\s*ظبي|ابو\s*ظبي|أبوظبي|ابوظبي"),
    ("DUBAI", "DXB", r"DUBAI|\bDXB\b|دبي"),
    ("SHARJAH", "SHJ", r"SHARJAH|\bSHJ\b|الشارقة"),
    ("AJMAN", "AJM", r"AJMAN|عجمان"),
    ("UMM AL QUWAIN", "UAQ", r"UMM\s*AL\s*QUWAIN|\bU\.?A\.?Q\b\.?|أم\s*القيوين|ام\s*القيوين"),
    ("RAS AL KHAIMAH", "RAK", r"RAS\s*AL\s*KHAIMAH|\bR\.?A\.?K\b\.?|رأس\s*الخيمة|راس\s*الخيمة"),
    ("FUJAIRAH", "FUJ", r"FUJAIRAH|الفجيرة"),
]
_NOISE = re.compile("|".join(p for _, _, p in EMIRATES) + r"|\bU\.?A\.?E\b\.?|UNITED\s*ARAB\s*EMIRATES", re.I)


def extract(lines: list[Line]) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    rs = rows(lines)
    candidates = [row_text(r) for r in rs]
    upper = "\n".join(candidates).upper()

    emirate = code_short = None
    for name, short, rx in EMIRATES:
        if re.search(rx, upper, re.I):
            emirate, code_short = name, short
            break

    # Tokens with the height of the box they came from: the plate number is the biggest text.
    tokens: list[tuple[str, float]] = []
    for ln in sorted(lines, key=lambda l: (l.cy, l.x0)):
        t = _NOISE.sub(" ", ln.text.upper())
        for tok in re.findall(r"[A-Z]+|\d+", t):
            tokens.append((tok, ln.h))

    nums = [(t, h) for t, h in tokens if t.isdigit() and 1 <= len(t) <= 5]
    number = max(nums, key=lambda th: (th[1], len(th[0])))[0] if nums else None

    # tallest short letter group: the category letter is printed big; stray OCR of Arabic text is small
    letters = [(t, h) for t, h in tokens if t.isalpha() and len(t) <= 2]
    code = max(letters, key=lambda th: th[1])[0] if letters else None
    if code is None and number is not None:  # Abu Dhabi / Sharjah style numeric category
        rest = [t for t, _ in tokens if t.isdigit() and len(t) <= 2 and t != number]
        code = rest[0] if rest else None

    if number is None:
        warnings.append("plate number not found")
    if emirate is None:
        warnings.append("emirate not detected")
    if code is None:
        warnings.append("plate code not found")

    plate = " ".join(p for p in (code_short, code, number) if p) if number else None
    return {"plate": plate, "emirate": emirate, "code": code, "number": number, "candidates": candidates}, warnings

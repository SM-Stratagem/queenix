"""Emirates ID (front, English labels). Arabic text is ignored."""

from __future__ import annotations

import re

from .common import DIGIT_FIX, Line, clean, find_dates, full_text, label_value

LABELS = {
    "id_number": r"\bI[dD]\s*(?:Number|No\.?)|Identity\s*(?:Number|No)",
    "name": r"\bName\b",
    "date_of_birth": r"Date\s*of\s*Birth|Birth\s*Date|\bD\.?O\.?B\b",
    "nationality": r"Nationality",
    "expiry_date": r"Expiry\s*Date|Date\s*of\s*Expiry|Expiry|Expires",
    "issuing_date": r"Issu(?:ing|e)\s*Date",
    "sex": r"\bSex\b|\bGender\b",
}
ANY_LABEL = "|".join(f"(?:{p})" for p in LABELS.values())

# 784 + 12 more digit-ish chars, allowing separators and common OCR confusions.
_ID = re.compile(r"7\s*8\s*4(?:[\s\-–.]*[\dOoDQIl|ZSsBG]){12}")


def luhn_ok(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        n = int(ch)
        if i % 2:
            n = n * 2 - 9 if n > 4 else n * 2
        total += n
    return total % 10 == 0


def find_id_number(text: str) -> str | None:
    """Normalized 784-YYYY-NNNNNNN-C, or None."""
    for m in _ID.finditer(text):
        digits = re.sub(r"\D", "", m.group(0).translate(DIGIT_FIX))
        if len(digits) == 15:
            return f"{digits[:3]}-{digits[3:7]}-{digits[7:14]}-{digits[14]}"
    return None


def _date(lines: list[Line], key: str) -> str | None:
    v = label_value(lines, LABELS[key])
    d = find_dates(v) if v else []
    return d[0] if d else None


def extract(lines: list[Line]) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    text = full_text(lines)

    id_number = find_id_number(text)
    if id_number is None:
        warnings.append("id_number not found")
    elif not luhn_ok(id_number.replace("-", "")):
        warnings.append("id_number check digit (Luhn) is invalid; likely an OCR misread")

    name = label_value(lines, LABELS["name"], stop=ANY_LABEL)
    nationality = label_value(lines, LABELS["nationality"], stop=ANY_LABEL)

    sex_raw = label_value(lines, LABELS["sex"], stop=ANY_LABEL) or ""
    m = re.match(r"(M|F)", clean(sex_raw).upper())
    sex = m.group(1) if m else None

    fields = {
        "id_number": id_number,
        "name": name,
        "nationality": nationality,
        "date_of_birth": _date(lines, "date_of_birth"),
        "expiry_date": _date(lines, "expiry_date"),
        "sex": sex,
    }
    warnings += [f"{k} not found" for k, v in fields.items() if v is None and k != "id_number"]
    return fields, warnings

"""Passport: ICAO 9303 TD3 machine-readable zone (2 lines x 44 chars)."""

from __future__ import annotations

import re
from datetime import date

from .common import Line, row_text, rows

_W = (7, 3, 1)
TO_DIGIT = str.maketrans("OQDUILZSBG", "0000112586")
TO_ALPHA = str.maketrans("0125867", "OIZSBGT")
_SWAPS = {"0": "O", "O": "0", "1": "I", "I": "1", "5": "S", "S": "5", "8": "B", "B": "8", "2": "Z", "Z": "2"}


def check_digit(s: str) -> int:
    total = 0
    for i, c in enumerate(s):
        v = int(c) if c.isdigit() else (ord(c) - 55 if c.isalpha() else 0)
        total += v * _W[i % 3]
    return total % 10


def _ok(field: str, digit: str) -> bool:
    return digit.isdigit() and check_digit(field) == int(digit) or (digit == "<" and check_digit(field) == 0)


def _normalize(raw: str) -> str:
    s = raw.upper().replace("«", "<<").replace("‹", "<").replace("＜", "<")
    return re.sub(r"[\s(\[{]", lambda m: "" if m.group(0).isspace() else "<", s)


def _fit(s: str, n: int = 44) -> str:
    """OCR often drops or adds a filler '<'; fix length by trimming/padding the longest filler run."""
    while len(s) > n:
        runs = list(re.finditer(r"<+", s))
        if not runs:
            return s[:n]
        r = max(runs, key=lambda m: len(m.group(0)))
        s = s[: r.start()] + s[r.start() + 1:]
    while len(s) < n:
        runs = list(re.finditer(r"<{2,}", s))
        if not runs:
            return s.ljust(n, "<")
        r = max(runs, key=lambda m: len(m.group(0)))
        s = s[: r.start()] + "<" + s[r.start():]
    return s


def _yymmdd(s: str, future: bool) -> str | None:
    if not s.isdigit():
        return None
    yy, mm, dd = int(s[:2]), int(s[2:4]), int(s[4:])
    cur = date.today().year % 100
    year = 2000 + yy if (future or yy <= cur) else 1900 + yy
    if future and yy > cur + 50:  # ponytail: expiry beyond +50y means a 19xx doc
        year = 1900 + yy
    try:
        return date(year, mm, dd).isoformat()
    except ValueError:
        return None


def _fix_number(num: str, digit: str) -> str:
    """Passport numbers are alphanumeric, so O/0-style confusions can't be fixed positionally.
    Try the OCR text first, then every single-character swap, keep the first that validates."""
    if _ok(num, digit):
        return num
    for i, c in enumerate(num):
        if c in _SWAPS:
            cand = num[:i] + _SWAPS[c] + num[i + 1:]
            if _ok(cand, digit):
                return cand
    return num


def find_mrz(lines: list[Line]) -> tuple[str | None, str | None]:
    cands = []
    for r in rows(lines):
        s = _normalize(row_text(r))
        if len(s) >= 30 and (s.count("<") >= 2 or re.fullmatch(r"[A-Z0-9<]+", s)):
            cands.append(s)
    l1 = l2 = None
    for i, s in enumerate(cands):
        if s.startswith("P") and "<" in s[:5]:
            l1 = _fit(s)
            if i + 1 < len(cands):
                l2 = _fit(cands[i + 1])
            break
    if l2 is None:  # line 1 missed: a line with digit runs at the date positions
        for s in cands:
            f = _fit(s)
            if re.fullmatch(r"\d{6}", f[13:19].translate(TO_DIGIT)) and f != l1:
                l2 = f
                break
    return l1, l2


def parse_td3(l1: str | None, l2: str) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    dig = lambda s: s.translate(TO_DIGIT)  # noqa: E731
    number, number_cd = l2[0:9], dig(l2[9])
    nationality = l2[10:13].translate(TO_ALPHA)
    dob, dob_cd = dig(l2[13:19]), dig(l2[19])
    sex = l2[20]
    expiry, expiry_cd = dig(l2[21:27]), dig(l2[27])
    optional, optional_cd = l2[28:42], dig(l2[42])
    composite_cd = dig(l2[43])

    number = _fix_number(number, number_cd)
    checks = {
        "passport_number": _ok(number, number_cd),
        "date_of_birth": _ok(dob, dob_cd),
        "expiry_date": _ok(expiry, expiry_cd),
        "optional_data": _ok(optional, optional_cd),
        "composite": _ok(number + number_cd + dob + dob_cd + expiry + expiry_cd + optional + optional_cd, composite_cd),
    }
    warnings += [f"MRZ check digit failed: {k}" for k, ok in checks.items() if not ok]

    surname = given = issuing = None
    if l1:
        issuing = l1[2:5].translate(TO_ALPHA).strip("<") or None
        names = re.sub(r"<[<K]*$", "", l1[5:]).translate(TO_ALPHA)  # OCR reads trailing '<' as 'K'
        sur, _, giv = names.partition("<<")
        surname = sur.replace("<", " ").strip() or None
        given = re.sub(r"<+", " ", giv).strip() or None
    else:
        warnings.append("MRZ line 1 not found; names and issuing country unavailable")

    fields = {
        "passport_number": number.replace("<", "") or None,
        "surname": surname,
        "given_names": given,
        "nationality": nationality.strip("<") or None,
        "issuing_country": issuing,
        "date_of_birth": _yymmdd(dob, future=False),
        "sex": {"M": "M", "F": "F"}.get(sex, "X"),
        "expiry_date": _yymmdd(expiry, future=True),
        "mrz_valid": all(checks.values()) and l1 is not None,
    }
    return fields, warnings


EMPTY = {k: None for k in ("passport_number", "surname", "given_names", "nationality", "issuing_country",
                           "date_of_birth", "sex", "expiry_date")} | {"mrz_valid": False}


def extract(lines: list[Line]) -> tuple[dict, list[str]]:
    l1, l2 = find_mrz(lines)
    if l2 is None:
        return dict(EMPTY), ["MRZ not found; see `lines` for raw text"]
    fields, warnings = parse_td3(l1, l2)
    fields["mrz"] = [l1, l2]
    return fields, warnings

"""Shared helpers for the field extractors. Everything here is pure: OCR lines in, values out."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from datetime import date
from statistics import median

Box = list[list[float]]  # 4 points, clockwise from top-left


@dataclass(frozen=True)
class Line:
    text: str
    confidence: float
    box: Box

    @property
    def x0(self) -> float:
        return min(p[0] for p in self.box)

    @property
    def x1(self) -> float:
        return max(p[0] for p in self.box)

    @property
    def y0(self) -> float:
        return min(p[1] for p in self.box)

    @property
    def y1(self) -> float:
        return max(p[1] for p in self.box)

    @property
    def cy(self) -> float:
        return (self.y0 + self.y1) / 2

    @property
    def h(self) -> float:
        return self.y1 - self.y0


def line(text: str, x: float = 0, y: float = 0, w: float | None = None, h: float = 20, conf: float = 0.99) -> Line:
    """Fixture helper: axis-aligned box at (x, y)."""
    w = w if w is not None else 10 * len(text)
    return Line(text, conf, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]])


def deskew(lines: list[Line]) -> list[Line]:
    """Rotate box coordinates by the median text angle so a tilted photo groups into rows correctly.
    Only coordinates change (text untouched). Upside-down/sideways images are NOT handled."""
    angles = []
    for l in lines:
        (ax, ay), (bx, by), _, (dx, dy) = l.box
        if math.hypot(bx - ax, by - ay) > 2 * math.hypot(dx - ax, dy - ay):  # wide boxes give a reliable angle
            angles.append(math.atan2(by - ay, bx - ax))
    a = median(angles) if angles else 0.0
    if abs(a) < 0.01:
        return lines
    c, s = math.cos(a), math.sin(a)
    return [Line(l.text, l.confidence, [[x * c + y * s, y * c - x * s] for x, y in l.box]) for l in lines]


def rows(lines: list[Line]) -> list[list[Line]]:
    """Group lines into visual rows (top-to-bottom), each row sorted left-to-right. Returns deskewed lines."""
    out: list[list[Line]] = []
    for ln in sorted(deskew(lines), key=lambda l: l.cy):
        if out:
            ref = out[-1]
            ref_cy = sum(l.cy for l in ref) / len(ref)
            ref_h = sum(l.h for l in ref) / len(ref)
            if abs(ln.cy - ref_cy) < 0.5 * min(ref_h, ln.h or ref_h):
                ref.append(ln)
                continue
        out.append([ln])
    return [sorted(r, key=lambda l: l.x0) for r in out]


def row_text(row: list[Line]) -> str:
    return " ".join(l.text for l in row)


def full_text(lines: list[Line]) -> str:
    return "\n".join(row_text(r) for r in rows(lines))


ARABIC = re.compile(r"[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+")


def clean(s: str) -> str:
    """Drop Arabic script and label punctuation, collapse whitespace."""
    s = ARABIC.sub(" ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip(" :;-_.,/|\t")


def label_value(lines: list[Line], label: str, stop: str | None = None) -> str | None:
    """Value for a printed label: rest of the same box, else the next box on the row,
    else the box directly below. `stop` = regex of other labels that must not be taken as a value."""
    rs = rows(lines)
    is_label = (lambda t: bool(re.search(stop, t, re.I))) if stop else (lambda t: False)
    for ri, row in enumerate(rs):
        for li, ln in enumerate(row):
            m = re.search(label, ln.text, re.I)
            if not m:
                continue
            rest = clean(ln.text[m.end():])
            if rest and not is_label(rest):
                return rest
            if li + 1 < len(row):
                nxt = clean(row[li + 1].text)
                if nxt and not is_label(nxt):
                    return nxt
            for below in rs[ri + 1 : ri + 2]:
                for b in below:
                    if b.x1 > ln.x0 and b.x0 < ln.x1 + 2 * (ln.x1 - ln.x0):
                        val = clean(b.text)
                        if val and not is_label(val):
                            return val
    return None


# --- dates ---------------------------------------------------------------

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}

_SEP = r"[-/.\s]"
_DATE_RES = [
    ("ymd", re.compile(r"\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b")),
    ("dmy", re.compile(r"(?<!\d)(\d{1,2})" + _SEP + r"(\d{1,2})" + _SEP + r"(\d{4})")),  # OCR may glue a time on: 14/07/202618:42
    ("dMy", re.compile(r"\b(\d{1,2})" + _SEP + r"?([A-Za-z]{3,9})\.?" + r"[-/.,\s]*(\d{4})\b")),
    ("Mdy", re.compile(r"\b([A-Za-z]{3,9})\.?\s*(\d{1,2}),?\s*(\d{4})\b")),
    ("dmy2", re.compile(r"\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})\b")),
]


def _mk(y: int, m: int, d: int) -> date | None:
    if m > 12 and d <= 12:  # US-style mm/dd
        m, d = d, m
    try:
        return date(y, m, d)
    except ValueError:
        return None


def find_dates(text: str) -> list[str]:
    """All dates in text as ISO strings, in order of appearance. Day-first (UAE convention)."""
    found: list[tuple[int, str]] = []
    taken: list[range] = []
    for kind, rx in _DATE_RES:
        for m in rx.finditer(text):
            if any(m.start() in r for r in taken):
                continue
            a, b, c = m.groups()
            if kind == "ymd":
                d = _mk(int(a), int(b), int(c))
            elif kind == "dmy":
                d = _mk(int(c), int(b), int(a))
            elif kind == "dmy2":
                d = _mk(2000 + int(c), int(b), int(a))
            else:
                day, mon = (a, b) if kind == "dMy" else (b, a)
                mi = MONTHS.get(mon[:3].lower())
                d = _mk(int(c), mi, int(day)) if mi else None
            if d:
                found.append((m.start(), d.isoformat()))
                taken.append(range(m.start(), m.end()))
    return [iso for _, iso in sorted(found)]


# --- numbers ------------------------------------------------------------

DIGIT_FIX = str.maketrans({"O": "0", "o": "0", "D": "0", "Q": "0", "I": "1", "l": "1", "|": "1",
                           "i": "1", "Z": "2", "S": "5", "s": "5", "B": "8", "G": "6"})

_AMOUNT = re.compile(r"(?<![\d.,])(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?![\d])")


def amounts(text: str) -> list[float]:
    """Money-looking numbers in text, ignoring dates, times and percentages."""
    for _, rx in _DATE_RES:
        text = rx.sub(" ", text)
    text = re.sub(r"\d+(?:[.,]\d+)?\s*%", " ", text)
    text = re.sub(r"\b\d{1,2}:\d{2}(?::\d{2})?\b", " ", text)
    out = []
    for m in _AMOUNT.finditer(text):
        s = m.group(1)
        s = s.replace(",", "") if re.search(r",\d{3}", s) else s.replace(",", ".")
        if float(s) < 1e9:  # skip TRNs, card and phone numbers
            out.append(float(s))
    return out

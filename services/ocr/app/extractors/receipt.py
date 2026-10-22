"""Receipts / tax invoices (UAE-centric: AED, 5% VAT, 15-digit TRN)."""

from __future__ import annotations

import re

from .common import Line, amounts, clean, find_dates, full_text, row_text, rows

# Highest priority first. The first level with a match wins; within a level the last (lowest) row wins.
TOTAL_LEVELS = [
    r"grand\s*total",
    r"amount\s*due|total\s*due|balance\s*due|net\s*(?:total|amount)|total\s*amount|amount\s*payable",
    r"(?<!sub)(?<!sub\s)(?<!sub-)\btotal\b(?!\s*(?:vat|tax|qty|items?|quantity|discount|savings|excl))",
    r"المجموع|الإجمالي|الاجمالي",
]
_VENDOR_SKIP = re.compile(r"tax\s*invoice|invoice|receipt|\btrn\b|\btel\b|phone|date|www\.|@|\d{5,}", re.I)
_VAT = re.compile(r"\bvat\b|\btax\b|ضريبة", re.I)
_VAT_SKIP = re.compile(r"invoice|\btrn\b|reg|\bno\b|number|incl|excl|grand|before|after", re.I)
_TRN_LABEL = re.compile(r"\bTRN\b|tax\s*reg|vat\s*(?:reg|no|number)", re.I)
_OTHER_CCY = {"USD": r"\bUSD\b|\$", "EUR": r"\bEUR\b|€", "GBP": r"\bGBP\b|£", "SAR": r"\bSAR\b",
              "QAR": r"\bQAR\b", "OMR": r"\bOMR\b", "KWD": r"\bKWD\b", "BHD": r"\bBHD\b", "INR": r"\bINR\b|₹"}


def _amount_after(texts: list[str], i: int, start: int) -> float | None:
    vals = amounts(texts[i][start:])
    if not vals and i + 1 < len(texts):
        vals = amounts(texts[i + 1])
    return vals[-1] if vals else None


def _vendor(rs: list[list[Line]]) -> str | None:
    cands = [ln for r in rs[:5] for ln in r
             if len(re.findall(r"[A-Za-z]", ln.text)) >= 3 and not _VENDOR_SKIP.search(ln.text)]
    if not cands:
        return None
    best = max(cands, key=lambda l: l.h * 1.0 - 1e-6 * l.y0)  # tallest; earliest on ties
    return clean(best.text) or None


def _trn(texts: list[str]) -> str | None:
    found = []
    for t in texts:
        for m in re.finditer(r"(?<!\d)\d(?:[\s-]?\d){14}(?!\d)", t):
            found.append((not _TRN_LABEL.search(t), re.sub(r"\D", "", m.group(0))))
    return min(found)[1] if found else None


def extract(lines: list[Line]) -> tuple[dict, list[str]]:
    warnings: list[str] = []
    rs = rows(lines)
    texts = [row_text(r) for r in rs]
    text = full_text(lines)

    total = None
    for level in TOTAL_LEVELS:
        hits = [(i, m.end()) for i, t in enumerate(texts) for m in [re.search(level, t, re.I)] if m]
        vals = [v for i, end in hits if (v := _amount_after(texts, i, end)) is not None]
        if vals:
            total = vals[-1]
            break
    if total is None:
        # decimals only (x.xx), so misread dates/phone numbers can't win
        every = [v for t in texts for v in amounts(" ".join(re.findall(r"\d[\d,]*[.,]\d{2}(?!\d)", t)))]
        if every:
            total = max(every)
            warnings.append("no TOTAL line found; total is the largest amount on the receipt")
        else:
            warnings.append("total not found")

    vat = None
    for i, t in enumerate(texts):
        m = _VAT.search(t)
        if m and not _VAT_SKIP.search(t) and (v := _amount_after(texts, i, m.end())) is not None:
            vat = v
            break

    if re.search(r"\bAED\b|د\.?\s?إ|\bDHS?\b|\bDIRHAMS?\b", text, re.I):
        currency = "AED"
    else:
        currency = next((c for c, rx in _OTHER_CCY.items() if re.search(rx, text)), None)
        if currency is None:
            currency = "AED"
            warnings.append("currency not printed; assumed AED")

    dates = find_dates(text)
    fields = {
        "vendor": _vendor(rs),
        "date": dates[0] if dates else None,
        "total": total,
        "vat": vat,
        "currency": currency,
        "trn": _trn(texts),
    }
    warnings += [f"{k} not found" for k in ("vendor", "date") if fields[k] is None]
    return fields, warnings

"""Synthetic, fictional sample images rendered with Pillow + DejaVu fonts (no real personal data).

    python -m tests.samples /tmp/samples   # writes <kind>.png for manual curl testing
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_DIRS = ["/usr/share/fonts/truetype/dejavu", "/Library/Fonts", str(Path.home() / "Library/Fonts")]


def font_path(name: str) -> str | None:
    for d in FONT_DIRS:
        p = Path(d) / name
        if p.exists():
            return str(p)
    return None


def _f(name: str, size: int) -> ImageFont.FreeTypeFont:
    p = font_path(name)
    if p is None:
        raise FileNotFoundError(f"{name} not found; install fonts-dejavu-core")
    return ImageFont.truetype(p, size)


SANS, BOLD, MONO = "DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSansMono.ttf"

EID = {"id": "784-1985-1122334-3", "name": "Sample Person Test", "dob": "12/06/1985",
       "nationality": "Utopia", "issue": "21/11/2024", "expiry": "20/11/2029", "sex": "F"}
MRZ = ["P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",  # ICAO 9303 specimen
       "L898902C36UTO7408122F1204159ZE184226B<<<<<10"]


def emirates_id() -> Image.Image:
    img = Image.new("RGB", (1012, 638), (236, 242, 238))
    d = ImageDraw.Draw(img)
    for y in range(0, 638, 6):  # faint guilloche-ish background lines
        d.line([(0, y), (1012, y + 40)], fill=(226, 234, 229))
    d.text((40, 30), "UNITED ARAB EMIRATES", font=_f(BOLD, 34), fill=(20, 40, 30))
    d.text((40, 75), "RESIDENT IDENTITY CARD", font=_f(SANS, 26), fill=(20, 40, 30))
    d.text((600, 30), "الإمارات العربية المتحدة", font=_f(SANS, 30), fill=(20, 40, 30))
    d.rectangle([40, 150, 270, 430], fill=(200, 205, 210), outline=(150, 150, 150))  # photo slot
    lab, val = _f(SANS, 24), _f(BOLD, 28)
    rows = [("ID Number", EID["id"]), ("Name:", EID["name"]), ("Date of Birth:", EID["dob"]),
            ("Nationality:", EID["nationality"])]
    y = 160
    for label, value in rows:
        d.text((310, y), label, font=lab, fill=(70, 70, 70))
        d.text((540, y - 2), value, font=val, fill=(0, 0, 0))
        y += 62
    d.text((640, y + 5), "الاسم", font=_f(SANS, 24), fill=(70, 70, 70))
    y += 62
    d.text((310, y), "Issuing Date:", font=lab, fill=(70, 70, 70))
    d.text((480, y - 2), EID["issue"], font=val, fill=(0, 0, 0))
    d.text((660, y), "Expiry Date:", font=lab, fill=(70, 70, 70))
    d.text((812, y - 2), EID["expiry"], font=val, fill=(0, 0, 0))
    d.text((310, y + 62), "Sex:", font=lab, fill=(70, 70, 70))
    d.text((380, y + 60), EID["sex"], font=val, fill=(0, 0, 0))
    return img


def passport() -> Image.Image:
    img = Image.new("RGB", (1000, 700), (245, 240, 228))
    d = ImageDraw.Draw(img)
    d.text((40, 30), "PASSPORT  UTOPIA", font=_f(BOLD, 34), fill=(60, 30, 30))
    d.rectangle([40, 100, 290, 420], fill=(210, 205, 200))
    for i, (k, v) in enumerate([("Surname", "ERIKSSON"), ("Given names", "ANNA MARIA"), ("Date of birth", "12 AUG 1974")]):
        d.text((330, 110 + i * 80), k, font=_f(SANS, 20), fill=(90, 90, 90))
        d.text((330, 135 + i * 80), v, font=_f(BOLD, 28), fill=(0, 0, 0))
    mono = _f(MONO, 34)
    for i, row in enumerate(MRZ):
        d.text((40, 540 + i * 56), row, font=mono, fill=(0, 0, 0))
    return img


def plate() -> Image.Image:
    img = Image.new("RGB", (620, 180), (120, 120, 120))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([20, 20, 600, 160], radius=14, fill="white", outline="black", width=5)
    d.text((45, 45), "DUBAI", font=_f(BOLD, 30), fill="black")
    d.text((50, 90), "دبي", font=_f(SANS, 30), fill="black")
    d.text((190, 40), "A", font=_f(BOLD, 88), fill="black")
    d.text((290, 40), "12345", font=_f(BOLD, 88), fill="black")
    return img


RECEIPT_ROWS = [
    ("Tax Invoice", ""), ("TRN: 100123456700003", ""), ("Date: 14/07/2026 18:42", ""), ("", ""),
    ("Protein Bar x2", "20.00"), ("Shaker Bottle", "80.00"), ("", ""),
    ("Subtotal", "100.00"), ("VAT 5%", "5.00"), ("TOTAL AED", "105.00"), ("", ""), ("Paid by card", ""),
]


def receipt() -> Image.Image:
    img = Image.new("RGB", (560, 760), "white")
    d = ImageDraw.Draw(img)
    d.text((40, 30), "FAKE FITNESS SUPPLIES", font=_f(BOLD, 34), fill="black")
    mono = _f(MONO, 24)
    y = 100
    for left, right in RECEIPT_ROWS:
        d.text((40, y), left, font=mono, fill="black")
        if right:
            d.text((520 - d.textlength(right, font=mono), y), right, font=mono, fill="black")
        y += 44
    return img


def document() -> Image.Image:
    img = Image.new("RGB", (900, 700), "white")
    d = ImageDraw.Draw(img)
    d.text((60, 40), "MEMBER WAIVER FORM", font=_f(BOLD, 36), fill="black")
    body = _f(SANS, 24)
    for i, t in enumerate(["I confirm that I am fit to exercise and", "agree to follow all gym safety rules.",
                           "Member name: Sample Person"]):
        d.text((60, 130 + i * 50), t, font=body, fill="black")
    d.text((60, 480), "Signature:", font=body, fill="black")
    d.line([(200, 505), (500, 505)], fill="black", width=2)
    d.text((60, 540), "Date: 01/09/2026", font=body, fill="black")
    return img


SAMPLES = {"emirates_id": emirates_id, "passport": passport, "plate": plate, "receipt": receipt, "document": document}

if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "samples")
    out.mkdir(parents=True, exist_ok=True)
    for kind, fn in SAMPLES.items():
        fn().save(out / f"{kind}.png")
        print(out / f"{kind}.png")

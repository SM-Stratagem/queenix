"""End-to-end: synthetic images -> real PP-OCR model -> FastAPI -> extractors."""

import io
import os

import pytest

pytest.importorskip("rapidocr")
from fastapi.testclient import TestClient  # noqa: E402

from tests import samples  # noqa: E402

if samples.font_path(samples.MONO) is None:
    pytest.skip("DejaVu fonts not installed", allow_module_level=True)

KEY = "test-key"
os.environ["OCR_API_KEY"] = KEY
from app.main import app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def png(img) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


def scan(client, kind, data, key=KEY, name="x.png", ctype="image/png"):
    return client.post("/v1/scan", data={"kind": kind}, files={"file": (name, data, ctype)},
                       headers={"X-OCR-Key": key} if key else {})


def test_refuses_to_start_without_key(monkeypatch):
    monkeypatch.delenv("OCR_API_KEY")
    with pytest.raises(RuntimeError, match="OCR_API_KEY"):
        with TestClient(app):
            pass


def test_health(client):
    body = client.get("/health").json()
    assert body["ok"] is True and "rapidocr" in body["version"]


def test_auth_and_validation(client):
    img = png(samples.plate())
    assert scan(client, "plate", img, key=None).status_code == 401
    assert scan(client, "plate", img, key="wrong").status_code == 401
    assert scan(client, "selfie", img).status_code == 400
    assert scan(client, "plate", b"%PDF-1.4 not an image", name="x.pdf", ctype="application/pdf").status_code == 400
    gif = io.BytesIO()
    samples.plate().save(gif, "GIF")
    assert scan(client, "plate", gif.getvalue(), name="x.gif", ctype="image/gif").status_code == 400
    assert scan(client, "plate", b"\0" * (10 * 1024 * 1024 + 1)).status_code == 413


def test_webp_and_jpeg_accepted(client):
    for fmt in ("WEBP", "JPEG"):
        buf = io.BytesIO()
        samples.plate().save(buf, fmt, quality=90)
        r = scan(client, "plate", buf.getvalue(), name=f"x.{fmt.lower()}", ctype=f"image/{fmt.lower()}")
        assert r.status_code == 200, r.text
        assert r.json()["fields"]["number"] == "12345"


def test_heic_accepted(client):
    pillow_heif = pytest.importorskip("pillow_heif")
    buf = io.BytesIO()
    pillow_heif.from_pillow(samples.plate()).save(buf, quality=90)
    r = scan(client, "plate", buf.getvalue(), name="x.heic", ctype="image/heic")
    assert r.status_code == 200, r.text
    assert r.json()["fields"]["number"] == "12345"


def test_emirates_id(client):
    r = scan(client, "emirates_id", png(samples.emirates_id()))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["fields"] == {
        "id_number": samples.EID["id"],
        "name": samples.EID["name"],
        "nationality": samples.EID["nationality"],
        "date_of_birth": "1985-06-12",
        "expiry_date": "2029-11-20",
        "sex": "F",
    }, body
    assert body["warnings"] == []
    assert 0 < body["confidence"] <= 1
    assert all({"text", "confidence", "box"} <= set(l) for l in body["lines"])


def test_passport_mrz(client):
    body = scan(client, "passport", png(samples.passport())).json()
    f = body["fields"]
    assert f["mrz_valid"] is True, body
    assert (f["passport_number"], f["surname"], f["given_names"]) == ("L898902C3", "ERIKSSON", "ANNA MARIA")
    assert (f["nationality"], f["issuing_country"], f["sex"]) == ("UTO", "UTO", "F")
    assert (f["date_of_birth"], f["expiry_date"]) == ("1974-08-12", "2012-04-15")


def test_plate(client):
    f = scan(client, "plate", png(samples.plate())).json()["fields"]
    assert f["plate"] == "DXB A 12345", f
    assert (f["emirate"], f["code"], f["number"]) == ("DUBAI", "A", "12345")


def test_receipt(client):
    f = scan(client, "receipt", png(samples.receipt())).json()["fields"]
    assert f == {"vendor": "FAKE FITNESS SUPPLIES", "date": "2026-07-14", "total": 105.0, "vat": 5.0,
                 "currency": "AED", "trn": "100123456700003"}, f


def test_document(client):
    f = scan(client, "document", png(samples.document())).json()["fields"]
    assert f["signed_by_detected"] is True
    assert f["text"].splitlines()[0] == "MEMBER WAIVER FORM", f
    assert "safety rules" in f["text"]


def test_blank_image_warns(client):
    from PIL import Image

    body = scan(client, "receipt", png(Image.new("RGB", (400, 300), "white"))).json()
    assert body["lines"] == [] and body["confidence"] == 0.0
    assert body["warnings"][0] == "no text detected"


def test_tilted_and_upside_down_photos(client):
    body = scan(client, "passport", png(samples.passport().rotate(-12, expand=True, fillcolor="gray"))).json()
    assert body["fields"]["mrz_valid"] is True, body
    body = scan(client, "receipt", png(samples.receipt().rotate(180))).json()
    assert (body["fields"]["total"], body["fields"]["vat"]) == (105.0, 5.0), body
    assert "rotated 180 degrees" in body["warnings"][0]
    body = scan(client, "receipt", png(samples.receipt().rotate(-90, expand=True))).json()
    assert (body["fields"]["total"], body["fields"]["vat"]) == (105.0, 5.0), body
    assert "rotated 90 degrees" in body["warnings"][0]

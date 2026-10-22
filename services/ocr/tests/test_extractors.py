"""Pure extractor tests over hand-written OCR line fixtures (no model needed). All data is fake."""

from app.extractors import EXTRACTORS
import math

from app.extractors.common import Line, amounts, find_dates, line, rows
from app.extractors.emirates_id import find_id_number, luhn_ok
from app.extractors.passport import check_digit, parse_td3

# ICAO 9303 part 4 specimen (fictional "Utopia" passport).
MRZ1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<"
MRZ2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10"


# --- common ------------------------------------------------------------------

def test_rows_group_same_line_boxes_left_to_right():
    rs = rows([line("B", x=200, y=102), line("A", x=0, y=100), line("C", x=0, y=150)])
    assert [[l.text for l in r] for r in rs] == [["A", "B"], ["C"]]


def _tilt(ln: Line, deg: float) -> Line:
    a = math.radians(deg)
    return Line(ln.text, ln.confidence, [[x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)] for x, y in ln.box])


def test_rows_survive_a_tilted_photo():
    # label/value pairs 30px apart vertically, tilted 7 degrees: without deskew the pairs mis-group
    flat = [line("Name:", x=0, y=100, w=80), line("Sample Person", x=300, y=100, w=200),
            line("Date of Birth:", x=0, y=130, w=150), line("12/06/1985", x=300, y=130, w=150)]
    rs = rows([_tilt(l, 7) for l in flat])
    assert [[l.text for l in r] for r in rs] == [["Name:", "Sample Person"], ["Date of Birth:", "12/06/1985"]]


def test_find_dates_formats():
    assert find_dates("DOB 05/03/1990") == ["1990-03-05"]
    assert find_dates("2024-12-31") == ["2024-12-31"]
    assert find_dates("12 Jan 2025 and Feb 3, 2026") == ["2025-01-12", "2026-02-03"]
    assert find_dates("14.07.24") == ["2024-07-14"]
    assert find_dates("no date 99/99/2020") == []
    assert find_dates("Date:14/07/202618:42") == ["2026-07-14"]  # OCR dropped the space before the time


def test_amounts_skip_dates_percent_and_trn():
    assert amounts("VAT 5% 5.25") == [5.25]
    assert amounts("1,234.50 on 01/02/2025 12:30") == [1234.5]
    assert amounts("TRN 100123456700003") == []
    assert amounts("12,50") == [12.5]


# --- emirates id -------------------------------------------------------------

def test_luhn():
    assert luhn_ok("79927398713")  # textbook Luhn example
    assert luhn_ok("784199012345676")
    assert not luhn_ok("784199012345670")


def test_find_id_number_normalizes_ocr_noise():
    assert find_id_number("ID Number 784 1990 1234567 6") == "784-1990-1234567-6"
    assert find_id_number("784-199O-l234567-6") == "784-1990-1234567-6"  # O->0, l->1
    assert find_id_number("no id here 12345") is None


EID_LINES = [
    line("United Arab Emirates", x=100, y=10),
    line("الإمارات العربية المتحدة", x=400, y=10),
    line("Resident Identity Card", x=100, y=40),
    line("ID Number", x=20, y=80, w=100), line("784-1990-1234567-6", x=130, y=80),
    line("Name: Test Person Alpha", x=20, y=120),
    line("الاسم: شخص تجريبي", x=400, y=120),
    line("Date of Birth", x=20, y=160, w=130), line("05/03/1990", x=160, y=160),
    line("Nationality", x=20, y=200, w=110), line("Utopian", x=140, y=200),
    line("Issuing Date", x=20, y=240, w=120), line("01/01/2024", x=150, y=240),
    line("Expiry Date", x=300, y=240, w=110), line("31/12/2028", x=420, y=240),
    line("Sex: M", x=20, y=280),
]


def test_emirates_id_front():
    fields, warnings = EXTRACTORS["emirates_id"](EID_LINES)
    assert fields == {
        "id_number": "784-1990-1234567-6",
        "name": "Test Person Alpha",
        "nationality": "Utopian",
        "date_of_birth": "1990-03-05",
        "expiry_date": "2028-12-31",
        "sex": "M",
    }
    assert warnings == []


def test_emirates_id_value_below_label_and_bad_luhn():
    fields, warnings = EXTRACTORS["emirates_id"]([
        line("784-1990-1234567-0", x=20, y=10),
        line("Name", x=20, y=50, w=60), line("SAMPLE HOLDER", x=20, y=80),
        line("Sex", x=20, y=120, w=40), line("Female", x=20, y=150),
    ])
    assert fields["id_number"] == "784-1990-1234567-0"
    assert fields["name"] == "SAMPLE HOLDER"
    assert fields["sex"] == "F"
    assert any("Luhn" in w for w in warnings)
    assert "date_of_birth not found" in warnings


# --- passport ----------------------------------------------------------------

def test_icao_specimen_check_digits():
    assert check_digit("L898902C3") == 6
    assert check_digit("740812") == 2
    assert check_digit("120415") == 9
    assert check_digit("ZE184226B<<<<<") == 1
    assert check_digit("L898902C36" + "7408122" + "120415" + "9" + "ZE184226B<<<<<" + "1") == 0


def test_icao_specimen_parse():
    fields, warnings = parse_td3(MRZ1, MRZ2)
    assert warnings == []
    assert fields["mrz_valid"] is True
    assert fields["passport_number"] == "L898902C3"
    assert fields["surname"] == "ERIKSSON"
    assert fields["given_names"] == "ANNA MARIA"
    assert fields["issuing_country"] == "UTO"
    assert fields["nationality"] == "UTO"
    assert fields["date_of_birth"] == "1974-08-12"
    assert fields["expiry_date"] == "2012-04-15"
    assert fields["sex"] == "F"


def test_passport_extract_with_ocr_confusions():
    # Split boxes, spaces, O for 0 in dates, a dropped filler '<' and trailing '<' read as K.
    fields, warnings = EXTRACTORS["passport"]([
        line("PASSPORT", x=10, y=10),
        line("P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<KKK<<<<", x=10, y=300, w=440),
        line("L898902C36UTO74O8122F12O4159", x=10, y=330, w=280),
        line("ZE184226B<<<<10", x=300, y=330, w=150),
    ])
    assert fields["mrz_valid"] is True, warnings
    assert fields["given_names"] == "ANNA MARIA"
    assert fields["date_of_birth"] == "1974-08-12"


def test_passport_bad_check_digit_is_reported():
    bad = MRZ2[:19] + "3" + MRZ2[20:]
    fields, warnings = parse_td3(MRZ1, bad)
    assert fields["mrz_valid"] is False
    assert "MRZ check digit failed: date_of_birth" in warnings


def test_passport_no_mrz():
    fields, warnings = EXTRACTORS["passport"]([line("just a photo caption")])
    assert fields["mrz_valid"] is False and fields["passport_number"] is None
    assert warnings and "MRZ not found" in warnings[0]


# --- plate -------------------------------------------------------------------

def test_plate_dubai_letter_code():
    fields, warnings = EXTRACTORS["plate"]([
        line("DUBAI", x=10, y=10, h=20), line("دبي", x=10, y=40, h=20),
        line("A", x=100, y=10, h=60), line("12345", x=160, y=10, h=60),
    ])
    assert fields["plate"] == "DXB A 12345"
    assert (fields["emirate"], fields["code"], fields["number"]) == ("DUBAI", "A", "12345")
    assert warnings == []


def test_plate_abu_dhabi_numeric_code_and_joined_text():
    fields, _ = EXTRACTORS["plate"]([line("A.D", x=10, y=10, h=20), line("5 4321", x=60, y=5, h=60)])
    assert fields["plate"] == "AUH 5 4321"
    fields, _ = EXTRACTORS["plate"]([line("SHARJAH 3", x=10, y=10, h=20), line("98765", x=10, y=40, h=60)])
    assert fields["plate"] == "SHJ 3 98765"


def test_plate_unknown_emirate():
    fields, warnings = EXTRACTORS["plate"]([line("K 777", h=50)])
    assert fields["plate"] == "K 777" and fields["emirate"] is None
    assert "emirate not detected" in warnings


# --- receipt -----------------------------------------------------------------

RECEIPT = [
    line("FAKE FITNESS SUPPLIES LLC", x=50, y=10, h=40),
    line("Tax Invoice", x=80, y=60),
    line("TRN: 100123456700003", x=20, y=90),
    line("Date: 14/07/2026 18:42", x=20, y=120),
    line("Protein Bar x2", x=20, y=160), line("20.00", x=300, y=160),
    line("Shaker", x=20, y=190), line("80.00", x=300, y=190),
    line("Subtotal", x=20, y=230), line("100.00", x=300, y=230),
    line("VAT 5%", x=20, y=260), line("5.00", x=300, y=260),
    line("TOTAL", x=20, y=290), line("AED 105.00", x=280, y=290),
    line("Paid by card", x=20, y=320),
]


def test_receipt():
    fields, warnings = EXTRACTORS["receipt"](RECEIPT)
    assert fields == {
        "vendor": "FAKE FITNESS SUPPLIES LLC",
        "date": "2026-07-14",
        "total": 105.0,
        "vat": 5.0,
        "currency": "AED",
        "trn": "100123456700003",
    }
    assert warnings == []


def test_receipt_grand_total_beats_total_and_amount_below_label():
    fields, _ = EXTRACTORS["receipt"]([
        line("Shop", y=0, h=30),
        line("Total", x=0, y=50), line("50.00", x=200, y=50),
        line("Grand Total", x=0, y=80), line("1,050.00", x=0, y=110),
    ])
    assert fields["total"] == 1050.0


def test_receipt_fallback_and_currency_default():
    fields, warnings = EXTRACTORS["receipt"]([line("Cafe Nowhere", h=30), line("Latte 18.00", y=40),
                                             line("Cookie 7.50", y=70), line("T0TAI 2026184", y=100)])
    assert fields["total"] == 18.0 and fields["currency"] == "AED"
    assert any("largest amount" in w for w in warnings)
    assert any("assumed AED" in w for w in warnings)


# --- document ----------------------------------------------------------------

def test_document_reading_order_and_signature():
    fields, _ = EXTRACTORS["document"]([
        line("Member Waiver", x=10, y=10),
        line("I agree to the rules.", x=10, y=50),
        line("Signature:", x=10, y=100), line("______", x=150, y=100),
    ])
    assert fields["text"] == "Member Waiver\nI agree to the rules.\nSignature: ______"
    assert fields["signed_by_detected"] is True
    assert EXTRACTORS["document"]([line("hello")])[0]["signed_by_detected"] is False

from . import document, emirates_id, passport, plate, receipt

EXTRACTORS = {
    "emirates_id": emirates_id.extract,
    "passport": passport.extract,
    "plate": plate.extract,
    "receipt": receipt.extract,
    "document": document.extract,
}

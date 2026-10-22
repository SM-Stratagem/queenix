# Queenix OCR service

A standalone container that OCRs Emirates IDs, passports (MRZ), UAE number plates, receipts and generic paper forms, and returns structured fields. Stack: Python 3.12, FastAPI, and PaddleOCR PP-OCR models running on ONNX Runtime through RapidOCR.

## Engine choice

**`rapidocr==3.9.2` + `onnxruntime==1.30.0`** (PaddleOCR **PP-OCRv6 small** det + rec, PP-OCR mobile angle classifier).

Measured 2026-09-29 on `python:3.12-slim`, both builds run on this Mac (linux/arm64):

| | rapidocr + onnxruntime | paddleocr 3.7.0 + paddlepaddle 3.3.1 |
|---|---|---|
| linux/arm64 wheel | yes, on PyPI (`onnxruntime` manylinux_2_28 aarch64) | **not on PyPI.** PyPI only has x86_64, macOS and Windows wheels. It works only from Paddle's own index (`paddlepaddle.org.cn/packages/stable/cpu`) |
| linux/amd64 wheel | yes, PyPI | yes, PyPI |
| Image size (probe image) | 664 MB | **1.96 GB** |
| Models | ship **inside the rapidocr wheel** (PP-OCRv6 det 9.9 MB, rec 21 MB, cls 0.6 MB) | downloaded on first use from HF/BOS into `~/.paddlex` |
| Model load | 0.37 s | 22 s (including download) |
| Same test line | `GRAND TOTAL AED 123.45` @ 0.999 | `GRAND TOTAL AED 123.45` @ 0.998 |

Both engines give the same accuracy because they run the same PaddleOCR models. RapidOCR installs from PyPI on both architectures, and its image is about 3× smaller. Its models are part of the wheel, so they are baked into the image layer. The Dockerfile loads them at build time, and that load fails the build if a model is missing. At runtime nothing is downloaded: the service was verified to start and scan under `docker run --network none`.

`requirements.txt` is the full pinned dependency set and is installed with `--no-deps`. That flag lets us swap rapidocr's declared `opencv-python` (the GUI build, which needs libGL) for `opencv-python-headless`.

## API

### `GET /health` (no auth)
```json
{"ok": true, "engine": "rapidocr/onnxruntime (PaddleOCR PP-OCRv6 small det+rec)", "version": "rapidocr 3.9.2; onnxruntime 1.30.0"}
```
The service answers only after the model is loaded and warmed up.

### `POST /v1/scan` (multipart)
- Header `X-OCR-Key`: must equal `OCR_API_KEY`. A missing or wrong key returns **401**, and the comparison is constant-time.
- `kind`: `emirates_id | passport | plate | receipt | document`. Any other value returns **400**.
- `file`: jpeg, png, webp or heic/heif, up to 10 MB. Other formats and unreadable files return **400**. Larger files return **413**. Images are capped at 50 megapixels as a decompression-bomb guard, and EXIF orientation is honoured.

```bash
curl -s http://localhost:8000/v1/scan \
  -H "X-OCR-Key: $OCR_API_KEY" \
  -F kind=receipt -F file=@receipt.jpg
```
```json
{
  "kind": "receipt",
  "fields": {"vendor": "FAKE FITNESS SUPPLIES", "date": "2026-07-14", "total": 105.0, "vat": 5.0,
             "currency": "AED", "trn": "100123456700003"},
  "lines": [{"text": "FAKE FITNESS SUPPLIES", "confidence": 0.997, "box": [[37,30],[506,31],[506,70],[37,69]]}, "..."],
  "confidence": 0.9942,
  "warnings": []
}
```
`box` holds 4 points, clockwise from the top-left, in pixels of the uploaded image. If the photo was sideways or upside down, the service retries on a rotated copy. It then adds a warning that says how far it rotated, and the boxes refer to that rotated image. `confidence` is the mean of the per-line confidences. The response header `X-Elapsed-Ms` gives the OCR plus extraction time.

Fields per kind:

| kind | fields |
|---|---|
| `emirates_id` | `id_number` (normalized to `784-YYYY-NNNNNNN-C`; a failed Luhn check adds a warning), `name`, `nationality`, `date_of_birth`, `expiry_date` (ISO dates), `sex` (`M`/`F`) |
| `passport` | `passport_number`, `surname`, `given_names`, `nationality`, `issuing_country`, `date_of_birth`, `sex`, `expiry_date`, `mrz_valid` (true only when all 5 ICAO 9303 TD3 check digits pass), `mrz` (the 2 raw OCR'd lines) |
| `plate` | `plate` (for example `DXB A 12345`), `emirate` (`DUBAI`, `ABU DHABI`, `SHARJAH`, `AJMAN`, `UMM AL QUWAIN`, `RAS AL KHAIMAH`, `FUJAIRAH`, or null), `code`, `number`, `candidates` (raw row texts) |
| `receipt` | `vendor`, `date`, `total`, `vat`, `currency` (AED when AED/د.إ/DHS is seen or nothing is printed, otherwise the ISO code that appears), `trn` (15 digits) |
| `document` | `text` (reading-order text: rows joined by newlines), `signed_by_detected` (a "Signature"/"Signed"/"Sign here" label was found) |

Fields that cannot be found are `null` and come with a warning. The extractors (`app/extractors/*.py`) are pure functions from OCR lines to `(fields, warnings)`, so they can be unit tested without the model.

## Env vars

| var | default | notes |
|---|---|---|
| `OCR_API_KEY` | **required** | If it is not set, the process exits at startup (uvicorn exit code 3). There is no default. |
| `PORT` | `8000` | Railway injects this. |
| `OCR_THREADS` | all visible cores | ONNX Runtime intra-op threads. Set it to the container's vCPU count on Railway/ECS, because ORT may otherwise see the host's cores. |
| `WEB_CONCURRENCY` | `1` | Number of uvicorn worker processes (uvicorn reads this variable itself). Each worker loads its own model copy (about 250 MB idle, about 670 MB peak). |

Each process runs one inference at a time (a global lock), because ORT already uses every core it is given. To scale, add workers or replicas.

## Build / run / test

```bash
cd services/ocr
docker build -t queenix-ocr .                                   # native arch
docker buildx build --platform linux/amd64 -t queenix-ocr:amd64 --load .
docker run --rm -p 8000:8000 -e OCR_API_KEY=dev-key queenix-ocr

docker build --target test -t queenix-ocr:test . && docker run --rm queenix-ocr:test   # pytest in-container
docker run --rm -v "$PWD/samples:/out" queenix-ocr:test python -m tests.samples /out     # synthetic PNGs for curl
```
The `test` stage adds pytest, httpx, the DejaVu fonts and `tests/`. The default (last) stage is the lean runtime image, which runs as non-root user 10001 and has a `HEALTHCHECK` on `/health`.

The tests come in two sets:
- `tests/test_extractors.py`: pure unit tests covering the ICAO specimen MRZ check digits, Emirates ID Luhn, OCR-confusion fixes, plate normalization, receipt totals, tilted-photo row grouping and date parsing.
- `tests/test_api.py`: end to end through the real model. It renders synthetic, fictional images with Pillow (an Emirates-ID-like card, a TD3 MRZ in DejaVu Sans Mono, a Dubai plate, a receipt and a waiver form), then checks the exact fields plus auth, 400/413 handling, webp/jpeg/heic input and rotated photos.

## Measured (2026-09-29, Apple Silicon, Docker Desktop linux/arm64)

- **Image:** 688 MB on disk, 183 MB compressed (arm64); 773 MB / 207 MB (amd64).
- **Cold start** (`docker run` to `/health` 200): about 2 s with all cores, 3.2 s at `--cpus=2`, 4.7 s at `--cpus=1`. Model load plus warm-up is about 1.3 s of that.
- **RAM:** about 245 MB idle RSS, about 670 MB peak during a scan. Give each worker **1 GB**.
- **Per-scan latency** (server side, synthetic samples 560–1012 px wide, median of 5–7 runs):

| kind | 10 vCPU | 2 vCPU | 1 vCPU |
|---|---|---|---|
| emirates_id | ~590 ms | ~770 ms | ~1.1 s |
| passport | ~450 ms | ~870 ms | ~1.0 s |
| plate | ~470 ms | ~800 ms | ~1.1 s |
| receipt | ~520 ms | ~620 ms | ~980 ms |
| document | ~390 ms | ~570 ms | ~770 ms |

Sideways or upside-down photos cost one or two extra OCR passes, so they take about 2–3× as long.

## Accuracy limits (be realistic)

- **Arabic is not recognized.** The bundled rec model covers Latin, Chinese and Japanese, so Arabic prints as low-confidence garbage lines (confidence around 0.6, for example `IJIe!I心IJEYso`). The extractors ignore these lines. However, `document.text` and `lines` include them, so filter on `confidence < 0.7` if they matter. `المجموع` and similar Arabic total labels only help when the OCR reads them, which this model does not.
- **Synthetic tests only.** All tests use clean rendered images. Real phone photos with glare, holograms, guilloche backgrounds, laminate reflections and perspective will be worse. **Always show the extracted fields to staff for confirmation.** Never auto-commit them.
- **Blur:** fields survive Gaussian blur r=1.5. At r=3, thin grey label text (`Name:`, `Nationality:`) disappears, so those fields come back null with warnings. On receipts the `TOTAL` label gets misread, and the total then falls back to the largest x.xx amount, with a warning.
- **Rotation:** tilts of ±12° are deskewed from the text-box angles. 90°, 180° and 270° are detected and retried. Strong perspective (a card shot at an angle) is not corrected.
- **Emirates ID:** only the front English-label layout is supported. The back of the card (the TD1 MRZ) is not parsed.
- **Passport:** needs the TD3 MRZ to be legible. There is no fallback to the visual zone. `mrz_valid=false` together with the check-digit warnings tells you which field is unreliable.
- **Plates:** matching is heuristic (the tallest 1–5 digit group is the number, and the tallest 1–2 letter group is the code). It has been tested only on a synthetic Dubai layout. Two-row plates, the old Abu Dhabi red-box codes, and motorcycle or taxi plates are untested.
- **Receipts:** dates are read day-first (UAE convention). The vendor is simply the tallest line near the top, so it is sometimes wrong for logo-only headers.
- **Uploads:** the 10 MB limit is enforced exactly per file. The early `Content-Length` rejection does not cover chunked uploads, which are still parsed before the per-file check runs, so put a proxy body limit in front of the service as well.

## Using it from the Queenix apps (local dev)

The apps never call this service directly. The web route `apps/web/src/app/api/ocr/route.ts` does it: it checks the BetterAuth session and the role for each kind, enforces the 10 MB limit and image types, and forwards the request with `X-OCR-Key`. Web and mobile clients call `POST /api/ocr` (mobile uses `authClient.$fetch` with an absolute URL). Every flow shows the fields in an editable review form, and nothing is saved until a person confirms it.

Run the service on host port 8800 (skip this if the compose `ocr` service is already up):

```bash
cd services/ocr && docker build -t queenix-ocr .
docker run -d --name queenix-ocr -p 8800:8000 -e OCR_API_KEY=dev-ocr-key queenix-ocr
curl -s localhost:8800/health
```

Web env: `OCR_URL` (dev default `http://localhost:8800`) and `OCR_API_KEY` (dev default `dev-ocr-key`). Both are required in production (`@queenix/auth/env`). How to reach the service:
- from a host `next dev`: the defaults work as they are
- from the Dockerized web container, when OCR runs via `docker run`: `OCR_URL=http://host.docker.internal:8800`
- from the Dockerized web container, when OCR runs as a compose service: `OCR_URL=http://ocr:8000`

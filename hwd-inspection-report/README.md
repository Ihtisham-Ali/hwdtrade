# HWD Trade — Site Inspection Report

A data-driven generator for HWD Trade site-inspection reports. Feed it a JSON
data file and it produces a clean, print-ready PDF in a black / white / grey
theme with the HWD logo, a dashboard summary, itemised checks, and a
photographic-evidence section.

![Report](assets/cover_bg_flat.png)

## How it works

```
data.json ──> generate.py ──> report.html ──> render_pdf.py ──> report.pdf
                  ▲                                 ▲
             styles.css                        Playwright
             assets/logo.png                   (Chromium)
             photos/*.png
```

* **`generate.py`** reads the JSON, inlines `styles.css` and the logo, and writes
  a self-contained `report.html`.
* **`render_pdf.py`** renders that HTML to an A4 PDF with Chromium via Playwright.
* **`styles.css`** holds the entire visual theme (layout, badges, cover, photo
  pages). Edit here to restyle.
* **`prepare_cover.py`** builds the flat grayscale cover background from a source
  photo (see *Cover image* below).

## Quick start

```bash
# 1. install dependencies
pip install -r requirements.txt
playwright install chromium

# 2. generate the HTML from the example data
python generate.py                      # -> report.html

# 3. render the PDF
python render_pdf.py                    # -> report.pdf
```

To use your own data, copy `data.example.json` to `data.json`, edit it, then:

```bash
python generate.py data.json report.html
python render_pdf.py report.html report.pdf
```

## The data file

See `data.example.json` for a complete, working example. Structure:

* **`meta`** — report identity: id, title/subtitle, property address, builder,
  check date, inspector, status, footer text.
* **`summary`** — the dashboard: `intro` paragraph, `stats` tiles, `outcome`
  banner, and the `outstanding` items list.
* **`detail_pages`** — a list of pages; each page is a list of **sections**.
  This is where page breaks are controlled: put the sections you want together
  on the same physical page inside the same inner list.
* **`photos`** — section title/subtitle and the list of photo file paths
  (rendered two per page).

### Check-item status types

Each check item has a `type` that controls its badge style:

| `type` | Meaning              | Style                         |
|--------|----------------------|-------------------------------|
| `done` | Completed / Correct  | outlined, ✓                   |
| `info` | Informational value  | light grey                    |
| `na`   | Not required / N/A    | faint grey, —                 |
| `attn` | Needs attention      | **red**, white text, !        |
| `crit` | Blocker (Cannot Install) | **solid red**, white text, ✕ |

A section item can also be a note instead of a check:
`{ "note": "Garage Head Notes", "text": "..." }`.

## Cover image

The cover uses `assets/cover_bg_flat.png` — a single flattened grayscale image
with the grey wash **baked in**. Do **not** replace this with a CSS overlay over
a colour photo: some PDF viewers misrender a semi-transparent overlay as a
pink/magenta tint. To change the cover photo, drop a new `assets/hero.png` and
regenerate:

```bash
python prepare_cover.py                 # rebuilds assets/cover_bg_flat.png
```

Tune `DARK`, `ALPHA_TOP`, and `ALPHA_BOTTOM` at the top of `prepare_cover.py` to
make the cover lighter or darker.

## Branding

Replace `assets/logo.png` with your own logo (transparent or white-on-dark works
best on the dark cover chip). Colours live in the `:root` block of `styles.css`
— e.g. `--red` is the accent used for attention/blocker badges.

## Notes

* The evidence photos are kept in **colour**; only the report chrome is
  black / white / grey.
* Page size is A4 portrait (794 × 1123 px @ 96dpi). Each `.page` is a fixed-height
  block; keep section content within one page or split it across `detail_pages`.

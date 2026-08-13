#!/usr/bin/env python3
"""
Render report.html to a print-ready PDF (A4 portrait, no margins).

Usage:
    python render_pdf.py [input.html] [output.pdf]

Defaults:
    input.html -> report.html
    output.pdf -> report.pdf

Requires Playwright + Chromium:
    pip install playwright
    playwright install chromium
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent


def main():
    in_path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "report.html"
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "report.pdf"
    url = in_path.resolve().as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url, wait_until="networkidle")
        page.pdf(
            path=str(out_path),
            width="794px",
            height="1123px",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
        )
        browser.close()
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Generate an HWD Trade site-inspection report (report.html) from a JSON data file.

Usage:
    python generate.py [data.json] [output.html]

Defaults:
    data.json   -> data.example.json
    output.html -> report.html

The output HTML is self-contained except for the site photos, which are
referenced from the paths listed in the data file (e.g. photos/photo1.png).
Render it to PDF with render_pdf.py.
"""
import base64
import html
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
ICON = {"done": "✓", "info": "", "attn": "!", "crit": "✕", "na": "—"}


def esc(s):
    return html.escape(str(s))


def data_uri(path: Path) -> str:
    ext = path.suffix.lstrip(".").lower()
    mime = "image/png" if ext == "png" else f"image/{ext}"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def badge(item):
    t = item.get("type", "info")
    ic = ICON.get(t, "")
    ic_html = f'<span class="ic">{ic}</span>' if ic else ""
    return f'<span class="badge b-{t}">{ic_html}{esc(item["status"])}</span>'


def render_items(items):
    rows = []
    for it in items:
        if "note" in it:
            rows.append(
                f'<div class="noterow"><div class="notelabel">{esc(it["note"])}</div>'
                f'<div class="notebox">{esc(it["text"])}</div></div>'
            )
        else:
            rows.append(
                f'<div class="row"><div class="q">{esc(it["q"])}</div>'
                f'<div class="a">{badge(it)}</div></div>'
            )
    return "\n".join(rows)


def section(sec):
    if "list" in sec:  # simple bullet-list section (e.g. general notes)
        body = "<ul class='genlist'>" + "".join(f"<li>{esc(x)}</li>" for x in sec["list"]) + "</ul>"
    else:
        body = render_items(sec["items"])
    return (
        f'<div class="section"><div class="sec-head">{esc(sec["title"])}</div>'
        f'<div class="sec-body">{body}</div></div>'
    )


def page_header(logo, label, ref):
    return (
        f'<div class="pg-head"><div class="ph-left"><img class="ph-logo" src="{logo}">'
        f'<span class="ph-title">INSPECTION {esc(label)}</span></div>'
        f'<div class="ph-ref">REF: {esc(ref)}</div></div>'
    )


def page_footer(meta):
    return (
        f'<div class="pg-foot"><div>{esc(meta["footer_left"])}</div>'
        f'<div>Report ID: {esc(meta["id"])}</div></div>'
    )


def build(data, logo):
    m = data["meta"]
    ref = m["id"]
    pages = []

    # ---- Cover ----
    cc = "".join(
        f'<div class="cc"><div class="cc-l">{esc(l)}</div><div class="cc-v">{esc(v)}</div></div>'
        for l, v in [
            ("PROPERTY ADDRESS", m["property_address"]),
            ("BUILDER", m["builder"]),
            ("CHECK DATE", m["check_date"]),
            ("SITE CHECK REFERENCE", m["site_check_reference"]),
            ("REPORT ID", m["id"]),
            ("SITE SUPERVISOR", m.get("supervisor") or m.get("inspector") or "Site Supervisor"),
        ]
    )
    pages.append(f'''<section class="page cover">
  <div class="cover-bg"></div><div class="cover-overlay"></div>
  <div class="cover-inner">
    <div class="cover-top"><div class="brand">HWD TRADE</div><img class="cover-logo" src="{logo}"></div>
    <div class="cover-mid">
      <span class="pill">{esc(m["cover_badge"])}</span>
      <h1 class="cover-name">{esc(m["title"])}</h1>
      <div class="cover-sub">{esc(m["subtitle"])}</div>
    </div>
    <div class="cover-card">{cc}</div>
    <div class="cover-foot"><div>{esc(m["confidential_note"])}</div>
      <div class="status-red">STATUS: {esc(m["status"])}</div></div>
  </div>
</section>''')

    # ---- Summary / dashboard ----
    s = data["summary"]
    tiles = "".join(
        f'<div class="tile {t.get("type","")}"><div class="tile-n">{esc(t["n"])}</div>'
        f'<div class="tile-l">{esc(t["label"])}</div></div>'
        for t in s["stats"]
    )
    oi = ""
    for it in s["outstanding"]:
        f = it["flag"]
        crit = " crit" if f.get("type") == "crit" else ""
        ic = ICON.get(f.get("type", "attn"), "!")
        oi += f'''<div class="oi">
      <div class="oi-head"><span class="oi-num">{esc(it["num"])}</span>
        <span class="oi-cat">{esc(it["category"])}</span></div>
      <div class="oi-title">{esc(it["title"])}</div>
      <div class="oi-flag{crit}"><span class="ic">{ic}</span>{esc(f["text"])}</div>
      <div class="oi-action">{esc(it["action"])}</div>
    </div>'''
    oc = s["outcome"]
    pages.append(f'''<section class="page">
  {page_header(logo, "SUMMARY", ref)}
  <div class="pg-body">
    <div class="h2"><span class="h2-bar"></span>INSPECTION SUMMARY &amp; DASHBOARD</div>
    <p class="intro">{esc(s["intro"])}</p>
    <div class="tiles">{tiles}</div>
    <div class="outcome"><div class="oc-left"><div class="oc-l">{esc(oc["label"])}</div>
      <div class="oc-v">{esc(oc["value"])}</div></div>
      <div class="oc-right">{esc(oc["detail"])}</div></div>
    <div class="h2"><span class="h2-bar"></span>OUTSTANDING ITEMS SUMMARY ({len(s["outstanding"])})</div>
    {oi}
  </div>
  {page_footer(m)}
</section>''')

    # ---- Detail pages ----
    for group in data["detail_pages"]:
        secs = "".join(section(sec) for sec in group)
        pages.append(f'''<section class="page">
  {page_header(logo, "DETAILS", ref)}
  <div class="pg-body">{secs}</div>
  {page_footer(m)}
</section>''')

    # ---- Photo divider + photo pages ----
    ph = data["photos"]
    files = ph["files"]
    pages.append(f'''<section class="page">
  {page_header(logo, "PHOTOGRAPHIC EVIDENCE", ref)}
  <div class="pg-body"><div class="photo-cover"><div class="pc-inner">
    <h2 class="pc-title">{esc(ph["title"])}</h2>
    <div class="pc-sub">{esc(ph["subtitle"])}</div>
    <div class="pc-count">Total Photos Attached: {len(files)}</div>
  </div></div></div>
  {page_footer(m)}
</section>''')

    total_photo_pages = (len(files) + 1) // 2
    for p in range(total_photo_pages):
        chunk = files[p * 2:p * 2 + 2]
        cards = ""
        for idx, fpath in enumerate(chunk):
            n = p * 2 + idx + 1
            cards += (
                f'<div class="photo-card"><img src="{esc(fpath)}">'
                f'<div class="photo-label">PHOTO {n}</div></div>'
            )
        pages.append(f'''<section class="page">
  <div class="pg-head"><div class="ph-left"><img class="ph-logo" src="{logo}">
    <span class="ph-title">PHOTOGRAPHIC EVIDENCE</span></div>
    <div class="ph-ref">PAGE {p+1} OF {total_photo_pages}</div></div>
  <div class="pg-body">{cards}</div>
  {page_footer(m)}
</section>''')

    css = (HERE / "styles.css").read_text()
    return (
        '<!DOCTYPE html><html><head><meta charset="utf-8">'
        f"<style>{css}</style></head><body>\n" + "\n".join(pages) + "\n</body></html>"
    )


def main():
    data_path = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "data.example.json"
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else HERE / "report.html"
    data = json.loads(Path(data_path).read_text())
    logo = data_uri(HERE / "assets" / "logo.png")
    html_doc = build(data, logo)
    out_path.write_text(html_doc)
    print(f"Wrote {out_path} ({len(html_doc):,} bytes) from {data_path}")


if __name__ == "__main__":
    main()

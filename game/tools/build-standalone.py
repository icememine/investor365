#!/usr/bin/env python3
"""Embed CSS, the two ES modules and the PNGs into one offline simulator.html.

The modular files under src/ and assets/ are the source of truth; simulator.html
is generated output. This is tied to the current file layout on purpose and is
not a general bundler: new modules, fonts or sounds must be added here explicitly.
"""
import base64
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, ASSETS = ROOT / "src", ROOT / "assets"


def data_uri(name):
    return "data:image/png;base64," + base64.b64encode((ASSETS / name).read_bytes()).decode()


def main():
    html = (SRC / "index.html").read_text(encoding="utf-8")
    css = (SRC / "style.css").read_text(encoding="utf-8")
    sim = (SRC / "sim.mjs").read_text(encoding="utf-8")
    app = (SRC / "app.js").read_text(encoding="utf-8")

    # Drop module boundaries: sim's exports become plain declarations, app's import disappears.
    sim = re.sub(r"^export\s+", "", sim, flags=re.M)
    app, n = re.subn(r"^import\s*\{[^}]*\}\s*from\s*'\./sim\.mjs';\s*$", "", app, flags=re.M)
    assert n == 1, "expected exactly one import of ./sim.mjs in app.js"
    for name in ("world.png", "actors.png"):
        ref = f"'../assets/{name}'"
        assert ref in app, f"missing {ref} in app.js"
        app = app.replace(ref, f"'{data_uri(name)}'")

    link = '<link rel="stylesheet" href="style.css">'
    script = '<script type="module" src="app.js"></script>'
    assert link in html and script in html, "index.html layout changed; update the exporter"
    html = html.replace(link, f"<style>\n{css}</style>")
    html = html.replace(script, f'<script type="module">\n{sim}\n{app}</script>')

    out = ROOT / "simulator.html"
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

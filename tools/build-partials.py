#!/usr/bin/env python3
"""Inserta partials/header.html y partials/footer.html en todas las páginas.

Uso: python3 tools/build-partials.py
Reemplaza lo que haya entre <!-- partial:NOMBRE --> y <!-- /partial:NOMBRE -->.
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
partials = {p.stem: p.read_text(encoding='utf-8') for p in (ROOT / 'partials').glob('*.html')}

for page in sorted(ROOT.glob('*.html')):
    text = page.read_text(encoding='utf-8')
    new = text
    for name, body in partials.items():
        pattern = re.compile(rf'(<!-- partial:{name} -->\n).*?([ \t]*)<!-- /partial:{name} -->', re.S)
        new = pattern.sub(lambda m: f'{m.group(1)}{body.rstrip()}\n{m.group(2) or "  "}<!-- /partial:{name} -->', new)
    if new != text:
        page.write_text(new, encoding='utf-8')
        print(f'actualizado: {page.name}')

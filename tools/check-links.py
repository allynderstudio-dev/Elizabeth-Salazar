#!/usr/bin/env python3
"""Revisa que todos los enlaces y recursos locales de las páginas existan.

Uso: python3 tools/check-links.py
"""
import pathlib
import re
import sys
from urllib.parse import urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
ATTR = re.compile(r'''(?:href|src|srcset|content)=["']([^"']+)["']''')
missing = []
for page in sorted(ROOT.glob('*.html')):
    text = page.read_text(encoding='utf-8')
    for ref in ATTR.findall(text):
        for part in ref.split(','):
            url = part.strip().split(' ')[0]
            if not url or url.startswith(('#', 'http', 'mailto:', 'tel:', 'data:', 'javascript:')) or '${' in url:
                continue
            if not re.search(r'\.(html|css|js|svg|jpe?g|png|webp|woff2)', url):
                continue
            path = ROOT / urlparse(url).path
            if not path.exists():
                missing.append(f'{page.name}: {url}')
for css in (ROOT / 'css').glob('*.css'):
    for url in re.findall(r'url\(([^)]+)\)', css.read_text(encoding='utf-8')):
        url = url.strip('\'"')
        if url.startswith('data:'):
            continue
        if not (css.parent / url).resolve().exists():
            missing.append(f'css/{css.name}: {url}')
print('\n'.join(missing) if missing else 'OK: todos los enlaces y recursos locales existen')
sys.exit(1 if missing else 0)

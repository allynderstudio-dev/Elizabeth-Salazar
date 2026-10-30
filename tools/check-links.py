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
# Archivos que no se publican (.vercelignore): ninguna página publicada puede enlazarlos
IGNORED = {l.strip().rstrip('/') for l in (ROOT / '.vercelignore').read_text(encoding='utf-8').splitlines() if l.strip() and not l.startswith('#')}
missing = []
for page in sorted(ROOT.glob('*.html')):
    if page.name in IGNORED:
        continue
    text = page.read_text(encoding='utf-8')
    for ref in ATTR.findall(text):
        for part in ref.split(','):
            url = part.strip().split(' ')[0]
            if not url or url.startswith(('#', 'http', 'mailto:', 'tel:', 'data:', 'javascript:', '//')) or '${' in url:
                continue
            route = urlparse(url).path
            # Las páginas se enlazan con URL limpia (/servicios, /): vercel.json tiene cleanUrls
            if route.endswith('.html'):
                missing.append(f'{page.name}: {url} (usa la URL limpia, sin .html)')
                continue
            if route.startswith('/') and not re.search(r'\.\w+$', route):
                route = (route.strip('/') or 'index') + '.html'
            elif not re.search(r'\.(css|js|svg|jpe?g|png|webp|woff2|ico|webmanifest)', url):
                continue
            path = ROOT / route.lstrip('/')
            if not path.exists():
                missing.append(f'{page.name}: {url}')
            elif path.relative_to(ROOT).as_posix() in IGNORED:
                missing.append(f'{page.name}: {url} (no se publica, ver .vercelignore)')
for css in (ROOT / 'css').glob('*.css'):
    for url in re.findall(r'url\(([^)]+)\)', css.read_text(encoding='utf-8')):
        url = url.strip('\'"')
        if url.startswith('data:'):
            continue
        if not (css.parent / url).resolve().exists():
            missing.append(f'css/{css.name}: {url}')
print('\n'.join(missing) if missing else 'OK: todos los enlaces y recursos locales existen')
sys.exit(1 if missing else 0)

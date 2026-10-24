#!/usr/bin/env python3
"""Background-only synthetic language and data compatibility checks; no simulator or downloads."""
import html
import http.server
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import threading

ROOT = Path(__file__).resolve().parent.parent
CHROME = Path(os.environ.get('CHROME_BIN', Path.home() / 'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
NODE = Path.home() / '.nvm/versions/node/v22.15.0/bin/node'
subprocess.run(['python3', str(ROOT / 'native/prepare.py')], check=True)
subprocess.run([str(NODE), '--check', str(ROOT / 'js/i18n.js')], check=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Quiet)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with tempfile.TemporaryDirectory(prefix='ziwei-language-check-') as profile:
        result = subprocess.run([str(CHROME), '--headless', '--no-sandbox', '--disable-gpu', '--user-data-dir=' + profile,
            '--virtual-time-budget=24000', '--dump-dom', f'http://127.0.0.1:{server.server_port}/test/language-checks.html'],
            capture_output=True, text=True, timeout=45, check=True)
finally:
    server.shutdown()
    server.server_close()
match = re.search(r'<pre id="result" data-status="(.*?)">(.*?)</pre>', result.stdout, re.S)
if not match:
    raise SystemExit('Missing UX result: ' + result.stderr[-1000:])
report = json.loads(html.unescape(match[2]))
(ROOT / 'build/language-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
if match[1] != 'passed':
    raise SystemExit('Language check failed: ' + report.get('error', 'unknown'))
print(f'Language/data/layout checks: {report["passed"]} passed; browser only, mocked native chooser')

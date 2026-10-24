#!/usr/bin/env python3
"""Offline release data/network checks in an isolated existing browser."""
import html
import http.server
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import threading
ROOT=Path(__file__).resolve().parent.parent
CHROME=Path(os.environ.get('CHROME_BIN',Path.home()/'Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
NODE=Path.home()/'.nvm/versions/node/v22.15.0/bin/node'
subprocess.run(['python3',str(ROOT/'native/prepare.py')],check=True)
for path in ['js/app.js','js/store.js','native/native-runtime.js','native/offline-services.js']:
 subprocess.run([str(NODE),'--check',str(ROOT/path)],check=True)
class Quiet(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Quiet)
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with tempfile.TemporaryDirectory(prefix='ziwei-offline-release-') as profile:
  r=subprocess.run([str(CHROME),'--headless','--no-sandbox','--disable-gpu','--user-data-dir='+profile,'--virtual-time-budget=24000','--dump-dom',f'http://127.0.0.1:{server.server_port}/test/offline-release-checks.html'],capture_output=True,text=True,timeout=45,check=True)
finally:server.shutdown();server.server_close()
match=re.search(r'<pre id="result" data-status="(.*?)">(.*?)</pre>',r.stdout,re.S)
if not match:raise SystemExit('Missing offline release result: '+r.stderr[-1000:])
report=json.loads(html.unescape(match[2]))
(ROOT/'build/offline-release-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
if match[1]!='passed':raise SystemExit('Offline release failed: '+report.get('error','unknown'))
print(f'Offline release data/network audit: {report["passed"]} checks passed; no Files or external services invoked')

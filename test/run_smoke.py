#!/usr/bin/env python3
"""Run the synthetic browser smoke check without installing dependencies."""

import html
import http.server
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import threading


ROOT = Path(__file__).resolve().parent.parent
NODE = shutil.which("node") or str(Path.home() / ".nvm/versions/node/v22.15.0/bin/node")
CHROME = os.environ.get("CHROME_BIN") or str(
    Path.home()
    / "Library/Caches/ms-playwright/chromium_headless_shell-1228/"
    "chrome-headless-shell-mac-arm64/chrome-headless-shell"
)


def main():
    subprocess.run([os.environ.get('PYTHON', 'python3'), str(ROOT / 'native/prepare.py')], check=True)
    for executable in (NODE, CHROME):
        if not Path(executable).is_file():
            raise SystemExit(f"Missing local executable: {executable}")

    sources = sorted((ROOT / "js").glob("*.js")) + [
        ROOT / "ai-relay/worker.js",
        ROOT / "oauth-relay/worker.js",
        ROOT / "test/calendar-fixtures.js",
        ROOT / "native/native-runtime.js",
    ]
    for source in sources:
        subprocess.run([NODE, "--check", str(source)], check=True)
    print(f"JavaScript syntax: {len(sources)} files passed")
    subprocess.run([NODE, str(ROOT / "test/calendar-fixtures.js")], check=True)

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def log_message(self, *_args):
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with tempfile.TemporaryDirectory(prefix="ziwei-smoke-") as profile:
            url = f"http://127.0.0.1:{server.server_port}/test/offline-smoke.html"
            result = subprocess.run(
                [
                    CHROME,
                    "--no-sandbox",
                    "--disable-gpu",
                    "--headless",
                    f"--user-data-dir={profile}",
                    "--virtual-time-budget=16000",
                    "--dump-dom",
                    url,
                ],
                capture_output=True,
                text=True,
                timeout=30,
                check=True,
            )
    finally:
        server.shutdown()
        server.server_close()

    (ROOT / "build/offline-smoke-dom.html").write_text(result.stdout)
    match = re.search(r'<pre id="result" data-status="(.*?)">(.*?)</pre>', result.stdout, re.S)
    if not match:
        raise SystemExit("Browser did not return a smoke result:\n" + result.stderr[-2000:])
    report = json.loads(html.unescape(match.group(2)))
    if match.group(1) != "passed":
        raise SystemExit("Browser smoke failed:\n" + json.dumps(report, ensure_ascii=False, indent=2))
    (ROOT / "build/offline-smoke-checks.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
    print(f"Offline browser smoke: {report['passed']} checks passed")


if __name__ == "__main__":
    main()

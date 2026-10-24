#!/usr/bin/env python3
"""Package the current web app into the existing iOS shell; no installs or network."""
import hashlib
import html
import json
import re
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'native/ios/App/App/public'

def main():
    if PUBLIC.exists():
        shutil.rmtree(PUBLIC)
    PUBLIC.mkdir(parents=True)
    for folder in ['css', 'js', 'vendor']:
        # Packaging copies bytes, not Finder/ResourceFork metadata that blocks iOS signing.
        shutil.copytree(ROOT / folder, PUBLIC / folder, copy_function=shutil.copyfile)
    source = (ROOT / 'index.html').read_text()
    source = source.replace('<head>', '<head>\n<script src="native-runtime.js"></script>')
    source = source.replace('width=device-width, initial-scale=1.0', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
    # Keep future web services in source, but never ship their endpoints or
    # credential/OAuth handling in the approved offline iPhone release.
    for service in ['sync', 'ai', 'chat']:
        (PUBLIC / 'js' / (service + '.js')).unlink()
        replacement = "  .then(() => loadScript(['native-offline-services.js']))" if service == 'sync' else ''
        source = source.replace("  .then(() => loadScript(['js/" + service + ".js']))", replacement)
    source = re.sub(r", 'https://(?:cdn\.jsdelivr\.net|unpkg\.com)/[^']+'", '', source)
    source = source.replace('請確認網路連線，或依 vendor/README.md 說明下載離線函式庫後重新整理。', '請關閉 App 後重新開啟；若問題持續，請保留既有備份並聯絡支援。')
    source = source.replace('https://github.com/6tail/lunar-javascript', 'privacy.html#licenses')
    source = source.replace('https://github.com/SylarLong/iztro', 'privacy.html#licenses')
    source = source.replace('https://github.com/settings/tokens/new?scopes=gist&description=ziwei-bazi-trend', '#sync-card')
    source = source.replace('href="privacy.html#licenses" target="_blank" rel="noopener"', 'href="privacy.html#licenses"')
    (PUBLIC / 'index.html').write_text(source)
    shutil.copyfile(ROOT / 'native/native-runtime.js', PUBLIC / 'native-runtime.js')
    shutil.copyfile(ROOT / 'native/offline-services.js', PUBLIC / 'native-offline-services.js')
    privacy = (ROOT / 'native/privacy.html').read_text()
    licenses = ''.join('<h3>' + name + '</h3><pre style="white-space:pre-wrap;overflow-wrap:anywhere">' + html.escape((ROOT / 'vendor/licenses' / filename).read_text()) + '</pre>' for name, filename in [('lunar-javascript', 'lunar-javascript-MIT.txt'), ('iztro', 'iztro-MIT.txt')])
    (PUBLIC / 'privacy.html').write_text(privacy.replace('<!-- BUNDLED_LICENSES -->', licenses))
    shutil.copyfile(ROOT / 'native/capacitor.config.json', PUBLIC.parent / 'capacitor.config.json')
    (PUBLIC.parent / 'config.xml').write_text('<?xml version="1.0" encoding="utf-8"?>\n<widget version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0"><access origin="capacitor://localhost" /></widget>\n')
    files = {str(p.relative_to(PUBLIC)): hashlib.sha256(p.read_bytes()).hexdigest()
             for p in sorted(PUBLIC.rglob('*')) if p.is_file()}
    report = {'webSourceCommit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'bundleID': 'com.lwbroo.ziweibazi', 'capacitorRuntime': '8.4.1', 'releaseScope': 'offline-first approved',
              'network': 'disabled; AI/OAuth/sync implementations and CDN fallback excluded', 'files': files}
    (ROOT / 'build').mkdir(exist_ok=True)
    (ROOT / 'build/native-assets.json').write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(f'Packaged {len(files)} current assets for com.lwbroo.ziweibazi')

if __name__ == '__main__':
    main()

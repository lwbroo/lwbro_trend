#!/usr/bin/env python3
"""Inspect an archive's identity and exact packaged assets without credentials."""
import hashlib
import json
from pathlib import Path
import plistlib
import subprocess

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'build/ZiweiUnsigned.xcarchive/Products/Applications/App.app'
info = plistlib.loads((APP / 'Info.plist').read_bytes())
assert info['CFBundleIdentifier'] == 'com.lwbroo.ziweibazi'
assert info['UIDeviceFamily'] == [1]
assert info['UIApplicationSceneManifest']['UIApplicationSupportsMultipleScenes'] is False
assert not (APP / 'embedded.mobileprovision').exists()
report = json.loads((ROOT / 'build/native-assets.json').read_text())
for relative, expected in report['files'].items():
    assert hashlib.sha256((APP / 'public' / relative).read_bytes()).hexdigest() == expected, relative
assert report['releaseScope'] == 'offline-first approved'
assert not any((APP / 'public/js' / (service + '.js')).exists() for service in ['ai', 'chat', 'sync'])
assert (APP / 'public/native-offline-services.js').is_file()
packaged_index = (APP / 'public/index.html').read_text()
assert 'cdn.jsdelivr.net' not in packaged_index and 'unpkg.com' not in packaged_index
assert 'https://github.com/settings/tokens' not in packaged_index
assert "connect-src 'none'" in (APP / 'public/native-runtime.js').read_text()
assert (APP / 'PrivacyInfo.xcprivacy').exists()
icon = ROOT / 'native/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
icon_info = subprocess.check_output(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', str(icon)], text=True)
assert 'pixelWidth: 1024' in icon_info and 'pixelHeight: 1024' in icon_info and 'hasAlpha: no' in icon_info
provenance = json.loads((ROOT / 'native/icon-provenance.json').read_text())
assert hashlib.sha256(icon.read_bytes()).hexdigest() == provenance['assetSHA256']
assert info['CFBundleIcons']['CFBundlePrimaryIcon']['CFBundleIconName'] == 'AppIcon'
assert (APP / 'Assets.car').exists()
executable = (APP / info['CFBundleExecutable']).read_bytes()
assert b'Synthetic-valid.json' not in executable
assert b'Shared-synthetic.json' not in executable
assert b'native-check-events.txt' not in executable
assert b'ZIWEI_UI_TEST' not in executable
assert not list(APP.glob('PlugIns/NativeChecks*'))
for name in ['Capacitor', 'Cordova']:
    assert (APP / f'Frameworks/{name}.framework/PrivacyInfo.xcprivacy').exists()
print(f'Archive identity, scene lifecycle, candidate opaque 1024 icon, {len(report["files"])} packaged asset hashes and 3 privacy manifests verified')

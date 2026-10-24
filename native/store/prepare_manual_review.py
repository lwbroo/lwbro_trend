#!/usr/bin/env python3
"""Stage synthetic files only into an explicitly owned manual-review simulator."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

if len(sys.argv) != 2 or not re.fullmatch(r'[A-Fa-f0-9-]{36}', sys.argv[1]):
    raise SystemExit('Pass the exact newly created manual-review UUID, never booted.')
uuid = sys.argv[1]
env = dict(os.environ, DEVELOPER_DIR='/Applications/Xcode.app/Contents/Developer')
def sim(*args):
    return subprocess.check_output(['xcrun','simctl',*args], env=env, text=True).strip()
devices = json.loads(sim('list','devices','-j'))['devices']
match = [d for group in devices.values() for d in group if d['udid'] == uuid]
if len(match) != 1 or match[0]['name'] != 'Ziwei manual Files review':
    raise SystemExit('Refusing a simulator not named for this dedicated manual review.')
root = Path(__file__).resolve().parents[2]
fixtures = root / 'native/store/review-kit/manual-fixtures'
documents = Path(sim('get_app_container',uuid,'com.lwbroo.ziweibazi','data'))/'Documents'
documents.mkdir(exist_ok=True)
if any(documents.iterdir()):
    raise SystemExit('Documents is not empty. Preserve it; use a newly created review simulator.')
manifest = json.loads((fixtures/'manifest.json').read_text())
for item in manifest['files']:
    source = fixtures/item['name']
    if source.stat().st_size != item['bytes'] or hashlib.sha256(source.read_bytes()).hexdigest() != item['sha256']:
        raise SystemExit('Synthetic fixture hash mismatch; no copy permitted.')
for item in manifest['files']:
    shutil.copyfile(fixtures/item['name'],documents/item['name'])
print('Synthetic files staged in exact UUID: '+uuid)
print('Documents: '+str(documents))
print('No app launch, foreground action, or real-device installation performed.')

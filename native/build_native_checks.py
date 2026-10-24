#!/usr/bin/env python3
"""Build a simulator-only test runner with ad-hoc signing, no Apple account."""
import hashlib
import argparse
import json
import os
from pathlib import Path
import subprocess
import prepare

ROOT = Path(__file__).resolve().parent.parent
env = os.environ.copy()
env['DEVELOPER_DIR'] = env.get('ZIWEI_XCODE_DIR', '/Applications/Xcode.app/Contents/Developer')
parser = argparse.ArgumentParser()
parser.add_argument('--configuration', choices=['Debug', 'Release'], default='Debug')
args = parser.parse_args()
derived = Path('/tmp') / ('ziwei-nativechecks-' + hashlib.sha256(str(ROOT).encode()).hexdigest()[:12] + '-' + args.configuration.lower())
prepare.main()
command = ['xcodebuild', '-project', 'native/ios/App/App.xcodeproj', '-scheme', 'NativeChecks',
           '-configuration', args.configuration, '-derivedDataPath', str(derived), '-clonedSourcePackagesDirPath', 'build/packages',
           '-disableAutomaticPackageResolution', '-skipPackageUpdates', 'CODE_SIGNING_ALLOWED=YES',
           'CODE_SIGN_IDENTITY=-', 'CODE_SIGN_STYLE=Manual', 'DEVELOPMENT_TEAM=',
           '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator', 'build-for-testing']
log = ROOT / ('build/ios-nativechecks-' + args.configuration.lower() + '-build.log')
with log.open('w') as output:
    result = subprocess.run(command, cwd=ROOT, env=env, stdout=output, stderr=subprocess.STDOUT)
print('\n'.join(log.read_text().splitlines()[-10:]))
if result.returncode:
    raise SystemExit(result.returncode)
(ROOT / ('build/nativechecks-' + args.configuration.lower() + '-path.json')).write_text(json.dumps({'derivedData':str(derived),'configuration':args.configuration,'signing':'simulator ad-hoc only; no certificate/account','sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()},indent=2)+'\n')
print(f'Local test build: {derived}')

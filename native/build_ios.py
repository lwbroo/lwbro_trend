#!/usr/bin/env python3
"""Build a simulator Release or unsigned device archive from local dependencies."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import prepare

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CACHE = Path.home() / 'Library/Developer/Xcode/DerivedData/App-avipleewibbxxvgobkbehvmoupaw/SourcePackages/artifacts/capacitor-swift-pm'

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['simulator', 'archive'])
    args = parser.parse_args()
    runtime = ROOT / 'native/vendor/CapacitorRuntime'
    cache = Path(os.environ.get('ZIWEI_CAPACITOR_CACHE', DEFAULT_CACHE))
    for name in ['Capacitor', 'Cordova']:
        target = runtime / (name + '.xcframework')
        if not target.exists():
            source = cache / name / (name + '.xcframework')
            if not source.exists():
                raise SystemExit(f'Existing runtime missing: {source}. No download was attempted.')
            shutil.copytree(source, target)
    integrity = json.loads((runtime / 'runtime-integrity.json').read_text())
    for relative, expected in integrity['binaries'].items():
        actual = hashlib.sha256((runtime / relative).read_bytes()).hexdigest()
        if actual != expected:
            raise SystemExit(f'Existing runtime does not match the recorded 8.4.1 cache: {relative}')
    prepare.main()
    env = os.environ.copy()
    env['DEVELOPER_DIR'] = env.get('ZIWEI_XCODE_DIR', '/Applications/Xcode.app/Contents/Developer')
    command = ['xcodebuild', '-project', 'native/ios/App/App.xcodeproj', '-scheme', 'App',
               '-configuration', 'Release', '-derivedDataPath', f'build/ios-{args.mode}',
               '-clonedSourcePackagesDirPath', 'build/packages', '-disableAutomaticPackageResolution',
               '-skipPackageUpdates', 'CODE_SIGNING_ALLOWED=NO']
    if args.mode == 'simulator':
        command += ['-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator', 'build']
    else:
        command += ['-sdk', 'iphoneos', '-destination', 'generic/platform=iOS',
                    '-archivePath', 'build/ZiweiUnsigned.xcarchive', 'archive']
    log = ROOT / f'build/ios-{args.mode}.log'
    with log.open('w') as output:
        result = subprocess.run(command, cwd=ROOT, env=env, stdout=output, stderr=subprocess.STDOUT)
    lines = log.read_text().splitlines()
    print('\n'.join(lines[-12:]))
    print(f'Full log: {log}')
    if result.returncode:
        raise SystemExit(result.returncode)
    print('Unsigned local build only; not an installable signed App Store IPA.')

if __name__ == '__main__':
    main()

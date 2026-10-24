#!/usr/bin/env python3
"""Run compiled synthetic UI checks on one disposable, background simulator."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import shutil
import time

ROOT = Path(__file__).resolve().parent.parent
env = os.environ.copy()
env['DEVELOPER_DIR'] = env.get('ZIWEI_XCODE_DIR', '/Applications/Xcode.app/Contents/Developer')

def sim(*args):
    return subprocess.check_output(['xcrun', 'simctl', *args], env=env, text=True, stderr=subprocess.STDOUT, timeout=180).strip()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('family', choices=['iphone', 'ipad'])
    parser.add_argument('--only', choices=['import', 'share', 'accessibility', 'release', 'screenshots'])
    parser.add_argument('--device-type', help='Exact installed simulator device type name, optional')
    parser.add_argument('--configuration', choices=['Debug', 'Release'], default='Debug')
    args = parser.parse_args()
    if (args.only == 'release') != (args.configuration == 'Release'):
        parser.error('Release verification requires both --configuration Release and --only release')
    derived = json.loads((ROOT / ('build/nativechecks-' + args.configuration.lower() + '-path.json')).read_text())['derivedData']
    types = json.loads(sim('list', 'devicetypes', '-j'))['devicetypes']
    if args.device_type:
        device_type = next((d for d in types if d['name'] == args.device_type), None)
        if not device_type or device_type.get('productFamily') != ('iPhone' if args.family == 'iphone' else 'iPad'):
            parser.error('Choose an exact installed device type matching the family')
    else:
        device_type = next(d for d in types if d['name'] == 'iPhone 17 Pro') if args.family == 'iphone' else next(d for d in types if d.get('productFamily') == 'iPad')
    run_id = str(int(time.time()))
    runtime = os.environ.get('ZIWEI_SIM_RUNTIME', 'com.apple.CoreSimulator.SimRuntime.iOS-26-5')
    device = sim('create', 'Ziwei native checks ' + run_id, device_type['identifier'], runtime)
    result = ROOT / f'build/native-{args.family}-{args.configuration.lower()}-{run_id}.xcresult'
    log = ROOT / f'build/native-{args.family}-{args.configuration.lower()}-{run_id}.log'
    print(f'Own disposable {device_type["name"]}: {device}; log: {log}', flush=True)
    try:
        sim('boot', device)
        sim('bootstatus', device, '-b')
        if args.only == 'screenshots':
            sim('status_bar', device, 'override', '--time', '9:41', '--dataNetwork', 'wifi',
                '--wifiMode', 'active', '--wifiBars', '3', '--cellularMode', 'active',
                '--cellularBars', '4', '--batteryState', 'discharging', '--batteryLevel', '100')
        if args.configuration == 'Release':
            # Seed only this disposable simulator's local Documents, outside the app.
            # The Release executable has no fixture bootstrap or diagnostic hook.
            app = Path(derived) / 'Build/Products/Release-iphonesimulator/App.app'
            sim('install', device, str(app))
            documents = Path(sim('get_app_container', device, 'com.lwbroo.ziweibazi', 'data')) / 'Documents'
            documents.mkdir(exist_ok=True)
            profile = {'name':'虛構測試人物','birthDate':'2000-01-01','birthTime':'12:00','gender':'女'}
            original = {'date':'2026-10-04','mood':3,'energy':4,'tags':[],'note':'synthetic only','updatedAt':'2026-10-04T00:00:00Z'}
            valid = {'date':'2026-10-03','mood':4,'energy':3,'tags':[],'note':'synthetic import','updatedAt':'2026-10-03T00:00:00Z'}
            (documents / 'Synthetic-start.json').write_text(json.dumps({'profile':profile,'records':[original]}))
            (documents / 'Synthetic-valid.json').write_text(json.dumps({'records':[valid]}))
            (documents / 'Synthetic-invalid.json').write_text('{bad json')
            (documents / 'Synthetic-large.json').write_bytes(b' ' * (5 * 1024 * 1024 + 1))
        command = ['xcodebuild', '-project', 'native/ios/App/App.xcodeproj', '-scheme', 'NativeChecks',
                   '-configuration', args.configuration,
                   '-derivedDataPath', derived, '-disableAutomaticPackageResolution', '-skipPackageUpdates',
                   '-destination', 'id=' + device, '-parallel-testing-enabled', 'NO',
                   '-resultBundlePath', str(result), 'CODE_SIGNING_ALLOWED=NO', 'test-without-building']
        if args.only:
            names = ['testReleaseImportCancelInvalidAndRepeat', 'testReleaseSaveToFilesRoundTrip'] if args.only == 'release' else [{'import':'testDocumentPickerCancelInvalidAndValidImport','screenshots':'testStoreScreenshots',
                    'share':'testShareSheetCancelAndScreens', 'accessibility':'testSettingsAccessibilityAudit'}[args.only]]
            for name in names:
                command.insert(-1, '-only-testing:NativeChecks/NativeChecks/' + name)
        with log.open('w') as output:
            completed = subprocess.run(command, cwd=ROOT, env=env, stdout=output, stderr=subprocess.STDOUT, timeout=600)
        print('\n'.join(log.read_text().splitlines()[-18:]))
        print(f'Result: {result}')
        raise SystemExit(completed.returncode)
    finally:
        try:
            container = Path(sim('get_app_container', device, 'com.lwbroo.ziweibazi', 'data'))
            evidence = ROOT / f'build/native-{args.family}-{args.configuration.lower()}-{run_id}-files'
            evidence.mkdir(exist_ok=True)
            for file in (container / 'Documents').glob('*'):
                if file.is_file():
                    shutil.copyfile(file, evidence / file.name)
            print(f'Own simulator Documents preserved: {evidence}', flush=True)
        except (subprocess.SubprocessError, OSError) as error:
            print(f'Could not preserve own simulator evidence: {type(error).__name__}', flush=True)
        subprocess.run(['xcrun', 'simctl', 'shutdown', device], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(['xcrun', 'simctl', 'delete', device], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == '__main__':
    main()

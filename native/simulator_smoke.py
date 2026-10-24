#!/usr/bin/env python3
"""Launch on a disposable dedicated simulator without opening Simulator.app."""
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent.parent
env = os.environ.copy()
env['DEVELOPER_DIR'] = env.get('ZIWEI_XCODE_DIR', '/Applications/Xcode.app/Contents/Developer')
prefix = ['xcrun', 'simctl']
if os.environ.get('ZIWEI_SIM_DEVICE_SET'):
    prefix += ['--set', os.environ['ZIWEI_SIM_DEVICE_SET']]

def run(*args, timeout=60):
    print('simctl ' + args[0], flush=True)
    return subprocess.check_output(prefix + list(args), env=env, cwd=ROOT, text=True, stderr=subprocess.STDOUT, timeout=timeout).strip()

def main():
    (ROOT / 'build/ziwei-sim-devices').mkdir(parents=True, exist_ok=True)
    app = ROOT / 'build/ios-simulator/Build/Products/Release-iphonesimulator/App.app'
    if not app.exists():
        raise SystemExit('Run python3 native/build_ios.py simulator first')
    device = run('create', 'Ziwei isolated smoke', 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro', os.environ.get('ZIWEI_SIM_RUNTIME', 'com.apple.CoreSimulator.SimRuntime.iOS-27-0'))
    try:
        run('boot', device)
        run('bootstatus', device, '-b', timeout=180)
        run('install', device, str(app))
        result = run('launch', device, 'com.lwbroo.ziweibazi')
        (ROOT / 'build/ios-simulator-launch.log').write_text(result)
        time.sleep(8)
        pid = result.rsplit(':', 1)[-1].strip()
        processes = run('spawn', device, 'launchctl', 'list')
        if not any(line.split() and line.split()[0] == pid and 'com.lwbroo.ziweibazi' in line for line in processes.splitlines()):
            raise RuntimeError('App exited after launch; inspect the Ziwei crash report before claiming startup passed')
        screenshot = ROOT / 'build/ziwei-simulator-settings.png'
        run('io', device, 'screenshot', str(screenshot))
        print(result)
        print(f'Native iPhone startup screenshot: {screenshot}')
    finally:
        subprocess.run(prefix + ['shutdown', device], env=env, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(prefix + ['delete', device], env=env, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        raise SystemExit(error.output)

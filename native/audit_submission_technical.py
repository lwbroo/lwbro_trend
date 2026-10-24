#!/usr/bin/env python3
"""Read-only candidate/package audit. Never builds, executes, signs or uploads an app."""
import argparse
import hashlib
import json
import plistlib
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def command(*args):
    return subprocess.check_output(args, text=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app', type=Path, help='Existing final .app, read only; default: recorded exact-source unsigned simulator app')
    parser.add_argument('--sdk-cache', type=Path, help='Optional existing SourcePackages root; inspect only this public SDK cache and receipt')
    parser.add_argument('--report', type=Path, default=ROOT/'build/submission-technical-audit.json')
    args = parser.parse_args()
    previous = json.loads((ROOT/'build/english-core-native-compile.json').read_text())
    expected = json.loads((ROOT/'build/native-assets.json').read_text())
    runtime_commit = previous['verifiedCommittedSource']
    assert runtime_commit == expected['webSourceCommit'] == '1019c380588bbf51f6d46d396798e034612f90aa'
    app = args.app or Path(previous['stage'])/'DerivedData/Build/Products/Release-iphonesimulator/App.app'
    assert app.is_dir(), f'Existing app missing: {app}; no build/download attempted'
    info = plistlib.loads((app/'Info.plist').read_bytes())
    assert info['CFBundleIdentifier'] == 'com.lwbroo.ziweibazi'
    assert info['ITSAppUsesNonExemptEncryption'] is False
    report = {'checkedAtUtc': datetime.now(timezone.utc).isoformat(), 'repoHead': command('git','-C',str(ROOT),'rev-parse','HEAD').strip(), 'runtimeSourceCommit':runtime_commit, 'appPath':str(app.resolve()), 'appInfoSHA256':sha(app/'Info.plist'), 'appInfo':{k:info.get(k) for k in ['CFBundleIdentifier','CFBundleShortVersionString','CFBundleVersion','CFBundleSupportedPlatforms','DTSDKName','DTXcodeBuild','MinimumOSVersion','ITSAppUsesNonExemptEncryption']}, 'validationScope':'static files, hashes, binary imports and pinned upstream source; not native execution, signing, Apple validation or final legal/account approval'}
    report['runtimeSources']={}
    for name, digest in previous['sourceSHA256'].items():
        actual=sha(ROOT/name); assert actual==digest, f'Runtime changed: {name}'
        report['runtimeSources'][name]=actual
    # Also pin packaging, adapters, native lifecycle/config/manifests to the runtime commit.
    for name in ['native/prepare.py','native/offline-services.js','native/capacitor.config.json','native/ios/App/App/SceneDelegate.swift','native/ios/App/App/AppDelegate.swift','native/ios/App/App/PrivacyInfo.xcprivacy','native/ios/App/App/Info.plist']:
        original=subprocess.check_output(['git','-C',str(ROOT),'show',runtime_commit+':'+name]);assert (ROOT/name).read_bytes()==original,name
        report['runtimeSources'][name]=sha(ROOT/name)
    assert len(expected['files'])==15
    actual_files={str(p.relative_to(app/'public')):sha(p) for p in (app/'public').rglob('*') if p.is_file()}
    assert actual_files==expected['files'], 'Packaged public inventory/hash mismatch; do not use historical archive'
    report['all15PackagedAssets']=actual_files
    report['config']=json.loads((app/'capacitor.config.json').read_text()); assert report['config']['packageClassList']==[]
    assert 'server' not in report['config'] and 'plugins' not in report['config']
    assert not any((app/'public/js'/f'{x}.js').exists() for x in ['ai','chat','sync'])
    assert "connect-src 'none'" in (app/'public/native-runtime.js').read_text()
    index=(app/'public/index.html').read_text();assert 'cdn.jsdelivr.net' not in index and 'unpkg.com' not in index
    network=re.compile(r'\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|CapacitorHttp|CapacitorCookies|_capacitor_https?_interceptor_')
    crypto=re.compile(r'crypto\.|CryptoJS|\bencrypt\s*\(|\bdecrypt\s*\(')
    scan={}
    for p in (app/'public').rglob('*.js'):
        s=p.read_text();hits=[{'offset':m.start(),'token':m.group()} for m in network.finditer(s)]
        assert not hits, f'App-owned/vendor JS network call/capability requires review: {p}'
        assert not crypto.search(s), f'Encryption call requires review: {p}'
        scan[str(p.relative_to(app))]={'networkCallPatternHits':0,'encryptionCallPatternHits':0}
    report['packagedJSScan']=scan
    integrity=json.loads((ROOT/'native/vendor/CapacitorRuntime/runtime-integrity.json').read_text()); report['SDKVersionProvenance']=integrity
    for p,digest in integrity['binaries'].items(): assert sha(ROOT/'native/vendor/CapacitorRuntime'/p)==digest,p
    if args.sdk_cache:
        checkout=args.sdk_cache/'checkouts/capacitor-swift-pm'
        tag=command('git','-C',str(checkout),'describe','--tags','--exact-match').strip()
        receipt=json.loads((args.sdk_cache/'workspace-state.json').read_text())
        artifacts=[a for a in receipt['object']['artifacts'] if a.get('packageRef',{}).get('identity')=='capacitor-swift-pm']
        comparisons={}
        for relative, digest in integrity['binaries'].items():
            name=relative.split('.')[0]
            cached=args.sdk_cache/'artifacts/capacitor-swift-pm'/name/relative
            comparisons[relative]={'sha256':sha(cached),'matchesPinnedCandidate':sha(cached)==digest}
        report['currentSharedSDKCache']={'checkoutTag':tag,'artifactReceipts':[{'target':a['targetName'],'source':a['source']} for a in artifacts],'binaryComparisons':comparisons,'sameAsPinnedCandidate':all(v['matchesPinnedCandidate'] for v in comparisons.values()),'interpretation':'Current shared cache is separate evidence. Do not replace pinned binaries or infer candidate upgrade from this tag; build hash guards must reject a differing fallback cache.'}
    report['manifests']={};report['binaries']={}
    binaries=[app/info['CFBundleExecutable']]
    for name in ['Capacitor','Cordova']:
        fw=app/'Frameworks'/f'{name}.framework'; assert fw.is_dir();binaries.append(fw/name)
        for path in [app/'PrivacyInfo.xcprivacy',fw/'PrivacyInfo.xcprivacy']:
            report['manifests'][str(path.relative_to(app))]={'sha256':sha(path),'content':plistlib.loads(path.read_bytes())}
        source_manifest=ROOT/'native/vendor/CapacitorRuntime'/f'{name}.xcframework'/'ios-arm64'/f'{name}.framework/PrivacyInfo.xcprivacy'
        assert sha(source_manifest)==sha(fw/'PrivacyInfo.xcprivacy')
        # Simulator frameworks may be thinned/re-signed: record exact bytes plus Mach-O UUIDs.
        load=command('/usr/bin/otool','-l',str(fw/name));report['binaries'][str((fw/name).relative_to(app))]={'sha256':sha(fw/name),'UUIDs':re.findall(r'uuid ([0-9A-F-]+)',load)}
    for p in binaries:
        imports=command('/usr/bin/nm','-u',str(p));links=command('/usr/bin/otool','-L',str(p))
        record=report['binaries'].setdefault(str(p.relative_to(app)),{'sha256':sha(p)})
        record.update(linkedLibraries=[s.strip() for s in links.splitlines()[1:]],networkImports=[s.strip() for s in imports.splitlines() if re.search(r'NSURLSession|NSURLConnection|CFNetwork',s)],cryptoImports=[s.strip() for s in imports.splitlines() if re.search(r'CC_SHA|CCCrypt|SecKey|CryptoKit|ssl_|EVP_|AES_|RSA_',s)],requiredReasonReviewImports=[s.strip() for s in imports.splitlines() if re.search(r'NSUserDefaults|\b_stat\b|\b_fstat\b|mach_absolute_time|systemUptime',s)])
    native_source=(ROOT/'native/ios/App/App/ZiweiViewController.swift').read_text()
    assert 'URLSession' not in native_source and 'URLRequest' not in native_source
    assert '#if DEBUG' in native_source
    binary=(app/info['CFBundleExecutable']).read_bytes()
    for marker in [b'ZIWEI_UI_TEST',b'Synthetic-valid.json',b'Shared-synthetic.json',b'native-check-events.txt']:
        assert marker not in binary, f'Debug marker shipped: {marker}'
    report['debugDiagnosticsAndFixturesExcludedFromRelease']=True
    report['networkConclusion']={'automaticAppTransmissionFound':False,'SDKNativeHttpCapabilityPresent':True,'SDKFetchXHRPatchingDefault':False,'directNativeHttpNotGuaranteedBlockedByWebCSP':True,'appJSUsesNativeHttp':False,'nativeNetworkExecutionObservedThisAudit':False,'finalNativeTrialStillRequired':True}
    report['encryptionConclusion']={'nonExemptFlag':False,'customPayloadOrBackupEncryptionFound':False,'CapacitorImportsAppleCC_SHA256':True,'SHA256IsHashingNotProofOfDataEncryption':True,'SDKCanUseAppleURLSessionTLS':True,'outsideAppleOSCipherImplementationFoundByScan':False,'finalExportAnswerApproved':False,'binaryScanNotProofOfCompleteAbsence':True}
    report['historicalDeviceArchiveChecks']=[]
    for old in sorted((ROOT/'build').glob('*.xcarchive/Products/Applications/App.app')):
        count=sum((old/'public'/p).is_file() and sha(old/'public'/p)==h for p,h in expected['files'].items())
        report['historicalDeviceArchiveChecks'].append({'appPath':str(old),'matchingCandidatePublicAssets':count,'expected':15,'matchesCurrentCandidate':count==15})
    is_device=info.get('CFBundleSupportedPlatforms')==['iPhoneOS']
    report.update(result='PASS_STATIC_PACKAGE_AUDIT',isDeviceApp=is_device,finalSignedDistributionVerified=False,nativeUIVerified=False,ownerFactsAndAppPrivacyApprovalComplete=False,noBuildAppExecutionUIClaudePhoneAccountSigningOrUpload=True)
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(f"{report['result']}: 15 packaged assets, 4 pinned SDK binaries, 3 manifests; {'device' if is_device else 'simulator only'}; final distribution/native/owner gates remain open. Report: {args.report}")

if __name__=='__main__': main()

#!/usr/bin/env python3
"""Assemble a versioned local review kit from completed QA; no build or external actions."""
import copy
import hashlib
import html
import json
import plistlib
import shutil
import struct
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILD = ROOT / 'build'
OLD = ROOT / 'native/store/review-kit'
COMMIT = 'e364fc39b59d17315db5530f591b429c9fee6cc8'
OUT = BUILD / 'ziwei-bazi-review-e364fc3'
ZIP = BUILD / 'ziwei-bazi-offline-store-review-kit.e364fc3.zip'
OLD_ZIP_SHA = '86efe99f3b5b4e1479ad63b59d6c0b3cbc5c506e54d383867c0250d2f5e2651d'


def read(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(name, data):
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def take(source, relative):
    target = OUT / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    assert digest(source) == digest(target), relative


def tree(path):
    return {str(p.relative_to(path)): digest(p) for p in sorted(path.rglob('*')) if p.is_file()}


def page(title, body):
    return ('<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{html.escape(title)}</title><style>'
            'body{margin:0;background:#faf7f1;color:#29231e;font:16px/1.65 -apple-system,sans-serif}'
            'main{max-width:1120px;margin:auto;padding:32px 24px}section{background:white;padding:24px;'
            'border:1px solid #e3d9c9;border-radius:16px;margin:20px 0}a{color:#8c2526}'
            '.notice{background:#fff2d9;padding:18px;border-radius:12px}.grid{display:grid;'
            'grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px}img{max-width:100%;'
            'height:400px;object-fit:contain}pre{white-space:pre-wrap;overflow-wrap:anywhere}'
            'table{width:100%;border-collapse:collapse}td,th{padding:12px;text-align:left;'
            'vertical-align:top;border-bottom:1px solid #ddd}.scroll{overflow:auto}'
            '</style></head><body><main>' + body + '</main></body></html>')


def main():
    assert not OUT.exists() and not ZIP.exists(), 'Versioned output exists; preserve it rather than overwrite.'
    audit = read(BUILD / 'native-english-fixed-package-audit.json')
    qa = read(BUILD / 'native-english-completion.json')
    assert audit['runtimeSourceCommit'] == qa['runtimeSourceCommit'] == COMMIT
    assert audit['result'] == 'PASS_STATIC_PACKAGE_AUDIT'
    assert qa['backgroundColdStartRegression']['afterPassed'] == 28
    assert qa['cleanup']['ownedDevicesRemoved'] and qa['cleanup']['otherDevicesSetUnchanged']
    for relative, sha in audit['runtimeSources'].items():
        assert digest(ROOT / relative) == sha, relative
        committed = subprocess.check_output(['git', '-C', str(ROOT), 'show', COMMIT + ':' + relative])
        assert hashlib.sha256(committed).hexdigest() == sha, relative
    app = Path(audit['appPath'])
    assert tree(app / 'public') == audit['all15PackagedAssets']
    info = plistlib.loads((app / 'Info.plist').read_bytes())
    assert info['CFBundleSupportedPlatforms'] == ['iPhoneSimulator']
    assert info['CFBundleIdentifier'] == 'com.lwbroo.ziweibazi'
    for relative, data in audit['binaries'].items():
        assert digest(app / relative) == data['sha256']
    for relative, data in audit['manifests'].items():
        assert digest(app / relative) == data['sha256']
    sdk = ROOT / 'native/vendor/CapacitorRuntime'
    for relative, sha in audit['SDKVersionProvenance']['binaries'].items():
        assert digest(sdk / relative) == sha, relative
    old_zip = BUILD / 'ziwei-bazi-offline-store-review-kit.zip'
    assert digest(old_zip) == OLD_ZIP_SHA
    old_tree = tree(OLD)
    OUT.mkdir(parents=True)
    # This is the actual tested simulator app, not a device/distribution archive.
    shutil.copytree(app, OUT / 'candidate/App.app', copy_function=shutil.copyfile, symlinks=True)
    app_files = tree(OUT / 'candidate/App.app')
    assert app_files == tree(app)
    app_tree_sha = hashlib.sha256(json.dumps(app_files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    write('candidate/app-files.json', {'algorithm': 'SHA256 of UTF-8 sorted compact JSON relative-path→SHA256 map',
                                     'treeSHA256': app_tree_sha, 'files': app_files})
    for relative in audit['runtimeSources']:
        take(ROOT / relative, 'candidate/source/' + relative)
    take(sdk / 'runtime-integrity.json', 'candidate/sdk-runtime-integrity.json')
    take(ROOT / 'native/audit_submission_technical.py', 'evidence/historical-audit-tool-0bdc228.py')
    take(Path(__file__), 'evidence/build_candidate_review.py')
    evidence = ['native-english-fixed-package-audit.json', 'native-english-completion.json',
                'native-cold-start-before-fix.json', 'native-cold-start-after-fix.json',
                'native-english-cleanup.json', 'native-english-session-blocked.json']
    for name in evidence:
        take(BUILD / name, 'evidence/' + name)
    take(BUILD / 'native-english-local-export/inspection.json', 'evidence/local-export-inspection.json')
    take(ROOT / 'native/qa/READINESS_206bbbb.md', 'evidence/native-readiness.md')
    take(ROOT / 'native/tests/campaigns/EnglishNativeQA.swift', 'evidence/EnglishNativeQA.swift')
    runner_archives = []
    for run in qa['runs']:
        take(Path(run['log']), 'evidence/runs/' + Path(run['log']).name)
        source = BUILD / ('native-english-' + run['id'] + '-executed-runner.swift')
        if source.exists():
            assert digest(source) == run['executedRunnerSHA256']
            take(source, 'evidence/runs/' + source.name)
        else:
            assert run['executedRunnerSHA256'] is None
        runner_archives.append({'run': run['id'], 'sourceArchived': source.exists(),
                                'sourceSHA256': run['executedRunnerSHA256'],
                                'note': 'Early runner source was not archived; preserve actual log and do not substitute newer source.' if not source.exists() else ''})
    write('evidence/runs/runner-archive-availability.json', runner_archives)
    for folder in ['native-english-edit-probe-evidence', 'native-english-edit-fixed-evidence']:
        for p in (BUILD / folder).iterdir():
            if p.is_file():
                take(p, 'evidence/' + folder + '/' + p.name)
    take(OLD / 'content.json', 'history/content-1019c38.json')
    take(OLD / 'submission-plan.json', 'history/submission-plan-1019c38.json')
    take(BUILD / 'store-deliverables.json', 'history/store-deliverables-1019c38.json')
    screens = []
    captions = {'01-daily': ('每日曆法', 'Daily calendar references'),
                '02-journal': ('日誌評分與筆記', 'Mood, energy and journal notes'),
                '03-chart-guide': ('命盤與閱讀指引', 'Traditional chart and reading guide'),
                '04-chart': ('命盤局部', 'Scrollable traditional chart'),
                '05-bazi': ('八字', 'Bazi / Four pillars'),
                '06-entries': ('記錄與備份', 'Entries and local backup'),
                '07-trends': ('歷史趨勢', 'Journal history and averages'),
                '08-settings': ('設定', 'Settings and birth-time limits')}
    for size, device in [('iphone17promax', 'iPhone 17 Pro Max'), ('iphone17pro', 'iPhone 17 Pro')]:
        original_manifest = BUILD / ('native-english-screenshots-' + size + '/manifest.json')
        take(original_manifest, 'evidence/screenshots-' + size + '-source-manifest.json')
        for item in read(original_manifest):
            assert item['runtimeSourceCommit'] == COMMIT and item['syntheticOnly']
            source = ROOT / item['path']
            assert digest(source) == item['sha256']
            width, height = struct.unpack('>II', source.read_bytes()[16:24])
            assert (width, height) == (item['width'], item['height']) and source.read_bytes()[25] == 2
            relative = 'screenshots/' + size + '/' + source.name
            take(source, relative)
            key = item['name'].removeprefix('en-store-')
            row = dict(item, path=relative, device=device, hasAlpha=False,
                       captionZh=captions[key][0], captionEn=captions[key][1],
                       recommended=size == 'iphone17promax' and key[:2] in ['02', '03', '05', '06', '07'],
                       purpose='e364fc3原生候選；核心英文、細部命盤術語及部分OS日期仍中文。',
                       submissionReady=False, finalSelectionApproved=False,
                       syntheticRecordCount=21 if size == 'iphone17promax' else 4)
            screens.append(row)
    assert len(screens) == 16
    screens.sort(key=lambda r: (r['device'], r['name']))
    write('screenshots.json', screens)
    write('primary-screenshots-draft.json', [r for r in screens if r['recommended']])
    write('screenshot-duplicate-groups.json', [[r['path'] for r in screens if r['sha256'] == h]
          for h in sorted({r['sha256'] for r in screens}) if sum(r['sha256'] == h for r in screens) > 1])
    content = copy.deepcopy(read(OLD / 'content.json'))
    plan = copy.deepcopy(read(OLD / 'submission-plan.json'))
    metadata = copy.deepcopy(read(ROOT / 'native/store/metadata-draft.json'))
    owner = copy.deepcopy(content['ownerValues'])
    declarations = copy.deepcopy(plan['ownerDeclarationValues'])
    assert owner['legalOwner'] == owner['copyrightOwnerName'] == 'Kurt Chiang'
    assert owner['reviewContact'] == {'name': None, 'email': 'lwbro@me.com', 'phone': None}
    native_summary = 'e364fc3在iOS26.5專用simulator完成英文核心操作、冷啟動Edit修復、全文取代、session草稿、旋轉／privacy返回、Files取消／錯誤／非空合併與本機JSON往返；分段run證據如實保留，不是一次完整suite全綠。'
    remaining = '不是distribution包。實機VoiceOver／Dynamic Type、SDK原生流量、CSV／其他分享目的地、有效政策與剩餘owner欄位／最終帳號聲明待完成。'
    identity = {'runtimeSourceCommit': COMMIT, 'materialsSourceCommit': qa['materialsHead'],
                'bundleId': info['CFBundleIdentifier'], 'version': info['CFBundleShortVersionString'],
                'build': info['CFBundleVersion'], 'artifactPath': str(OUT / 'candidate/App.app'),
                'portableArtifactPath': 'candidate/App.app', 'platform': 'iPhoneSimulator',
                'signing': 'Existing local XCTest ad-hoc - only; copied exact bytes; not Apple Distribution',
                'appFilesManifest': 'candidate/app-files.json', 'appTreeSHA256': app_tree_sha,
                'appInfoSHA256': digest(app / 'Info.plist'), 'binaries': {k: v['sha256'] for k, v in audit['binaries'].items()},
                'runtime17Sources': audit['runtimeSources'], 'packaged15Assets': audit['all15PackagedAssets'],
                'lockedSDK4Binaries': audit['SDKVersionProvenance']['binaries'],
                'privacy3Manifests': {k: v['sha256'] for k, v in audit['manifests'].items()},
                'staticAudit': 'evidence/native-english-fixed-package-audit.json',
                'nativeQA': 'evidence/native-english-completion.json', 'screenshotManifest': 'screenshots.json',
                'runtimeChangedSince1019c38': ['js/app.js'], 'nativePrivacyLatestLegalNamePackaged': False,
                'distributionVerified': False, 'nativeNetworkExecutionObserved': False,
                'physicalInstalledSourceStill': '9f737e0', 'noRuntimeBuildTestUIApplePhoneCredentialOrExternalActionsThisAssembly': True}
    write('candidate-identity.json', identity)
    content.update(currentRuntimeSourceCommit=COMMIT, inspectedReleaseCommit=COMMIT,
                   uiLanguage='English / Traditional Chinese core UI; detailed chart terms and CSV headers remain Chinese',
                   currentEnglishCandidateNativeUIVerified=True, candidateIdentity='candidate-identity.json',
                   nativeQACheckpoint={'summary': native_summary, 'remaining': remaining, 'report': identity['nativeQA']},
                   storeSubmissionReadiness='NOT READY: final device/distribution, policies, physical QA and owner/account declarations pending')
    content['privacyTechnicalEvidence'].update(runtimeSourceCommit=COMMIT, latestPackageAudit=identity['staticAudit'])
    technical = content['technicalQuestionnaireDraft']
    technical.update(runtimeSourceCommit=COMMIT, auditReport=identity['staticAudit'],
                     reproduce='Existing original audit tool is pinned to1019c38. Current report provenance records temporary exact commit-pin adaptation. Final device verification must use e364fc3 source/15-assets evidence; never apply1019c38 hashes or shared8.5.0 cache. See distribution-next-steps.txt.')
    technical['rows'][4]['status'] = '此候選實際原生Files取消／拒絕／非空合併／本機JSON回匯通過；CSV、實機及其他provider未覆蓋。外部副本／系統備份不受App刪除控制。'
    technical['rows'][9]['evidence'] = '候選simulator鍵盤／旋轉／privacy返回已驗證；沒有新的VoiceOver／Dynamic Type通過證據，舊嚴格audit未通過。'
    zh_notes = ('e364fc3候選：英文／繁中核心五分頁；細部命盤術語及CSV欄名仍中文。免費離線首版，無登入、AI、App同步、廣告、內購或自動診斷上報。\n\n'
                '合成資料流程：Settings→2000-01-02、12:00、Female、Demo English User→Save；Birth chart查看命盤及八字；Daily明確保存心情／精力／筆記，Entries編輯。兩筆以上看Trends；歷史平均預覽需要至少10筆相應指標。Entries匯出JSON／CSV，Import JSON接受UTF-8、最多5MB，依日期合併且保留既有profile。\n\n'
                '原生simulator已驗證核心流程與本機Files JSON往返，保存記錄在冷啟動後Edit的空白問題已修復。草稿僅session保留，不自動保存。Web CSP限制Web連線，SDK內建HTTP能力仍存在，原生流量觀測待完成。\n\n'
                '命理僅文化性詮釋，統計是日誌相關性，沒有科學確立的預測能力，不作醫療／財務建議。沒有出生地時區、DST或真太陽時校正；全球產品目標不是全球校正驗證。\n\n'
                '本機審閱草稿，不能直接送審：final device/distribution、App record、有效privacy/support URLs、私人審查姓名／電話、政策營運事實與最終聲明、實機檢查仍待完成。法定發布者／版權姓名Kurt Chiang、審查email lwbro@me.com已確認；不能推定seller相符或完整內容權利。最新法定姓名尚未加入候選App內privacy。\n\n公開品牌：lwbro\n支援信箱：lwbro@me.com')
    en_notes = ('Candidate e364fc3: English and Traditional Chinese core screens; detailed chart terms and CSV headings remain Chinese. Free offline first release with no login, AI, app sync, ads, purchases or automatic diagnostic reporting.\n\n'
                'Synthetic review flow: Settings→2000-01-02, 12:00, Female, Demo English User→Save. Explore Birth chart and Bazi. Explicitly save mood, energy and notes in Daily; edit in Entries. Trends need two records; historical averages need ten records with the selected metric. Export JSON/CSV or import UTF-8 JSON up to5MB. Import merges by date and retains an existing local profile.\n\n'
                'Scoped native simulator QA and an actual local Save to Files JSON roundtrip passed. A cold-start blank Edit form was fixed; drafts remain session-only and are not auto-saved. Web CSP limits Web connections; the SDK still includes native HTTP capability and native traffic observation remains pending.\n\n'
                'Astrology is cultural interpretation. Journal statistics describe associations, have no scientifically established predictive ability, and are not medical or financial advice. Birthplace time-zone, DST and true-solar-time correction are not implemented; global intent is not worldwide calculation validation.\n\n'
                'LOCAL REVIEW DRAFT—DO NOT SUBMIT: final device/distribution package, App record, effective public privacy/support URLs, private review name/phone, operator facts, final declarations and physical-device checks remain pending. Kurt Chiang is the confirmed legal publisher/copyright owner name and lwbro@me.com is the confirmed review email; seller match and full content rights are not inferred. The latest legal name is not yet packaged in app privacy.\n\nPublic brand: lwbro\nSupport email: lwbro@me.com')
    for language, notes in [('zh-Hant', zh_notes), ('en-US', en_notes)]:
        content['localizations'][language]['reviewNotes'] = notes
        fields = content['localizations'][language]
        (OUT / ('listing.' + language + '.txt')).write_text('\n\n'.join(k + '\n' + fields[k] for k in ['name', 'subtitle', 'promotionalText', 'keywords', 'description']) + '\n')
        (OUT / ('review-notes.' + language + '.txt')).write_text(notes + '\n')
        for kind in ['privacy', 'support']:
            # Existing local policy drafts already contain confirmed names and explicit pending facts.
            take(OLD / (kind + '.' + language + '.html'), kind + '.' + language + '.html')
    metadata.update(localizations=content['localizations'], reviewNotes=zh_notes,
                    currentRuntimeSourceCommit=COMMIT, currentEnglishCandidateNativeUIVerified=True,
                    candidateIdentity='candidate-identity.json', reviewKit='index.html', submissionPlan='submission-plan.json',
                    ageRating=None, appPrivacySuggestion=None, exportCompliance=None)
    plan['currentUXCandidate'].update(runtimeSourceCommit=COMMIT, report=identity['nativeQA'],
                                     nativeKeyboardUIRecheck=native_summary,
                                     existingStoreScreenshotsReflectCurrentCandidate=True)
    plan['readinessCheckpoint'].update(reviewDate='2026-10-08', reviewedRuntimeCommit=COMMIT,
                                      status='NOT READY FOR SUBMISSION: scoped native simulator QA and current screenshots complete; distribution, policy, owner/physical gates open',
                                      report=identity['nativeQA'], existingVerification=native_summary,
                                      priorNativeFiles='Current e364fc3 local JSON roundtrip and error/merge preservation passed; physical/provider/CSV checks remain open.',
                                      actionsThisAudit='This assembly reads/copies local evidence only; no new build, tests, UI, Apple, phone, signing or external transfer.',
                                      coordinationUpdate='Owned QA simulators removed; no foreground access required for packaging.')
    plan['followupEnglishCandidate'].update(runtimeSourceCommit=COMMIT, sourceIdentity='Exact tested e364fc3 simulator candidate',
                                           nativeUIVerified=True, report=identity['nativeQA'], verification=native_summary)
    plan['engineeringGates'] = [native_summary, remaining,
                              'Distribution work remains exclusively with the authorized coordinator. Verify existing App record and signing capability, exact final device source/assets/SDK/manifests, signature/entitlements/profile and Apple archive validation. This worker does not perform these actions.',
                              'Align final packaged privacy with approved operator facts and effective policies; any runtime/policy change requires new exact source identity and targeted QA before reusing screenshots.']
    plan['screenshotProvenance'] = {'runtimeSourceCommit': COMMIT, 'manifest': 'screenshots.json', 'nativeCaptureFiles': 16,
                                   'syntheticOnly': True, 'nativePixelsPreserved': True, 'currentUXCandidateScreenshotsVerified': True,
                                   'someScreensAreByteIdentical': True, 'finalSelectionApproved': False, 'submissionReady': False}
    for row in plan['proposedAndRemainingDecisions']:
        if row['field'] == '平台／語言／版本':
            row['proposed'] = 'iOS；英文／繁中核心五分頁；細部命盤術語／CSV欄名中文；1.0/build1，iPhone，最低iOS15；e364fc3 simulator原生核心流程已驗證，帳號primary language未操作。'
    plan['candidateIdentity'] = 'candidate-identity.json'
    assert content['ownerValues'] == owner and plan['ownerDeclarationValues'] == declarations
    for k in ['legalOwner', 'copyrightOwnerName', 'reviewContact', 'copyright', 'appleSellerLegalName',
              'privacyPolicyUrl', 'supportUrl', 'policyEffectiveDate', 'supportMessageRetentionPolicy', 'supportMessageDeletionProcess']:
        assert metadata[k] == read(ROOT / 'native/store/metadata-draft.json')[k], k
    write('content.json', content)
    write('submission-plan.json', plan)
    write('metadata-draft.json', metadata)
    checks = []
    for language, fields in content['localizations'].items():
        for k, maximum in {'name': 30, 'subtitle': 30, 'promotionalText': 170, 'keywords': 100, 'description': 4000}.items():
            length = len(fields[k].encode()) if k == 'keywords' else len(fields[k])
            assert length <= maximum
            checks.append({'language': language, 'field': k, 'length': length, 'limit': maximum})
    write('metadata-checks.json', checks)
    take(OLD / 'icon-candidate.png', 'icon-candidate.png')
    steps = ('DISTRIBUTION NEXT STEPS — coordinator only; no actions performed by this builder\n\n'
             '1. Verify existing App Store Connect record for com.lwbroo.ziweibazi; record numeric Apple ID and seller, avoid duplicates. Existing distribution capabilities must be checked before creating anything; signing work remains with Glyco/parent under their existing authorization.\n'
             '2. Freeze source e364fc39b59d17315db5530f591b429c9fee6cc8. This kit contains the exact TESTED SIMULATOR App, never an upload-ready device archive. Use the four pinned8.4.1 SDK hashes, not differing shared8.5.0 cache.\n'
             '3. Complete approved legal/policy/contact facts, package updated native privacy, and resolve physical QA. Unknown seller/review name/phone/copyright/policy/support/privacy/age/export values stay null. Any runtime or native privacy change creates a new candidate; compare sources/assets and run only necessary affected checks.\n'
             '4. Authorized coordinator builds the exact final iPhoneOS distribution archive with an applicable Apple Distribution identity and App Store profile, matching bundle/team/entitlements/version/build. Inspect signature, profile validity and asset/SDK/manifests identity; never substitute simulator/development/ad-hoc binaries.\n'
             '5. Re-audit final device package with current source evidence. Original audit tool0bdc228 is pinned to1019c38; current static report records a temporary commit-pin adaptation. Prepare explicit e364fc3 source and15-asset manifests (or new approved candidate evidence after privacy changes), adapt the accepted pin in isolated staging, and record tool provenance. Do not run the historical default and label it e364fc3. Framework thinning/signing may change bytes; verify locked input provenance, Mach-O UUIDs and manifests.\n'
             '6. Observe native SDK network behavior, finish device/VoiceOver/Dynamic Type and relevant file/provider checks, and align approved metadata/effective public policies with the exact final App. Select matching native screenshots; duplicated chart captures are alternatives, not distinct screens.\n'
             '7. Only the authorized account coordinator validates the archive with Apple and submits after gates pass. Then review Apple-computed age/privacy/export fields and approved storefront/release choices. No Store upload, Library transfer or public hosting is authorized in this assembly.10/11 Asia/Taipei remains a target, not guaranteed approval.\n')
    (OUT / 'distribution-next-steps.txt').write_text(steps)
    decisions = '\n\n'.join(row['field'] + '\n建議／已知：' + row['proposed'] + '\n狀態：' + row['status'] + '\n需要：' + row['needed'] for row in plan['proposedAndRemainingDecisions'])
    (OUT / 'owner-decisions.txt').write_text('e364fc3本機審閱草稿\n\n' + native_summary + '\n' + remaining + '\n\n' + decisions + '\n\n原始null欄位完整保留，見submission-plan.json及content.json。\n')
    (OUT / 'screenshot-review.txt').write_text('e364fc3英文原生截圖：兩尺寸各8張，無alpha，原像素／SHA保留。\nPro Max21筆、Pro4筆合成資料；未注入App storage。核心英文，细部命盤術語、系統日期／部分Files metadata仍中文。\n五張推薦只作選圖草稿，未批准／上傳；重複SHA組見screenshot-duplicate-groups.json。完整16圖见screenshots.json。\n舊25 PNG及1019c38 ZIP保留原位置／bytes，未混入目前英文候選畫面。\n')
    readme = ('LOCAL REVIEW ONLY — e364fc3\n\nOpen index.html. This versioned kit binds17 runtime sources,15 packaged assets,4 locked SDK inputs,3 privacy manifests, native QA and16 raw screenshots to the same tested simulator candidate.\n'
              'candidate/App.app is the exact tested simulator Release with existing local ad-hoc signing, NOT a device/distribution upload artifact. Full file inventory and deterministic tree hash are in candidate/app-files.json.\n'
              'Confirmed publisher/copyright owner name: Kurt Chiang; public brand lwbro; support and expressly confirmed App Review email lwbro@me.com. Unknown legal/support/final declaration values remain null. New legal name is NOT yet packaged in app privacy.\n'
              'Failed-before cold-start evidence, runner locator failures and actual executed methods remain in evidence. Static audit nativeUIVerified=false is its own static scope; native QA is separately linked to the identical package.\n'
              'No new tests/builds, UI, Apple accounts, phone, credentials, installs, purchases, uploads, Library transfers or attachment sending during assembly. Original old ZIP and failures are preserved.\n'
              'Follow distribution-next-steps.txt through the authorized coordinator. Policies remain unpublished and ineffective; App Store readiness is not claimed.\n')
    (OUT / 'README.txt').write_text(readme)
    cards = ''.join('<article><a href="' + r['path'] + '"><img src="' + r['path'] + '" alt="' + html.escape(r['captionEn']) + '"></a><h3>' + html.escape(r['captionZh']) + '</h3><p>' + r['device'] + ' · ' + str(r['width']) + '×' + str(r['height']) + '</p></article>' for r in screens)
    rows = ''.join('<tr>' + ''.join('<td>' + html.escape(row[k]) + '</td>' for k in ['field', 'proposed', 'status', 'needed']) + '</tr>' for row in plan['proposedAndRemainingDecisions'])
    technical_rows = ''.join('<tr>' + ''.join('<td>' + html.escape(row[k]) + '</td>' for k in ['field', 'draft', 'evidence', 'status']) + '</tr>' for row in technical['rows'])
    body = ('<h1>紫微八字｜e364fc3 本機審閱包</h1><div class="notice">核心原生QA與16張合成資料截圖已完成。仍待final distribution、有效政策、owner空欄位及實機驗證；沒有上傳或提交。</div>'
            '<section><h2>精確候選</h2><p>' + native_summary + '</p><p>' + remaining + '</p><p><a href="candidate-identity.json">來源／App／SDK／manifest身份與SHA</a> · <a href="evidence/native-english-completion.json">原生QA完整記錄</a> · <a href="evidence/native-english-fixed-package-audit.json">精確技術稽核</a> · <a href="distribution-next-steps.txt">distribution必要步驟</a></p><p>App內privacy尚未包含最新法定姓名。SDK內建HTTP能力仍存在，CSP不是native網路隔離證明。手機已安裝版仍9f737e0。</p></section>'
            '<section><h2>英文原生畫面</h2><p>Pro Max1320×2868、Pro1206×2622，各8檔；RGB無alpha。詳細術語及部分OS日期仍中文，命盤可水平捲動。選圖尚未批准，重複圖只選一張。</p><p><a href="screenshots.json">16圖SHA及來源</a> · <a href="primary-screenshots-draft.json">五張推薦草稿</a> · <a href="screenshot-duplicate-groups.json">相同像素組</a></p><div class="grid">' + cards + '</div></section>'
            '<section><h2>商店文案與未發布政策</h2><p><a href="listing.en-US.txt">英文listing</a> · <a href="listing.zh-Hant.txt">中文listing</a> · <a href="review-notes.en-US.txt">英文review notes</a> · <a href="review-notes.zh-Hant.txt">中文review notes</a></p><p><a href="privacy.en-US.html">Privacy草稿</a> · <a href="privacy.zh-Hant.html">隱私草稿</a> · <a href="support.en-US.html">Support草稿</a> · <a href="support.zh-Hant.html">支援草稿</a></p></section>'
            '<section><h2>已確認與空欄位</h2><p>法定發布者／版權姓名Kurt Chiang；lwbro／lwbro@me.com；審查email明確確認為lwbro@me.com。seller、審查姓名／電話、完整版權、policy URL／生效日、支援營運及最終聲明留空。</p><p><a href="submission-plan.json">完整計畫</a> · <a href="content.json">canonical內容／owner facts</a> · <a href="metadata-draft.json">metadata草稿</a> · <a href="owner-decisions.txt">待填文字版</a></p><div class="scroll"><table><tr><th>欄位</th><th>已知／提案</th><th>狀態</th><th>需要</th></tr>' + rows + '</table></div></section>'
            '<section><h2>技術問卷草稿</h2><p>靜態稽核不等於最終帳號答案或流量觀測。沒有代填Data Not Collected、年齡級別或法律答覆。</p><div class="scroll"><table>' + technical_rows + '</table></div></section>'
            '<section><h2>歷史與保存</h2><p>原1019c38審閱ZIP及25 PNG原樣保留於原位置；本包history保存舊canonical身份。Failed-before及修正後focused證據見evidence。全部合成資料，命理僅文化性詮釋，不作科學預測／醫療／財務建議。</p><p><a href="README.txt">使用說明</a> · <a href="history/content-1019c38.json">舊來源內容</a> · <a href="history/store-deliverables-1019c38.json">舊包身份</a></p></section>')
    (OUT / 'index.html').write_text(page('紫微八字 e364fc3 本機審閱', body))
    (OUT / 'submission-readiness.html').write_text(page('e364fc3 上架缺件', '<a href="index.html">← 本機審閱包</a><h1>尚未適合提交</h1><p>' + remaining + '</p><pre>' + html.escape(steps) + '</pre><div class="scroll"><table>' + rows + '</table></div>'))
    assert tree(OLD) == old_tree and digest(old_zip) == OLD_ZIP_SHA
    inventory = tree(OUT)
    write('package-files.json', {'files': inventory, 'manifestSelfExcluded': True})
    with zipfile.ZipFile(ZIP, 'x', zipfile.ZIP_DEFLATED) as archive:
        for p in sorted(OUT.rglob('*')):
            if p.is_file():
                archive.write(p, p.relative_to(OUT))
    result = {'assembledAtUtc': datetime.now(timezone.utc).isoformat(), 'runtimeSourceCommit': COMMIT,
              'materialsSourceCommit': qa['materialsHead'], 'directory': str(OUT), 'reviewIndex': str(OUT / 'index.html'),
              'zip': str(ZIP), 'sha256': digest(ZIP), 'bytes': ZIP.stat().st_size,
              'files': len(tree(OUT)), 'candidateApp': identity['artifactPath'], 'appTreeSHA256': app_tree_sha,
              'appBinarySHA256': identity['binaries']['App'], 'screenshots': 16,
              'oldReviewDirectoryBytesPreserved': True, 'oldZIP': str(old_zip), 'oldZIPsha256': OLD_ZIP_SHA,
              'ownerUnknownValuesPreserved': True, 'distributionVerified': False,
              'localOnlyNoLibraryExternalUploadOrAttachmentSending': True}
    (BUILD / 'store-deliverables.e364fc3.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()

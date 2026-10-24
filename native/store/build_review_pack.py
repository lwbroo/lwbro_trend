#!/usr/bin/env python3
"""Build local, unpublished store-review materials from verified candidate facts."""
from pathlib import Path
import html
import json
import shutil
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'native/store/review-kit'
D = json.loads((OUT / 'content.json').read_text())
E = html.escape
BRAND = D['ownerValues']['publicOperatorBrand']
EMAIL = D['ownerValues']['supportEmail']
LEGAL_OWNER = D['ownerValues']['legalOwner']
COPYRIGHT_OWNER = D['ownerValues']['copyrightOwnerName']
CONTACT_ZH = f'法定發布者：{LEGAL_OWNER}；版權姓名：{COPYRIGHT_OWNER}；公開品牌／營運稱呼：{BRAND}；支援信箱：{EMAIL}。'
CONTACT_EN = f'Legal publisher: {LEGAL_OWNER}; copyright owner name: {COPYRIGHT_OWNER}; public-facing operator/brand: {BRAND}; support email: {EMAIL}.'
CSS = '''*{box-sizing:border-box}body{margin:0;background:#faf7f1;color:#29231e;font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1120px;margin:auto;padding:32px 24px 64px}h1,h2,h3{line-height:1.25}h1{font-size:36px;margin:10px 0}h2{font-size:24px;margin:0 0 16px}h3{font-size:18px}a{color:#8c2526}nav{display:flex;gap:16px;flex-wrap:wrap;margin:20px 0}.card{padding:24px;background:#fff;border:1px solid #e3d9c9;border-radius:18px;margin:20px 0}.notice{padding:16px 20px;background:#fff2d9;border:1px solid #d9bc7c;border-radius:12px}.badge{display:inline-block;padding:3px 10px;border:1px solid #bd9c61;border-radius:99px;color:#764d21;font-size:12px;letter-spacing:.04em}.hero{display:flex;gap:24px;align-items:center}.icon{width:110px;border-radius:24px}.muted{color:#675e55}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}.tile{padding:18px;border:1px solid #e3d9c9;border-radius:12px;background:#fff}.tile img{width:100%;height:340px;object-fit:contain;background:#f6f2ec;border-radius:8px}.tile a{display:block}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;background:#fbf9f5;padding:14px;border-radius:8px}table{border-collapse:collapse;min-width:950px;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #e7e0d6;padding:12px}th{background:#f7f1e5}.table-wrap{overflow:auto}button{padding:10px 18px;background:#fff;border:1px solid #bdb1a0;border-radius:8px;font:inherit;color:#5c3a24;cursor:pointer}button[aria-pressed=true]{background:#8c2526;color:#fff}.lang-panel[hidden]{display:none}.links{display:flex;gap:14px;flex-wrap:wrap}li{margin:8px 0}footer{font-size:13px;color:#675e55;margin-top:36px}@media(max-width:760px){main{padding:24px 16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}h1{font-size:28px}.hero{gap:16px}.icon{width:76px}.card{padding:18px}}@media(max-width:440px){.grid{grid-template-columns:1fr}}'''

def page(title, body, lang='zh-Hant'):
    return f'<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{E(title)}</title><style>{CSS}</style></head><body><main>{body}</main></body></html>'

def sections(items):
    return ''.join(f'<section class="card"><h2>{E(title)}</h2>{"".join(f"<p>{E(text)}</p>" for text in paragraphs)}</section>' for title, paragraphs in items)

privacy = {
 'zh-Hant': [
  ('適用範圍', ['本草稿只描述紫微八字目前的 iPhone 離線首版（1.0／build 1）。法定發布者及版權姓名已確認為Kurt Chiang；Apple seller核對、生效日期與公開網址仍待確認；本頁尚未發布。AI 或同步若日後加入，政策需先依新資料流程更新。']),
  ('你在裝置上輸入的資料', ['姓名可選填；出生日期、時間與性別用於傳統排盤。每日日期、心情、精力、標籤、筆記及更新時間用於記錄與統計觀察。這些資料保存在 App 的本機儲存空間，命盤和統計在裝置上計算。', '此離線版不會將出生資料或日誌交給開發者；沒有 AI 服務、App 雲端同步、廣告追蹤或自動診斷回報。核心曆法與排盤程式隨 App 提供。']),
  ('匯出與選擇分享', ['JSON 備份包含出生資料、日誌與匯出資訊；CSV 包含日誌與推算的流日欄位。分享前請自行確認內容。檔案先寫入專用暫存目錄，完成或取消分享後清除；中斷的暫存匯出會在下次啟動清理。', 'iOS 分享面板只將檔案交給你選擇的目的地。若選擇第三方 App 或雲端服務，該目的地可能保存、上傳或使用檔案，其政策適用。App 內清除資料不會刪除已保存或分享出去的副本。']),
  ('匯入與復原', ['JSON 匯入只讀取你選擇的本機／Files 檔案；來源檔不被 App 修改。支援 UTF-8 .json，檔案上限 5 MB。完整內容先驗證，再依日期合併記錄；較新的更新時間優先，本機已有出生資料時予以保留。取消或非法檔不改動現有記錄。']),
  ('保存與刪除', ['本機出生資料與日誌會保留到你編輯、刪除單日，或在「設定 → 清除全部資料」移除為止。該操作刪除 App 中的出生資料與記錄；請在 Files 或所選目的地另行刪除備份。移除 App 或清除其儲存空間可能使未備份資料遺失。', 'iOS／裝置備份可能依你的系統設定處理 App 儲存。此 App 沒有自行同步功能，不代表所有系統備份永遠只在手機上。']),
  ('外部連結與主動聯絡', ['若你自行開啟外部連結，目的網站可能依自己的政策處理連線資訊。若你主動透過支援管道提供訊息或附件，收件者會取得你提供的內容。請避免傳送出生資料、私人筆記或未遮蔽的 JSON 備份。', '支援訊息的保留期限與刪除處理流程尚待確認；沒有承諾固定期限或自動刪除。政策生效日期未定，本草稿不能作為已生效的公開政策。']),
  ('詮釋與聯絡', ['命理是文化性詮釋，日誌圖表與歷史平均預覽是相關性觀察，沒有科學驗證的預測效力，也不構成醫療、心理健康或財務建議。輸入時間未做出生地時區、夏令時間不存在／重複時刻判別或真太陽時校正。', CONTACT_ZH + ' lwbro為公開品牌；完整版權文字／年份及Apple seller帳號名稱與是否相符仍待確認。生效日期待定。'])],
 'en-US': [
  ('Scope', ['This draft describes the current approved offline iPhone release of Ziwei Bazi Journal (1.0, build 1). The legal publisher and copyright owner name are confirmed as Kurt Chiang. Apple seller account verification, the effective date, and public URL remain pending. This page is unpublished. Any future AI or sync feature requires an updated policy matching its data flows.']),
  ('Information entered on your device', ['An optional name and your entered birth date, time, and gender are used for traditional charts. Dates, mood, energy, tags, notes, and update times are used for journaling and statistics. They are stored in the app on your device; charts and statistics are computed locally.', 'The offline first release does not send birth information or journal entries to the developer. It has no AI service, app cloud sync, advertising tracking, or automatic diagnostic reporting. Core calendar and chart code is bundled.']),
  ('Export and sharing you choose', ['JSON backups contain birth information, journal records, and export information. CSV files contain journal and derived calendar fields. Review content before sharing. Exports are written to a dedicated temporary directory and removed after completion/cancellation; interrupted temporary exports are cleaned at the next startup.', 'The iOS share sheet delivers files to the destination you choose. A selected app or cloud service may retain, upload, or use the file under its own policies. Clearing app data does not delete saved or shared copies.']),
  ('Import and restoration', ['Import reads a selected file locally and does not modify the source file. UTF-8 .json backups up to 5 MB are supported. The whole backup is validated before records are merged by date; a newer update time takes priority, and an existing local birth profile is retained. Cancellation or invalid input does not change existing records.']),
  ('Retention and deletion', ['Local birth information and records remain until you edit, delete an entry, or use Settings → Clear All Data. That action removes the birth profile and records in the app. Delete backups separately in Files or the chosen destination. Uninstalling the app or clearing its storage may lose data that was not backed up.', 'System/device backups may handle app storage according to your settings. No app sync feature is enabled; this does not guarantee that every system backup stays only on the phone.']),
  ('External links and voluntary contact', ['A website you choose to open may handle connection information under its own policies. If you voluntarily contact support or send attachments, the recipient receives what you provide. Avoid sending birth details, private notes, or unredacted JSON backups.', 'The retention period and deletion procedure for support messages require confirmation. No fixed retention period or automatic deletion is promised. The effective date remains unset; this draft is not an effective public policy.']),
  ('Interpretation and contact', ['Astrological content is cultural interpretation. Journal charts and historical-average previews describe associations, have no scientifically validated predictive accuracy, and do not provide medical, mental-health, or financial advice. Birthplace time-zone conversion, DST gap/overlap handling and true-solar-time correction are not implemented. International birth data must not be described as producing a corrected chart.', CONTACT_EN + ' lwbro is the public brand. The full copyright text/year and Apple seller account identity/match remain unconfirmed. The effective date is unset.'])]
}
support = {
 'zh-Hant': [
  ('快速開始', ['1. 到設定填入國曆出生日期、時間與性別；姓名可選填，按「儲存並排盤」。2. 在本命盤查看傳統命盤。3. 在今日流運選定日期，保存心情、精力、標籤與筆記。4. 至少兩筆記錄可看趨勢。5. 換裝置或刪除 App 前，先匯出 JSON 備份。']),
  ('AI 或同步為何不能使用？', ['本離線首版沒有 AI 服務、App 雲端同步或帳號登入。正式導覽不含 AI、同步或登入入口。此頁不承諾未來服務或推出時間。']),
  ('如何備份與復原？', ['在記錄頁匯出 JSON，使用 iOS 分享面板選擇本機 Files 或你自行選定的目的地。復原使用「匯入 JSON」：UTF-8 .json、最多 5 MB。CSV 供外部檢視，不能作為 App 匯入格式。', '匯入會依日期合併；同日期較新的更新時間優先，本機出生資料若已存在會保留。這不是整份覆蓋復原。先備份再進行你打算的資料整理。']),
  ('趨勢或預覽為何沒有資料？', ['趨勢圖至少需要兩筆記錄。歷史平均流日預覽需要至少 10 筆有相應心情／精力指標的記錄。篩選期間、缺少指標或分組樣本不足都會影響結果。這些數值是個人紀錄的統計參考。']),
  ('出生時間與命盤差異', ['此版直接使用輸入的日期與時間，未做出生地時區、夏令時間不存在／重複時刻判別或真太陽時校正。流日參考所選日期中午 12:00；節氣交接日不同時段、安星規則或流派設定可能呈現不同結果。命理內容是文化性詮釋。']),
  ('刪除資料與遇到匯入問題', ['「設定 → 清除全部資料」刪除 App 內出生資料與記錄；備份副本須在 Files 或目的地另刪。遇到匯入問題時，先保留原有資料與備份，取消面板後再確認檔案格式和大小。不要靠刪除 App 來測試復原。']),
  ('聯絡支援', [CONTACT_ZH + ' 你可自行寄信聯絡；本地草稿沒有送出表單，App 不會自動寄信或傳送問題。公開 HTTPS 支援網址尚未指定，本頁尚未發布。', '回報時提供版本、iOS 版本、操作步驟與遮蔽敏感內容的畫面即可；請不要寄真實出生資料、私人筆記或完整備份。'])],
 'en-US': [
  ('Getting started', ['1. In Settings, enter a Gregorian birth date, time, and gender; the name is optional. Save to generate charts. 2. Open Birth chart. 3. Select a date in Daily and save mood, energy, tags, and notes. 4. With at least two entries, view Trends. 5. Export a JSON backup before changing devices or removing the app. Use the Language control to choose English or Traditional Chinese. Traditional chart names remain in Chinese.']),
  ('Why is AI or sync unavailable?', ['The offline first release has no AI service, app cloud sync, account, or login. Release navigation has no AI, sync or login entry points. This page makes no commitment about a future service or launch date.']),
  ('Backup and restoration', ['Export JSON from Entries and choose local Files or a destination you select in the iOS share sheet. Import accepts UTF-8 .json up to 5 MB. CSV is for external viewing and cannot be imported into the app.', 'Import merges by date, preferring a newer update time and retaining an existing local birth profile. It does not replace the whole database. Keep a backup before intentional data changes.']),
  ('Why are charts or previews empty?', ['Trend charts need at least two records. The historical-average day preview needs at least 10 records with the selected metric. Date filters, missing mood/energy values, and small groups affect results. Values are statistical references from your own journal.']),
  ('Birth times and chart differences', ['The app uses the date and time as entered, without birthplace time-zone conversion, DST gap/overlap handling or true-solar-time correction. Global availability does not establish validated worldwide calculations. Daily calculations refer to noon on the selected date. Solar-term transition times and different chart rules or traditions can produce different results. Interpretations are cultural content.']),
  ('Deletion and import problems', ['Settings → Clear All Data removes the birth profile and journal records in the app. Delete saved backups separately in Files or the destination. If import fails, retain current data and backups, cancel the picker, and check the format and size. Do not uninstall as a restoration test.']),
  ('Contact support', [CONTACT_EN + ' You may choose to email support. This local draft has no submission form, and the app sends no email or support information automatically. An authorized public HTTPS support URL is still needed; this page is unpublished.', 'For a report, provide the app version, iOS version, steps, and a redacted screenshot. Do not send actual birth information, private notes, or complete backups.'])]
}

OUT.mkdir(parents=True, exist_ok=True)
for language, fields in D['localizations'].items():
    listing='\n\n'.join(f'{key}\n{fields[key]}' for key in ['name','subtitle','promotionalText','keywords','description'])+'\n'
    (OUT / f'listing.{language}.txt').write_text(listing)
    (OUT / f'review-notes.{language}.txt').write_text(fields['reviewNotes']+'\n')
    for kind, all_sections in [('privacy',privacy),('support',support)]:
        title = ('隱私政策草稿' if kind=='privacy' else '支援頁草稿') if language=='zh-Hant' else ('Privacy policy draft' if kind=='privacy' else 'Support page draft')
        notice = '草稿・未發布。法定發布者／版權姓名Kurt Chiang、公開品牌與支援信箱已確認；Apple seller核對、政策生效日期與公開 URL 待確認。' if language=='zh-Hant' else 'Unpublished draft. Publisher/copyright owner name Kurt Chiang, public brand, and support email are confirmed; Apple seller verification, policy effective date, and public URL remain pending.'
        body=f'<a href="index.html">← Review kit</a><h1>{title}</h1><div class="notice">{notice}</div>'+sections(all_sections[language])+f'<footer>Offline first release 1.0 / build 1 · <a href="{kind}.{"en-US" if language=="zh-Hant" else "zh-Hant"}.html">中文 / English</a></footer>'
        (OUT / f'{kind}.{language}.html').write_text(page(title,body,language))
shutil.copyfile(ROOT/'native/ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',OUT/'icon-candidate.png')

limits={'name':30,'subtitle':30,'promotionalText':170,'keywords':100,'description':4000}
checks=[]
for lang,f in D['localizations'].items():
    for field,maximum in limits.items():
        count=len(f[field].encode('utf-8')) if field=='keywords' else len(f[field])
        assert count<=maximum,(lang,field,count,maximum)
        checks.append({'language':lang,'field':field,'count':count,'limit':maximum,'unit':'UTF-8 bytes' if field=='keywords' else 'characters'})
        if field=='keywords': assert all(len(term)>2 for term in f[field].split(','))

panels=[]
labels={'name':'名稱 / Name','subtitle':'副標題 / Subtitle','promotionalText':'宣傳文字 / Promotional text','keywords':'關鍵字 / Keywords','description':'描述 / Description','reviewNotes':'審查說明 / Review notes'}
for lang,f in D['localizations'].items():
    fields=''.join(f'<h3>{labels[k]}</h3><pre>{E(f[k])}</pre>' for k in labels)
    panels.append(f'<div class="lang-panel" data-language="{lang}" {"hidden" if lang=="en-US" else ""}><p class="links"><a href="listing.{lang}.txt">下載文案 TXT</a><a href="review-notes.{lang}.txt">審查備註 TXT</a></p>{fields}</div>')
rows=''.join('<tr>'+''.join(f'<td>{E(str(row[k]))}</td>' for k in ['feature','data','storage','destination','control','source'])+'</tr>' for row in D['dataFlows'])
flow='<div class="table-wrap"><table><thead><tr>'+''.join(f'<th>{s}</th>' for s in ['功能','資料','儲存／處理','目的地','使用者控制','本機來源'])+'</tr></thead><tbody>'+rows+'</tbody></table></div>'
screen_manifest = json.loads((OUT/'screenshots.json').read_text()) if (OUT/'screenshots.json').exists() else []
gallery=''.join(f'<article class="tile"><a href="{E(s["path"])}"><img loading="lazy" src="{E(s["path"])}" alt="{E(s["captionZh"])}"></a><h3>{E(s["captionZh"])}</h3><p>{E(s["captionEn"])}</p><p class="muted">{E(s["purpose"])} · {s["width"]} × {s["height"]}</p></article>' for s in screen_manifest if s.get('recommended',False))
additional=''.join(f'<article class="tile"><a href="{E(s["path"])}"><img loading="lazy" src="{E(s["path"])}" alt="{E(s["captionZh"])}"></a><h3>{E(s["captionZh"])}</h3><p>{E(s["purpose"])}</p><p class="muted">{s["width"]} × {s["height"]}</p></article>' for s in screen_manifest if not s.get('recommended',False))
if not gallery: gallery='<p class="muted">原始截圖待收集與視覺核對；尚未把缺少的素材標為完成。</p>'
source_links=''.join(f'<li><a href="{E(s["url"])}">{E(s["title"])}</a></li>' for s in D['sources'])
submission_path=OUT/'submission-plan.json'
if submission_path.exists():
    submission=json.loads(submission_path.read_text())
    # Keep the downloadable decisions synchronized with their canonical JSON.
    owner_lines = [
        '紫微八字上架：可審閱建議值與剩餘決定', '',
        '已確認：免費離線首版、US優先／全球產品目標、lwbro／lwbro@me.com；2026-10-08法定發布者／版權姓名Kurt Chiang及審查email lwbro@me.com。',
        '已安裝版本仍為9f737e0 development 1.0/build1；1019c38英文核心候選通過75／25／165／35背景檢查及generic unsigned simulator編譯，未安裝／完成原生UI重測。',
        '下一個帳號 gate：' + submission['nextAccountStep'], ''
    ]
    for number, row in enumerate(submission['proposedAndRemainingDecisions'], 1):
        owner_lines.extend([f'{number}. {row["field"]}', '   建議／已知：' + row['proposed'],
                            '   狀態：' + row['status'], '   需要：' + row['needed'], ''])
    owner_lines.extend(['工程gate：', *('• ' + gate for gate in submission['engineeringGates']), '',
                        '簽名紀錄為先前只讀檢查：development identity 1、distribution identity 0、Ziwei只有development profile。帳號內既有／雲端能力未知，沒有建立憑證或變更權限。',
                        '最新英文候選已跑合成背景檢查；原生UI、手機、帳號、時區演算法、上傳及提交仍未操作。既有206bbbb只讀檢查另保留來源。'])
    checkpoint = submission.get('readinessCheckpoint')
    if checkpoint:
        owner_lines.extend(['', '1019c38準備狀態：' + checkpoint['status'],
                            'QA整理：' + checkpoint['report'], '最少owner待填／確認：',
                            *('• ' + item for item in checkpoint['minimumOwnerInputGroups']),
                            checkpoint['deferredCalculationDecision']])
    (OUT/'owner-decisions.txt').write_text('\n'.join(owner_lines) + '\n')
    if submission.get('followupEnglishCandidate'):
        owner_lines = (OUT/'owner-decisions.txt').read_text() + '\n英文候選補充：核心五分頁英文／繁中已實作；傳統命盤名稱保留中文。原生UI未驗證。見native/qa/ENGLISH_CORE_IMPLEMENTATION.md。\n'
        (OUT/'owner-decisions.txt').write_text(owner_lines)
    technical = D.get('technicalQuestionnaireDraft')
    if technical:
        owner_text = (OUT/'owner-decisions.txt').read_text() + '\n工程技術問卷草稿（未提交／未批准；精確候選static核對，不代表最終device包）：\n'
        for row in technical['rows']:
            owner_text += '\n' + row['field'] + '\n   草稿：' + row['draft'] + '\n   證據：' + row['evidence'] + '\n   限制／狀態：' + row['status'] + '\n'
        owner_text += '\n唯讀核對方法：' + technical['reproduce'] + '\n2026-10-08已確認法定發布者／版權姓名Kurt Chiang及審查email lwbro@me.com；審查姓名／電話、seller帳號核對、完整版權文字／年份、支援營運／政策主機及最終聲明仍待提供／確認。\n'
        (OUT/'owner-decisions.txt').write_text(owner_text)
    columns=['field','proposed','status','needed']
    decision_rows=''.join('<tr>'+''.join(f'<td>{E(row[k])}</td>' for k in columns)+'</tr>' for row in submission['proposedAndRemainingDecisions'])
    declarations='<div class="table-wrap"><table><thead><tr>'+''.join(f'<th>{s}</th>' for s in ['欄位','建議值／已知事實','批准狀態','需要你決定或提供'])+'</tr></thead><tbody>'+decision_rows+'</tbody></table></div>'
    gates='<ul>'+''.join(f'<li>{E(s)}</li>' for s in submission['engineeringGates'])+'</ul>'
    references='<ul>'+''.join(f'<li><a href="{E(s["url"])}">{E(s["title"])}</a></li>' for s in submission['sources'])+'</ul>'
    submission_body='<a href="index.html">← Review kit</a><h1>紫微八字｜上架建議值與待決聲明</h1><div class="notice">免費離線首版已批准；此頁是審閱提案。development版已安裝，尚無distribution上傳包、有效公開政策或最終帳號聲明。沒有上傳或提交。</div>'
    if checkpoint:
        submission_body += '<section class="card"><h2>1019c38 現況與歷史證據</h2><p>' + E(checkpoint['status']) + '</p><p>' + E(checkpoint['existingVerification']) + '</p><p>' + E(checkpoint['priorNativeFiles']) + '</p><p>206bbbb的歷史檢查當時未有英文流程。最新候選已實作英文／繁中核心切換，傳統命盤名稱保留中文；候選原生UI、鍵盤與實機可及性仍待驗證。全球出生時區演算法保留待決。</p><h3>最少使用者待填／確認</h3><ul>' + ''.join('<li>' + E(item) + '</li>' for item in checkpoint['minimumOwnerInputGroups']) + '</ul></section>'
    if technical:
        technical_rows = ''.join('<tr>' + ''.join('<td>' + E(row[k]) + '</td>' for k in ['field','draft','evidence','status']) + '</tr>' for row in technical['rows'])
        submission_body += '<section class="card"><h2>工程技術問卷草稿</h2><p>來源1019c38：15資產／4SDK binary／3manifest靜態核對通過，只有unsigned simulator包；不代表原生驗收或最終distribution包。SDK含native HTTP能力，CSP及空白manifest不能當成完全無網路的證明。以下由工程草擬，owner只需提供真實營運／身分事實。</p><div class="table-wrap"><table><thead><tr><th>題目</th><th>技術答案草稿</th><th>來源</th><th>限制／待辦</th></tr></thead><tbody>' + technical_rows + '</tbody></table></div><p>未操作帳號；最終收集標籤／加密及法律答覆未批准。</p></section>'
    submission_body+='<section class="card"><h2>下一個帳號 gate</h2><p>'+E(submission['nextAccountStep'])+'</p><p>本機有效development憑證1、distribution憑證0；八字profile只有development。帳號內既有／雲端發行能力尚未核對；不能從本機缺少推定帳號缺少。兩App的Apple Distribution憑證／App Store profiles建立已由Kurt明確授權，Glyco獨占辦理；此worker未操作或驗證完成。</p><p>瀏覽器操作限制保留；不改Chrome權限、不擷取cookies／tokens，不盲目重試。本人接手登入或協議。</p><p class="links"><a href="account-next-step.txt">精確手動下一步 TXT</a><a href="submission-plan.json">完整計畫 JSON</a></p></section>'
    submission_body+='<section class="card"><h2>可逐項審閱的欄位表</h2>'+declarations+'</section>'
    submission_body+='<section class="card"><h2>已有驗證及素材</h2><p>9f737e0 development Release 1.0／build1 已驗證嚴格簽章、entitlements、內嵌profile與14資產雜湊，含核准聯絡文字。真實iPhone確認安裝identity，基本launch成功且程序2秒存活；沒有完整畫面／Files／可及性通過的宣稱。</p><p>五張主截圖1320×2868、無alpha，保留原始SHA與合成資料。來源d9f9634，反映已安裝9f737e0之前的主畫面。本次UX候選修改安全區與設定提示，尚未重拍iOS截圖；全部既有截圖保留作歷史素材，候選提交前需重新核對／拍攝。舊隱私截圖只作歷史證據。圖示原件未改。</p><p class="links"><a href="upload-candidates/manifest.json">五張主截圖／SHA清單</a><a href="owner-decisions.txt">欄位與聲明 TXT</a></p></section>'
    submission_body+='<section class="card"><h2>不能由簽名或 owner 資料替代的工程 gate</h2>'+gates+'</section>'
    submission_body+='<section class="card"><h2>官方表單參考</h2>'+references+'</section>'
    (OUT/'submission-readiness.html').write_text(page('紫微八字上架建議值與待決聲明',submission_body))
body=f'''<div class="hero"><img class="icon" src="icon-candidate.png" alt="既有候選 App icon"><div><span class="badge">LOCAL REVIEW DRAFT</span><h1>紫微八字｜離線版上架素材</h1><p class="muted">Ziwei Bazi Journal · 1.0 / build 1 · 合成資料示範</p></div></div>
<div class="notice"><strong>Kurt 已確認離線首版與首版免費下載。</strong> 本套描述已選定的離線命盤、日誌、趨勢及備份版本，沒有 AI 服務或雲端同步。沒有公開發布頁面、App 上傳或帳號法律聲明。</div>
<nav><a href="#copy">中英文文案</a><a href="#screens">截圖</a><a href="#pages">隱私／支援</a><a href="#flows">資料流程</a><a href="#gates">待決定事項</a></nav>
<section class="card"><h2>目前到哪裡</h2><div class="grid"><div class="tile"><span class="badge">已有產物</span><h3>本機 Release</h3><p>9f737e0 development Release 已簽名、安裝，1.0／build 1，程序啟動後2秒仍運行。1019c38通過75語言／資料／英文版面、25草稿、165中文版面及35離線檢查，以及generic unsigned simulator編譯；15打包資產雜湊符合來源，原生UI仍未驗證。本輪文件更新未重跑。distribution 上傳包尚未具備。</p></div><div class="tile"><span class="badge">如實標示</span><h3>真實畫面、合成資料</h3><p>既有 iPhone native 截圖，來源保留於manifest；尚未反映本次UX候選。最新候選核心分頁可切換英文／繁中；傳統命盤名稱保留中文，尚未有新版iOS截圖。iPad 圖只保留前版相容模式參考。</p></div><div class="tile"><span class="badge">仍需完成</span><h3>候選原生／實機確認</h3><p>9f737e0模擬器已完成本機Files真實roundtrip與匯入保留。206bbbb更動controller，需待協調重測鍵盤／Files；實機及其他provider驗證仍開放。</p></div></div></section>
<section class="card" id="copy"><h2>可複製的中英文商店文案</h2><div class="links"><button data-lang="zh-Hant" aria-pressed="true">繁體中文</button><button data-lang="en-US" aria-pressed="false">English</button></div>{''.join(panels)}<p class="muted">名稱／副標題 30 字、宣傳文字 170 字、描述 4000 字、關鍵字 100 UTF-8 bytes 已核對；字數見 <a href="metadata-checks.json">欄位檢查</a>。</p></section>
<section class="card" id="screens"><h2>歷史原生截圖與待重拍英文文案</h2><p>合成出生資料與 21 筆示範記錄；沒有 AI 輸出。6.9 吋 iPhone 是主要尺寸。命盤左右操作與記錄卡已在大、小 iPhone 模擬器驗證；先前已拍五個離線入口；尚未重拍1019c38英文候選。下方中文原始圖不是英文素材；待拍英文標題及要求見逐張審查TXT。AI／同步不出現在正式導覽。</p><div class="grid">{gallery}</div><p><a href="screenshots.json">全部截圖、尺寸、來源與 SHA256</a> · <a href="screenshot-review.txt">逐張審查與已排除素材</a></p><details><summary>其餘歷史畫面：操作證據、小 iPhone，以及前版 iPad 參考</summary><div class="grid">{additional}</div></details></section>
<section class="card" id="pages"><h2>隱私與支援頁草稿</h2><p class="links"><a href="privacy.zh-Hant.html">隱私中文</a><a href="privacy.en-US.html">Privacy English</a><a href="support.zh-Hant.html">支援中文</a><a href="support.en-US.html">Support English</a></p><p>這些是可 review 的本機 HTML，沒有公開 URL。公開品牌為 lwbro，支援信箱為 lwbro@me.com。法定發布者／版權姓名已確認為Kurt Chiang；Apple seller核對、完整版權文字／年份、支援訊息保留／刪除做法與生效日期仍待確認。9f737e0 已安裝開發版含先前核准的品牌／支援信箱文字，未加入本次Kurt Chiang姓名；舊 d9f9634 unsigned archive／截圖保留原始來源，內部隱私畫面不作目前政策或商店圖。</p></section>
<section class="card" id="flows"><h2>功能與資料流程對照</h2>{flow}<p class="muted">本表描述離線首版；App Store 隱私宣告需按最終功能、所有平台與 SDK 行為確認。</p></section>
<section class="card" id="gates"><h2>需 Kurt 決定與剩餘動作</h2><p class="links"><a href="submission-readiness.html">具體建議值／聲明表</a><a href="submission-plan.json">可審閱上架計畫 JSON</a><a href="account-next-step.txt">下一個帳號步驟</a><a href="upload-candidates/manifest.json">五張主截圖候選</a></p><ol><li>離線首版與五個可用入口已確認；不再詢問 AI 是否必須同版提供。</li><li>首版免費下載已確認；另確認中英文名稱、候選圖示、發行地區與 Lifestyle 類別。後續商業模式僅探索，不啟用購買、廣告或 AI。</li><li>公開品牌 lwbro／支援信箱 lwbro@me.com 已確認；2026-10-08另確認法定發布者／版權姓名Kurt Chiang及審查email lwbro@me.com；仍需審查姓名／電話、Apple seller帳號核對、完整版權文字／年份及已授權隱私／支援 HTTPS 網址。政策生效日期與支援訊息保留／刪除方式待定。</li><li>App ID／開發profile已由本人建立，development安裝成功；App Store Connect紀錄與distribution簽名待核對，兩App的Apple Distribution憑證／App Store profiles建立已由Kurt明確授權，Glyco獨占辦理；此worker未操作或驗證完成。</li><li>在實際帳號確認年齡、所有平台的隱私、出口合規與發行方式。</li><li>development安裝及基本啟動完成；仍需協調Files／完整實機導航與可及性檢查，此輪不控制手機。</li></ol><p>已完成：完整記錄卡、命盤局部左右操作與鍵盤控制、分頁與編輯導航、離線服務隔離、AI／同步入口隱藏、本機備份文案與匯入失敗回復。首版範圍已確認；本次草稿保留／錯誤提示已通過背景瀏覽器檢查，原生鍵盤安全區修改只完成編譯。最近協調回報Mac鎖定／loginwindow、Glyco未持有模擬器；待解鎖並重新協調後重測1019c38語言切換、鍵盤、旋轉、隱私往返及Files；實機可及性及帳號資料尚未完成。</p><p class="links"><a href="offline-release-verification.txt">最新離線首版驗證</a><a href="layout-verification.txt">歷史版面里程碑</a><a href="owner-decisions.txt">完整待決定項目</a><a href="manual-iphone-checklist.txt">最小人工 checklist</a><a href="manual-fixtures/manifest.json">合成手檢檔案</a></p></section>
<section class="card"><h2>官方規則參考</h2><p>命理類別有 Apple 4.3(b) 差異化審查風險。可說明現有裝置內日誌、統計觀察與可攜備份用途；不能保證通過，也不能以 AI 或預測保證作為文案。隱私／支援 URL 與實際聯絡資料必須完成才可提交。</p><ul>{source_links}</ul></section>
<footer>本機素材草稿 · Bundle ID {E(D['bundleId'])} · 無公開發布、無上傳。原始 Library 圖示未修改。</footer>
<script>document.querySelectorAll('[data-lang]').forEach(button=>button.addEventListener('click',()=>{{document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));document.querySelectorAll('.lang-panel').forEach(p=>p.hidden=p.dataset.language!==button.dataset.lang)}}));</script>'''
(OUT/'index.html').write_text(page('紫微八字｜離線版上架素材',body))
(OUT/'metadata-checks.json').write_text(json.dumps({'checkedAtUtc':datetime.now(timezone.utc).isoformat(),'status':'all field-size limits passed; ownership and availability unverified','fields':checks},ensure_ascii=False,indent=2)+'\n')
print('Built bilingual listing/review TXT, four unpublished policy/support HTML pages, review index and metadata checks')

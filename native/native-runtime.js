/* Approved offline-first iPhone release: bundled charts, journal and local sharing. */
window.ZWBZ_NATIVE_OFFLINE = true;
document.documentElement.dataset.nativeRelease = 'offline';
if (window.ZWBZ_NATIVE_INSETS) {
  document.documentElement.style.setProperty('--native-safe-top', window.ZWBZ_NATIVE_INSETS.top + 'px');
  document.documentElement.style.setProperty('--native-safe-bottom', window.ZWBZ_NATIVE_INSETS.bottom + 'px');
}
const nativePolicy = document.createElement('meta');
nativePolicy.httpEquiv = 'Content-Security-Policy';
nativePolicy.content = "default-src 'self' data: blob:; connect-src 'none'; form-action 'none'; base-uri 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:";
document.head.appendChild(nativePolicy);
// Apply before body parsing so unavailable services never flash in navigation.
const nativeStyle = document.createElement('style');
nativeStyle.textContent = 'html[data-native-release="offline"] [data-tab="ai-chat"],html[data-native-release="offline"] #tab-ai-chat,html[data-native-release="offline"] #sync-card{display:none!important}html[data-native-release="offline"] .app-header{padding-top:calc(14px + max(env(safe-area-inset-top),var(--native-safe-top,0px)))} html[data-native-release="offline"] main{padding-bottom:calc(30px + max(env(safe-area-inset-bottom),var(--native-safe-bottom,0px)))} html[data-native-release="offline"] button,html[data-native-release="offline"] .file-label,html[data-native-release="offline"] input,html[data-native-release="offline"] select{min-height:44px} html[data-native-release="offline"] .tabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));overflow:visible} html[data-native-release="offline"] .tab{white-space:normal;padding:8px 4px} html[data-native-release="offline"] .hint{font-size:.875rem}';
document.head.appendChild(nativeStyle);
window.ZWBZ_NATIVE_EXPORT = async (filename, text) => {
  const share = window.Capacitor && window.Capacitor.Plugins.ShareExport;
  if (!share) throw new Error('原生分享功能無法使用');
  return share.share({ filename, text });
};
window.ZWBZ_NATIVE_IMPORT = async () => {
  const plugin = window.Capacitor && window.Capacitor.Plugins.ShareExport;
  if (!plugin) throw new Error('原生匯入功能無法使用');
  return plugin.importBackup();
};
document.addEventListener('DOMContentLoaded', () => {
  const banner = document.querySelector('#demo-banner');
  if (banner) {
    banner.hidden = false;
    banner.textContent = '離線排盤與個人日誌：資料保存在裝置，請定期匯出備份。';
  }
  const aiTab = document.querySelector('[data-tab="ai-chat"]');
  if (aiTab) aiTab.hidden = true;
  const aiPanel = document.querySelector('#tab-ai-chat');
  if (aiPanel) { aiPanel.hidden = true; aiPanel.inert = true; }
  const syncCard = document.querySelector('#sync-card');
  if (syncCard) { syncCard.hidden = true; syncCard.inert = true; }
  const storageHint = document.querySelector('#data-storage-hint');
  if (storageHint) storageHint.textContent = '資料保存在此 App 的裝置儲存空間。換裝置或移除 App 前，請先匯出 JSON 備份。iOS 系統備份與你選擇的分享目的地，依各自設定處理檔案。';
});

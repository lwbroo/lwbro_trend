/* localStorage 資料層：設定與用餐紀錄 */
const Store = (() => {
  const KEY_SETTINGS = "glyco.settings";
  const KEY_RECORDS = "glyco.records";

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SETTINGS)) || {};
    } catch {
      return {};
    }
  }

  function saveSettings(s) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
  }

  function getRecords() {
    try {
      return JSON.parse(localStorage.getItem(KEY_RECORDS)) || [];
    } catch {
      return [];
    }
  }

  function addRecord(rec) {
    const records = getRecords();
    records.unshift(rec);
    // localStorage 容量有限（約 5MB），縮圖已壓小，仍保留最近 200 筆為上限
    if (records.length > 200) records.length = 200;
    localStorage.setItem(KEY_RECORDS, JSON.stringify(records));
  }

  function deleteRecord(id) {
    localStorage.setItem(
      KEY_RECORDS,
      JSON.stringify(getRecords().filter(r => r.id !== id))
    );
  }

  function clearRecords() {
    localStorage.removeItem(KEY_RECORDS);
  }

  function exportJSON() {
    return JSON.stringify({ app: "glyco-order", exported_at: new Date().toISOString(), records: getRecords() }, null, 2);
  }

  return { getSettings, saveSettings, getRecords, addRecord, deleteRecord, clearRecords, exportJSON };
})();

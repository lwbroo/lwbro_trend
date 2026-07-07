# vendor — 排盤引擎函式庫

`index.html` 會優先載入此資料夾內的本地函式庫，找不到時自動改用 CDN（鎖定版本）。
想要**完全離線使用**，下載以下兩個檔案放進本資料夾即可：

```bash
curl -L -o vendor/lunar.js     https://cdn.jsdelivr.net/npm/lunar-javascript@1.7.7/lunar.js
curl -L -o vendor/iztro.min.js https://cdn.jsdelivr.net/npm/iztro@2.5.8/dist/iztro.min.js
```

或用 npm：

```bash
npm install lunar-javascript@1.7.7 iztro@2.5.8
cp node_modules/lunar-javascript/lunar.js vendor/
cp node_modules/iztro/dist/iztro.min.js vendor/
```

| 檔案 | 套件 | 用途 | 授權 |
|---|---|---|---|
| `lunar.js` | [lunar-javascript](https://github.com/6tail/lunar-javascript) 1.7.7 | 八字／農曆／節氣／流日干支 | MIT |
| `iztro.min.js` | [iztro](https://github.com/SylarLong/iztro) 2.5.8 | 紫微斗數排盤／流年流月流日四化 | MIT |

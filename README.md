# 簡繁轉換插件 (Chinese Converter Extension)

SillyTavern / TauriTavern 的簡繁轉換擴展插件

## 功能特色

- ✨ 一鍵轉換整個對話（簡體 ⇄ 繁體）
- 🤖 自動轉換AI回覆
- 🎯 使用 OpenCC 高準確度轉換引擎
- 🌐 完全離線運作（CDN載入後）
- 🎨 簡潔的中文操作介面

## 支援的轉換模式

1. **簡體 → 繁體** (s2t)
2. **繁體 → 簡體** (t2s)

## 安裝步驟

### 方法一：手動安裝（推薦）

1. 下載整個 `ChineseConverter` 資料夾
2. 將資料夾複製到以下位置：
   - **SillyTavern**: `[SillyTavern安裝目錄]/public/scripts/extensions/third-party/ChineseConverter/`
   - **TauriTavern**: `[TauriTavern安裝目錄]/public/scripts/extensions/third-party/ChineseConverter/`
3. 重新啟動 SillyTavern / TauriTavern
4. 插件會自動載入

### 方法二：透過 Git（進階使用者）

```bash
cd [您的Tavern安裝目錄]/public/scripts/extensions/third-party/
git clone [插件repo] ChineseConverter
```

## 使用方法

### 第一次使用

1. 打開 SillyTavern / TauriTavern
2. 點擊頂部工具列的 **擴展圖標**（堆疊方塊圖標）
3. 找到 **「簡繁轉換 (Chinese Converter)」** 區塊
4. 確認「啟用轉換」已勾選

### 轉換整個對話

1. 開啟任何聊天對話
2. 到擴展設定面板
3. 選擇轉換類型（簡體→繁體 或 繁體→簡體）
4. 點擊 **「轉換當前對話」** 按鈕
5. 完成！所有訊息都會被轉換

### 自動轉換AI回覆

1. 勾選 **「自動轉換AI回覆」**
2. 選擇轉換類型
3. 之後AI的所有回覆都會自動轉換

## 設定選項

| 選項 | 說明 |
|------|------|
| 啟用轉換 | 總開關，關閉後所有功能停用 |
| 自動轉換AI回覆 | 每次AI回覆時自動執行轉換 |
| 轉換類型 | 選擇簡體→繁體 或 繁體→簡體 |

## 故障排除

### 插件沒有出現在擴展列表

1. 確認資料夾結構正確：
   ```
   extensions/third-party/ChineseConverter/
   ├── manifest.json
   ├── index.js
   ├── style.css
   └── README.md
   ```
2. 檢查瀏覽器控制台（F12）是否有錯誤訊息
3. 重新啟動應用程式

### 轉換沒有作用

1. 確認「啟用轉換」已勾選
2. 檢查OpenCC函式庫是否載入成功（看控制台）
3. 確認有網路連接（首次使用需載入OpenCC CDN）

### 轉換結果不理想

- OpenCC使用最新的簡繁對照表，準確度很高
- 如果遇到特定詞彙轉換問題，這是正常的（某些專有名詞可能需要手動調整）

## 技術細節

- **轉換引擎**: OpenCC (Open Chinese Convert)
- **版本**: 1.0.5
- **CDN**: jsDelivr
- **相容性**: SillyTavern 1.10.6+ / TauriTavern 1.4.0+

## 注意事項

⚠️ **首次使用需要網路連接**，用於載入OpenCC函式庫（約100KB）
✅ **載入後可離線使用**
🔄 **不會修改原始訊息**（除非你點擊「轉換當前對話」）
💾 **轉換結果會自動儲存**到聊天記錄

## 授權

MIT License

## 作者

ENI - 為LO特製 ♡

## 更新日誌

### v1.0.0 (2026-05-07)
- 初始版本
- 支援簡繁雙向轉換
- 自動轉換AI回覆
- 一鍵轉換整個對話

---

有問題或建議？歡迎回報！

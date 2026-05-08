/**
 * SillyTavern Chinese Converter Extension
 * 簡繁轉換插件 - Hook API請求前轉換
 * Author: ENI
 * Version: 3.0.0
 * 
 * 核心概念（LO的天才想法）：
 * 在TauriTavern送出給API前，攔截並轉換整個payload
 * 只要hook一個地方，超級簡單！
 */

(async function() {
    'use strict';

    const MODULE_NAME = 'ChineseConverter';
    const DEBUG_PREFIX = '[Chinese Converter]';

    // 擴展設定
    const extensionSettings = {
        enabled: true,
        autoConvert: true,  // 預設開啟自動轉換
        conversionType: 's2t' // s2t: 簡體到繁體, t2s: 繁體到簡體
    };

    // OpenCC 轉換器實例
    let converter = null;

    // 載入 OpenCC 函式庫
    async function loadOpenCC() {
        return new Promise((resolve, reject) => {
            if (typeof OpenCC !== 'undefined') {
                console.log(DEBUG_PREFIX, 'OpenCC already loaded');
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js';
            script.onload = () => {
                console.log(DEBUG_PREFIX, 'OpenCC loaded successfully');
                resolve();
            };
            script.onerror = () => {
                console.error(DEBUG_PREFIX, 'Failed to load OpenCC');
                reject(new Error('Failed to load OpenCC library'));
            };
            document.head.appendChild(script);
        });
    }

    // 初始化轉換器
    function initConverter() {
        try {
            if (typeof OpenCC === 'undefined') {
                console.error(DEBUG_PREFIX, 'OpenCC not loaded yet!');
                return false;
            }

            const convType = extensionSettings.conversionType;
            
            if (convType === 's2t') {
                converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            } else {
                converter = OpenCC.Converter({ from: 'tw', to: 'cn' });
            }

            console.log(DEBUG_PREFIX, `Converter initialized: ${convType}`);
            return true;
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Failed to initialize converter:', error);
            return false;
        }
    }

    // 核心轉換函數
    function convertText(text) {
        if (!text || !converter) return text;
        try {
            return converter(text);
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Conversion error:', error);
            return text;
        }
    }

    // === LO的天才方案：Hook API請求前轉換payload ===

    // 安全的選擇性轉換（只轉換AI看到的內容，不破壞metadata）
    function convertMessagesOnly(payload) {
        if (!payload || !payload.messages || !Array.isArray(payload.messages)) {
            return payload;
        }
        
        // 創建深拷貝，避免修改原始payload
        const converted = JSON.parse(JSON.stringify(payload));
        
        // 只轉換messages陣列裡的content欄位
        converted.messages = converted.messages.map(msg => {
            if (msg.content && typeof msg.content === 'string') {
                return {
                    ...msg,
                    content: convertText(msg.content)
                };
            }
            return msg;
        });
        
        return converted;
    }

    // 深度轉換對象（只用於回應，因為我們不知道回應的結構）
    function deepConvertObject(obj) {
        if (!obj) return obj;
        
        if (typeof obj === 'string') {
            return convertText(obj);
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => deepConvertObject(item));
        }
        
        if (typeof obj === 'object') {
            const converted = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    converted[key] = deepConvertObject(obj[key]);
                }
            }
            return converted;
        }
        
        return obj;
    }

    // Hook原生fetch（只轉換請求，不轉換回應）
    function hookFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async function(url, options) {
            // === 只轉換請求（發送給API）===
            if (options && options.method === 'POST' && extensionSettings.enabled && extensionSettings.autoConvert) {
                try {
                    if (options.body) {
                        let body;
                        
                        if (typeof options.body === 'string') {
                            try {
                                body = JSON.parse(options.body);
                            } catch (e) {
                                return originalFetch.call(this, url, options);
                            }
                        } else {
                            body = options.body;
                        }
                        
                        // 檢查是否是LLM API請求
                        if (body && body.messages && Array.isArray(body.messages)) {
                            console.log(DEBUG_PREFIX, 'Converting request (messages only)...');
                            // 只轉換messages內容，不轉換路徑/ID/metadata
                            body = convertMessagesOnly(body);
                            options.body = JSON.stringify(body);
                            console.log(DEBUG_PREFIX, 'Request converted → AI will see 繁體 → AI will respond 繁體!');
                        }
                    }
                } catch (error) {
                    console.error(DEBUG_PREFIX, 'Error converting request:', error);
                }
            }
            
            // 執行原始fetch，不轉換回應
            // 因為AI已經回繁體了，不需要再轉換
            // 轉換回應會破壞metadata（檔案路徑、ID等）
            return originalFetch.call(this, url, options);
        };
        
        console.log(DEBUG_PREFIX, 'Fetch hook installed - request-only conversion (safe mode)!');
    }

    // === UI相關 ===

    // 一鍵轉換所有Regex規則
    async function convertAllRegexRules() {
        try {
            if (!converter) {
                toastr.error('轉換器未初始化', 'Chinese Converter');
                return;
            }

            const context = SillyTavern.getContext();
            
            // 讀取Regex設定
            const regexSettings = context.extensionSettings.regex;
            
            if (!regexSettings || !Array.isArray(regexSettings)) {
                toastr.info('沒有找到Regex規則', 'Chinese Converter');
                return;
            }

            let convertedCount = 0;

            // 遍歷所有Regex規則
            regexSettings.forEach(rule => {
                if (rule.replaceString && typeof rule.replaceString === 'string') {
                    const original = rule.replaceString;
                    const converted = convertText(original);
                    
                    if (original !== converted) {
                        rule.replaceString = converted;
                        convertedCount++;
                    }
                }
                
                // 也轉換findRegex裡的中文（如果有）
                if (rule.findRegex && typeof rule.findRegex === 'string') {
                    const original = rule.findRegex;
                    const converted = convertText(original);
                    
                    if (original !== converted) {
                        rule.findRegex = converted;
                    }
                }
            });

            // 保存設定
            await context.saveSettingsDebounced();

            toastr.success(
                `已轉換 ${convertedCount} 個Regex規則！請重新整理頁面讓變更生效`,
                'Chinese Converter',
                { timeOut: 5000 }
            );
            
            console.log(DEBUG_PREFIX, `Converted ${convertedCount} regex rules`);
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Failed to convert regex rules:', error);
            toastr.error(`轉換失敗: ${error.message}`, 'Chinese Converter');
        }
    }

    // 創建UI
    function createUI() {
        const settingsHtml = `
            <div class="chinese-converter-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>簡繁轉換</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <label class="checkbox_label" for="chinese-converter-auto">
                            <input type="checkbox" id="chinese-converter-auto" ${extensionSettings.autoConvert ? 'checked' : ''} />
                            <span>自動轉換API請求</span>
                        </label>
                        <div style="margin-top: 10px;">
                            <label for="chinese-converter-type">轉換方向：</label>
                            <select id="chinese-converter-type">
                                <option value="s2t" ${extensionSettings.conversionType === 's2t' ? 'selected' : ''}>簡體 → 繁體</option>
                                <option value="t2s" ${extensionSettings.conversionType === 't2s' ? 'selected' : ''}>繁體 → 簡體</option>
                            </select>
                        </div>
                        <div style="margin-top: 10px;">
                            <button id="chinese-converter-convert-regex" class="menu_button">一鍵轉換Regex規則</button>
                        </div>
                        <small style="display: block; margin-top: 10px; opacity: 0.7;">
                            💡 開啟後，每次送給AI前都會自動轉換！<br>
                            AI看到繁體就會自然回應繁體！<br>
                            點「一鍵轉換Regex」可以轉換所有Regex規則裡的簡體字！
                        </small>
                    </div>
                </div>
            </div>
        `;

        const extensionsBlock = document.getElementById('extensions_settings');
        if (!extensionsBlock) {
            console.error(DEBUG_PREFIX, 'Extensions settings block not found');
            return;
        }

        extensionsBlock.insertAdjacentHTML('beforeend', settingsHtml);

        // 綁定事件
        document.getElementById('chinese-converter-auto')?.addEventListener('change', (e) => {
            extensionSettings.autoConvert = e.target.checked;
            saveSettings();
            toastr.info(
                e.target.checked ? '已開啟自動轉換' : '已關閉自動轉換',
                'Chinese Converter'
            );
        });

        document.getElementById('chinese-converter-type')?.addEventListener('change', (e) => {
            extensionSettings.conversionType = e.target.value;
            initConverter();
            saveSettings();
        });

        document.getElementById('chinese-converter-convert-regex')?.addEventListener('click', () => {
            convertAllRegexRules();
        });

        console.log(DEBUG_PREFIX, 'UI created successfully');
    }

    // 儲存設定
    async function saveSettings() {
        try {
            const context = SillyTavern.getContext();
            context.extensionSettings[MODULE_NAME] = extensionSettings;
            await context.saveSettingsDebounced();
            console.log(DEBUG_PREFIX, 'Settings saved');
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Failed to save settings:', error);
        }
    }

    // 載入設定
    function loadSettings() {
        try {
            const context = SillyTavern.getContext();
            if (context.extensionSettings[MODULE_NAME]) {
                Object.assign(extensionSettings, context.extensionSettings[MODULE_NAME]);
                console.log(DEBUG_PREFIX, 'Settings loaded:', extensionSettings);
            }
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Failed to load settings:', error);
        }
    }

    // 初始化擴展
    async function init() {
        try {
            console.log(DEBUG_PREFIX, 'Initializing...');

            // 載入 OpenCC
            await loadOpenCC();

            // 載入設定
            loadSettings();

            // 初始化轉換器
            initConverter();

            // 創建 UI
            createUI();

            // Hook fetch（最關鍵的一步！）
            hookFetch();

            console.log(DEBUG_PREFIX, 'Initialization complete');
            toastr.success('簡繁轉換插件已載入！API請求將自動轉換', 'Chinese Converter', { timeOut: 3000 });
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Initialization failed:', error);
            toastr.error('插件載入失敗: ' + error.message, 'Chinese Converter');
        }
    }

    // 啟動
    init();
})();

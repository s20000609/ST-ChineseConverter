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

    // 深度轉換對象（遞歸處理所有字串）
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

    // Hook原生fetch（攔截所有API請求）
    function hookFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async function(url, options) {
            // 只處理POST請求（通常是API呼叫）
            if (options && options.method === 'POST' && extensionSettings.enabled && extensionSettings.autoConvert) {
                try {
                    // 解析請求body
                    if (options.body) {
                        let body;
                        
                        // 如果是字串，解析為JSON
                        if (typeof options.body === 'string') {
                            try {
                                body = JSON.parse(options.body);
                            } catch (e) {
                                // 不是JSON，跳過
                                return originalFetch.call(this, url, options);
                            }
                        } else {
                            body = options.body;
                        }
                        
                        // 檢查是否是LLM API請求（有messages陣列）
                        if (body && body.messages && Array.isArray(body.messages)) {
                            console.log(DEBUG_PREFIX, 'Intercepting API request, converting messages...');
                            
                            // 轉換整個payload！
                            body = deepConvertObject(body);
                            
                            // 更新請求body
                            options.body = JSON.stringify(body);
                            
                            console.log(DEBUG_PREFIX, 'Messages converted and sent to API');
                        }
                    }
                } catch (error) {
                    console.error(DEBUG_PREFIX, 'Error in fetch hook:', error);
                }
            }
            
            // 執行原始fetch
            return originalFetch.call(this, url, options);
        };
        
        console.log(DEBUG_PREFIX, 'Fetch hook installed - will convert all API requests!');
    }

    // === UI相關 ===

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
                        <div>
                            <label for="chinese-converter-type">轉換方向：</label>
                            <select id="chinese-converter-type">
                                <option value="s2t" ${extensionSettings.conversionType === 's2t' ? 'selected' : ''}>簡體 → 繁體</option>
                                <option value="t2s" ${extensionSettings.conversionType === 't2s' ? 'selected' : ''}>繁體 → 簡體</option>
                            </select>
                        </div>
                        <div style="margin-top: 10px;">
                            <button id="chinese-converter-convert-display" class="menu_button">轉換畫面上的對話</button>
                        </div>
                        <small style="display: block; margin-top: 10px; opacity: 0.7;">
                            💡 開啟後，每次送給AI前都會自動轉換！<br>
                            AI看到繁體就會自然回應繁體！
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

        document.getElementById('chinese-converter-convert-display')?.addEventListener('click', () => {
            convertDisplayedMessages();
        });

        console.log(DEBUG_PREFIX, 'UI created successfully');
    }

    // 轉換畫面上已經顯示的對話（視覺上的轉換）
    function convertDisplayedMessages() {
        try {
            if (!converter) {
                toastr.error('轉換器未初始化', 'Chinese Converter');
                return;
            }

            // 直接操作DOM（從之前學到的）
            const messageElements = document.querySelectorAll('#chat > div.mes > div.mes_block > div.mes_text');
            
            if (messageElements.length === 0) {
                toastr.info('沒有對話可以轉換', 'Chinese Converter');
                return;
            }
            
            let count = 0;
            messageElements.forEach((element) => {
                const originalHTML = element.innerHTML;
                const convertedHTML = convertText(originalHTML);
                
                if (originalHTML !== convertedHTML) {
                    element.innerHTML = convertedHTML;
                    count++;
                }
            });

            toastr.success(`已轉換 ${count} 條訊息`, 'Chinese Converter');
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Failed to convert display:', error);
            toastr.error(`轉換失敗: ${error.message}`, 'Chinese Converter');
        }
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

/**
 * SillyTavern Chinese Converter Extension
 * 簡繁轉換插件 - 最終簡化版
 * Author: ENI
 * Version: 4.0 Final
 * 
 * 核心功能：
 * - 自動轉換發送給AI的請求（messages內容）
 * - AI看到繁體 → AI回應繁體
 */

(async function() {
    'use strict';

    const MODULE_NAME = 'ChineseConverter';
    const DEBUG_PREFIX = '[Chinese Converter]';

    // 擴展設定
    const extensionSettings = {
        enabled: true,
        autoConvert: true,
        conversionType: 's2t' // s2t: 簡→繁, t2s: 繁→簡
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

    // 安全的選擇性轉換（只轉換messages內容）
    function convertMessagesOnly(payload) {
        if (!payload || !payload.messages || !Array.isArray(payload.messages)) {
            return payload;
        }
        
        const converted = JSON.parse(JSON.stringify(payload));
        
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

    // Hook fetch（只轉換請求）
    function hookFetch() {
        const originalFetch = window.fetch;
        
        window.fetch = async function(url, options) {
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
                        
                        if (body && body.messages && Array.isArray(body.messages)) {
                            console.log(DEBUG_PREFIX, 'Converting request...');
                            body = convertMessagesOnly(body);
                            options.body = JSON.stringify(body);
                            console.log(DEBUG_PREFIX, 'Request converted → AI will see 繁體!');
                        }
                    }
                } catch (error) {
                    console.error(DEBUG_PREFIX, 'Error converting request:', error);
                }
            }
            
            return originalFetch.call(this, url, options);
        };
        
        console.log(DEBUG_PREFIX, 'Fetch hook installed!');
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

            await loadOpenCC();
            loadSettings();
            initConverter();
            createUI();
            hookFetch();

            console.log(DEBUG_PREFIX, 'Initialization complete');
            toastr.success('簡繁轉換插件已載入！', 'Chinese Converter', { timeOut: 3000 });
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Initialization failed:', error);
            toastr.error('插件載入失敗: ' + error.message, 'Chinese Converter');
        }
    }

    init();
})();

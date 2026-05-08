/**
 * SillyTavern Chinese Converter Extension
 * 簡繁轉換插件
 * Author: ENI
 * Version: 1.0.0
 */

(async function() {
    'use strict';

    const MODULE_NAME = 'ChineseConverter';
    const DEBUG_PREFIX = '[Chinese Converter]';

    // 擴展設定
    const extensionSettings = {
        enabled: true,
        autoConvert: false,
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
                throw new Error('OpenCC library not loaded');
            }

            const converterType = extensionSettings.conversionType === 's2t' 
                ? OpenCC.Converter({ from: 'cn', to: 'tw' })
                : OpenCC.Converter({ from: 'tw', to: 'cn' });
            
            converter = converterType;
            console.log(DEBUG_PREFIX, `Converter initialized: ${extensionSettings.conversionType}`);
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Failed to initialize converter:', error);
            toastr.error('初始化轉換器失敗', 'Chinese Converter');
        }
    }

    // 轉換文字
    function convertText(text) {
        if (!converter) {
            console.error(DEBUG_PREFIX, 'Converter not initialized');
            return text;
        }

        try {
            return converter(text);
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Conversion error:', error);
            return text;
        }
    }

    // 轉換當前對話中的所有消息（直接操作DOM）
    async function convertCurrentChat() {
        try {
            // **關鍵檢查：確保OpenCC和converter已就緒**
            if (typeof OpenCC === 'undefined') {
                toastr.error('OpenCC未載入！請重啟擴展', 'Chinese Converter');
                console.error(DEBUG_PREFIX, 'OpenCC library not loaded!');
                return;
            }

            if (!converter) {
                console.log(DEBUG_PREFIX, 'Converter not initialized, initializing now...');
                initConverter();
                if (!converter) {
                    toastr.error('轉換器初始化失敗', 'Chinese Converter');
                    console.error(DEBUG_PREFIX, 'Converter initialization failed!');
                    return;
                }
            }

            console.log(DEBUG_PREFIX, 'OpenCC and converter ready, starting conversion...');
            
            let convertedCount = 0;

            // 使用正確的DOM路徑（從ST-Prompt-Template學來的）
            // 直接操作已經在畫面上的訊息，不需要API
            const messageElements = document.querySelectorAll('#chat > div.mes > div.mes_block > div.mes_text');
            
            console.log(DEBUG_PREFIX, `Found ${messageElements.length} message elements`);
            
            if (messageElements.length === 0) {
                toastr.info('沒有對話可以轉換', 'Chinese Converter');
                return;
            }
            
            messageElements.forEach((element) => {
                const originalText = element.textContent || element.innerText;
                const convertedText = convertText(originalText);
                
                if (originalText !== convertedText) {
                    // 直接寫入轉換後的文字到DOM
                    element.textContent = convertedText;
                    convertedCount++;
                }
            });

            toastr.success(`已轉換 ${convertedCount} 條訊息`, 'Chinese Converter');
            console.log(DEBUG_PREFIX, `Converted ${convertedCount} messages`);
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Failed to convert chat:', error);
            toastr.error(`轉換失敗: ${error.message}`, 'Chinese Converter');
        }
    }

    // 轉換單條消息（用於自動轉換）
    function convertMessage(message) {
        if (!extensionSettings.autoConvert || !extensionSettings.enabled) {
            return message;
        }

        if (message.mes) {
            message.mes = convertText(message.mes);
        }

        return message;
    }

    // 創建UI
    function createUI() {
        const settingsHtml = `
            <div id="chinese-converter-settings">
                <div class="inline-drawer">
                    <div class="inline-drawer-toggle inline-drawer-header">
                        <b>簡繁轉換 (Chinese Converter)</b>
                        <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                    </div>
                    <div class="inline-drawer-content">
                        <div class="chinese-converter-controls">
                            <label class="checkbox_label">
                                <input type="checkbox" id="chinese-converter-enabled" ${extensionSettings.enabled ? 'checked' : ''} />
                                <span>啟用轉換</span>
                            </label>
                            
                            <label class="checkbox_label">
                                <input type="checkbox" id="chinese-converter-auto" ${extensionSettings.autoConvert ? 'checked' : ''} />
                                <span>自動轉換AI回覆</span>
                            </label>

                            <div class="chinese-converter-type">
                                <label>轉換類型:</label>
                                <select id="chinese-converter-type">
                                    <option value="s2t" ${extensionSettings.conversionType === 's2t' ? 'selected' : ''}>簡體 → 繁體</option>
                                    <option value="t2s" ${extensionSettings.conversionType === 't2s' ? 'selected' : ''}>繁體 → 簡體</option>
                                </select>
                            </div>

                            <div class="chinese-converter-actions">
                                <div class="menu_button" id="chinese-converter-convert-btn">
                                    <i class="fa-solid fa-language"></i>
                                    <span>轉換當前對話</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const extensionsContainer = document.getElementById('extensions_settings');
        if (extensionsContainer) {
            extensionsContainer.insertAdjacentHTML('beforeend', settingsHtml);
        }

        // 綁定事件
        document.getElementById('chinese-converter-enabled')?.addEventListener('change', (e) => {
            extensionSettings.enabled = e.target.checked;
            saveSettings();
        });

        document.getElementById('chinese-converter-auto')?.addEventListener('change', (e) => {
            extensionSettings.autoConvert = e.target.checked;
            saveSettings();
        });

        document.getElementById('chinese-converter-type')?.addEventListener('change', (e) => {
            extensionSettings.conversionType = e.target.value;
            initConverter();
            saveSettings();
        });

        document.getElementById('chinese-converter-convert-btn')?.addEventListener('click', () => {
            convertCurrentChat();
        });

        console.log(DEBUG_PREFIX, 'UI created successfully');
    }

    // 儲存設定
    async function saveSettings() {
        try {
            const context = SillyTavern.getContext();
            await context.saveSettingsDebounced();
            console.log(DEBUG_PREFIX, 'Settings saved');
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Failed to save settings:', error);
        }
    }

    // 載入設定
    function loadSettings() {
        const context = SillyTavern.getContext();
        if (context.extensionSettings[MODULE_NAME]) {
            Object.assign(extensionSettings, context.extensionSettings[MODULE_NAME]);
            console.log(DEBUG_PREFIX, 'Settings loaded:', extensionSettings);
        }
    }

    // 監聽消息生成事件（用於自動轉換）
    function setupEventListeners() {
        const context = SillyTavern.getContext();
        
        // 監聽AI回覆
        context.eventSource.on('MESSAGE_RECEIVED', (message) => {
            if (extensionSettings.enabled && extensionSettings.autoConvert) {
                convertMessage(message);
            }
        });

        console.log(DEBUG_PREFIX, 'Event listeners setup');
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

            // 設定事件監聽
            setupEventListeners();

            console.log(DEBUG_PREFIX, 'Initialization complete');
            toastr.success('簡繁轉換插件已載入', 'Chinese Converter', { timeOut: 2000 });
        } catch (error) {
            console.error(DEBUG_PREFIX, 'Initialization failed:', error);
            toastr.error('插件載入失敗: ' + error.message, 'Chinese Converter');
        }
    }

    // 將設定保存到全域
    const context = SillyTavern.getContext();
    context.extensionSettings[MODULE_NAME] = extensionSettings;

    // 啟動擴展
    init();
})();

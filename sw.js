<!DOCTYPE html>
<html lang="zh-HK">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>AVA CRM v2.3.6 Auto Height & USD Currency Version</title>

    <link rel="manifest" href="manifest-admin.json">
    <link rel="icon" type="image/png" sizes="192x192" href="crmlogo-192.png?v=2.3.6">
    <link rel="apple-touch-icon" sizes="180x180" href="crmlogo-192.png?v=2.3.6">
    <meta name="theme-color" content="#0B0F19">

    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <style>
        body { background-color: #0B0F19; color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .glass-card { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); }
        .gold-border { border-color: rgba(212, 175, 55, 0.4); }
        .gold-text { color: #D4AF37; }
        .blue-text { color: #38BDF8; }
        textarea { resize: none; overflow: hidden; }
    </style>
</head>
<body x-data="app()" x-init="initApp()">

    <div class="min-h-screen pb-20">
        <header class="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
                <img src="crmlogo-192.png?v=2.3.6" class="w-6 h-6 object-contain rounded">
                <span class="font-bold gold-text text-sm">AVA Admin</span>
                <span class="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">v2.3.6</span>
            </div>
            <button @click="initApp()" class="text-xs text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-lg hover:bg-amber-500/10">🔄 同步 Sheet</button>
        </header>

        <main class="p-4 max-w-lg mx-auto space-y-6">
            <!-- 客戶選擇與管理區 -->
            <section class="glass-card p-4 rounded-2xl space-y-3">
                <div class="flex justify-between items-center">
                    <label class="text-xs font-bold gold-text">👤 選擇 / 管理客戶</label>
                    <div class="flex items-center gap-3">
                        <button @click="resetOwner()" class="text-xs text-blue-400 font-bold hover:underline">+ 建立新客戶</button>
                        <button x-show="selectedClientId" @click="deleteCurrentClient()" class="text-xs text-red-400 font-bold hover:underline"><i class="fa-solid fa-trash-can"></i> 刪除此客戶</button>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <select x-model="selectedClientId" @change="loadSelectedClient()" class="col-span-2 w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white">
                        <option value="">-- 請選擇客戶 --</option>
                        <template x-for="c in filteredClients" :key="c.id">
                            <option :value="c.id" x-text="(c.owner || '未命名') + ' (' + (c.policies ? c.policies.length : 0) + ' 份)'"></option>
                        </template>
                    </select>
                    <input type="text" x-model="searchOrNameInput" @input="onNameInput()" class="col-span-1 w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-xs text-white" placeholder="搜尋或修改姓名">
                </div>
            </section>

            <template x-if="currentClient">
                <div class="space-y-6">
                    <!-- AI 保單文件解析區 -->
                    <section class="glass-card p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                        <h3 class="text-xs font-bold gold-text"><i class="fa-solid fa-wand-magic-sparkles"></i> AI 自動解析保單 (Gemini 3.6 Flash)</h3>
                        <input type="file" @change="uploadAndParse($event)" accept="image/*, application/pdf" class="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950">
                        <div x-show="isParsing" class="text-xs text-amber-400 font-bold animate-pulse">
                            <i class="fa-solid fa-spinner fa-spin"></i> AI 正在解析條款及數據...
                        </div>
                    </section>

                    <!-- 保障列表 -->
                    <section class="space-y-4">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xs font-bold blue-text">📜 保障列表 (<span x-text="currentClient.policies ? currentClient.policies.length : 0"></span>)</h3>
                            <button @click="addEmptyPolicy()" class="text-xs bg-slate-800 px-2.5 py-1 rounded-lg text-blue-400 border border-slate-700">+ 新增保單</button>
                        </div>

                        <template x-for="(pol, pIndex) in currentClient.policies" :key="pIndex">
                            <div class="glass-card p-4 rounded-2xl space-y-3 relative border-l-4 border-l-blue-500">
                                <button @click="removePolicy(pIndex)" class="absolute top-3 right-3 text-xs text-red-400 hover:text-red-300"><i class="fa-solid fa-xmark"></i> 刪除保單</button>

                                <div class="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <label class="text-[10px] text-slate-400">保單持有人</label>
                                        <input type="text" x-model="pol.policyHolder" class="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white">
                                    </div>
                                    <div>
                                        <label class="text-[10px] text-slate-400">受保人姓名</label>
                                        <input type="text" x-model="pol.insuredPerson" class="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white">
                                    </div>
                                </div>

                                <div class="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <label class="text-[10px] text-slate-400">保險公司 (下拉選擇)</label>
                                        <select x-model="pol.insurer" class="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white">
                                            <option value="">-- 請選擇 --</option>
                                            <template x-for="inc in dbProducts['保險公司'] || []" :key="inc">
                                                <option :value="inc" x-text="inc"></option>
                                            </template>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="text-[10px] text-slate-400">保單號碼</label>
                                        <input type="text" x-model="pol.policyNumber" class="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white">
                                    </div>
                                    <div>
                                        <label class="text-[10px] text-slate-400">生效日期</label>
                                        <input type="text" x-model="pol.commencementDate" class="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-white">
                                    </div>
                                </div>

                                <!-- 險種條目 -->
                                <template x-for="(item, iIndex) in pol.items" :key="iIndex">
                                    <div class="bg-slate-900/60 p-3 rounded-xl space-y-2 border border-slate-800 relative">
                                        <button @click="removeSingleItem(pol, iIndex)" class="absolute top-1 right-2 text-xs text-red-600 hover:text-red-400"><i class="fa-solid fa-minus"></i> 刪險</button>

                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <label class="text-[10px] text-slate-400">保障種類</label>
                                                <select x-model="item.category" class="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white">
                                                    <option value="危疾">危疾</option>
                                                    <option value="醫療">醫療</option>
                                                    <option value="意外">意外</option>
                                                    <option value="人壽">人壽</option>
                                                    <option value="儲蓄">儲蓄</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label class="text-[10px] text-slate-400">產品名稱 (連動 Sheet)</label>
                                                <select x-model="item.name" @change="onProductSelect(item)" class="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white">
                                                    <option value="">-- 請選擇產品 --</option>
                                                    <template x-for="p in getProductListForCategory(item.category)" :key="p.name">
                                                        <option :value="p.name" x-text="p.name"></option>
                                                    </template>
                                                </select>
                                            </div>
                                        </div>

                                        <!-- 🌟 升級：美金保費自動 7.8 換算與動態幣別靈活切換 🌟 -->
                                        <div class="grid grid-cols-3 gap-2 text-xs">
                                            <div class="col-span-1">
                                                <label class="text-[10px] text-slate-400 block">保費 (每年)</label>
                                                <div class="flex items-center gap-1">
                                                    <input type="text" x-model="item.premium" @blur="formatCurrency(item, 'premium')" class="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white font-mono">
                                                    <select x-model="item.currency" @change="recalculateHkd(item)" class="bg-slate-900 text-slate-300 border border-slate-800 rounded p-1 w-16">
                                                        <option value="HKD">HKD</option>
                                                        <option value="USD">USD</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div class="col-span-2 flex items-end">
                                                <template x-if="item.currency === 'USD'">
                                                    <div class="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 w-full justify-between">
                                                        <span class="text-[11px] font-mono gold-text font-bold" x-text="item.showRawUsd ? 'US$ ' + item.premium : '≈ HK$ ' + item.hkdPremium"></span>
                                                        <button @click="item.showRawUsd = !item.showRawUsd" class="text-[10px] text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded hover:bg-blue-500/10 flex-shrink-0">
                                                            🔄 <span x-text="item.showRawUsd ? '換算 HK$' : '顯示 US$'"></span>
                                                        </button>
                                                    </div>
                                                </template>
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <label class="text-[10px] text-slate-400">供款年期</label>
                                                <input type="text" x-model="item.term" class="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white">
                                            </div>
                                            <div>
                                                <label class="text-[10px] text-slate-400">保障年期</label>
                                                <input type="text" x-model="item.maturity" class="w-full bg-slate-950 border border-slate-800 rounded p-1 text-white">
                                            </div>
                                        </div>

                                        <!-- 🌟 升級：自動調整高度特點框 🌟 -->
                                        <div>
                                            <label class="text-[10px] text-slate-400">特點 (完整顯示，高度自動自適應)</label>
                                            <textarea 
                                                x-model="item.features" 
                                                x-ref="featArea"
                                                @input="autoResizeTextarea($el)"
                                                x-init="$nextTick(() => autoResizeTextarea($el))"
                                                class="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-xs text-slate-300 leading-relaxed block transition-all"
                                                placeholder="保障特點..."
                                            ></textarea>
                                        </div>
                                    </div>
                                </template>
                            </div>
                        </template>
                    </section>

                    <button @click="saveCurrentClient()" class="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 font-bold rounded-xl text-xs text-white shadow-lg">
                        💾 儲存並同步至 Google Sheet CRM
                    </button>

                    <!-- 二維碼區 -->
                    <section class="glass-card p-4 rounded-2xl gold-border bg-[#111827]">
                        <div class="flex items-center gap-4">
                            <div id="qrcode" class="bg-white p-2 rounded-lg flex-shrink-0"></div>
                            <div class="flex-1 space-y-2 text-xs">
                                <h4 class="font-bold gold-text"><i class="fa-solid fa-qrcode"></i> 客戶專屬二維碼 (PWA)</h4>
                                <p class="text-[10px] text-slate-400">請掃描 QR Code 分享給客戶觀看其專屬頁面。</p>
                                <button @click="openPwa()" class="text-xs text-blue-400 hover:underline break-all text-left block">
                                    🔗 預覽連結：<span x-text="generatePwaUrl(currentClient.id)"></span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </template>
        </main>
    </div>

    <script>
        const CRM_GAS_URL = "https://script.google.com/macros/s/AKfycbzy1gnDB-qXZIhTsgxNvLveRrHWVP7AoYoqG_JsbELBvvReXy4Fx2rYu6ieJNuupMtmdg/exec";
        const PRODUCTS_GAS_URL = "https://script.google.com/macros/s/AKfycbzJxEthfbtGFhesn9zqKz_14bvLY0Q6uvKVzSr2WM8s1VfCTJXaCg7lhNEwqyAql6hUuQ/exec";
        const AI_GAS_URL = "https://script.google.com/macros/s/AKfycbzPIlJHqcGWDMeJd_Tc_tpDz-r-vVW9lNXBiVXnD2o0ulVNoGkUHy-Ve3rAxnsWh9dhUQ/exec";

        const formatNumber = (num) => {
            if (num === null || num === undefined || isNaN(num) || num === "") return "";
            return parseFloat(num).toLocaleString('zh-HK');
        };
        const parseNumber = (str) => {
            if (!str) return 0;
            if (typeof str === 'number') return str;
            return parseFloat(str.toString().replace(/,/g, ''));
        };

        function app() {
            return {
                clients: [],
                dbProducts: {},
                selectedClientId: '',
                searchOrNameInput: '',
                currentClient: null,
                isParsing: false,

                initApp() {
                    this.fetchClients();
                    this.fetchProducts();
                },
                fetchClients() {
                    fetch(CRM_GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'get' }), redirect: "follow" })
                    .then(r => r.json())
                    .then(res => {
                        if (res.status === 'success') {
                            this.clients = res.data || [];
                        }
                    });
                },
                fetchProducts() {
                    fetch(PRODUCTS_GAS_URL)
                    .then(r => r.json())
                    .then(res => {
                        if (res.status === 'success') {
                            this.dbProducts = res.data || {};
                        }
                    });
                },
                autoResizeTextarea(el) {
                    if (!el) return;
                    el.style.height = 'auto';
                    el.style.height = (el.scrollHeight + 4) + 'px';
                },
                recalculateHkd(item) {
                    if (item.currency === 'USD') {
                        const usdVal = parseNumber(item.premium);
                        item.hkdPremium = formatNumber(usdVal * 7.8);
                        if (item.showRawUsd === undefined) item.showRawUsd = false;
                    }
                },
                get filteredClients() {
                    if (!this.searchOrNameInput || this.selectedClientId) return this.clients;
                    return this.clients.filter(c => (c.owner || '').includes(this.searchOrNameInput));
                },
                loadSelectedClient() {
                    const found = this.clients.find(c => String(c.id) === String(this.selectedClientId));
                    if (!found) {
                        this.currentClient = null;
                        this.searchOrNameInput = '';
                        return;
                    }
                    const clientCopy = JSON.parse(JSON.stringify(found));
                    clientCopy.policies.forEach(pol => {
                        if (!pol.policyHolder) pol.policyHolder = clientCopy.owner;
                        if (pol.items) {
                            pol.items.forEach(item => {
                                if (!item.currency) item.currency = 'HKD';
                                item.premium = formatNumber(parseNumber(item.premium));
                                this.recalculateHkd(item);
                            });
                        }
                    });
                    this.currentClient = clientCopy;
                    this.searchOrNameInput = clientCopy.owner;
                    this.renderQrCode();
                    this.$nextTick(() => {
                        document.querySelectorAll('textarea').forEach(el => this.autoResizeTextarea(el));
                    });
                },
                onNameInput() {
                    if (this.currentClient) {
                        this.currentClient.owner = this.searchOrNameInput;
                    }
                },
                resetOwner() {
                    this.selectedClientId = '';
                    this.searchOrNameInput = '新客戶';
                    const newId = Date.now().toString();
                    this.currentClient = { id: newId, owner: '新客戶', insured: '新客戶', policies: [] };
                    this.renderQrCode();
                },
                deleteCurrentClient() {
                    if (!this.selectedClientId) return;
                    if (confirm('確定要永久刪除此客戶紀錄？')) {
                        fetch(CRM_GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'delete', id: this.selectedClientId }), redirect: "follow" })
                        .then(r => r.json())
                        .then(res => {
                            if (res.status === 'success') {
                                alert('✅ 客戶已刪除！');
                                this.selectedClientId = '';
                                this.currentClient = null;
                                this.searchOrNameInput = '';
                                this.fetchClients();
                            } else {
                                alert('刪除失敗：' + res.message);
                            }
                        });
                    }
                },
                generatePwaUrl(clientId) {
                    if (!clientId) return '';
                    const baseUrl = window.location.href.split('?')[0];
                    return baseUrl + '?id=' + clientId;
                },
                renderQrCode() {
                    this.$nextTick(() => {
                        const container = document.getElementById("qrcode");
                        if (container && this.currentClient) {
                            container.innerHTML = "";
                            new QRCode(container, { text: this.generatePwaUrl(this.currentClient.id), width: 120, height: 120 });
                        }
                    });
                },
                openPwa() {
                    if (this.currentClient) {
                        window.open(this.generatePwaUrl(this.currentClient.id), '_blank');
                    }
                },
                addEmptyPolicy() {
                    if (!this.currentClient.policies) this.currentClient.policies = [];
                    this.currentClient.policies.push({
                        insurer: '', policyNumber: '', commencementDate: '',
                        policyHolder: this.searchOrNameInput, insuredPerson: this.searchOrNameInput,
                        items: [{ category: '危疾', name: '', term: '', maturity: '', premium: "0", currency: 'HKD', features: '' }]
                    });
                },
                removePolicy(index) {
                    this.currentClient.policies.splice(index, 1);
                },
                removeSingleItem(policy, itemIndex) {
                    policy.items.splice(itemIndex, 1);
                },
                getProductListForCategory(cat) {
                    return this.dbProducts[cat] || [];
                },
                onProductSelect(item) {
                    const list = this.getProductListForCategory(item.category);
                    const matched = list.find(p => p.name === item.name);
                    if (matched) {
                        item.features = matched.features;
                        this.$nextTick(() => {
                            document.querySelectorAll('textarea').forEach(el => this.autoResizeTextarea(el));
                        });
                    }
                },
                formatCurrency(item, field) {
                    if (item[field]) {
                        item[field] = formatNumber(parseNumber(item[field]));
                        this.recalculateHkd(item);
                    }
                },
                uploadAndParse(e) {
                    const file = e.target.files[0];
                    if (!file) return;
                    this.isParsing = true;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        let rawBase64 = ev.target.result.split(',')[1];
                        let cleanBase64 = rawBase64.replace(/[\r\n\s]/g, '');

                        fetch(AI_GAS_URL, {
                            method: 'POST',
                            body: JSON.stringify({ action: 'parsePolicyDocument', fileData: cleanBase64, mimeType: file.type })
                        })
                        .then(r => r.json())
                        .then(res => {
                            this.isParsing = false;
                            if (res.status === 'success' && res.data) {
                                const parsed = res.data;
                                if (!this.currentClient.policies) this.currentClient.policies = [];
                                parsed.forEach(p => {
                                    const newItem = {
                                        category: '危疾',
                                        name: p.productName || '',
                                        sumAssured: formatNumber(parseNumber(p.sumAssured ? p.sumAssured.amount : 0)),
                                        term: p.term || '',
                                        maturity: p.maturity || '',
                                        premium: formatNumber(parseNumber(p.premium ? p.premium.amount : 0)),
                                        currency: (p.premium && p.premium.currency) ? p.premium.currency : 'HKD',
                                        features: p.features || ''
                                    };
                                    this.onProductSelect(newItem);
                                    this.recalculateHkd(newItem);
                                    this.currentClient.policies.push({
                                        insurer: p.insurer || '',
                                        policyNumber: p.policyNumber || '',
                                        commencementDate: p.commencementDate || '',
                                        policyHolder: p.policyHolder || this.searchOrNameInput,
                                        insuredPerson: p.insuredPerson || this.searchOrNameInput,
                                        items: [newItem]
                                    });
                                });
                                this.renderQrCode();
                                this.$nextTick(() => {
                                    document.querySelectorAll('textarea').forEach(el => this.autoResizeTextarea(el));
                                });
                                alert('🎉 AI 自動解析完成！');
                            } else {
                                alert('AI 解析失敗：' + (res.message || '請確認權限'));
                            }
                        })
                        .catch(err => {
                            this.isParsing = false;
                            alert('解析失敗: ' + err.message);
                        });
                    };
                    reader.readAsDataURL(file);
                },
                saveCurrentClient() {
                    if (this.currentClient) {
                        this.currentClient.owner = this.searchOrNameInput;
                    }
                    fetch(CRM_GAS_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'update', payload: this.currentClient }),
                        redirect: "follow"
                    })
                    .then(r => r.json())
                    .then(res => {
                        if (res.status === 'success') {
                            this.fetchClients();
                            this.renderQrCode();
                            alert('💾 成功同步至 Google Sheet CRM！');
                        } else {
                            alert('儲存失敗：' + res.message);
                        }
                    });
                }
            }
        }
    </script>
</body>
</html>

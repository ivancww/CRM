(function (root) {
  'use strict';

  root.pwaApp = function () {
    return {
      pwaClient: null,
      selectedInsured: '',
      selectedCompany: '',
      isLoading: true,
      isAdvisor: false,
      showQrModal: false,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !root.MSStream,
      isAndroid: /Android/.test(navigator.userAgent),
      compDisplayConfig: { showSa: false, showPrem: false, showCv: true, showTerms: false, showFeatures: false },

      async initPwa() {
        const match = root.location.hash.match(/(?:^#|&)token=([a-f0-9]+)/i);
        const token = match && match[1];
        this.isAdvisor = new URLSearchParams(root.location.search).get('role') === 'advisor';
        if (!token) { this.isLoading = false; return; }
        try {
          this.pwaClient = await AVACRM.getClientShare(token);
          if (this.pwaClient) this.selectedInsured = this.pwaClient.owner;
        } catch (error) {
          console.error('Unable to load read-only client snapshot', error);
        } finally { this.isLoading = false; }
      },

      money(value) { return 'HK$' + new Intl.NumberFormat('en-HK', { maximumFractionDigits: 0 }).format(Number(value) || 0); },
      formatDate(value) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('zh-HK'); },
      sourceTitle() { return ({ ci: '危疾保障來源', life: '人壽保障來源', medical: '醫療保障來源', values: '保單價值來源' })[this.selectedCompany] || ''; },
      currentSources() { return this.pwaClient && this.pwaClient.sources && this.pwaClient.sources[this.selectedCompany] || []; },
      sourceValue(item) {
        if (item.amount !== undefined) return this.money(item.amount);
        if (item.guaranteed !== undefined) return `保證 ${this.money(item.guaranteed)} · 非保證 ${this.money(item.nonGuaranteed)}`;
        return '已包括';
      },

      getClientShareUrl() { return root.location.href; },
      openQrModal() {
        this.showQrModal = true;
        this.$nextTick(() => {
          const container = document.getElementById('modal-qrcode');
          if (!container || !root.QRCode) return;
          container.innerHTML = '';
          new QRCode(container, { text: this.getClientShareUrl(), width: 140, height: 140 });
        });
      },
      copyClientLink() {
        navigator.clipboard?.writeText(this.getClientShareUrl()).then(() => alert('已複製 read-only 連結。')).catch(() => prompt('請複製以下連結：', this.getClientShareUrl()));
      },
      triggerInstall() { alert('請使用瀏覽器「加到主畫面」功能。'); },
      generateAndDownloadPdf() { alert('為保障私隱，v7 read-only Client View 暫不輸出包含私人資料的 PDF。'); },

      // Compatibility methods retained for the legacy hidden layout.
      getAllInsureds() { return this.pwaClient ? [this.pwaClient.owner] : []; },
      getCompanyList() { return []; },
      getFilteredPolicies() { return []; },
      getTotalAnnualPremiumDisplay() { return '—'; },
      getTotalMonthlyEqDisplay() { return '—'; },
      getCategorySum(category) { return category === '危疾' ? this.money(this.pwaClient?.summary?.ci) : category === '人壽' ? this.money(this.pwaClient?.summary?.life) : '—'; },
      hasMultiClaimCi() { return false; },
      getRetirePortfolioValue() { return this.pwaClient?.summary?.guaranteed || 0; },
      getMedRetirePortfolioValue() { return 0; },
      getDisplayValue(value) { return this.money(value); },
      getItemCvHkd() { return 0; }
    };
  };
})(window);

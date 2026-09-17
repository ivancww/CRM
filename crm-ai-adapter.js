(function (root) {
  'use strict';

  class PolicyAIAdapter {
    constructor(endpoint, systemVersion) {
      this.endpoint = endpoint;
      this.systemVersion = systemVersion;
    }

    async extractFile(input) {
      if (!this.endpoint) throw new Error('未設定 AI Provider Backend');
      const response = await fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify({
          action: 'parsePolicyDocument',
          fileData: input.base64Data,
          mimeType: input.mimeType,
          fileName: input.fileName,
          extractionSchema: 'ava.crm.policy.v1',
          temporary: true,
          version: this.systemVersion
        })
      });
      const payload = await response.json();
      if (!response.ok || payload.status !== 'success') throw new Error(payload.message || 'AI Provider 回應失敗');
      return { records: Array.isArray(payload.data) ? payload.data : [payload.data], processingId: payload.processingId || null };
    }

    async cleanup(processingId) {
      if (!processingId || !this.endpoint) return;
      try {
        await fetch(this.endpoint, { method: 'POST', keepalive: true, body: JSON.stringify({ action: 'cleanupTemporaryPolicyDocument', processingId, version: this.systemVersion }) });
      } catch (_) { /* Best effort only; backend retention must be verified during deployment. */ }
    }
  }

  root.PolicyAIAdapter = PolicyAIAdapter;
})(window);

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

test('CRM exposes explicit AVA entry routing without changing standalone default', () => {
  assert.match(html, /AVA_ENTRY_MODES = Object\.freeze\(\{ frontend: 'review', user: 'user', admin: 'admin' \}\)/);
  assert.match(html, /viewMode: AVA_ENTRY_MODES\[AVA_ENTRY\] \|\| 'review'/);
  assert.match(html, /get\('avaEntry'\)/);
});

test('integrated entries return to the matching AVA surface', () => {
  assert.match(html, /AVA_PLATFORM_URL = 'https:\/\/ivancww\.github\.io\/avaplatform\/'/);
  assert.match(html, /AVA_ENTRY === 'admin' \? 'admin' : \(AVA_ENTRY === 'user' \? 'user' : 'frontend'\)/);
  assert.match(html, /\?avaSurface=\$\{surface\}/);
});

test('integrated mode leaves standalone PWA ownership untouched', () => {
  assert.match(html, /document\.querySelector\('link\[rel="manifest"\]'\)\?\.remove\(\)/);
  assert.match(html, /'serviceWorker' in navigator && !isAvaIntegratedEntry\(\)/);
});

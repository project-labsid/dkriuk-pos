const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');

// Only the 4 files that show "Segera Hadir"
const files = {
  'src/features/settings/PrinterSettings.tsx': fs.readFileSync(path.join(root, 'src/features/settings/PrinterSettings.tsx'), 'utf8'),
  'src/features/settings/AIAssistantSettings.tsx': fs.readFileSync(path.join(root, 'src/features/settings/AIAssistantSettings.tsx'), 'utf8'),
  'src/features/settings/BackupSettings.tsx': fs.readFileSync(path.join(root, 'src/features/settings/BackupSettings.tsx'), 'utf8'),
  'src/features/settings/SubscriptionSettings.tsx': fs.readFileSync(path.join(root, 'src/features/settings/SubscriptionSettings.tsx'), 'utf8'),
};

const jsonStr = JSON.stringify(files);
const compressed = zlib.gzipSync(Buffer.from(jsonStr));
const b64 = compressed.toString('base64');

const script = `// fix-4-settings.cjs
// Fixes: Printer, AI Assistant, Backup & Restore, Subscription
// Run: node scripts/fix-4-settings.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const b64 = '${b64}';

try {
  const data = JSON.parse(zlib.gunzipSync(Buffer.from(b64, 'base64')).toString('utf8'));
  const root = path.resolve(__dirname, '..');
  const keys = Object.keys(data);
  
  for (let i = 0; i < keys.length; i++) {
    const p = path.join(root, keys[i]);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, data[keys[i]], 'utf8');
    console.log('[' + (i+1) + '/' + keys.length + '] ' + keys[i]);
  }
  console.log('Done! ' + keys.length + ' files fixed.');
  console.log('Now run: git add . && git commit -m "fix: settings fungsional" && git push');
} catch(e) { console.error('ERROR:', e.message); process.exit(1); }
`;

const outPath = path.join(root, 'scripts', 'fix-4-settings.cjs');
fs.writeFileSync(outPath, script, 'utf8');
console.log('Generated: fix-4-settings.cjs (' + (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB)');

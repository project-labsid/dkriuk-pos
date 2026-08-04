const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Files to sync (relative to project root)
const files = [
  // Settings sub-pages (NEW files - previously Segera Hadir)
  'src/features/settings/PrinterSettings.tsx',
  'src/features/settings/PaymentMethodSettings.tsx',
  'src/features/settings/AIAssistantSettings.tsx',
  'src/features/settings/BackupSettings.tsx',
  'src/features/settings/SubscriptionSettings.tsx',
  'src/features/settings/HelpSettings.tsx',

  // SettingsPage (MODIFIED - no more Segera Hadir, all sub-pages connected)
  'src/features/settings/SettingsPage.tsx',

  // Existing settings sub-pages (from previous sync)
  'src/features/settings/AccountSettings.tsx',
  'src/features/settings/StoreInfoSettings.tsx',
  'src/features/settings/NotificationSettings.tsx',
  'src/features/settings/AppearanceSettings.tsx',

  // API routes needed by new settings
  'src/app/api/settings/backup/route.ts',
  'src/app/api/reset/route.ts',

  // Sidebar (MODIFIED - Pengguna removed)
  'src/components/layout/AppSidebar.tsx',

  // Other files from previous sync
  'src/lib/notification-service.ts',
  'src/lib/api-error.ts',
  'src/app/api/notifications/route.ts',
  'src/app/api/notifications/read-all/route.ts',
  'src/app/api/notifications/[id]/read/route.ts',
  'src/app/api/notifications/settings/route.ts',
  'src/components/layout/AppHeader.tsx',
  'src/features/dashboard/DashboardPage.tsx',
  'src/app/api/dashboard/route.ts',
  'src/app/api/transactions/route.ts',
  'src/app/api/purchases/route.ts',
  'src/app/api/stock/route.ts',
  'prisma/schema.prisma',
];

const root = path.resolve(__dirname, '..');
const fileData = {};
let missing = [];

for (const f of files) {
  const fp = path.join(root, f);
  if (fs.existsSync(fp)) {
    fileData[f] = fs.readFileSync(fp, 'utf8');
  } else {
    missing.push(f);
  }
}

if (missing.length > 0) {
  console.error('MISSING FILES:');
  missing.forEach(f => console.error('  - ' + f));
  process.exit(1);
}

const jsonStr = JSON.stringify(fileData);
const compressed = zlib.gzipSync(Buffer.from(jsonStr));
const b64 = compressed.toString('base64');

const script = `// sync-all-v2.cjs — Auto-extract script for Dkriuk POS
// Generated: ${new Date().toISOString()}
// Files: ${files.length}
// Run: node scripts/sync-all-v2.cjs
//
// This script creates/overwrites files to sync sandbox changes to your local project.
//
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const b64 = '${b64}';

try {
  const compressed = Buffer.from(b64, 'base64');
  const jsonStr = zlib.gunzipSync(compressed).toString('utf8');
  const fileData = JSON.parse(jsonStr);

  const root = path.resolve(__dirname, '..');
  let created = 0;
  let updated = 0;

  const keys = Object.keys(fileData);
  for (let i = 0; i < keys.length; i++) {
    const relPath = keys[i];
    const fullPath = path.join(root, relPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const exists = fs.existsSync(fullPath);
    fs.writeFileSync(fullPath, fileData[relPath], 'utf8');

    if (exists) {
      updated++;
    } else {
      created++;
    }
    console.log('[' + (i + 1) + '/' + keys.length + '] ' + (exists ? 'updated' : 'created') + ': ' + relPath);
  }

  console.log('');
  console.log('Done! ' + created + ' created, ' + updated + ' updated.');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('  1. bun run db:push        (if prisma schema changed)');
  console.log('  2. bun run lint          (check code quality)');
  console.log('  3. git add .');
  console.log('  4. git commit -m "feat: all settings functional, sidebar cleaned"');
  console.log('  5. git push              (auto deploy to Vercel)');
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
`;

const outPath = path.join(root, 'scripts', 'sync-all-v2.cjs');
fs.writeFileSync(outPath, script, 'utf8');

console.log('Generated sync-all-v2.cjs (' + (fs.statSync(outPath).size / 1024).toFixed(1) + ' KB)');
console.log('Files bundled: ' + files.length);
console.log('');
console.log('Run on your deployed project:');
console.log('  node scripts/sync-all-v2.cjs');

const fs = require('fs');
const path = require('path');

const files = [
  'src/features/settings/AccountSettings.tsx',
  'src/features/settings/StoreInfoSettings.tsx',
  'src/features/settings/NotificationSettings.tsx',
  'src/features/settings/AppearanceSettings.tsx',
  'src/lib/notification-service.ts',
  'src/lib/api-error.ts',
  'src/app/api/notifications/route.ts',
  'src/app/api/notifications/read-all/route.ts',
  'src/app/api/notifications/[id]/read/route.ts',
  'src/app/api/notifications/settings/route.ts',
  'src/components/layout/AppHeader.tsx',
  'src/components/layout/AppSidebar.tsx',
  'src/features/dashboard/DashboardPage.tsx',
  'src/app/api/dashboard/route.ts',
  'src/app/api/transactions/route.ts',
  'src/app/api/purchases/route.ts',
  'src/app/api/stock/route.ts',
  'prisma/schema.prisma',
];

const root = path.join(__dirname, '..');
let output = '// ============================================\n';
output += '// Run: node scripts/sync-all-changes.cjs\n';
output += '// ============================================\n';
output += 'const fs = require("fs");\n';
output += 'const path = require("path");\n';
output += '\n';
output += 'function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }\n';
output += '\n';
output += 'const files = [\n';

let totalLines = 0;

for (const f of files) {
  const fullPath = path.join(root, f);
  if (!fs.existsSync(fullPath)) {
    console.log('SKIP (not found): ' + f);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n').length;
  totalLines += lines;
  
  // Escape backticks, dollar signs, and backslashes for template literal
  const escaped = content
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');
  
  output += '  {\n';
  output += '    path: "' + f + '",\n';
  output += '    content: `';
  output += escaped;
  output += '`,\n';
  output += '  },\n';
  
  console.log('[' + files.indexOf(f) + '] ' + f + ' (' + lines + ' lines)');
}

output += '];\n';
output += '\n';
output += 'let count = 0;\n';
output += 'for (const file of files) {\n';
output += '  const fullPath = path.join(__dirname, "..", file.path);\n';
output += '  mkdirp(path.dirname(fullPath));\n';
output += '  fs.writeFileSync(fullPath, file.content);\n';
output += '  count++;\n';
output += '  console.log("[" + count + "/" + files.length + "] " + file.path);\n';
output += '}\n';
output += '\n';
output += 'console.log("" + "Done! " + count + " files synced. ' + totalLines + ' total lines.");\n';
output += 'console.log("Now run: bun add sonner next-themes");\n';

const outPath = path.join(__dirname, 'sync-all-changes.cjs');
fs.writeFileSync(outPath, output);
console.log('\nScript written to: ' + outPath);
console.log('Size: ' + (Buffer.byteLength(output) / 1024).toFixed(1) + ' KB');

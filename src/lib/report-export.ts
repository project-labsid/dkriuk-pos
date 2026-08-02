import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportData {
  sheetName: string;
  columns: string[];
  rows: (string | number)[][];
}

export interface PrintOptions {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: (string | number)[][];
  summary?: Record<string, string>;
}

export interface ThermalOptions {
  storeName: string;
  title: string;
  columns: string[];
  rows: (string | number)[][];
  summary?: Record<string, string>;
}

// ─── Export to Excel ─────────────────────────────────────────────────────────

export function exportToExcel(data: ReportData): void {
  const wsData: (string | number)[][] = [data.columns, ...data.rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-size columns based on content
  const colWidths = data.columns.map((col, colIdx) => {
    let maxLen = col.length;
    for (const row of data.rows) {
      const cellVal = String(row[colIdx] ?? '');
      maxLen = Math.max(maxLen, cellVal.length);
    }
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, data.sheetName);
  XLSX.writeFile(wb, `${data.sheetName}.xlsx`);
}

// ─── Print A4 ─────────────────────────────────────────────────────────────────

export function printReport(options: PrintOptions): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const summaryHtml = options.summary
    ? `<div style="margin-bottom:16px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#64748b;">Ringkasan</h3>
        ${Object.entries(options.summary)
          .map(
            ([k, v]) =>
              `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #e2e8f0;">
                <span style="color:#475569;">${k}</span>
                <span style="font-weight:600;">${v}</span>
              </div>`
          )
          .join('')}
      </div>`
    : '';

  const tableRowsHtml = options.rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">${cell}</td>`
          )
          .join('')}</tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.title}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; margin: 0; padding: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; padding: 8px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #64748b; margin-bottom: 16px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="title">${options.title}</div>
  ${options.subtitle ? `<div class="subtitle">${options.subtitle}</div>` : ''}
  ${summaryHtml}
  <table>
    <thead><tr>${options.columns.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${tableRowsHtml}</tbody>
  </table>
</body>
</html>`;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 5000);
}

// ─── Thermal Receipt Text ────────────────────────────────────────────────────

const THERMAL_WIDTH = 32;

function padRight(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length > len ? str.slice(0, str.length) : ' '.repeat(len - str.length) + str;
}

function centerText(text: string): string {
  const pad = Math.max(0, Math.floor((THERMAL_WIDTH - text.length) / 2));
  return ' '.repeat(pad) + text;
}

export function generateThermalText(options: ThermalOptions): string {
  const lines: string[] = [];
  const sep = '='.repeat(THERMAL_WIDTH);
  const dashSep = '-'.repeat(THERMAL_WIDTH);

  // Header
  lines.push(sep);
  lines.push(centerText(options.storeName.toUpperCase()));
  lines.push(centerText(options.title));
  lines.push(centerText(new Date().toLocaleDateString('id-ID')));
  lines.push(dashSep);

  // Summary
  if (options.summary) {
    for (const [key, val] of Object.entries(options.summary)) {
      const valLen = val.length;
      const keyLen = THERMAL_WIDTH - valLen - 1;
      const truncatedKey = key.length > keyLen ? key.slice(0, keyLen - 1) + '.' : key;
      lines.push(padRight(truncatedKey, keyLen) + ' ' + val);
    }
    lines.push(dashSep);
  }

  // Column headers
  const numCols = options.columns.length;
  const colWidth = Math.floor(THERMAL_WIDTH / numCols);
  const headerLine = options.columns
    .map((c) => padRight(c.slice(0, colWidth), colWidth))
    .join('')
    .slice(0, THERMAL_WIDTH);
  lines.push(headerLine);
  lines.push(dashSep);

  // Rows
  for (const row of options.rows) {
    const parts: string[] = [];
    for (let i = 0; i < row.length; i++) {
      const isLast = i === row.length - 1;
      const available = isLast
        ? THERMAL_WIDTH - parts.join('').length
        : colWidth;
      const cellStr = String(row[i]);
      if (isLast) {
        // Right-align numbers in last column
        const num = parseFloat(cellStr.replace(/[^\d.-]/g, ''));
        parts.push(isNaN(num) ? padRight(cellStr, available) : padLeft(cellStr, available));
      } else {
        parts.push(padRight(cellStr, available));
      }
    }
    lines.push(parts.join('').slice(0, THERMAL_WIDTH));
  }

  lines.push(sep);
  return lines.join('\n');
}

// ─── Print Thermal ────────────────────────────────────────────────────────────

export function printThermal(options: ThermalOptions): void {
  const text = generateThermalText(options);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${options.title}</title>
  <style>
    @page { size: 80mm auto; margin: 2mm; }
    body { margin: 0; padding: 0; background: #fff; }
    pre {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      line-height: 1.3;
      white-space: pre;
      width: 250px;
      margin: 0;
      padding: 4px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <pre>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  iframe.contentWindow?.print();

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 5000);
}

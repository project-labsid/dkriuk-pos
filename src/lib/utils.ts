import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Rupiah Formatting ─────────────────────────────────────────────────────────

/** Format angka ke Rp 10.000 (pakai titik sebagai pemisah ribuan) */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format raw digit string ke string dengan titik: "10000" → "10.000" */
export function formatNominal(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Parse string berformat titik kembali ke angka: "10.000" → 10000 */
export function parseNominal(formatted: string): number {
  return parseInt(formatted.replace(/\D/g, ''), 10) || 0;
}

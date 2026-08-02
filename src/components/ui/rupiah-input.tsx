'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RupiahInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange' | 'type'> {
  /** Angka aktual (tanpa format) */
  value: number;
  /** Callback dengan angka aktual */
  onChange: (value: number) => void;
  /** Tampilkan prefix "Rp " atau tidak */
  showPrefix?: boolean;
  /** Placeholder ketika kosong */
  placeholder?: string;
}

/**
 * Input otomatis format Rupiah.
 * Saat mengetik angka, otomatis muncul titik pemisah ribuan.
 * Contoh: ketik 10000 → tampil "10.000"
 */
const RupiahInput = React.forwardRef<HTMLInputElement, RupiahInputProps>(
  ({ value, onChange, showPrefix = false, placeholder = '0', className, ...props }, ref) => {
    // Simpan raw digit string di internal state agar cursor stabil
    const [rawDigits, setRawDigits] = React.useState(() =>
      value > 0 ? String(value) : ''
    );

    // Sync dari luar (misal reset form)
    React.useEffect(() => {
      const rawFromValue = value > 0 ? String(value) : '';
      setRawDigits(rawFromValue);
    }, [value]);

    const formatted = React.useMemo(() => {
      if (!rawDigits) return '';
      return rawDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }, [rawDigits]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/\D/g, '');
      setRawDigits(digits);
      onChange(parseInt(digits, 10) || 0);
    };

    return (
      <div className="relative">
        {showPrefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            Rp
          </span>
        )}
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={formatted}
          placeholder={placeholder}
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
            showPrefix && 'pl-10',
            className
          )}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

RupiahInput.displayName = 'RupiahInput';

export { RupiahInput };

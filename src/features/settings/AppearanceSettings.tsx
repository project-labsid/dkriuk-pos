'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ArrowLeft, Sun, Moon, Monitor, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AppearanceSettingsProps {
  onBack: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const themeOptions = [
  {
    value: 'light',
    label: 'Terang',
    description: 'Tampilan dengan latar belakang terang',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Gelap',
    description: 'Tampilan dengan latar belakang gelap',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'Sistem',
    description: 'Mengikuti pengaturan sistem operasi Anda',
    icon: Monitor,
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppearanceSettings({ onBack }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const mount = useCallback(() => setMounted(true), []);
  useEffect(() => {
    queueMicrotask(mount);
  }, [mount]);

  return (
    <motion.div {...fadeIn} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tampilan</h1>
          <p className="text-muted-foreground text-sm">
            Personalisasi tampilan aplikasi sesuai preferensi Anda
          </p>
        </div>
      </div>

      {/* Theme Selection */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-emerald-600" />
            Tema Aplikasi
          </CardTitle>
          <CardDescription>
            Pilih tema yang nyaman untuk mata Anda saat menggunakan aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setTheme(option.value);
                      toast.success(`Tema diubah ke ${option.label}`);
                    }}
                    className={cn(
                      'relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all text-center cursor-pointer',
                      'hover:bg-muted/50',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm'
                        : 'border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-12 h-12 rounded-xl transition-colors',
                        isSelected
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl border-2 p-5 space-y-3 animate-pulse">
                  <div className="w-12 h-12 rounded-xl bg-muted mx-auto" />
                  <div className="h-4 w-16 bg-muted rounded mx-auto" />
                  <div className="h-3 w-28 bg-muted rounded mx-auto" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Language Selection */}
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Bahasa
          </CardTitle>
          <CardDescription>
            Pilih bahasa untuk tampilan aplikasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              className={cn(
                'relative flex-1 flex items-center gap-3 rounded-xl border-2 px-5 py-4 transition-all cursor-pointer',
                'hover:bg-muted/50',
                'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
              )}
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <span className="text-lg font-bold">ID</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">Bahasa Indonesia</p>
                <p className="text-xs text-muted-foreground">Bahasa utama aplikasi</p>
              </div>
              <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Fitur multi-bahasa akan segera tersedia.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

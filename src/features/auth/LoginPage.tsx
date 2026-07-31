'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Store, Eye, EyeOff, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuthStore } from '@/store';

type LoginFormData = {
  email: string;
  password: string;
  remember: boolean;
};

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
  remember: z.boolean().optional().default(false),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const { login } = useAuthStore();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch('/api/users?perPage=1');
        if (res.ok) {
          const json = await res.json();
          if (json.total === 0) {
            setIsSetup(true);
          }
        }
      } catch {
        // ignore
      }
    }
    checkSetup();
  }, []);

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || 'Login gagal, periksa email dan password');
        return;
      }

      if (data.remember) {
        localStorage.setItem('pos_remember', data.email);
      } else {
        localStorage.removeItem('pos_remember');
      }

      login(result.user);
      toast.success(`Selamat datang, ${result.user.name}!`);
    } catch {
      toast.error('Terjadi kesalahan koneksi. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem('pos_remember');
    if (saved) {
      form.setValue('email', saved);
      form.setValue('remember', true);
    }
  }, [form]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding area - desktop */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(0,0,0,0.15),transparent_50%)]" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col items-center text-center max-w-md"
          >
            <div className="w-20 h-20 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 border border-white/20">
              <Store className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight mb-4">
              POS Sejahtera
            </h1>
            <p className="text-emerald-100 text-lg leading-relaxed">
              Sistem Point of Sale modern untuk mengelola transaksi, stok, dan laporan bisnis Anda dengan mudah dan efisien.
            </p>
            <div className="mt-12 grid grid-cols-3 gap-6 text-center">
              {[
                { label: 'Transaksi', value: 'Cepat' },
                { label: 'Stok', value: 'Terkelola' },
                { label: 'Laporan', value: 'Lengkap' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-2xl font-bold text-white">{item.value}</div>
                  <div className="text-sm text-emerald-200 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Mobile top gradient section */}
      <div className="lg:hidden relative h-48 bg-gradient-to-br from-emerald-600 to-emerald-800 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative z-10 flex flex-col items-center justify-center h-full text-white"
        >
          <div className="w-14 h-14 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center mb-3 border border-white/20">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">POS Sejahtera</h1>
          <p className="text-emerald-100 text-sm mt-1">Modern Point of Sale</p>
        </motion.div>
      </div>

      {/* Right login form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12"
      >
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Masuk ke Akun</h2>
            <p className="text-muted-foreground mt-2">
              Masukkan email dan password Anda untuk melanjutkan
            </p>
          </div>

          {isSetup && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-lg"
            >
              <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Pertama kali menggunakan sistem? Silakan buat akun Super Admin terlebih dahulu.
              </p>
            </motion.div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="nama@contoh.com"
                        autoComplete="email"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Masukkan password"
                          autoComplete="current-password"
                          disabled={isLoading}
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal cursor-pointer select-none">
                      Ingat saya
                    </FormLabel>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-base font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </Button>
            </form>
          </Form>

        </div>
      </motion.div>
    </div>
  );
}

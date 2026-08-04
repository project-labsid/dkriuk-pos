'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, ExternalLink, MessageCircle, BookOpen, Bug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'Bagaimana cara menambah produk baru?',
    answer:
      'Buka menu Produk > klik tombol "+ Tambah Produk". Isi nama, SKU, harga beli, harga jual, stok, dan kategori. Klik Simpan.',
  },
  {
    question: 'Bagaimana cara membuat transaksi?',
    answer:
      'Buka menu Kasir (POS). Pilih produk yang ingin dijual, atur jumlah, lalu klik "Bayar". Pilih metode pembayaran dan selesaikan transaksi.',
  },
  {
    question: 'Bagaimana cara mencetak struk?',
    answer:
      'Setelah transaksi selesai, struk akan otomatis dicetak jika printer thermal terhubung. Anda juga bisa mencetak ulang dari halaman Riwayat Transaksi.',
  },
  {
    question: 'Bagaimana cara backup data?',
    answer:
      'Buka Pengaturan > Backup. Klik "Export Backup" untuk mendownload file backup. Untuk restore, upload file backup yang sudah disimpan.',
  },
  {
    question: 'Bagaimana cara melihat laporan penjualan?',
    answer:
      'Buka menu Laporan. Pilih tab yang diinginkan (Penjualan, Traffic, Produk Terlaris, dll). Gunakan filter tanggal untuk mempersempit data.',
  },
  {
    question: 'Apa itu Service Charge?',
    answer:
      'Service charge adalah biaya tambahan yang ditambahkan ke total transaksi. Bisa diatur persentasenya di Pengaturan > Service Charge.',
  },
  {
    question: 'Bagaimana cara mengatur printer thermal?',
    answer:
      'Buka Pengaturan > Printer. Pilih jenis printer (thermal 58mm/80mm atau A4), atur jumlah salinan, dan aktifkan auto-print.',
  },
];

const supportLinks = [
  {
    title: 'Dokumentasi',
    description: 'Panduan lengkap penggunaan aplikasi',
    icon: BookOpen,
    url: '#',
  },
  {
    title: 'Hubungi Kami',
    description: 'Chat langsung dengan tim support',
    icon: MessageCircle,
    url: '#',
  },
  {
    title: 'Laporkan Bug',
    description: 'Temukan bug? Laporkan di sini',
    icon: Bug,
    url: '#',
  },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="rounded-lg border">
          <button
            className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
          >
            <span className="text-sm font-medium pr-4">{item.question}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                openIndex === index ? 'rotate-180' : ''
              }`}
            />
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  {item.answer}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export default function HelpSettings() {
  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Pusat Bantuan
          </CardTitle>
          <CardDescription>FAQ dan informasi bantuan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Pertanyaan yang Sering Diajukan (FAQ)</h3>
            <FAQAccordion items={faqItems} />
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3">Tautan Bantuan</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {supportLinks.map((link) => (
                <a
                  key={link.title}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                >
                  <link.icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium flex items-center gap-1">
                      {link.title}
                      <ExternalLink className="h-3 w-3" />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {link.description}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

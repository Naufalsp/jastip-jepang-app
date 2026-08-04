// app/order/[order_number]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrderTrackingPortal() {
  const params = useParams();
  const orderNumber = params?.order_number as string;

  const [order, setOrder] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderNumber) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('order_number', orderNumber)
        .single();

      if (error) {
        console.error("Error fetching order:", error);
      }

      if (data) setOrder(data);
    }

    fetchOrder();
  }, [orderNumber]);

  const handleUploadReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !order) return;

    setUploading(true);
    try {
      // 1. Unggah file struk ke Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${order.order_number}-${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-receipts')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      // 2. Update status pembayaran ke 'pending_verification'
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          payment_proof_url: publicUrl,
          payment_status: 'pending_verification'
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // 3. Panggil API Notifikasi WA bahwa bukti bayar telah berhasil diunggah
      try {
        await fetch('/api/notify-payment-uploaded', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderNumber: order.order_number,
            customerName: order.customer_name,
            whatsappNumber: order.whatsapp_number,
            totalPriceIdr: order.total_price_idr
          })
        });
      } catch (waErr) {
        console.warn("Gagal memicu notifikasi WA upload struk:", waErr);
      }

      alert('Bukti pembayaran berhasil dikirim! Admin akan segera memverifikasi.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Gagal mengunggah bukti transfer');
    } finally {
      setUploading(false);
    }
  };

  // Helper Pemetaan Status Ketersediaan
  const renderAvailabilityBadge = (status: string) => {
    switch (status) {
      case 'tersedia':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full text-xs uppercase">✓ Barang Tersedia</span>;
      case 'tidak_ada_stok':
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold rounded-full text-xs uppercase">✕ Stok Tidak Ada / Habis</span>;
      default:
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs uppercase">⌛ Dalam Pengecekan Admin</span>;
    }
  };

  if (!order) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="p-8 text-center text-slate-500 font-medium animate-pulse">Memuat data pesanan...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto my-12 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      {/* Header Info */}
      <div className="flex flex-wrap justify-between items-center border-b pb-4 gap-2">
        <div>
          <span className="text-xs font-mono text-slate-400 uppercase">ORDER NUMBER</span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{order.order_number}</h1>
          <p className="text-xs text-slate-500 mt-1">Pemesan: <strong>{order.customer_name}</strong> ({order.whatsapp_number})</p>
        </div>
        <div className="text-right">
          <span className="text-xs block font-bold text-slate-500 uppercase mb-1">Status Ketersediaan</span>
          {renderAvailabilityBadge(order.order_status)}
        </div>
      </div>

      {/* Rincian Biaya & Form Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border">
        {/* Detail Rincian Biaya */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Rincian Tagihan (Full Payment)</h3>
          
          {/* Rincian Tagihan */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Total Harga Barang:</span>
              <span className="font-mono font-semibold">
                Rp {Number(order.items_price_idr || 0).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Jasa Titip (Fee Jastip):</span>
              <span className="font-mono font-semibold">
                Rp {Number(order.jastip_fee_idr || 0).toLocaleString('id-ID')}
              </span>
            </div>

            {/* TAMPILKAN BIAYA TRANSPORT JIKA ADA */}
            {order.transport_fee_idr > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>Service Handling Fee (¥300):</span>
                <span className="font-mono font-semibold">
                  Rp {Number(order.transport_fee_idr).toLocaleString('id-ID')}
                </span>
              </div>
            )}

            {order.shipping_fee_idr > 0 && (
              <div className="flex justify-between">
                <span>Ongkir / Bagasi Bagian:</span>
                <span className="font-mono font-semibold">
                  Rp {Number(order.shipping_fee_idr || 0).toLocaleString('id-ID')}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t text-sm font-black text-slate-900">
              <span>Total Pelunasan:</span>
              <span className="text-indigo-600">
                Rp {Number(order.total_price_idr || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <span className="text-xs text-slate-400 uppercase block">Status Pembayaran:</span>
            <span className="text-sm font-bold text-indigo-600 capitalize">
              {order.payment_status?.replace(/_/g, ' ') || 'UNPAID'}
            </span>
          </div>
        </div>

        {/* Kotak Upload Pembayaran */}
        <div className="border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
          {order.order_status === 'dalam_pengecekan' ? (
            <div className="text-xs text-amber-700 bg-amber-50 p-4 rounded-lg border border-amber-200 font-medium space-y-1">
              <p className="font-bold">⌛ Admin Sedang Mengecek Barang</p>
              <p>Tombol pembayaran akan terbuka secara otomatis setelah status ketersediaan barang dikonfirmasi *Tersedia* oleh Admin.</p>
            </div>
          ) : order.order_status === 'tidak_ada_stok' ? (
            <div className="text-xs text-rose-700 bg-rose-50 p-4 rounded-lg border border-rose-200 font-medium">
              <p className="font-bold">✕ Stok Barang Habis / Tidak Ada</p>
              <p>Mohon maaf, barang tidak dapat diproses karena tidak tersedia di toko Jepang.</p>
            </div>
          ) : order.payment_status === 'fully_paid' || order.payment_status === 'paid' ? (
            /* TAMPILAN JIKA SUDAH DIVERIFIKASI LUNAS OLEH ADMIN */
            <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200 text-center space-y-2">
              <div className="w-10 h-10 bg-emerald-500 text-white font-bold text-lg rounded-full flex items-center justify-center mx-auto">
                ✓
              </div>
              <p className="text-sm font-black text-emerald-900 uppercase tracking-wide">
                Pembayaran Lunas
              </p>
              <p className="text-xs text-emerald-700">
                Terima kasih! Bukti transfer kamu telah diverifikasi Admin. Pesanan kamu sedang diproses/disiapkan oleh tim Jepang.
              </p>
            </div>
          ) : order.payment_status === 'pending_verification' ? (
            /* TAMPILAN JIKA SUDAH UPLOAD STRUK TAPI BELUM VERIFIKASI ADMIN */
            <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 text-center space-y-2">
              <div className="w-10 h-10 bg-amber-500 text-white font-bold text-lg rounded-full flex items-center justify-center mx-auto animate-pulse">
                ⏳
              </div>
              <p className="text-sm font-bold text-amber-900 uppercase">
                Menunggu Verifikasi Admin
              </p>
              <p className="text-xs text-amber-700">
                Struk transfer sudah kami terima. Admin sedang mencocokkan mutasi rekening kamu.
              </p>
            </div>
          ) : (
            /* FORM UPLOAD STRUK (JIKA UNPAID) */
            <form onSubmit={handleUploadReceipt} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Upload Bukti Pembayaran Lunas (Full Payment)
              </label>
              
              <div>
                <label 
                  htmlFor="payment-proof-upload" 
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                >
                  📁 Pilih File Struk Transfer
                </label>
                <input 
                  id="payment-proof-upload"
                  type="file" 
                  accept="image/*" 
                  required 
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="hidden" 
                />
                {file && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    ✓ File terpilih: {file.name}
                  </p>
                )}
              </div>
              
              <button 
                type="submit" 
                disabled={uploading || !file}
                className="w-full bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {uploading ? 'Mengirim Struk...' : 'Kirim Bukti Pembayaran Lunas'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Manifest Barang */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 border-b pb-2 text-sm">Daftar Barang Bawaan / Titipan</h3>
        {order.order_items && order.order_items.length > 0 ? (
          order.order_items.map((item: any) => (
            <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm text-sm">
              <div>
                <p className="font-bold text-slate-900">{item.item_name}</p>
                <p className="text-xs text-slate-400">Jumlah: {item.quantity}x</p>
              </div>
              <div className="text-right">
                {item.price_original > 0 && (
                  <p className="font-mono text-xs text-slate-400">¥{Number(item.price_original).toLocaleString()}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400 italic">Tidak ada item rincian.</p>
        )}
      </div>
    </div>
  );
}
// app/admin/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { calculateOrderPricing } from '@/lib/pricing';

export default function AdminManageOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [totalWeightKg, setTotalWeightKg] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchOrderData() {
      if (!orderId) return;

      try {
        setLoading(true);
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', orderId)
          .single();

        if (orderErr) throw orderErr;

        setOrder(orderData);
        setItems(orderData.order_items || []);
        setTotalWeightKg(orderData.total_weight_kg || 0);
      } catch (err: any) {
        alert('Gagal mengambil detail order: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrderData();
  }, [orderId]);

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Kalkulasi Otomatis Berdasarkan Input Harga Yen Saat Ini
  const currentPricing = calculateOrderPricing(
    order?.package_type || 'titip_beli',
    items.map((i) => ({
      priceJpy: Number(i.item_price_jpy) || 0,
      quantity: Number(i.quantity) || 1,
    })),
    totalWeightKg
  );

  const handleSaveAndNotify = async () => {
    try {
      setSaving(true);

      // 1. Simpan Status Ketersediaan & Harga Yen masing-masing item ke Supabase
      for (const item of items) {
        const { error: itemErr } = await supabase
          .from('order_items')
          .update({
            availability_status: item.availability_status || 'pending',
            item_price_jpy: Number(item.item_price_jpy) || 0,
          })
          .eq('id', item.id);

        if (itemErr) throw itemErr;
      }

      // 2. Cek ketersediaan item untuk menentukan status final order
      const availableItems = items.filter(
        (i) => i.availability_status === 'available'
      );
      
      // Jika tidak ada barang yang tersedia sama sekali, set status 'tidak_ada_stok'
      const targetStatus = availableItems.length === 0 ? 'tidak_ada_stok' : 'menunggu_dp';

      // 3. Simpan Header Pesanan & Update Status
      const updatedOrderPayload = {
        total_weight_kg: totalWeightKg,
        total_items_price: currentPricing.totalItemsPriceIdr,
        total_jastip_fee: currentPricing.totalJastipFeeIdr,
        total_price: currentPricing.totalPriceIdr,
        dp_amount: currentPricing.dp75AmountIdr,
        order_status: targetStatus,
      };

      const { error: orderUpdateErr } = await supabase
        .from('orders')
        .update(updatedOrderPayload)
        .eq('id', orderId);

      if (orderUpdateErr) throw orderUpdateErr;

      // 4. Kirim WA Notification via API Route
      const fullOrderForWA = {
        ...order,
        ...updatedOrderPayload,
      };

      const resWa = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'status_or_verification',
          actionType: 'status_change',
          newStatus: targetStatus, // Gunakan status dinamis
          order: fullOrderForWA,
          orderItems: items,
          items: items,
        }),
      });

      if (!resWa.ok) {
        const errData = await resWa.json().catch(() => ({}));
        console.warn('Order berhasil disimpan tetapi notifikasi WhatsApp gagal terkirim:', errData);
      }

      alert('Harga & Status transaksi berhasil diperbarui!');
      router.push('/admin');
    } catch (err: any) {
      alert('Gagal menyimpan perubahan: ' + (err.message || 'Terjadi kesalahan'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <p className="text-sm font-bold text-slate-600">Memuat data pesanan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans flex justify-center">
      <div className="w-full max-w-3xl bg-white rounded-3xl border border-slate-900 p-6 space-y-6 shadow-sm">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">Kelola Harga Pesanan</h1>
            <p className="text-xs text-slate-500">
              Order: <span className="font-bold text-slate-800">#{order?.order_number}</span> ({order?.customer_name})
            </p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="text-xs font-bold text-slate-500 hover:text-slate-800"
          >
            ← Kembali
          </button>
        </div>

        {/* Input Barang & Harga Yen Per Item */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            1. Input Harga Yen Per Item
          </h2>

          {items.map((item, index) => (
            <div key={item.id || index} className="p-4 border rounded-2xl bg-slate-50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900">
                  {item.item_name} <span className="text-slate-500">(Qty: {item.quantity})</span>
                </span>
                <select
                  value={item.availability_status || 'pending'}
                  onChange={(e) => handleItemChange(index, 'availability_status', e.target.value)}
                  className="p-1.5 border rounded-lg text-xs font-bold bg-white"
                >
                  <option value="pending">Proses Cek</option>
                  <option value="available">Tersedia</option>
                  <option value="out_of_stock">Kosong</option>
                </select>
              </div>

              {order?.package_type === 'titip_beli' && (
                <div className="pt-1">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    Harga Barang (Yen / JPY per unit)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">¥</span>
                    <input
                      type="number"
                      value={item.item_price_jpy || ''}
                      onChange={(e) =>
                        handleItemChange(index, 'item_price_jpy', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                      className="w-full p-2 pl-8 border rounded-xl text-xs font-bold bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Configuration Khusus Titip Kirim */}
        {order?.package_type === 'titip_kirim' && (
          <div className="p-4 border border-amber-200 bg-amber-50 rounded-2xl space-y-2">
            <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Total Berat Bagasi (Titip Kirim)
            </h2>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.5"
                value={totalWeightKg}
                onChange={(e) => setTotalWeightKg(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 border border-amber-300 rounded-xl text-xs font-bold text-slate-900 bg-white"
              />
              <span className="text-xs font-bold text-amber-900">Kg</span>
            </div>
          </div>
        )}

        {/* Ringkasan Perhitungan Transaksi */}
        <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2 text-xs">
          <div className="font-bold text-slate-400 uppercase border-b border-slate-800 pb-2 mb-3 tracking-wider text-[11px]">
            Ringkasan Rincian Biaya Transaksi
          </div>

          {order?.package_type === 'titip_beli' ? (
            <>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Harga Barang:</span>
                <span className="font-bold">
                  Rp {currentPricing.totalItemsPriceIdr.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Fee Jastip:</span>
                <span className="font-bold">
                  Rp {currentPricing.totalJastipFeeIdr.toLocaleString('id-ID')}
                </span>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <span className="text-slate-400">Total Biaya Bagasi:</span>
              <span className="font-bold">
                Rp {currentPricing.shippingFeeIdr.toLocaleString('id-ID')}
              </span>
            </div>
          )}

          <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-sm font-black text-emerald-400">
            <span>Total Pelunasan:</span>
            <span className="text-base">
              Rp {currentPricing.totalPriceIdr.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 pt-1">
            <span>Estimasi DP 75%:</span>
            <span className="font-bold text-white">
              Rp {currentPricing.dp75AmountIdr.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <button
          onClick={handleSaveAndNotify}
          disabled={saving}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-sm transition shadow-sm disabled:opacity-50"
        >
          {saving ? 'Menyimpan & Mengirim WA...' : 'Simpan Harga & Kirim Notifikasi WA'}
        </button>
      </div>
    </div>
  );
}
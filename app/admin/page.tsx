'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [totalWeightKg, setTotalWeightKg] = useState<number>(1);
  const [itemPrices, setItemPrices] = useState<{ [key: string]: number | string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [filterPackageType, setFilterPackageType] = useState<string>('ALL');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  // Verifikasi Pembayaran Full Payment
  const handleVerifyPayment = async (orderId: string) => {
    // 1. Cari data order yang sedang diverifikasi
    const targetOrder = orders.find((o) => o.id === orderId);

    if (!targetOrder) {
      alert('Data pesanan tidak ditemukan!');
      return;
    }

    // 2. Update status pembayaran ke 'fully_paid'
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'fully_paid' })
      .eq('id', orderId);

    if (error) {
      alert('Gagal memverifikasi pembayaran: ' + error.message);
      return;
    }

    // 3. Kirim Notifikasi WhatsApp Otomatis ke Customer
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const trackingUrl = `${baseUrl}/order/${targetOrder.order_number}`;

    const messageText = `Halo Kak ${targetOrder.customer_name}! 👋\n\n` +
      `Pembayaran untuk pesanan *${targetOrder.order_number}* telah *DIVERIFIKASI & LUNAS* oleh Admin! ✅\n\n` +
      `Barang kamu saat ini sedang disiapkan / dibeli oleh tim kami di Jepang. 🇯🇵\n\n` +
      `Cek perkembangan status pesanan kamu kapan saja di link berikut:\n${trackingUrl}\n\n` +
      `Terima kasih! 🙏`;

    try {
      await fetch('/api/admin/send-wa-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetOrder.whatsapp_number,
          message: messageText
        })
      });
      alert('Pembayaran LUNAS berhasil diverifikasi dan WA konfirmasi telah dikirim!');
    } catch (waErr) {
      console.error('Gagal kirim WA:', waErr);
      alert('Pembayaran diverifikasi, tetapi pesan WA gagal terkirim.');
    }

    // 4. Refresh data di layar Admin
    fetchOrders();
  };

  // Update Status Ketersediaan Barang (dalam_pengecekan / tersedia / tidak_ada_stok)
  const handleUpdateAvailability = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ order_status: status })
      .eq('id', orderId);

    if (error) {
      alert('Gagal memperbarui ketersediaan: ' + error.message);
    } else {
      fetchOrders();
    }
  };

  const handleFinalizeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const itemsPayload = selectedOrder.order_items.map((item: any) => ({
        id: item.id,
        item_name: item.item_name,
        price_original: Number(itemPrices[item.id] || 0),
        category: item.category || 'General',
        quantity: item.quantity
      }));

      const res = await fetch('/api/admin/finalize-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          totalWeightKg: Number(totalWeightKg),
          items: itemsPayload
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal memproses finalisasi');

      alert('Harga berhasil dikunci & Status Ketersediaan otomatis TERSEDIA!');
      setSelectedOrder(null);
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((ord) => {
    if (filterPackageType === 'ALL') return true;
    const typeValue = (ord.package_type || ord.order_type || '').toString().toLowerCase().trim();
    if (filterPackageType === 'TITIP_BELI') return typeValue.includes('beli') || typeValue === '';
    if (filterPackageType === 'TITIP_KIRIM') return typeValue.includes('kirim');
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-xl shadow-sm border">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Dashboard Admin Jastip</h1>
            <p className="text-sm text-slate-500">Kelola status ketersediaan barang dan kunci harga.</p>
          </div>
          <button onClick={fetchOrders} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">
            🔄 Refresh Data
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Daftar Pesanan Masuk</h2>

            {/* Filter Tab */}
            <div className="flex gap-2 mb-4 bg-slate-200 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setFilterPackageType('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${filterPackageType === 'ALL' ? 'bg-white text-slate-900' : 'text-slate-600'}`}
              >
                Semua ({orders.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterPackageType('TITIP_BELI')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${filterPackageType === 'TITIP_BELI' ? 'bg-white text-indigo-600' : 'text-slate-600'}`}
              >
                🛒 Titip Beli
              </button>
              <button
                type="button"
                onClick={() => setFilterPackageType('TITIP_KIRIM')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${filterPackageType === 'TITIP_KIRIM' ? 'bg-white text-indigo-600' : 'text-slate-600'}`}
              >
                📦 Titip Kirim
              </button>
            </div>

            {loading ? (
              <p className="p-8 text-center bg-white rounded-xl border text-slate-400">Memuat data...</p>
            ) : filteredOrders.map((ord) => (
              <div key={ord.id} className="bg-white p-5 rounded-xl border shadow-sm space-y-3">
                <div className="flex justify-between items-start border-b pb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-400">{ord.order_number}</span>
                    <h3 className="font-bold text-slate-900 text-lg">{ord.customer_name || 'Tanpa Nama'}</h3>
                    <p className="text-xs text-slate-500">Whatsapp: {ord.whatsapp_number}</p>
                    <p className="text-xs text-slate-500">Alamat Penerima: {ord.shipping_address}</p>
                  </div>

                  <div className="text-right space-y-1">
                    {/* Select Status Ketersediaan Barang */}
                    <select
                      value={ord.order_status || 'dalam_pengecekan'}
                      onChange={(e) => handleUpdateAvailability(ord.id, e.target.value)}
                      className="text-xs border font-bold rounded-lg px-2 py-1 bg-slate-50"
                    >
                      <option value="dalam_pengecekan">⌛ Dalam Pengecekan</option>
                      <option value="tersedia">✓ Tersedia</option>
                      <option value="tidak_ada_stok">✕ Tidak Ada Stok</option>
                    </select>

                    <p className="text-xs font-bold text-indigo-600 uppercase">
                      {(ord.payment_status || 'UNPAID').replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                {/* --- DETAIL RINCIAN HARGA PADA CARD DOKUMEN --- */}
                <div className="bg-slate-50 p-3 rounded-lg border space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Harga Barang:</span>
                    <span className="font-mono font-semibold">
                      Rp {Number(ord.items_price_idr || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Fee Jastip:</span>
                    <span className="font-mono font-semibold">
                      Rp {Number(ord.jastip_fee_idr || 0).toLocaleString('id-ID')}
                    </span>
                  </div>

                  {ord.transport_fee_idr > 0 && (
                    <div className="flex justify-between text-amber-700 font-medium">
                      <span>Transport Lokal (¥300):</span>
                      <span className="font-mono font-semibold">
                        Rp {Number(ord.transport_fee_idr).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  {ord.shipping_fee_idr > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Ongkir Bagasi:</span>
                      <span className="font-mono font-semibold">
                        Rp {Number(ord.shipping_fee_idr).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2 border-t font-bold text-slate-900 text-sm">
                    <span>Total Pelunasan:</span>
                    <span className="text-indigo-600 font-black">
                      Rp {Number(ord.total_price_idr || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {ord.payment_proof_url && (
                    <a href={ord.payment_proof_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-sky-50 text-sky-700 text-xs font-bold rounded-lg border">
                      👁️ Struk
                    </a>
                  )}

                  {ord.payment_status === 'pending_verification' && (
                    <button onClick={() => handleVerifyPayment(ord.id)} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg">
                      ✓ Verifikasi Lunas
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSelectedOrder(ord);
                      const initialPrices: any = {};
                      ord.order_items?.forEach((i: any) => { initialPrices[i.id] = i.price_original || ''; });
                      setItemPrices(initialPrices);
                      setTotalWeightKg(ord.total_weight_kg || 1);
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg"
                  >
                    ⚙️ Kelola Harga
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Panel Konfirmasi Harga */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl border shadow-sm sticky top-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b pb-3">Panel Konfirmasi Harga</h2>

              {!selectedOrder ? (
                <p className="text-xs text-slate-400 text-center py-12">
                  Klik <span className="font-bold text-slate-700">⚙️ Kelola Harga</span> pada pesanan untuk memproses tagihan.
                </p>
              ) : (
                <form onSubmit={handleFinalizeOrder} className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border">
                    <p className="font-bold text-slate-900">{selectedOrder.order_number}</p>
                    <p className="text-xs text-slate-500">{selectedOrder.customer_name}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Berat Bagasi Total (Kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={totalWeightKg}
                      onChange={(e) => setTotalWeightKg(Number(e.target.value))}
                      className="w-full border rounded-lg p-2 text-sm font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-2 border-t pt-2">
                    <label className="block text-xs font-bold text-slate-700">Harga JPY Per Barang:</label>
                    {selectedOrder.order_items?.map((item: any) => (
                      <div key={item.id} className="bg-slate-50 p-2 rounded border space-y-1">
                        <p className="text-xs font-bold">{item.item_name} ({item.quantity}x)</p>
                        <input
                          type="number"
                          placeholder="Harga Yen"
                          value={itemPrices[item.id] !== undefined ? itemPrices[item.id] : ''}
                          onChange={(e) => setItemPrices({ ...itemPrices, [item.id]: e.target.value === '' ? '' : Number(e.target.value) })}
                          className="w-full border rounded p-1.5 text-xs font-mono font-bold"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  {/* --- RINCIAN KALKULASI TAGIHAN DI PANEL KANAN --- */}
                  <div className="bg-slate-50 p-3 rounded-lg border space-y-1 text-xs">
                    <p className="font-bold text-slate-700 border-b pb-1 mb-2 uppercase text-[10px] tracking-wider">
                      Rincian Tagihan Saat Ini
                    </p>

                    <div className="flex justify-between text-slate-600">
                      <span>Total Harga Barang:</span>
                      <span className="font-mono font-semibold">
                        Rp {Number(selectedOrder.items_price_idr || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Fee Jastip:</span>
                      <span className="font-mono font-semibold">
                        Rp {Number(selectedOrder.jastip_fee_idr || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {selectedOrder.transport_fee_idr > 0 && (
                      <div className="flex justify-between text-amber-700 font-medium">
                        <span>Transport (¥300):</span>
                        <span className="font-mono font-semibold">
                          Rp {Number(selectedOrder.transport_fee_idr).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    {selectedOrder.shipping_fee_idr > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Ongkir Bagasi:</span>
                        <span className="font-mono font-semibold">
                          Rp {Number(selectedOrder.shipping_fee_idr).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between pt-2 border-t font-black text-slate-900 text-sm">
                      <span>Total Tagihan:</span>
                      <span className="text-indigo-600">
                        Rp {Number(selectedOrder.total_price_idr || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-lg">
                    {submitting ? 'Memproses...' : '⚡ Kunci Harga & Set status TERSEDIA'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
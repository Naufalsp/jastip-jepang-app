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
    const targetOrder = orders.find((o) => o.id === orderId);

    if (!targetOrder) {
      alert('Data pesanan tidak ditemukan!');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .update({ payment_status: 'fully_paid' })
      .eq('id', orderId);

    if (error) {
      alert('Gagal memverifikasi pembayaran: ' + error.message);
      return;
    }

    // Kirim Notifikasi WhatsApp Otomatis ke Customer
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

    fetchOrders();
  };

  // Update Status Ketersediaan Barang
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

  // KETEGORI PENYARINGAN PESANAN
  const checkIsTitipBeli = (ord: any) => {
    const typeValue = (ord.package_type || ord.order_type || '').toString().toLowerCase().trim();
    return typeValue.includes('beli') || typeValue === '';
  };

  const checkIsTitipKirim = (ord: any) => {
    const typeValue = (ord.package_type || ord.order_type || '').toString().toLowerCase().trim();
    return typeValue.includes('kirim');
  };

  // JUMLAH UTK DITAMPILKAN DI PADA BUTTON TAB FILTER
  const totalAll = orders.length;
  const totalTitipBeli = orders.filter(checkIsTitipBeli).length;
  const totalTitipKirim = orders.filter(checkIsTitipKirim).length;

  const filteredOrders = orders.filter((ord) => {
    if (filterPackageType === 'ALL') return true;
    if (filterPackageType === 'TITIP_BELI') return checkIsTitipBeli(ord);
    if (filterPackageType === 'TITIP_KIRIM') return checkIsTitipKirim(ord);
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-6 pb-20">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header Dashboard */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-2xl shadow-sm border gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Dashboard Admin Jastip</h1>
            <p className="text-xs sm:text-sm text-slate-500">Kelola status ketersediaan barang &amp; kunci harga.</p>
          </div>
          <button 
            onClick={fetchOrders} 
            className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold active:scale-95 transition text-center"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Filter Tab Kategori (Mobile-Friendly Horizontal Scroll) */}
        <div className="bg-white p-2 rounded-2xl border shadow-sm">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterPackageType('ALL')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                filterPackageType === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({totalAll})
            </button>
            <button
              type="button"
              onClick={() => setFilterPackageType('TITIP_BELI')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                filterPackageType === 'TITIP_BELI'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🛒 Titip Beli ({totalTitipBeli})
            </button>
            <button
              type="button"
              onClick={() => setFilterPackageType('TITIP_KIRIM')}
              className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition ${
                filterPackageType === 'TITIP_KIRIM'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📦 Titip Kirim ({totalTitipKirim})
            </button>
          </div>
        </div>

        {/* Daftar Pesanan Masuk */}
        <div className="space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 px-1">
            Daftar Pesanan ({filteredOrders.length})
          </h2>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border text-slate-400 font-medium animate-pulse text-xs">
              Memuat data pesanan...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border text-slate-400 text-xs font-medium">
              Tidak ada pesanan pada kategori ini.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const combinedJastipFee = Number(ord.jastip_fee_idr || 0) + Number(ord.transport_fee_idr || 0);

              return (
                <div key={ord.id} className="bg-white p-4 sm:p-5 rounded-2xl border shadow-sm space-y-3">
                  {/* Header Card Pesanan */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">{ord.order_number}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                          checkIsTitipKirim(ord) ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {checkIsTitipKirim(ord) ? 'Titip Kirim' : 'Titip Beli'}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg mt-0.5">{ord.customer_name || 'Tanpa Nama'}</h3>
                      <p className="text-xs text-slate-500">WA: <span className="font-semibold text-slate-700">{ord.whatsapp_number}</span></p>
                      {ord.shipping_address && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">Alamat: {ord.shipping_address}</p>
                      )}
                    </div>

                    {/* Status Select & Payment Badge */}
                    <div className="w-full sm:w-auto flex sm:flex-col justify-between items-center sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0">
                      <select
                        value={ord.order_status || 'dalam_pengecekan'}
                        onChange={(e) => handleUpdateAvailability(ord.id, e.target.value)}
                        className="text-xs border font-bold rounded-xl px-2.5 py-1.5 bg-slate-50 text-slate-800 cursor-pointer"
                      >
                        <option value="dalam_pengecekan">⌛ Dalam Pengecekan</option>
                        <option value="tersedia">✓ Tersedia</option>
                        <option value="tidak_ada_stok">✕ Tidak Ada Stok</option>
                      </select>

                      <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-lg ${
                        ord.payment_status === 'fully_paid' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : ord.payment_status === 'pending_verification'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {(ord.payment_status || 'UNPAID').replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Ringkasan Biaya Tagihan */}
                  <div className="bg-slate-50 p-3 rounded-xl border space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Harga Barang:</span>
                      <span className="font-mono font-semibold">
                        Rp {Number(ord.items_price_idr || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Fee Jastip:</span>
                      <span className="font-mono font-semibold">
                        Rp {combinedJastipFee.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {ord.shipping_fee_idr > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Ongkir / Bagasi:</span>
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

                  {/* Tombol Aksi */}
                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    {ord.payment_proof_url && (
                      <a 
                        href={ord.payment_proof_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex-1 sm:flex-initial text-center px-3 py-2 bg-sky-50 text-sky-700 text-xs font-bold rounded-xl border hover:bg-sky-100 transition"
                      >
                        👁️ Struk
                      </a>
                    )}

                    {ord.payment_status === 'pending_verification' && (
                      <button 
                        onClick={() => handleVerifyPayment(ord.id)} 
                        className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 active:scale-95 transition"
                      >
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
                      className="flex-1 sm:flex-initial px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 active:scale-95 transition"
                    >
                      ⚙️ Kelola Harga
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL POPUP / BOTTOM SHEET KELOLA HARGA (TAMPIL HANYA JIKA DIBUKA) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            
            {/* Header Modal */}
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h3 className="text-base font-black text-slate-900">Kelola &amp; Kunci Harga</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedOrder.order_number} - {selectedOrder.customer_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Body Modal (Scrollable) */}
            <form onSubmit={handleFinalizeOrder} className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Berat Bagasi Total */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Berat Bagasi Total (Kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={totalWeightKg}
                  onChange={(e) => setTotalWeightKg(Number(e.target.value))}
                  className="w-full border rounded-xl p-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Input Harga JPY per Barang */}
              <div className="space-y-2 border-t pt-3">
                <label className="block text-xs font-bold text-slate-700">Harga JPY Per Barang:</label>
                {selectedOrder.order_items?.map((item: any) => (
                  <div key={item.id} className="bg-slate-50 p-3 rounded-xl border space-y-1.5">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-bold text-slate-900">{item.item_name}</p>
                      <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">{item.quantity}x</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">¥</span>
                      <input
                        type="number"
                        placeholder="Harga Yen"
                        value={itemPrices[item.id] !== undefined ? itemPrices[item.id] : ''}
                        onChange={(e) => setItemPrices({ ...itemPrices, [item.id]: e.target.value === '' ? '' : Number(e.target.value) })}
                        className="w-full border rounded-lg p-2 pl-7 text-xs font-mono font-bold text-slate-900 bg-white"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Rincian Tagihan Saat Ini dalam Modal */}
              <div className="bg-slate-50 p-3 rounded-xl border space-y-1.5 text-xs">
                <p className="font-bold text-slate-700 border-b pb-1 uppercase text-[10px] tracking-wider">
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
                    Rp {(Number(selectedOrder.jastip_fee_idr || 0) + Number(selectedOrder.transport_fee_idr || 0)).toLocaleString('id-ID')}
                  </span>
                </div>

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

              {/* Footer Tombol Submit */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="w-1/3 py-3 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Memproses...' : '⚡ Kunci Harga & Set TERSEDIA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
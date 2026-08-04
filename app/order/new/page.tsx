'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewOrderPage() {
  const router = useRouter();
  const [orderType, setOrderType] = useState<'TITIP_BELI' | 'TITIP_KIRIM'>('TITIP_BELI');
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [shippingAddress, setShippingAddress] = useState(''); // <-- [DITAMBAHKAN] State Alamat
  const [estimatedWeightKg, setEstimatedWeightKg] = useState<number>(1);

  // List Item Barang
  const [items, setItems] = useState<{ item_name: string; quantity: number }[]>([
    { item_name: '', quantity: 1 }
  ]);

  const [submitting, setSubmitting] = useState(false);

  const handleAddItem = () => {
    setItems([...items, { item_name: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validasi item tidak boleh kosong
      const validItems = items.filter(i => i.item_name.trim() !== '');
      if (validItems.length === 0) {
        alert('Mohon isi minimal 1 nama barang.');
        setSubmitting(false);
        return;
      }

      const payload = {
        orderType,
        customerName,
        whatsappNumber,
        shippingAddress, // <-- [DITAMBAHKAN] Kirim alamat ke API
        estimatedWeightKg: orderType === 'TITIP_KIRIM' ? Number(estimatedWeightKg) : null,
        items: validItems
      };

      const res = await fetch('/api/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat pesanan');

      alert('Pesanan berhasil dibuat! Anda akan diarahkan ke halaman tracking.');
      router.push(`/order/${data.orderNumber}`);
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat memproses order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-12 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Form Pesanan Jastip Jepang</h1>
        <p className="text-xs text-slate-500">Isi detail pesanan kamu di bawah ini.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipe Layanan */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Pilih Tipe Layanan</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setOrderType('TITIP_BELI')}
              className={`p-3 text-xs font-bold rounded-xl border transition text-center ${
                orderType === 'TITIP_BELI' 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              🛒 Titip Beli (Beli Barang di Jepang)
            </button>
            <button
              type="button"
              onClick={() => setOrderType('TITIP_KIRIM')}
              className={`p-3 text-xs font-bold rounded-xl border transition text-center ${
                orderType === 'TITIP_KIRIM' 
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                  : 'border-slate-200 text-slate-600'
              }`}
            >
              📦 Titip Kirim (Kirim Bagasi / Bawaan)
            </button>
          </div>
        </div>

        {/* Data Pemesan */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nama Pemesan</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              className="w-full border rounded-lg p-2.5 text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp</label>
            <input
              type="text"
              required
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="Contoh: 08123456789 atau +628123456789"
              className="w-full border rounded-lg p-2.5 text-sm font-medium"
            />
          </div>

          {/* INPUT ALAMAT LENGKAP PENGIRIMAN */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Alamat Lengkap Pengiriman (di Indonesia)
            </label>
            <textarea
              required
              rows={3}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Contoh: Jln. Kebon Jeruk No. 12, RT 01/RW 02, Kec. Kebayoran Baru, Jakarta Selatan, 12240"
              className="w-full border rounded-lg p-2.5 text-sm font-medium resize-y"
            />
          </div>

          {/* PERKIRAAN BERAT: Hanya untuk Titip Kirim */}
          {orderType === 'TITIP_KIRIM' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <label className="block text-xs font-bold text-amber-900">Perkiraan Berat Bagasi (Kg)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={estimatedWeightKg}
                onChange={(e) => setEstimatedWeightKg(Number(e.target.value))}
                className="w-full border rounded-lg p-2 text-sm font-bold text-slate-900 bg-white"
              />
              <p className="text-[11px] text-amber-700">Masukkan perkiraan berat total barang yang ingin dititipkan.</p>
            </div>
          )}
        </div>

        {/* Daftar Barang */}
        <div className="space-y-3 border-t pt-4">
          <label className="block text-xs font-bold text-slate-700 uppercase">Daftar Barang Titipan</label>
          
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                required
                placeholder="Nama Barang"
                value={item.item_name}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].item_name = e.target.value;
                  setItems(updated);
                }}
                className="flex-1 border rounded-lg p-2 text-xs font-medium"
              />
              <input
                type="number"
                min="1"
                required
                value={item.quantity}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].quantity = Number(e.target.value);
                  setItems(updated);
                }}
                className="w-20 border rounded-lg p-2 text-xs font-bold text-center"
              />
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="text-rose-500 font-bold px-2 py-1 text-xs hover:bg-rose-50 rounded"
                >
                  ✕
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            + Tambah Barang Lain
          </button>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-900 text-white font-bold text-xs py-3 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
        >
          {submitting ? 'Memproses Pesanan...' : 'Kirim Pesanan'}
        </button>
      </form>
    </div>
  );
}
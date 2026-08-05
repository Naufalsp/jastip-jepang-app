'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type ServiceType = 'TITIP_BELI_TOKO' | 'TITIP_BELI_ONLINE' | 'TITIP_KIRIM';

interface OrderItemInput {
  item_name: string;
  quantity: number;
  item_url?: string;
  image_url?: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [serviceType, setServiceType] = useState<ServiceType>('TITIP_BELI_TOKO');
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [weightKg, setWeightKg] = useState(1);
  const [items, setItems] = useState<OrderItemInput[]>([
    { item_name: '', quantity: 1, item_url: '', image_url: '' }
  ]);

  const handleAddItem = () => {
    setItems([...items, { item_name: '', quantity: 1, item_url: '', image_url: '' }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      customerName,
      whatsappNumber,
      packageType: serviceType,
      totalWeightKg: serviceType === 'TITIP_KIRIM' ? weightKg : 0,
      items: serviceType !== 'TITIP_KIRIM' ? items : []
    };

    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      router.push(`/order/${data.orderNumber}`);
    } else {
      alert(data.error || 'Gagal membuat pesanan');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl border shadow-sm my-8">
      <h1 className="text-xl font-bold mb-4">Buat Pesanan Jastip</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Input Customer */}
        <div>
          <label className="block text-xs font-bold mb-1">Nama Lengkap</label>
          <input
            required
            type="text"
            className="w-full border rounded-lg p-2 text-sm"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">Nomor WhatsApp</label>
          <input
            required
            type="text"
            className="w-full border rounded-lg p-2 text-sm"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
          />
        </div>

        {/* Pemilihan Layanan */}
        <div>
          <label className="block text-xs font-bold mb-2">Pilih Layanan</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setServiceType('TITIP_BELI_TOKO')}
              className={`p-2 text-xs font-bold rounded-xl border ${
                serviceType === 'TITIP_BELI_TOKO' ? 'bg-indigo-600 text-white' : 'bg-slate-50'
              }`}
            >
              🛍️ Titip Beli Toko
            </button>
            <button
              type="button"
              onClick={() => setServiceType('TITIP_BELI_ONLINE')}
              className={`p-2 text-xs font-bold rounded-xl border ${
                serviceType === 'TITIP_BELI_ONLINE' ? 'bg-indigo-600 text-white' : 'bg-slate-50'
              }`}
            >
              🌐 Checkout Online
            </button>
            <button
              type="button"
              onClick={() => setServiceType('TITIP_KIRIM')}
              className={`p-2 text-xs font-bold rounded-xl border ${
                serviceType === 'TITIP_KIRIM' ? 'bg-indigo-600 text-white' : 'bg-slate-50'
              }`}
            >
              📦 Titip Kirim
            </button>
          </div>
        </div>

        {/* Form Dinamis Berdasarkan Layanan */}
        {serviceType === 'TITIP_BELI_TOKO' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Barang Toko (Nama & Foto Wajib)</h3>
            {items.map((item, idx) => (
              <div key={idx} className="p-3 border rounded-xl bg-slate-50 space-y-2 text-xs">
                <input
                  required
                  placeholder="Nama Barang"
                  className="w-full p-2 border bg-white rounded-lg"
                  value={item.item_name}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx].item_name = e.target.value;
                    setItems(updated);
                  }}
                />
                <input
                  required
                  placeholder="URL Gambar Produk (Upload Image)"
                  className="w-full p-2 border bg-white rounded-lg"
                  value={item.image_url}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx].image_url = e.target.value;
                    setItems(updated);
                  }}
                />
                <div className="flex justify-between items-center">
                  <input
                    type="number"
                    min="1"
                    className="w-20 p-2 border bg-white rounded-lg"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx].quantity = Number(e.target.value);
                      setItems(updated);
                    }}
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-600 font-bold">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={handleAddItem} className="text-xs font-bold text-indigo-600">
              + Tambah Barang
            </button>
          </div>
        )}

        {serviceType === 'TITIP_BELI_ONLINE' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Checkout Online (Link Wajib)</h3>
            {items.map((item, idx) => (
              <div key={idx} className="p-3 border rounded-xl bg-slate-50 space-y-2 text-xs">
                <input
                  required
                  placeholder="Nama Produk"
                  className="w-full p-2 border bg-white rounded-lg"
                  value={item.item_name}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx].item_name = e.target.value;
                    setItems(updated);
                  }}
                />
                <input
                  required
                  type="url"
                  placeholder="Link Produk Online (https://...)"
                  className="w-full p-2 border bg-white rounded-lg"
                  value={item.item_url}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx].item_url = e.target.value;
                    setItems(updated);
                  }}
                />
                <div className="flex justify-between items-center">
                  <input
                    type="number"
                    min="1"
                    className="w-20 p-2 border bg-white rounded-lg"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx].quantity = Number(e.target.value);
                      setItems(updated);
                    }}
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-600 font-bold">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={handleAddItem} className="text-xs font-bold text-indigo-600">
              + Tambah Barang
            </button>
          </div>
        )}

        {serviceType === 'TITIP_KIRIM' && (
          <div className="p-3 border rounded-xl bg-amber-50 text-xs space-y-2">
            <label className="block font-bold">Estimasi Berat (Kg)</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              className="w-full p-2 border bg-white rounded-lg font-bold"
              value={weightKg}
              onChange={(e) => setWeightKg(Number(e.target.value))}
            />
          </div>
        )}

        <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm">
          Kirim Pesanan →
        </button>
      </form>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ItemForm {
  item_name: string;
  item_url: string;
  quantity: number;
  image_file: File | null;
  image_preview: string | null;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [packageType, setPackageType] = useState<'titip_beli' | 'titip_kirim'>('titip_beli');
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState<ItemForm[]>([
    { item_name: '', item_url: '', quantity: 1, image_file: null, image_preview: null },
  ]);
  const [loading, setLoading] = useState(false);

  const handleAddItem = () => {
    setItems([
      ...items,
      { item_name: '', item_url: '', quantity: 1, image_file: null, image_preview: null },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemForm, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleFileChange = (index: number, file: File | null) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const updated = [...items];
    updated[index].image_file = file;
    updated[index].image_preview = previewUrl;
    setItems(updated);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName || !whatsappNumber || !address) {
      alert('Mohon lengkapi Nama, WhatsApp, dan Alamat Anda.');
      return;
    }

    for (const item of items) {
      if (!item.item_name) {
        alert('Nama barang tidak boleh kosong.');
        return;
      }
    }

    try {
      setLoading(true);

      // Upload gambar terlebih dahulu
      const processedItems = [];
      for (const item of items) {
        let imageUrl = '';

        if (item.image_file) {
          const fileExt = item.image_file.name.split('.').pop();
          const filePath = `items/${Date.now()}-${Math.random().toString(36).substring(2, 5)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('order_attachments')
            .upload(filePath, item.image_file);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('order_attachments')
              .getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;
          }
        }

        processedItems.push({
          item_name: item.item_name,
          item_url: item.item_url || '',
          quantity: item.quantity,
          image_url: imageUrl,
        });
      }

      // Kirim via Server API Route
      const res = await fetch('/api/submit-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageType,
          customerName,
          whatsappNumber,
          address,
          items: processedItems,
        }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Gagal membuat pesanan.');
      }

      router.push(`/order/${resData.orderNumber}`);

    } catch (err: any) {
      alert('Gagal membuat pesanan: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 font-sans flex justify-center items-start">
      <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-900 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-1 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-black text-slate-900">Buat Pesanan Jastip</h1>
          <p className="text-xs text-slate-500 font-medium">
            Isi formulir di bawah ini untuk menitipkan barang atau pengiriman.
          </p>
        </div>

        <form onSubmit={handleSubmitOrder} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Pilih Layanan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPackageType('titip_beli')}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  packageType === 'titip_beli'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                🛒 Titip Beli (Barang)
              </button>
              <button
                type="button"
                onClick={() => setPackageType('titip_kirim')}
                className={`py-3 px-4 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  packageType === 'titip_kirim'
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                📦 Titip Kirim (Bagasi)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Informasi Pemesan
            </label>
            
            <div className="space-y-2.5">
              <input
                type="text"
                placeholder="Nama Lengkap"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
              />

              <input
                type="tel"
                placeholder="Nomor WhatsApp (+628123456789)"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition"
              />

              <textarea
                placeholder="Nama Jalan & Nomor Rumah/Gedung, RT/RW, Kelurahan/Desa, Kecamatan, Kota/Kabupaten, Provinsi, Kode Pos"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900 transition resize-none"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Input Barang Pesanan
              </label>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 border border-slate-200 rounded-2xl bg-white space-y-3 relative group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400"># Barang {index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-[11px] text-rose-600 font-bold hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Nama Barang"
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      required
                      className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-slate-900"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="url"
                        placeholder="Link Referensi Barang (Opsional)"
                        value={item.item_url}
                        onChange={(e) => handleItemChange(index, 'item_url', e.target.value)}
                        className="col-span-2 p-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-slate-900"
                      />

                      <div className="flex items-center border border-slate-300 rounded-xl px-2">
                        <span className="text-[10px] text-slate-400 font-bold mr-1">Qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)
                          }
                          className="w-full text-xs font-bold text-slate-900 outline-none text-center"
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex items-center gap-3">
                      <label className="cursor-pointer text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition border border-indigo-200">
                        📷 Upload Foto Referensi (Opsional)
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                        />
                      </label>

                      {item.image_preview && (
                        <div className="flex items-center gap-2">
                          <img
                            src={item.image_preview}
                            alt="Preview"
                            className="w-8 h-8 object-cover rounded-lg border border-slate-300"
                          />
                          <span className="text-[10px] text-emerald-600 font-bold">✓ Foto terlampir</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition block py-1"
            >
              + Tambah Barang Lain
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-2xl text-sm transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Memproses Pesanan...' : 'Buat Pesanan Sekarang →'}
          </button>
        </form>
      </div>
    </div>
  );
}
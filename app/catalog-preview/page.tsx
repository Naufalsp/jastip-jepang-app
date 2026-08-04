// app/catalog-preview/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function CatalogPreview() {
  const [products, setProducts] = useState<any[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('popular'); // default: Terpopuler

  useEffect(() => {
    async function fetchCatalog() {
      let query = supabase.from('catalog').select('*');
      
      if (categoryFilter !== 'All') {
        query = query.eq('category', categoryFilter);
      }

      // Penanganan Logika Sorting di Sisi Server Database
      if (sortBy === 'az') query = query.order('item_name', { ascending: true });
      else if (sortBy === 'za') query = query.order('item_name', { ascending: false });
      else if (sortBy === 'price_low') query = query.order('price_original_jpy', { ascending: true });
      else if (sortBy === 'price_high') query = query.order('price_original_jpy', { ascending: false });
      else if (sortBy === 'popular') query = query.order('total_ordered_count', { ascending: false });

      const { data } = await query;
      if (data) setProducts(data);
    }
    fetchCatalog();
  }, [categoryFilter, sortBy]);

  return (
    <div className="max-w-7xl mx-auto p-6 hidden-structure-preview">
      <div className="border-b pb-4 mb-6">
        <h1 className="text-xl font-mono font-bold text-slate-700">[Staging Core] Kerangka Engine Katalog Otomatis</h1>
        <p className="text-xs text-slate-400">Status: Hidden dari navigasi umum. Sinkronisasi otomatis aktif.</p>
      </div>

      {/* Bar Kontrol Filter dan Sorting */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-8 bg-slate-50 p-4 rounded-xl border">
        <div className="flex gap-2 items-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Kategori:</span>
          <select className="border p-2 rounded-lg text-sm bg-white" onChange={e => setCategoryFilter(e.target.value)}>
            <option value="All">Semua Kategori</option>
            <option value="Anime/Hobby">Anime / Hobby</option>
            <option value="Skincare">Skincare & Makeup</option>
            <option value="Snacks">Snacks & Food</option>
            <option value="Electronics">Electronics</option>
          </select>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-xs font-bold text-slate-500 uppercase">Urutkan:</span>
          <select className="border p-2 rounded-lg text-sm bg-white" onChange={e => setSortBy(e.target.value)}>
            <option value="popular">Paling Populer (Jumlah Order)</option>
            <option value="az">Abjad A ke Z</option>
            <option value="za">Abjad Z ke A</option>
            <option value="price_low">Harga Terendah (¥)</option>
            <option value="price_high">Harga Tertinggi (¥)</option>
          </select>
        </div>
      </div>

      {/* Grid Katalog Data Render */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.map((product) => (
          <div key={product.id} className="border rounded-xl overflow-hidden hover:shadow-md transition bg-white flex flex-col justify-between">
            <div className="w-full aspect-square bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
              {product.image_url ? <img src={product.image_url} alt={product.item_name} className="object-cover w-full h-full" /> : 'No Product Banner'}
            </div>
            <div className="p-4 space-y-2">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {product.category}
              </span>
              <h3 className="font-bold text-sm text-slate-800 line-clamp-2">{product.item_name}</h3>
              <div className="flex justify-between items-center pt-2 border-t text-xs">
                <span className="font-mono text-slate-500">Unit: {product.weight_per_pcs_kg} Kg</span>
                {/* Catatan: Harga di katalog memakai JPY asli agar stabil terhadap fluktuasi harian sistem saat ditarik customer */}
                <span className="font-black text-slate-950 text-right">¥ {Number(product.price_original_jpy).toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
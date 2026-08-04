'use client';

import { useState } from 'react';
import Link from 'next/link';

// Interface Tipe Data Item
interface CalcItem {
  item_name: string;
  price_jpy: number | string; // Mengizinkan string kosong agar input tidak error
  quantity: number;
}

export default function PriceCalculatorPage() {
  const [orderType, setOrderType] = useState<'TITIP_BELI' | 'TITIP_KIRIM'>('TITIP_BELI');
  
  // State Titip Beli dengan Tipe Data Eksplisit
  const [items, setItems] = useState<CalcItem[]>([
    { item_name: '', price_jpy: '', quantity: 1 }
  ]);

  // State Titip Kirim
  const [weightKg, setWeightKg] = useState<number>(1);

  // 1. SETTING KURS FLAT + MARGIN 3%
  const BASE_FLAT_RATE = 116.505;
  const MARGIN = 1.03;
  const EFFECTIVE_RATE = BASE_FLAT_RATE * MARGIN; // 120.00015

  // Fungsi pembulatan ke ribuan terdekat
  const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

  // Handler Item Titip Beli
  const handleAddItem = () => {
    setItems((prevItems) => [...prevItems, { item_name: '', price_jpy: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prevItems) => prevItems.filter((_, i) => i !== index));
  };

  // KALKULASI HARGA
  let totalItemsPriceIdr = 0;
  let totalJastipFeeIdr = 0;
  let transportFeeIdr = 0; // Biaya Handling/Transport (Dipisah)
  let shippingFeeIdr = 0;

  if (orderType === 'TITIP_BELI') {
    if (items && items.length > 0) {
      items.forEach((item) => {
        const priceJpy = Number(item.price_jpy) || 0;
        const qty = Number(item.quantity) || 1;

        // Konversi & Pembulatan Harga Barang per unit
        const priceInIdr = roundUpToThousand(priceJpy * EFFECTIVE_RATE);

        // Hitung Tiering Fee Jastip per Item
        let rawFee = 0;
        if (priceInIdr > 0) {
          if (priceInIdr <= 100000) rawFee = priceInIdr * 0.30;
          else if (priceInIdr <= 500000) rawFee = priceInIdr * 0.20;
          else if (priceInIdr <= 1000000) rawFee = priceInIdr * 0.10;
          else rawFee = priceInIdr * 0.07;
        }
        const feeInIdr = roundUpToThousand(rawFee);

        totalItemsPriceIdr += priceInIdr * qty;
        totalJastipFeeIdr += feeInIdr * qty;
      });

      // Biaya Transport / Handling (100 Yen)
      const TRANSPORT_JPY = 100;
      transportFeeIdr = roundUpToThousand(TRANSPORT_JPY * EFFECTIVE_RATE);
    }
    shippingFeeIdr = 0;
  } else {
    // Titip Kirim (Bagasi)
    const weight = Number(weightKg) || 1;
    const TARIF_PER_KG = 150000;
    
    shippingFeeIdr = roundUpToThousand(weight * TARIF_PER_KG);
    totalItemsPriceIdr = 0;
    totalJastipFeeIdr = 0;
    transportFeeIdr = 0;
  }

  // Total Pelunasan
  const subtotalItemsIdr = totalItemsPriceIdr + totalJastipFeeIdr + transportFeeIdr;
  const totalPriceIdr = roundUpToThousand(subtotalItemsIdr + shippingFeeIdr);

  return (
    <div className="max-w-2xl mx-auto my-6 sm:my-12 p-4 sm:p-6 bg-white border rounded-2xl shadow-sm space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">Kalkulator Biaya Jastip</h1>
        <p className="text-xs text-slate-500">Hitung estimasi rincian &amp; total biaya pesanan kamu secara akurat.</p>
      </div>

      {/* Tipe Layanan */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Pilih Layanan</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setOrderType('TITIP_BELI')}
            className={`p-3 text-xs font-bold rounded-xl border transition text-center ${
              orderType === 'TITIP_BELI'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🛒 Titip Beli (Barang Jepang)
          </button>
          <button
            type="button"
            onClick={() => setOrderType('TITIP_KIRIM')}
            className={`p-3 text-xs font-bold rounded-xl border transition text-center ${
              orderType === 'TITIP_KIRIM'
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📦 Titip Kirim (Bagasi/Bawaan)
          </button>
        </div>
      </div>

      {/* FORM INPUT */}
      {orderType === 'TITIP_BELI' ? (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase">Input Barang &amp; Harga (Yen)</label>
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-center bg-slate-50 sm:bg-transparent p-2 sm:p-0 rounded-xl border sm:border-0">
              <input
                type="text"
                placeholder="Nama Barang (opsional)"
                value={item.item_name}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx] = { ...updated[idx], item_name: e.target.value };
                  setItems(updated);
                }}
                className="w-full sm:flex-1 border bg-white rounded-lg p-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-32">
                  <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">¥</span>
                  <input
                    type="number"
                    placeholder="Harga JPY"
                    min="0"
                    value={item.price_jpy}
                    onChange={(e) => {
                      const updated = [...items];
                      const val = e.target.value;
                      updated[idx] = { 
                        ...updated[idx], 
                        price_jpy: val === '' ? '' : Number(val) 
                      };
                      setItems(updated);
                    }}
                    className="w-full border bg-white rounded-lg p-2 pl-7 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold sm:hidden">Qty:</span>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx] = { 
                        ...updated[idx], 
                        quantity: Number(e.target.value) || 1 
                      };
                      setItems(updated);
                    }}
                    className="w-16 border bg-white rounded-lg p-2 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-rose-500 font-bold px-2.5 py-1 text-xs hover:bg-rose-50 rounded-lg transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs font-bold text-indigo-600 hover:underline inline-block pt-1"
          >
            + Tambah Barang Lain
          </button>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <label className="block text-xs font-bold text-amber-900">Perkiraan Berat Bagasi (Kg)</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            className="w-full border rounded-lg p-2.5 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <p className="text-[11px] text-amber-700">Tarif flat bagasi: Rp 150.000 / Kg</p>
        </div>
      )}

      {/* RINGKASAN RINCIAN BIAYA (FEES DIPISAHKAN) */}
      <div className="bg-slate-50 p-4 rounded-xl space-y-2 border text-xs">
        <div className="font-bold text-slate-700 uppercase border-b pb-2 mb-2 tracking-wider text-[11px]">
          Rincian Perhitungan
        </div>
        
        {orderType === 'TITIP_BELI' ? (
          <>
            <div className="flex justify-between text-slate-600">
              <span>Total Harga Barang (IDR):</span>
              <span className="font-bold text-slate-900">
                Rp {totalItemsPriceIdr.toLocaleString('id-ID')}
              </span>
            </div>

            {/* DIPISAHKAN: FEE JASTIP */}
            <div className="flex justify-between text-slate-600">
              <span>Fee Jastip (Tiering):</span>
              <span className="font-bold text-slate-900">
                Rp {totalJastipFeeIdr.toLocaleString('id-ID')}
              </span>
            </div>

            {/* DIPISAHKAN: BIAYA HANDLING / TRANSPORT */}
            <div className="flex justify-between text-slate-600">
              <span>Biaya Handling / Transport (100 JPY):</span>
              <span className="font-bold text-slate-900">
                Rp {transportFeeIdr.toLocaleString('id-ID')}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-slate-600">
            <span>Biaya Bagasi Titip Kirim ({weightKg} Kg):</span>
            <span className="font-bold text-slate-900">
              Rp {shippingFeeIdr.toLocaleString('id-ID')}
            </span>
          </div>
        )}

        <div className="border-t pt-3 flex justify-between items-center font-black text-indigo-600">
          <span className="text-xs sm:text-sm uppercase">Estimasi Total Pelunasan:</span>
          <span className="text-base sm:text-lg">Rp {totalPriceIdr.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <Link
        href="/order/new"
        className="block w-full bg-slate-900 text-white text-center font-bold text-xs sm:text-sm py-3.5 rounded-xl hover:bg-slate-800 active:scale-95 transition"
      >
        Buat Pesanan Sekarang →
      </Link>
    </div>
  );
}
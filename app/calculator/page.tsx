'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PriceCalculatorPage() {
  const [orderType, setOrderType] = useState<'TITIP_BELI' | 'TITIP_KIRIM'>('TITIP_BELI');
  
  // State Titip Beli
  const [items, setItems] = useState<{ item_name: string; price_jpy: number; quantity: number }[]>([
    { item_name: '', price_jpy: 0, quantity: 1 }
  ]);

  // State Titip Kirim
  const [weightKg, setWeightKg] = useState<number>(1);

  // KURS FLAT RATE: 116.505 + Margin 3% = 120.00015
  const BASE_FLAT_RATE = 116.505;
  const MARGIN = 1.03;
  const EFFECTIVE_RATE = BASE_FLAT_RATE * MARGIN;

  const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

  // Handler Item Titip Beli
  const handleAddItem = () => {
    setItems([...items, { item_name: '', price_jpy: 0, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // KALKULASI HARGA
  let totalItemsPriceIdr = 0;
  let totalJastipFeeIdr = 0;
  let transportFeeIdr = 0;
  let shippingFeeIdr = 0;

  if (orderType === 'TITIP_BELI') {
    items.forEach((item) => {
      const priceJpy = Number(item.price_jpy) || 0;
      const qty = Number(item.quantity) || 1;

      // Harga Barang IDR
      const priceInIdr = roundUpToThousand(priceJpy * EFFECTIVE_RATE);

      // Fee Jastip Tiering per Item
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

    // Transport Flat 300 Yen
    const TRANSPORT_JPY = 300;
    transportFeeIdr = roundUpToThousand(TRANSPORT_JPY * EFFECTIVE_RATE);
  } else {
    // Titip Kirim
    const weight = Number(weightKg) || 1;
    const TARIF_PER_KG = 150000;
    shippingFeeIdr = roundUpToThousand(weight * TARIF_PER_KG);
  }

  const subtotalItemsIdr = totalItemsPriceIdr + totalJastipFeeIdr + transportFeeIdr;
  const totalPriceIdr = roundUpToThousand(subtotalItemsIdr + shippingFeeIdr);

  return (
    <div className="max-w-2xl mx-auto my-12 p-6 bg-white border rounded-xl shadow-sm space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Kalkulator Biaya Jastip</h1>
        <p className="text-xs text-slate-500">Hitung estimasi total biaya pesanan kamu secara akurat.</p>
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
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 text-slate-600'
            }`}
          >
            🛒 Titip Beli (Barang Jepang)
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
            📦 Titip Kirim (Bagasi/Bawaan)
          </button>
        </div>
      </div>

      {/* FORM INPUT */}
      {orderType === 'TITIP_BELI' ? (
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase">Input Barang & Harga (Yen)</label>
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Nama Barang (opsional)"
                value={item.item_name}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].item_name = e.target.value;
                  setItems(updated);
                }}
                className="flex-1 border rounded-lg p-2 text-xs font-medium"
              />
              <div className="relative w-32">
                <span className="absolute left-2.5 top-2.5 text-xs text-slate-400 font-bold">¥</span>
                <input
                  type="number"
                  placeholder="Harga"
                  min="0"
                  value={item.price_jpy || ''}
                  onChange={(e) => {
                    const updated = [...items];
                    updated[idx].price_jpy = Number(e.target.value);
                    setItems(updated);
                  }}
                  className="w-full border rounded-lg p-2 pl-7 text-xs font-bold"
                />
              </div>
              <input
                type="number"
                min="1"
                value={item.quantity}
                onChange={(e) => {
                  const updated = [...items];
                  updated[idx].quantity = Number(e.target.value);
                  setItems(updated);
                }}
                className="w-16 border rounded-lg p-2 text-xs font-bold text-center"
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
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
          <label className="block text-xs font-bold text-amber-900">Perkiraan Berat Bagasi (Kg)</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            className="w-full border rounded-lg p-2 text-sm font-bold text-slate-900 bg-white"
          />
          <p className="text-[11px] text-amber-700">Tarif flat bagasi: Rp 150.000 / Kg</p>
        </div>
      )}

      {/* RINGKASAN RINCIAN BIAYA */}
      <div className="bg-slate-50 p-4 rounded-xl space-y-2 border text-xs">
        <div className="font-bold text-slate-700 uppercase border-b pb-2 mb-2">Rincian Perhitungan</div>
        
        {orderType === 'TITIP_BELI' ? (
          <>
            <div className="flex justify-between text-slate-600">
              <span>Total Estimasi Harga Barang:</span>
              <span className="font-bold">Rp {totalItemsPriceIdr.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Total Fee Jastip:</span>
              <span className="font-bold">Rp {totalJastipFeeIdr.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Biaya Transport Lokal JPY (300 Yen):</span>
              <span className="font-bold">Rp {transportFeeIdr.toLocaleString('id-ID')}</span>
            </div>
          </>
        ) : (
          <div className="flex justify-between text-slate-600">
            <span>Biaya Bagasi Titip Kirim ({weightKg} Kg):</span>
            <span className="font-bold">Rp {shippingFeeIdr.toLocaleString('id-ID')}</span>
          </div>
        )}

        <div className="border-t pt-2 flex justify-between items-center text-sm font-black text-indigo-600">
          <span>ESTIMASI TOTAL PELUNASAN:</span>
          <span className="text-base">Rp {totalPriceIdr.toLocaleString('id-ID')}</span>
        </div>
      </div>

      <Link
        href="/order/new"
        className="block w-full bg-slate-900 text-white text-center font-bold text-xs py-3 rounded-xl hover:bg-slate-800 transition"
      >
        Buat Pesanan Sekarang →
      </Link>
    </div>
  );
}
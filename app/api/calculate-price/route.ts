// app/api/calculate-price/route.ts
import { NextResponse } from 'next/server';

interface PricingPayload {
  packageType: 'titip_beli' | 'titip_kirim' | 'TITIP_BELI' | 'TITIP_KIRIM';
  items?: Array<{ priceOriginal: number; quantity: number }>;
  totalWeightKg?: number;
  route?: 'JP_TO_ID' | 'ID_TO_JP';
}

// FUNGSI PEMBULATAN KE ATAS KE RIBUAN TERDEKAT
// Contoh: Rp 12.100 -> Rp 13.000, Rp 5.500.200 -> Rp 5.501.000
const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

export async function POST(request: Request) {
  try {
    const body: PricingPayload = await request.json();
    const { packageType, items, totalWeightKg, route = 'JP_TO_ID' } = body;

    const normalizedType = packageType.toString().toUpperCase();

    // 1. Fetch live JPY rate dengan fallback
    let exchangeRateUsed = 113.3;
    try {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/JPY');
      const rateData = await rateRes.json();
      const baseJpyToIdr = rateData?.rates?.IDR || 110;
      exchangeRateUsed = baseJpyToIdr * 1.03; // Margin 3%
    } catch (e) {
      console.warn("Gagal fetch kurs live, memakai fallback rate:", e);
    }

    let itemsPriceIdr = 0;
    let jastipFeeIdr = 0;
    let transportFeeIdr = 0; // Biaya Transport Tambahan
    let shippingFeeIdr = 0;

    // 2. SKEMA TITIP BELI
    if (normalizedType.includes('BELI')) {
      if (items && items.length > 0) {
        items.forEach((item) => {
          const priceOriginal = Number(item.priceOriginal) || 0;
          const qty = Number(item.quantity) || 1;

          // Konversi & Pembulatan Harga Barang
          const priceInIdr = roundUpToThousand(
            route === 'JP_TO_ID' ? priceOriginal * exchangeRateUsed : priceOriginal
          );

          // Hitung Tiering Fee Jastip per Item
          let rawFee = 0;
          if (priceInIdr > 0) {
            if (priceInIdr <= 100000) rawFee = priceInIdr * 0.30;
            else if (priceInIdr <= 500000) rawFee = priceInIdr * 0.20;
            else if (priceInIdr <= 1000000) rawFee = priceInIdr * 0.10;
            else rawFee = priceInIdr * 0.07;
          }

          const feeInIdr = roundUpToThousand(rawFee);

          itemsPriceIdr += priceInIdr * qty;
          jastipFeeIdr += feeInIdr * qty;
        });

        // Hitung Biaya Transport Flat Rate 300 Yen
        const TRANSPORT_JYP = 300;
        transportFeeIdr = roundUpToThousand(
          route === 'JP_TO_ID' ? TRANSPORT_JYP * exchangeRateUsed : TRANSPORT_JYP
        );
      }
      shippingFeeIdr = 0; // Titip Beli tanpa ongkir bagasi
    } 
    // 3. SKEMA TITIP KIRIM (FORWARDING / BAGASI)
    else {
      const weight = Number(totalWeightKg) || 1;
      const TARIF_PER_KG = 150000; // Flat Rp 150.000 / Kg
      
      shippingFeeIdr = roundUpToThousand(weight * TARIF_PER_KG);
      itemsPriceIdr = 0;
      jastipFeeIdr = 0;
      transportFeeIdr = 0;
    }

    // 4. Total Pelunasan (Full Payment)
    const subtotalItemsIdr = itemsPriceIdr + jastipFeeIdr + transportFeeIdr;
    const totalPriceIdr = roundUpToThousand(subtotalItemsIdr + shippingFeeIdr);

    return NextResponse.json({
      exchangeRateUsed,
      itemsPriceIdr,
      jastipFeeIdr,
      transportFeeIdr, // Nilai Rp dari 300 yen
      subtotalItemsIdr,
      shippingFeeIdr,
      totalPriceIdr // Full payment 100%
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Pricing calculation failed' }, { status: 500 });
  }
}
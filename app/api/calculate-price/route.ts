// app/api/calculate-price/route.ts
import { NextResponse } from 'next/server';

interface PricingPayload {
  packageType: 'titip_beli' | 'titip_kirim' | 'TITIP_BELI' | 'TITIP_KIRIM';
  items?: Array<{ priceOriginal: number; quantity: number }>;
  totalWeightKg?: number;
  route?: 'JP_TO_ID' | 'ID_TO_JP';
}

// FUNGSI PEMBULATAN KE ATAS KE RIBUAN TERDEKAT
const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

export async function POST(request: Request) {
  try {
    const body: PricingPayload = await request.json();
    const { packageType, items, totalWeightKg, route = 'JP_TO_ID' } = body;

    const normalizedType = packageType.toString().toUpperCase();

    // 1. SETTING KURS FLAT + MARGIN 3%
    const BASE_FLAT_RATE = 116.505;
    const MARGIN = 1.03; // Margin 3%
    const exchangeRateUsed = BASE_FLAT_RATE * MARGIN; // Hasil: 120.00015

    let itemsPriceIdr = 0;
    let jastipFeeIdr = 0;
    let transportFeeIdr = 0;
    let shippingFeeIdr = 0;

    // 2. SKEMA TITIP BELI
    if (normalizedType.includes('BELI')) {
      if (items && items.length > 0) {
        let rawJastipFeeTotal = 0;
        let totalJpy = 0;

        items.forEach((item) => {
          const priceOriginal = Number(item.priceOriginal) || 0;
          const qty = Number(item.quantity) || 1;

          // Akumulasi total Yen
          totalJpy += priceOriginal * qty;

          // Hitung Tiering Fee Jastip per Item (berdasarkan estimasi IDR per item)
          const itemPriceInIdr = priceOriginal * exchangeRateUsed;
          let rawFee = 0;
          if (itemPriceInIdr > 0) {
            if (itemPriceInIdr <= 100000) rawFee = itemPriceInIdr * 0.30;
            else if (itemPriceInIdr <= 500000) rawFee = itemPriceInIdr * 0.20;
            else if (itemPriceInIdr <= 1000000) rawFee = itemPriceInIdr * 0.10;
            else rawFee = itemPriceInIdr * 0.07;
          }

          rawJastipFeeTotal += rawFee * qty;
        });

        // 1. Total Harga Barang (Konversi total Yen & Bulatkan)
        itemsPriceIdr = roundUpToThousand(
          route === 'JP_TO_ID' ? totalJpy * exchangeRateUsed : totalJpy
        );

        // 2. Hitung Biaya Transport (100 JPY)
        const TRANSPORT_JPY = 100;
        transportFeeIdr = roundUpToThousand(
          route === 'JP_TO_ID' ? TRANSPORT_JPY * exchangeRateUsed : TRANSPORT_JPY
        );

        // 3. Fee Jastip (Bulatkan Fee Tiering + Gabungkan Transport Fee agar presisi dengan Admin)
        jastipFeeIdr = roundUpToThousand(rawJastipFeeTotal) + transportFeeIdr;
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
    const subtotalItemsIdr = itemsPriceIdr + jastipFeeIdr;
    const totalPriceIdr = roundUpToThousand(subtotalItemsIdr + shippingFeeIdr);

    return NextResponse.json({
      exchangeRateUsed,
      itemsPriceIdr,
      jastipFeeIdr,     // Fee Jastip sudah termasuk Biaya Transport (100 JPY)
      transportFeeIdr,  // Nilai nominal transport fee (Rp 13.000)
      subtotalItemsIdr,
      shippingFeeIdr,
      totalPriceIdr     // Total Pelunasan
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Pricing calculation failed' }, { status: 500 });
  }
}
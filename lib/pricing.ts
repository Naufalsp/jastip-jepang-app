// // lib/pricing.ts

// export const BASE_FLAT_RATE = 116.505;
// export const MARGIN = 1.03;
// export const EFFECTIVE_RATE = BASE_FLAT_RATE * MARGIN; // 120.00015

// export const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

// export interface CalculationItemInput {
//   priceJpy?: number;
//   quantity: number;
// }

// export function calculateOrderPricing(
//   packageType: 'titip_beli' | 'titip_kirim',
//   items: CalculationItemInput[],
//   totalWeightKg: number = 0
// ) {
//   let totalItemsPriceIdr = 0;
//   let totalJastipFeeIdr = 0;
//   let shippingFeeIdr = 0;

//   if (packageType === 'titip_beli') {
//     let totalJpy = 0;
//     let rawJastipFeeTotal = 0;
//     let totalTransportFeeIdr = 0;

//     const TRANSPORT_JPY = 100;
//     const transportPerItemFeeIdr = roundUpToThousand(TRANSPORT_JPY * EFFECTIVE_RATE);

//     items.forEach((item) => {
//       const qty = Number(item.quantity) || 1;
//       const priceJpy = Number(item.priceJpy) || 0;

//       // 1. Akumulasi Total Yen
//       totalJpy += priceJpy * qty;

//       // 2. Hitung Harga Barang per Unit dalam IDR Mentah untuk menentukan Tiering Fee Jastip
//       const rawUnitPriceIdr = priceJpy * EFFECTIVE_RATE;

//       let rawFee = 0;
//       if (rawUnitPriceIdr > 0) {
//         if (rawUnitPriceIdr <= 100000) rawFee = rawUnitPriceIdr * 0.30;
//         else if (rawUnitPriceIdr <= 500000) rawFee = rawUnitPriceIdr * 0.20;
//         else if (rawUnitPriceIdr <= 1000000) rawFee = rawUnitPriceIdr * 0.10;
//         else rawFee = rawUnitPriceIdr * 0.07;
//       }

//       rawJastipFeeTotal += rawFee * qty;

//       // 3. Akumulasi Transport Fee berdasarkan total Qty
//       totalTransportFeeIdr += transportPerItemFeeIdr * qty;
//     });

//     // Total Harga Barang IDR (Total Yen x Kurs, dibulatkan ke ribuan terdekat)
//     totalItemsPriceIdr = roundUpToThousand(totalJpy * EFFECTIVE_RATE);

//     // Total Fee Jastip (Bulatkan Fee Tiering + Total Transport per Qty)
//     totalJastipFeeIdr = roundUpToThousand(rawJastipFeeTotal) + totalTransportFeeIdr;
//     shippingFeeIdr = 0;
//   } else {
//     // Titip Kirim (Bagasi)
//     const weight = Number(totalWeightKg) || 0;
//     const TARIF_PER_KG = 150000;

//     shippingFeeIdr = roundUpToThousand(weight * TARIF_PER_KG);
//     totalItemsPriceIdr = 0;
//     totalJastipFeeIdr = 0;
//   }

//   const totalPriceIdr = roundUpToThousand(totalItemsPriceIdr + totalJastipFeeIdr + shippingFeeIdr);
//   const dp75AmountIdr = Math.round(totalPriceIdr * 0.75);

//   return {
//     totalItemsPriceIdr,
//     totalJastipFeeIdr,
//     shippingFeeIdr,
//     totalPriceIdr,
//     dp75AmountIdr,
//   };
// }

// lib/pricing.ts

export const BASE_FLAT_RATE = 116.505;
export const MARGIN = 1.03;
export const EFFECTIVE_RATE = BASE_FLAT_RATE * MARGIN; // 120.00015

export const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

export interface CalculationItemInput {
  priceJpy?: number;
  quantity: number;
  status?: string; // Tambahkan properti status jika ada
}

export function calculateOrderPricing(
  packageType: 'titip_beli' | 'titip_kirim',
  items: CalculationItemInput[],
  totalWeightKg: number = 0
) {
  let totalItemsPriceIdr = 0;
  let totalJastipFeeIdr = 0;
  let shippingFeeIdr = 0;

  if (packageType === 'titip_beli') {
    let totalJpy = 0;
    let rawJastipFeeTotal = 0;
    let totalTransportFeeIdr = 0;

    const TRANSPORT_JPY = 100;
    const transportPerItemFeeIdr = roundUpToThousand(TRANSPORT_JPY * EFFECTIVE_RATE);

    items.forEach((item) => {
      const qty = Number(item.quantity) || 1;
      const priceJpy = Number(item.priceJpy) || 0;
      const isKosong = item.status === 'Kosong' || item.status === 'tidak_tersedia' || priceJpy === 0;

      // JIKA ITEM KOSONG / HARGA 0 JPY, SKIP SEMUA PERHITUNGAN UNTUK ITEM INI
      if (isKosong) return;

      // 1. Akumulasi Total Yen
      totalJpy += priceJpy * qty;

      // 2. Hitung Harga Barang per Unit dalam IDR Mentah
      const rawUnitPriceIdr = priceJpy * EFFECTIVE_RATE;

      let rawFee = 0;
      if (rawUnitPriceIdr > 0) {
        if (rawUnitPriceIdr <= 100000) rawFee = rawUnitPriceIdr * 0.30;
        else if (rawUnitPriceIdr <= 500000) rawFee = rawUnitPriceIdr * 0.20;
        else if (rawUnitPriceIdr <= 1000000) rawFee = rawUnitPriceIdr * 0.10;
        else rawFee = rawUnitPriceIdr * 0.07;
      }

      rawJastipFeeTotal += rawFee * qty;

      // 3. Akumulasi Transport Fee hanya untuk item yang TERSEDIA
      totalTransportFeeIdr += transportPerItemFeeIdr * qty;
    });

    // Total Harga Barang IDR
    totalItemsPriceIdr = roundUpToThousand(totalJpy * EFFECTIVE_RATE);

    // Total Fee Jastip (Bulatkan Fee Tiering + Total Transport per Qty dari item yang tersedia)
    totalJastipFeeIdr = totalJpy > 0 ? (roundUpToThousand(rawJastipFeeTotal) + totalTransportFeeIdr) : 0;
    shippingFeeIdr = 0;
  } else {
    // Titip Kirim (Bagasi)
    const weight = Number(totalWeightKg) || 0;
    const TARIF_PER_KG = 150000;

    shippingFeeIdr = roundUpToThousand(weight * TARIF_PER_KG);
    totalItemsPriceIdr = 0;
    totalJastipFeeIdr = 0;
  }

  const totalPriceIdr = roundUpToThousand(totalItemsPriceIdr + totalJastipFeeIdr + shippingFeeIdr);
  const dp75AmountIdr = Math.round(totalPriceIdr * 0.75);

  return {
    totalItemsPriceIdr,
    totalJastipFeeIdr,
    shippingFeeIdr,
    totalPriceIdr,
    dp75AmountIdr,
  };
}
// // lib/pricing.ts

// export const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

// export interface CalculationItemInput {
//   priceIdr: number;
//   quantity: number;
// }

// export interface CalculationResult {
//   totalItemsPriceIdr: number;
//   totalJastipFeeIdr: number;
//   totalPriceIdr: number;
//   dp75AmountIdr: number;
// }

// export function calculateItemJastipFee(priceIdr: number): number {
//   if (priceIdr <= 0) return 0;

//   let rawFee = 0;
//   if (priceIdr <= 100000) rawFee = priceIdr * 0.30;
//   else if (priceIdr <= 500000) rawFee = priceIdr * 0.20;
//   else if (priceIdr <= 1000000) rawFee = priceIdr * 0.10;
//   else rawFee = priceIdr * 0.07;

//   const transportFlatPerItem = 15000;
//   return roundUpToThousand(rawFee) + transportFlatPerItem;
// }

// export function calculateOrderPricing(
//   packageType: string,
//   items: CalculationItemInput[] = [],
//   totalWeightKg: number = 0
// ): CalculationResult {
//   const normalizedType = packageType.toUpperCase();
//   let totalItemsPriceIdr = 0;
//   let totalJastipFeeIdr = 0;
//   let shippingFeeIdr = 0;

//   if (normalizedType.includes('BELI')) {
//     items.forEach((item) => {
//       const price = Number(item.priceIdr) || 0;
//       const qty = Number(item.quantity) || 1;
//       const itemFee = calculateItemJastipFee(price);

//       totalItemsPriceIdr += price * qty;
//       totalJastipFeeIdr += itemFee * qty;
//     });
//   } else {
//     const weight = Number(totalWeightKg) || 1;
//     shippingFeeIdr = roundUpToThousand(weight * 150000);
//   }

//   const totalPriceIdr = roundUpToThousand(totalItemsPriceIdr + totalJastipFeeIdr + shippingFeeIdr);
//   const dp75AmountIdr = roundUpToThousand(totalPriceIdr * 0.75);

//   return {
//     totalItemsPriceIdr,
//     totalJastipFeeIdr,
//     totalPriceIdr,
//     dp75AmountIdr
//   };
// }

// Effective Rate Yen to IDR (Flat rate 116.505 * margin 3%)
export const BASE_FLAT_RATE = 116.505;
export const MARGIN = 1.03;
export const EFFECTIVE_RATE = BASE_FLAT_RATE * MARGIN; // 120.00015

export const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

export interface CalculationItemInput {
  priceJpy?: number;
  quantity: number;
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

    items.forEach((item) => {
      const qty = Number(item.quantity) || 1;
      const priceJpy = Number(item.priceJpy) || 0;

      // 1. Akumulasi Total Yen
      totalJpy += priceJpy * qty;

      // 2. Hitung Harga Barang per Unit dalam IDR Mentah untuk menentukan Tiering Fee Jastip
      const rawUnitPriceIdr = priceJpy * EFFECTIVE_RATE;

      let rawFee = 0;
      if (rawUnitPriceIdr > 0) {
        if (rawUnitPriceIdr <= 100000) rawFee = rawUnitPriceIdr * 0.30;
        else if (rawUnitPriceIdr <= 500000) rawFee = rawUnitPriceIdr * 0.20;
        else if (rawUnitPriceIdr <= 1000000) rawFee = rawUnitPriceIdr * 0.10;
        else rawFee = rawUnitPriceIdr * 0.07;
      }

      rawJastipFeeTotal += rawFee * qty;
    });

    // Total Harga Barang IDR (Total Yen x Kurs, dibulatkan ke ribuan terdekat)
    totalItemsPriceIdr = roundUpToThousand(totalJpy * EFFECTIVE_RATE);

    // Biaya Transport / Handling (100 Yen = Rp 13.000)
    const TRANSPORT_JPY = 100;
    const transportFeeIdr = roundUpToThousand(TRANSPORT_JPY * EFFECTIVE_RATE);

    // Total Fee Jastip (Bulatkan Fee Tiering + Transport)
    totalJastipFeeIdr = roundUpToThousand(rawJastipFeeTotal) + transportFeeIdr;
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
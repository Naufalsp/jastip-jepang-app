// lib/pricing.ts

export const roundUpToThousand = (val: number) => Math.ceil(val / 1000) * 1000;

export interface CalculationItemInput {
  priceIdr: number;
  quantity: number;
}

export interface CalculationResult {
  totalItemsPriceIdr: number;
  totalJastipFeeIdr: number; // Termasuk tiering + transport flat Rp 15.000 / item
  totalPriceIdr: number;      // Total Pelunasan 100%
  dp75AmountIdr: number;      // Nominal DP 75%
}

/**
 * Menghitung Fee Jastip Tiering + Biaya Transport Flat Rp 15.000 per item
 */
export function calculateItemJastipFee(priceIdr: number): number {
  if (priceIdr <= 0) return 0;

  let rawFee = 0;
  if (priceIdr <= 100000) rawFee = priceIdr * 0.30;
  else if (priceIdr <= 500000) rawFee = priceIdr * 0.20;
  else if (priceIdr <= 1000000) rawFee = priceIdr * 0.10;
  else rawFee = priceIdr * 0.07;

  // Fee Tiering dibulatkan + Transport Flat Rp 15.000 per barang
  const transportFlatPerItem = 15000;
  return roundUpToThousand(rawFee) + transportFlatPerItem;
}

export function calculateOrderPricing(
  packageType: string,
  items: CalculationItemInput[] = [],
  totalWeightKg: number = 0
): CalculationResult {
  const normalizedType = packageType.toUpperCase();
  let totalItemsPriceIdr = 0;
  let totalJastipFeeIdr = 0;
  let shippingFeeIdr = 0;

  if (normalizedType.includes('BELI')) {
    items.forEach((item) => {
      const price = Number(item.priceIdr) || 0;
      const qty = Number(item.quantity) || 1;

      const itemFee = calculateItemJastipFee(price);

      totalItemsPriceIdr += price * qty;
      totalJastipFeeIdr += itemFee * qty;
    });
  } else {
    // Titip Kirim (Bagasi Flat Rp 150.000/Kg)
    const weight = Number(totalWeightKg) || 1;
    shippingFeeIdr = roundUpToThousand(weight * 150000);
  }

  const totalPriceIdr = roundUpToThousand(totalItemsPriceIdr + totalJastipFeeIdr + shippingFeeIdr);
  const dp75AmountIdr = roundUpToThousand(totalPriceIdr * 0.75);

  return {
    totalItemsPriceIdr,
    totalJastipFeeIdr,
    totalPriceIdr,
    dp75AmountIdr
  };
}
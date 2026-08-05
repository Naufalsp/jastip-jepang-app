import { NextResponse } from 'next/server';
import { calculateOrderPricing } from '@/lib/pricing';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { packageType, items, totalWeightKg } = body;

    const formattedItems = (items || []).map((i: any) => ({
      priceIdr: Number(i.priceIdr || i.priceOriginal) || 0,
      quantity: Number(i.quantity) || 1
    }));

    const pricing = calculateOrderPricing(packageType, formattedItems, totalWeightKg);

    return NextResponse.json(pricing);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Kalkulasi gagal' }, { status: 500 });
  }
}
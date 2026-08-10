// app/api/whatsapp/route.ts
import { NextResponse } from 'next/server';
import { triggerWAOnStatusOrVerificationChange } from '@/lib/whatsapp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, order, newStatus, actionType } = body;

    if (type === 'status_or_verification') {
      await triggerWAOnStatusOrVerificationChange(order, newStatus, actionType);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
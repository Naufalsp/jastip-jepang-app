import { supabase } from '@/lib/supabase'; // Import supabase instance kamu
import { triggerWAOnOrderCreated } from '@/lib/whatsapp';

// Di dalam handler API Pembuatan Order (misal: POST handler)
export async function POST(req: Request) {
  // ... logika ambil data request/payload ...

  const { data: newOrder, error } = await supabase
    .from('orders')
    .insert([/* payload */])
    .select()
    .single();

  if (!error && newOrder) {
    // OTOMATIS KIRIM WA KONDISI 1
    triggerWAOnOrderCreated(newOrder).catch((err) =>
      console.error('Gagal kirim WA otomatis:', err)
    );
  }

  return Response.json({ success: true, order: newOrder });
}
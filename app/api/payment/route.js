import { NextResponse } from 'next/dist/server/web/spec-extension/response';
import midtransClient from 'midtrans-client';

export async function POST(request) {
  try {
    const body = await request.json();
    const { booking_id, gross_amount, customer_name, customer_email } = body;

    // Inisialisasi Midtrans CoreApi/Snap
    let snap = new midtransClient.Snap({
      isProduction: false, // Wajib false untuk Sandbox
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
    });

    // Parameter transaksi yang akan dikirim ke Midtrans
    let parameter = {
      transaction_details: {
        order_id: `CH-${booking_id}`,
        gross_amount: gross_amount
      },
      customer_details: {
        first_name: customer_name,
        email: customer_email
      }
    };

    // Minta token ke Midtrans
    const transaction = await snap.createTransaction(parameter);
    
    // Kembalikan token ke frontend
    return NextResponse.json({ token: transaction.token });

  } catch (error) {
    console.error('Midtrans Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
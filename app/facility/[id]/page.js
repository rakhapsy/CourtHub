"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, MapPin, CreditCard, QrCode } from "lucide-react";
import Swal from 'sweetalert2';

export default function FacilityDetail() {
  const { id } = useParams();
  const router = useRouter();
  
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 minutes
  const [createdBookingId, setCreatedBookingId] = useState(null);

  const timeSlots = ["08:00", "10:00", "16:00", "18:00", "19:00", "20:00", "21:00"];

  useEffect(() => {
    const fetchFacility = async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", id)
        .single();

      if (data) setFacility(data);
      setLoading(false);
    };
    if (id) fetchFacility();
  }, [id]);

  useEffect(() => {
    let timer;
    if (showPayment && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0 && showPayment) {
      alert("Waktu pembayaran habis. Silakan ulangi booking.");
      setShowPayment(false);
      setCountdown(900);
    }
    return () => clearInterval(timer);
  }, [showPayment, countdown]);

  const handleBooking = async () => {
    if (!selectedDate || !selectedTime) {
      alert("Pilih tanggal dan waktu terlebih dahulu!");
      return;
    }

    setBookingLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    const user = session.user;

    // 1. Simpan data booking ke Supabase (Status masih 'pending' & 'unpaid')
    // Prepare timestamps
    const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    // Kurangi waktu selesai dengan waktu mulai (hasilnya dalam satuan milidetik)
    const diffInMilliseconds = end - start;

    // Konversi milidetik menjadi jam 
    // (1000 milidetik * 60 detik * 60 menit = 3.600.000)
    const duration = diffInMilliseconds / (1000 * 60 * 60);

    // Validasi keamanan: Pastikan durasi tidak minus atau nol
    if (duration <= 0) {
      alert("Waktu selesai harus lebih besar dari waktu mulai!");
      return; // Hentikan fungsi agar tidak menembak API
    }

    const calculatedPrice = facility.price_per_hour * duration;

    const { data: bookingData, error } = await supabase
      .from('bookings')
      .insert([
        { 
          profile_id: session.user.id,
          facility_id: facility.id,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: "pending",
          total_price: facility.price_per_hour,
          payment_status: "unpaid",
        }
      ])
      .select()
      .single();

    setBookingLoading(false);

    if (error) {
      console.error(error);
      return;
    }

    // 2. Minta Token dari API Route yang baru kita buat
    const response = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingData.id,
        gross_amount: calculatedPrice,
        customer_name: user.user_metadata.full_name || 'Pelanggan',
        customer_email: user.email
      })
    });

    const { token } = await response.json();

    // 3. Tampilkan Popup Midtrans Snap
    if (token) {
      window.snap.pay(token, {
        onSuccess: async function(result){
          
          // 1. Update status di database Supabase
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed', payment_status: 'paid' })
            .eq('id', bookingData.id);

          if (updateError) {
            console.error("Gagal update database:", updateError);
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: 'Pembayaran berhasil, tetapi sistem gagal memperbarui data.',
              confirmButtonColor: '#033671'
            });
            return;
          }

          // 2. Tampilkan SweetAlert Sukses
          Swal.fire({
            icon: 'success',
            title: 'Pembayaran Berhasil!',
            text: 'Pesanan Anda telah dikonfirmasi.',
            confirmButtonColor: '#033671', // Menggunakan warna biru gelap brand aplikasi
            allowOutsideClick: false
          }).then((result) => {
            // Arahkan ke riwayat HANYA SETELAH user mengklik tombol OK di SweetAlert
            if (result.isConfirmed) {
              router.push('/my-bookings');
              router.refresh();
            }
          });
        },
        
        onPending: function(result){
          Swal.fire({
            icon: 'info',
            title: 'Menunggu Pembayaran',
            text: 'Silakan selesaikan pembayaran melalui Virtual Account pilihan Anda.',
            confirmButtonColor: '#033671'
          }).then(() => {
            router.push('/my-bookings');
          });
        },
        
        onError: function(result){
          Swal.fire({
            icon: 'error',
            title: 'Pembayaran Gagal',
            text: 'Terjadi kesalahan saat memproses pembayaran Anda.',
            confirmButtonColor: '#e3342f'
          });
        },
        
        onClose: function(){
          Swal.fire({
            icon: 'warning',
            title: 'Dibatalkan',
            text: 'Anda menutup jendela tanpa menyelesaikan pembayaran.',
            confirmButtonColor: '#f6993f'
          }).then(() => {
            router.push('/my-bookings');
          });
        }
      });
    }

    // Prepare timestamps
    // const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
    // const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration

    // const { data, error } = await supabase.from("bookings").insert({
    //   profile_id: session.user.id,
    //   facility_id: facility.id,
    //   start_time: startDateTime.toISOString(),
    //   end_time: endDateTime.toISOString(),
    //   status: "pending",
    //   total_price: facility.price_per_hour,
    //   payment_status: "unpaid",
    // }).select().single();

    // setBookingLoading(false);

    // if (error) {
    //   console.error(error);
    //   alert("Gagal melakukan booking. Silakan coba lagi.");
    // } else {
    //   setCreatedBookingId(data.id);
    //   setShowPayment(true);
    // }
  };

  const handleSimulatePayment = async () => {
    const { error } = await supabase
      .from("bookings")
      .update({ payment_status: "paid", status: "confirmed" })
      .eq("id", createdBookingId);
      
    if (error) {
      alert("Terjadi kesalahan sistem saat memproses pembayaran.");
    } else {
      alert("Pembayaran Berhasil!");
      router.push("/my-bookings");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat data...</div>;
  }

  if (!facility) {
    return <div className="min-h-screen flex items-center justify-center">Fasilitas tidak ditemukan.</div>;
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {showPayment ? (
        // PAYMENT UI
        <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#033671] mb-2">Selesaikan Pembayaran</h2>
            <p className="text-slate-500">Pindai kode QRIS di bawah ini dengan aplikasi m-banking atau e-wallet Anda.</p>
          </div>
          
          <div className="bg-[#033671] text-white py-2 rounded-t-xl font-bold tracking-widest">
            QRIS CourtHub
          </div>
          <div className="p-6 border-x border-b border-gray-200 flex justify-center items-center bg-slate-50">
            {/* Mock QR Code */}
            <div className="w-48 h-48 bg-white border-2 border-slate-300 p-2 flex items-center justify-center relative">
              <QrCode className="w-full h-full text-slate-800" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-slate-200/30 to-transparent"></div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-1">Sisa Waktu Pembayaran</p>
            <p className="text-3xl font-black text-red-600 font-mono">{formatTime(countdown)}</p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-3">
            <p className="text-xs text-slate-400">Tombol di bawah hanya untuk simulasi (Testing)</p>
            <button
              onClick={handleSimulatePayment}
              className="w-full py-3 bg-[#87dd70] hover:bg-[#76cc60] text-[#033671] font-bold rounded-lg transition-colors shadow-sm"
            >
              Simulasikan Pembayaran Berhasil
            </button>
          </div>
        </div>
      ) : (
        // BOOKING UI
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-[#033671]">{facility.name}</h1>
                  <span className="inline-block mt-2 px-3 py-1 bg-gray-100 text-sm rounded-full text-gray-700">
                    {facility.category}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#87dd70]">
                    Rp {facility.price_per_hour.toLocaleString("id-ID")}
                  </p>
                  <p className="text-sm text-gray-500">/ jam</p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2 text-[#033671]" />
                {facility.location}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#033671]/20 h-fit">
            <h2 className="text-xl font-bold text-[#033671] mb-6">Pesan Jadwal</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input 
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Waktu (Durasi 1 Jam)</label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 text-sm rounded-lg border transition-colors ${
                        selectedTime === time 
                          ? "bg-[#033671] text-white border-[#033671]" 
                          : "bg-white text-gray-700 border-gray-300 hover:border-[#87dd70]"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t mt-4">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-medium text-gray-700">Total Harga</span>
                  <span className="font-bold text-lg text-[#033671]">
                    Rp {(selectedTime ? facility.price_per_hour : 0).toLocaleString("id-ID")}
                  </span>
                </div>

                <button
                  onClick={handleBooking}
                  disabled={bookingLoading || !selectedDate || !selectedTime}
                  className="w-full py-3 bg-[#033671] hover:bg-[#033671]/90 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {bookingLoading ? (
                    "Memproses..."
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Lanjutkan ke Pembayaran
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, MapPin, CreditCard, QrCode, Tag, Percent } from "lucide-react";
import Swal from 'sweetalert2';

export default function FacilityDetail() {
  const { id } = useParams();
  const router = useRouter();
  
  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [duration, setDuration] = useState(1); // Duration in hours
  const [bookingLoading, setBookingLoading] = useState(false);
  
  // Payment state
  const [showPayment, setShowPayment] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 minutes
  const [createdBookingId, setCreatedBookingId] = useState(null);

  // Mabar state
  const [isMabar, setIsMabar] = useState(false);
  const [mabarTitle, setMabarTitle] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [skillLevel, setSkillLevel] = useState("Semua Level");

  // Promotions state
  const [activePromo, setActivePromo] = useState(null);
  const [discountedPricePerHour, setDiscountedPricePerHour] = useState(0);

  // Booking availability state
  const [bookedSlots, setBookedSlots] = useState([]);

  // Admin fee constant
  const ADMIN_FEE = 3000;

  const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

  useEffect(() => {
    const fetchFacility = async () => {
      // Fetch facility data
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("id", id)
        .single();

      if (data) {
        setFacility(data);

        // Fetch active promotions for this facility
        const { data: promoData } = await supabase
          .from("promotions")
          .select("*")
          .eq("facility_id", id)
          .gt("valid_until", new Date().toISOString())
          .order("discount_percentage", { ascending: false })
          .limit(1)
          .single();

        if (promoData) {
          setActivePromo(promoData);
          // Calculate discounted price
          const discount = data.price_per_hour * (promoData.discount_percentage / 100);
          const discounted = data.price_per_hour - discount;
          setDiscountedPricePerHour(Math.round(discounted));
        } else {
          setDiscountedPricePerHour(data.price_per_hour);
        }
      }
      setLoading(false);
    };
    if (id) fetchFacility();
  }, [id]);

  // Fetch booked slots when date changes
  useEffect(() => {
    const fetchBookedSlots = async () => {
      if (!selectedDate || !id) {
        setBookedSlots([]);
        return;
      }

      // Query all bookings for this facility on the selected date
      // Using a simpler approach: get bookings where start_time is on the selected date
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, end_time, id, status")
        .eq("facility_id", id)
        .in("status", ["confirmed", "pending"])
        .gte("start_time", `${selectedDate}T00:00:00`)
        .lt("start_time", `${selectedDate}T23:59:59`);

      if (error) {
        console.error("Error fetching booked slots:", error);
        setBookedSlots([]);
      } else {
        // Uncomment for debugging:
        // console.log("✅ Fetched bookings:", { date: selectedDate, count: data?.length, bookings: data });
        setBookedSlots(data || []);
      }
    };

    fetchBookedSlots();
  }, [selectedDate, id]);

  // Reset selected time when duration changes if the new duration makes it unavailable
  useEffect(() => {
    if (!selectedTime || !selectedDate || bookedSlots.length === 0) return;

    // Check if current selected time is still available with new duration
    const slotStartStr = `${selectedDate}T${selectedTime}:00`;
    const slotStart = new Date(slotStartStr);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 60 * 1000);

    let isAvailable = true;
    for (const booking of bookedSlots) {
      const bookingStartStr = booking.start_time.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '');
      const bookingEndStr = booking.end_time.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '');
      const bookingStart = new Date(bookingStartStr);
      const bookingEnd = new Date(bookingEndStr);

      if (slotStart < bookingEnd && slotEnd > bookingStart) {
        isAvailable = false;
        break;
      }
    }

    if (!isAvailable) {
      setSelectedTime("");
    }
  }, [duration, bookedSlots, selectedTime, selectedDate]);

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
    // Prepare timestamps - menggunakan format lokal tanpa timezone conversion
    const startDateTime = `${selectedDate}T${selectedTime}:00`;
    const endTime = new Date(`${selectedDate}T${selectedTime}:00`);
    endTime.setHours(endTime.getHours() + duration);
    const endDateTime = `${endTime.getFullYear()}-${String(endTime.getMonth() + 1).padStart(2, '0')}-${String(endTime.getDate()).padStart(2, '0')}T${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}:00`;

    // Calculate total price based on duration
    const calculatedPrice = discountedPricePerHour * duration;

    // Validate Mabar fields if Mabar is enabled
    if (isMabar) {
      if (!mabarTitle.trim()) {
        alert("Judul Mabar tidak boleh kosong!");
        setBookingLoading(false);
        return;
      }
      if (maxPlayers < 2) {
        alert("Kapasitas Pemain minimal 2 orang!");
        setBookingLoading(false);
        return;
      }
    }

    const { data: bookingData, error } = await supabase
      .from('bookings')
      .insert([
        { 
          profile_id: session.user.id,
          facility_id: facility.id,
          start_time: startDateTime,
          end_time: endDateTime,
          status: "pending",
          total_price: calculatedPrice,
          payment_status: "unpaid",
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(error);
      setBookingLoading(false);
      return;
    }

    // If Mabar is enabled, insert into mabar_sessions table
    if (isMabar && bookingData) {
      const pricePerPlayer = calculatedPrice / maxPlayers;
      
      const { error: mabarError } = await supabase
        .from('mabar_sessions')
        .insert([
          {
            booking_id: bookingData.id,
            host_id: session.user.id,
            title: mabarTitle,
            max_players: maxPlayers,
            price_per_player: pricePerPlayer,
            skill_level: skillLevel
          }
        ]);

      if (mabarError) {
        console.error("Error creating mabar session:", mabarError);
        // Optionally: rollback booking or notify user
        alert("Booking berhasil tetapi gagal membuat sesi Mabar. Silakan hubungi admin.");
      }
    }

    setBookingLoading(false);

    // 2. Calculate payment amount (only host's share if Mabar)
    const basePaymentAmount = isMabar ? (calculatedPrice / maxPlayers) : calculatedPrice;
    
    // 3. Add admin fee
    const paymentAmount = basePaymentAmount + ADMIN_FEE;

    // 4. Minta Token dari API Route yang baru kita buat
    const response = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingData.id,
        gross_amount: paymentAmount,
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

  // Check if a time slot is available (considering current duration selection)
  const isTimeSlotAvailable = (timeSlot) => {
    if (!selectedDate || bookedSlots.length === 0) return true;

    // Parse times as local time strings (remove timezone to avoid UTC conversion)
    const slotStartStr = `${selectedDate}T${timeSlot}:00`;
    const slotStart = new Date(slotStartStr);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 60 * 1000);

    // Check if this proposed slot conflicts with any existing booked slot
    for (const booking of bookedSlots) {
      // Remove timezone suffix for local comparison
      const bookingStartStr = booking.start_time.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '');
      const bookingEndStr = booking.end_time.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '');
      
      const bookingStart = new Date(bookingStartStr);
      const bookingEnd = new Date(bookingEndStr);

      // Uncomment for debugging:
      // console.log(`🔍 Slot ${timeSlot}:`, {
      //   slot: `${slotStartStr} to ${slotEnd.toLocaleString('id-ID')}`,
      //   booking: `${bookingStartStr} to ${bookingEndStr}`,
      //   overlap: slotStart < bookingEnd && slotEnd > bookingStart
      // });

      // Two time ranges overlap if:
      // 1. Proposed slot starts before existing booking ends, AND
      // 2. Proposed slot ends after existing booking starts
      if (slotStart < bookingEnd && slotEnd > bookingStart) {
        return false; // This slot is not available
      }
    }

    return true; // This slot is available
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
                  {activePromo ? (
                    <div>
                      <p className="text-lg line-through text-gray-400">
                        Rp {facility.price_per_hour.toLocaleString("id-ID")}
                      </p>
                      <p className="text-2xl font-bold text-[#87dd70]">
                        Rp {discountedPricePerHour.toLocaleString("id-ID")}
                      </p>
                      <p className="text-sm text-gray-500">/ jam</p>
                      <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-[#87dd70] text-white text-xs font-semibold rounded-full">
                        <Percent className="w-3 h-3" />
                        Diskon {activePromo.discount_percentage}%
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-bold text-[#87dd70]">
                        Rp {facility.price_per_hour.toLocaleString("id-ID")}
                      </p>
                      <p className="text-sm text-gray-500">/ jam</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex items-center text-gray-600">
                <MapPin className="w-5 h-5 mr-2 text-[#033671]" />
                {facility.location}
              </div>

              {activePromo && (
                <div className="mt-4 p-3 bg-gradient-to-r from-[#87dd70]/20 to-[#87dd70]/10 border-l-4 border-[#87dd70] rounded">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-[#87dd70]" />
                    <div>
                      <p className="text-sm font-semibold text-[#033671]">
                        Promo Aktif! Kode: <span className="font-mono bg-white px-2 py-0.5 rounded">{activePromo.promo_code}</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Hemat {activePromo.discount_percentage}% hingga {new Date(activePromo.valid_until).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Waktu Mulai</label>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => {
                    const available = isTimeSlotAvailable(time);
                    return (
                      <button
                        key={time}
                        onClick={() => available && setSelectedTime(time)}
                        disabled={!available}
                        className={`py-2 text-sm rounded-lg border transition-colors ${
                          selectedTime === time 
                            ? "bg-[#033671] text-white border-[#033671]" 
                            : available
                              ? "bg-white text-gray-700 border-gray-300 hover:border-[#87dd70]"
                              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        }`}
                      >
                        {time}
                        {!available && <span className="block text-xs">Terisi</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedDate && (
                  <p className="text-xs text-gray-500 mt-2">
                    {bookedSlots.length > 0 
                      ? `${bookedSlots.length} booking ditemukan. Slot berwarna abu-abu sudah dibooking.` 
                      : "Semua slot tersedia untuk tanggal ini"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Durasi</label>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none bg-white"
                >
                  <option value={1}>1 Jam</option>
                  <option value={2}>2 Jam</option>
                  <option value={3}>3 Jam</option>
                  <option value={4}>4 Jam</option>
                </select>
              </div>

              {/* Mabar Toggle */}
              <div className="pt-4 border-t">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox"
                    checked={isMabar}
                    onChange={(e) => setIsMabar(e.target.checked)}
                    className="w-5 h-5 text-[#033671] border-gray-300 rounded focus:ring-[#87dd70] cursor-pointer"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-[#033671]">
                      Buka sesi ini untuk Mabar umum
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pemain lain bisa bergabung dan berbagi biaya
                    </p>
                  </div>
                </label>
              </div>

              {/* Conditional Mabar Inputs */}
              {isMabar && (
                <div className="space-y-4 p-4 bg-[#87dd70]/10 rounded-lg border border-[#87dd70]/30">
                  <h3 className="text-sm font-bold text-[#033671] flex items-center gap-2">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    Detail Sesi Mabar
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Judul Mabar *
                    </label>
                    <input 
                      type="text"
                      value={mabarTitle}
                      onChange={(e) => setMabarTitle(e.target.value)}
                      placeholder="e.g., Fun Football Malam"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kapasitas Pemain * (Min: 2)
                    </label>
                    <input 
                      type="number"
                      min="2"
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Level Permainan
                    </label>
                    <select 
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none bg-white text-gray-900"
                    >
                      <option value="Pemula">Pemula</option>
                      <option value="Menengah">Menengah</option>
                      <option value="Semua Level">Semua Level</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t mt-4">
                {isMabar ? (
                  <div className="space-y-3 mb-6">
                    {activePromo && (
                      <div className="flex items-center gap-2 text-xs text-[#87dd70] font-semibold mb-2">
                        <Tag className="w-4 h-4" />
                        Promo {activePromo.discount_percentage}% diterapkan!
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Harga per Jam</span>
                      <div className="text-right">
                        {activePromo && (
                          <span className="block text-xs line-through text-gray-400">
                            Rp {facility.price_per_hour.toLocaleString("id-ID")}
                          </span>
                        )}
                        <span className="font-semibold text-gray-800">
                          Rp {discountedPricePerHour.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Durasi</span>
                      <span className="text-gray-600">× {duration} jam</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-200">
                      <span className="text-gray-600">
                        {activePromo ? "Total Harga Lapangan (sudah diskon)" : "Total Harga Lapangan"}
                      </span>
                      <span className="font-semibold text-gray-800">
                        Rp {(selectedTime ? discountedPricePerHour * duration : 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Dibagi {maxPlayers} pemain</span>
                      <span className="text-gray-600">÷ {maxPlayers}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-200">
                      <span className="text-gray-600">Bagian Anda</span>
                      <span className="font-semibold text-gray-800">
                        Rp {(selectedTime && maxPlayers > 0 ? Math.round((discountedPricePerHour * duration) / maxPlayers) : 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Biaya Admin</span>
                      <span className="font-semibold text-gray-800">
                        Rp {ADMIN_FEE.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#87dd70]/20 rounded-lg">
                      <span className="font-semibold text-[#033671]">Total Bayar</span>
                      <span className="font-bold text-lg text-[#033671]">
                        Rp {(selectedTime && maxPlayers > 0 ? Math.round((discountedPricePerHour * duration) / maxPlayers) + ADMIN_FEE : ADMIN_FEE).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 italic">
                      * Pemain lain akan membayar saat bergabung
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {activePromo && (
                      <div className="flex items-center gap-2 text-xs text-[#87dd70] font-semibold mb-2">
                        <Tag className="w-4 h-4" />
                        Promo {activePromo.discount_percentage}% diterapkan!
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Harga per Jam</span>
                      <div className="text-right">
                        {activePromo && (
                          <span className="block text-xs line-through text-gray-400">
                            Rp {facility.price_per_hour.toLocaleString("id-ID")}
                          </span>
                        )}
                        <span className="font-semibold text-gray-800">
                          Rp {discountedPricePerHour.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Durasi</span>
                      <span className="text-gray-600">× {duration} jam</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Subtotal Lapangan</span>
                      <span className="font-semibold text-gray-800">
                        Rp {(selectedTime ? discountedPricePerHour * duration : 0).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-200">
                      <span className="text-gray-600">Biaya Admin</span>
                      <span className="font-semibold text-gray-800">
                        Rp {ADMIN_FEE.toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-[#87dd70]/20 rounded-lg">
                      <span className="font-semibold text-[#033671]">Total Bayar</span>
                      <span className="font-bold text-lg text-[#033671]">
                        Rp {(selectedTime ? (discountedPricePerHour * duration) + ADMIN_FEE : ADMIN_FEE).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                )}

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

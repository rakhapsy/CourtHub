"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Calendar, Clock, MapPin } from "lucide-react";

export default function MyBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          facilities (
            name,
            location
          )
        `)
        .eq("profile_id", session.user.id)
        .order("start_time", { ascending: false });

      if (data) setBookings(data);
      setLoading(false);
    };

    fetchBookings();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Memuat riwayat...</div>;
  }

  const formatDateTime = (timestamp) => {
    // Remove timezone to prevent UTC conversion
    const cleanTimestamp = timestamp.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '').replace(/\+\d{2}$/, '');
    const date = new Date(cleanTimestamp);
    return {
      date: date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    };
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-[#033671] mb-8">Riwayat Booking Saya</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500">Anda belum memiliki riwayat booking.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const { date, time } = formatDateTime(booking.start_time);
            
            return (
              <div key={booking.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-[#87dd70] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#033671]">
                    {booking.facilities?.name || "Fasilitas Tidak Diketahui"}
                  </h3>
                  <div className="flex items-center text-sm text-gray-600 gap-4">
                    <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {time}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 gap-1">
                    <MapPin className="w-4 h-4" />
                    {booking.facilities?.location || "-"}
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.status === 'confirmed' ? 'Terkonfirmasi' : 'Menunggu'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      booking.payment_status === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.payment_status === 'paid' ? 'Lunas' : 'Belum Dibayar'}
                    </span>
                  </div>
                  <p className="font-bold text-[#033671] mt-2">
                    Rp {booking.total_price?.toLocaleString("id-ID")}
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

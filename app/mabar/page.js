"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Users, Calendar, DollarSign } from "lucide-react";

export default function MabarPage() {
  const router = useRouter();
  const [mabarSessions, setMabarSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMabarSessions();
  }, []);

  const fetchMabarSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('mabar_sessions')
        .select(`
          *,
          booking:bookings(
            id,
            start_time,
            end_time,
            status,
            facility:facilities(
              id,
              name,
              location,
              category
            )
          ),
          participants:mabar_participants(count)
        `)
        .eq('booking.status', 'confirmed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMabarSessions(data || []);
    } catch (error) {
      console.error("Error fetching mabar sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  // Keep dummy data as fallback
  const dummySessions = [
    {
      id: 1,
      title: "Badminton Mabar Sore - Mixed Double",
      date: "Sabtu, 28 Juni 2026",
      time: "16:00 - 18:00",
      slotsAvailable: 4,
      totalSlots: 8,
      pricePerPlayer: 50000,
      location: "GOR Senayan, Jakarta",
      level: "Intermediate"
    },
    {
      id: 2,
      title: "Futsal Friendly Match",
      date: "Minggu, 29 Juni 2026",
      time: "09:00 - 11:00",
      slotsAvailable: 6,
      totalSlots: 10,
      pricePerPlayer: 75000,
      location: "Lapangan Futsal Bintaro",
      level: "All Levels"
    },
    {
      id: 3,
      title: "Basketball 3v3 Streetball",
      date: "Sabtu, 28 Juni 2026",
      time: "18:00 - 20:00",
      slotsAvailable: 2,
      totalSlots: 6,
      pricePerPlayer: 60000,
      location: "BSD Basketball Court",
      level: "Advanced"
    }
  ];

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  // Use real data if available, otherwise use dummy data
  const displaySessions = mabarSessions.length > 0 ? mabarSessions : dummySessions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#033671] to-[#045299] text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Cari Lawan atau Teman Mabar
          </h1>
          <p className="text-lg sm:text-xl text-slate-200 max-w-2xl mx-auto">
            Temukan pemain lain untuk melengkapi tim atau jadilah lawan tanding yang sportif. 
            Olahraga lebih seru bersama komunitas!
          </p>
        </div>
      </section>

      {/* Mabar Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#033671] mb-2">Sesi Mabar Tersedia</h2>
          <p className="text-slate-600">Bergabunglah dengan sesi olahraga yang sedang mencari pemain</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#033671] mx-auto mb-4"></div>
            <p className="text-slate-600">Memuat sesi Mabar...</p>
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Belum ada sesi mabar tersedia saat ini.</p>
            <p className="text-slate-400 text-sm mt-2">Jadilah yang pertama membuat sesi!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displaySessions.map((session) => {
              // Calculate participants for real data
              const totalParticipants = session.participants ? (session.participants[0]?.count || 0) + 1 : (session.totalSlots - session.slotsAvailable);
              const isRealData = session.booking && session.booking.start_time;
              
              return (
                <div 
                  key={session.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-slate-200 cursor-pointer"
                  onClick={() => router.push(`/mabar/${session.id}`)}
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-[#033671] to-[#045299] p-4">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {session.title}
                    </h3>
                    <span className="inline-block px-3 py-1 bg-[#87dd70] text-[#033671] text-xs font-semibold rounded-full">
                      {session.skill_level || session.level}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4">
                    {/* Date & Time */}
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {isRealData ? formatDate(session.booking.start_time) : session.date}
                        </p>
                        <p className="text-sm text-slate-600">
                          {isRealData 
                            ? `${formatTime(session.booking.start_time)} - ${formatTime(session.booking.end_time)}`
                            : session.time
                          }
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm text-slate-600">
                        {isRealData ? session.booking.facility.location : session.location}
                      </p>
                    </div>

                    {/* Slots Available */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#033671]" />
                        <span className="text-sm font-semibold text-slate-700">Pemain</span>
                      </div>
                      <span className={`text-lg font-bold ${
                        (isRealData ? (session.max_players - totalParticipants) : session.slotsAvailable) <= 2 
                          ? 'text-red-500' 
                          : 'text-[#87dd70]'
                      }`}>
                        {isRealData 
                          ? `${totalParticipants}/${session.max_players}`
                          : `${session.totalSlots - session.slotsAvailable}/${session.totalSlots}`
                        }
                      </span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between p-3 bg-[#87dd70] bg-opacity-10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[#033671]" />
                        <span className="text-sm font-semibold text-slate-700">Harga per Pemain</span>
                      </div>
                      <span className="text-lg font-bold text-[#033671]">
                        {formatPrice(isRealData ? session.price_per_player : session.pricePerPlayer)}
                      </span>
                    </div>

                    {/* View Details Button */}
                    <button 
                      className="w-full bg-[#033671] hover:bg-[#87dd70] hover:text-[#033671] text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/mabar/${session.id}`);
                      }}
                    >
                      Lihat Detail & Join
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-[#033671] to-[#045299] rounded-2xl p-8 sm:p-12 text-center text-white">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Tidak Menemukan Sesi yang Cocok?
          </h2>
          <p className="text-slate-200 mb-6 max-w-2xl mx-auto">
            Buat sesi mabar sendiri dan undang pemain lain untuk bergabung!
          </p>
          <button 
            onClick={() => router.push('/cari-lapangan')}
            className="bg-[#87dd70] text-[#033671] font-bold py-3 px-8 rounded-lg hover:bg-white transition-colors duration-200 shadow-lg"
          >
            Buat Sesi Mabar
          </button>
        </div>
      </section>
    </div>
  );
}

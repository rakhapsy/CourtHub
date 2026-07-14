'use client';

import { Trophy, MapPin, Users, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";

// Client Component - fetch data on mount
export default function TournamentPage() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const { data, error } = await supabase
      .from('tournaments')
      .select(`
        *,
        facility:facilities!inner(
          name,
          location,
          category
        )
      `)
      .eq('status', 'open')
      .order('start_date', { ascending: true });

    if (!error) {
      setTournaments(data || []);
    }
    setLoading(false);
  };

  const handleContactUs = () => {
    const whatsappNumber = '6288293012135';
    const message = encodeURIComponent('Halo CourtHub! Saya tertarik untuk mengadakan turnamen olahraga.');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startFormatted = start.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    const endFormatted = end.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long' 
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#033671] to-[#045299] text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-4">
            <Trophy className="w-16 h-16 text-[#87dd70]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Turnamen Mendatang
          </h1>
          <p className="text-lg sm:text-xl text-slate-200 max-w-2xl mx-auto">
            Ikuti kompetisi olahraga resmi dan buktikan kemampuan timmu. 
            Raih trofi dan hadiah menarik!
          </p>
        </div>
      </section>

      {/* Tournament Cards Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#033671] mb-2">Turnamen Terbuka</h2>
          <p className="text-slate-600">Daftarkan tim Anda sekarang dan jadilah juara!</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#033671] mx-auto mb-4"></div>
            <p className="text-slate-600">Memuat turnamen...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {tournaments && tournaments.length > 0 ? (
              tournaments.map((tournament) => (
              <div 
                key={tournament.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200"
              >
                {/* Card Header with Trophy Icon */}
                <div className="bg-gradient-to-r from-[#033671] to-[#045299] p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 opacity-10">
                    <Trophy className="w-32 h-32 text-white" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <span className="inline-block px-3 py-1 bg-[#87dd70] text-[#033671] text-xs font-bold rounded-full uppercase">
                        {tournament.facility?.category || 'Olahraga'}
                      </span>
                      <span className="inline-block px-3 py-1 bg-white bg-opacity-20 text-white text-xs font-semibold rounded-full">
                        OPEN
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight">
                      {tournament.title}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-4">
                  {/* Description */}
                  {tournament.description && (
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {tournament.description}
                    </p>
                  )}

                  <div className="border-t border-slate-200 pt-4 space-y-3">
                    {/* Venue */}
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Venue</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {tournament.facility?.name || 'Venue TBA'}
                        </p>
                        {tournament.facility?.location && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            {tournament.facility.location}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Tanggal</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatDate(tournament.start_date, tournament.end_date)}
                        </p>
                      </div>
                    </div>

                    {/* Max Participants */}
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-slate-500 font-semibold uppercase">Maksimal Peserta</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {tournament.max_participants} Tim
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prize Pool & Registration Fee */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="p-4 bg-gradient-to-br from-[#87dd70] to-[#6bc557] rounded-lg text-center">
                      <Trophy className="w-6 h-6 text-[#033671] mx-auto mb-1" />
                      <p className="text-xs text-[#033671] font-semibold mb-1">Prize Pool</p>
                      <p className="text-lg font-bold text-[#033671]">
                        {formatPrice(tournament.prize_pool)}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-100 rounded-lg text-center border-2 border-slate-200">
                      <DollarSign className="w-6 h-6 text-[#033671] mx-auto mb-1" />
                      <p className="text-xs text-slate-600 font-semibold mb-1">Biaya Registrasi</p>
                      <p className="text-lg font-bold text-[#033671]">
                        {formatPrice(tournament.registration_fee)}
                      </p>
                    </div>
                  </div>

                  {/* View Details & Register Button */}
                  <Link 
                    href={`/tournament/${tournament.id}`}
                    className="w-full bg-[#033671] hover:bg-[#87dd70] hover:text-[#033671] text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                  >
                    <Trophy className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    Lihat Detail & Daftar
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-16">
              <Trophy className="w-20 h-20 text-slate-300 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-slate-600 mb-2">
                Belum Ada Turnamen Terbuka
              </h3>
              <p className="text-slate-500 text-lg mb-1">
                Belum ada turnamen yang tersedia saat ini.
              </p>
              <p className="text-slate-400 text-sm">
                Pantau terus untuk update turnamen terbaru!
              </p>
            </div>
          )}
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gradient-to-r from-[#033671] to-[#045299] rounded-2xl p-8 sm:p-12 text-center text-white">
          <Trophy className="w-12 h-12 text-[#87dd70] mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ingin Mengadakan Turnamen?
          </h2>
          <p className="text-slate-200 mb-6 max-w-2xl mx-auto">
            Jadilah penyelenggara turnamen dan bawa komunitasmu ke level berikutnya. 
            CourtHub siap membantu!
          </p>
          <button 
            onClick={handleContactUs}
            className="bg-[#87dd70] text-[#033671] font-bold py-3 px-8 rounded-lg hover:bg-white transition-colors duration-200 shadow-lg"
          >
            Hubungi Kami
          </button>
        </div>
      </section>

      {/* Info Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white border-2 border-[#87dd70] rounded-xl p-6 shadow-md">
          <h3 className="text-lg font-bold text-[#033671] mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Informasi Penting
          </h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="text-[#87dd70] font-bold">•</span>
              <span>Pastikan tim Anda sudah terdaftar minimal 7 hari sebelum tanggal turnamen</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#87dd70] font-bold">•</span>
              <span>Biaya registrasi tidak dapat dikembalikan setelah pendaftaran dikonfirmasi</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#87dd70] font-bold">•</span>
              <span>Setiap tim wajib membawa perlengkapan dan dokumen identitas saat pertandingan</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

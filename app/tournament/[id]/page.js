"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Trophy, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  CreditCard
} from "lucide-react";
import Swal from 'sweetalert2';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [tournament, setTournament] = useState(null);
  const [participantsCount, setParticipantsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  
  // Registration form
  const [teamName, setTeamName] = useState("");

  useEffect(() => {
    fetchTournamentData();
    checkCurrentUser();
  }, [id]);

  const checkCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
      
      // Check if user already registered
      const { data } = await supabase
        .from('tournament_participants')
        .select('id')
        .eq('tournament_id', id)
        .eq('captain_id', session.user.id)
        .single();
      
      if (data) {
        setAlreadyRegistered(true);
      }
    }
  };

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament with facility details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          *,
          facility:facilities(
            name,
            location,
            category
          )
        `)
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Fetch participants count
      const { count, error: countError } = await supabase
        .from('tournament_participants')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', id)
        .eq('payment_status', 'paid');

      if (countError) throw countError;
      setParticipantsCount(count || 0);

    } catch (error) {
      console.error("Error fetching tournament:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memuat data turnamen',
        confirmButtonColor: '#033671'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Diperlukan',
        text: 'Silakan login terlebih dahulu untuk mendaftar turnamen',
        confirmButtonColor: '#033671',
        showCancelButton: true,
        cancelButtonText: 'Batal',
        confirmButtonText: 'Login Sekarang'
      }).then((result) => {
        if (result.isConfirmed) {
          router.push('/login');
        }
      });
      return;
    }

    // Check if already registered
    if (alreadyRegistered) {
      Swal.fire({
        icon: 'info',
        title: 'Sudah Terdaftar',
        text: 'Anda sudah terdaftar dalam turnamen ini',
        confirmButtonColor: '#033671'
      });
      return;
    }

    // Check if tournament is full
    if (participantsCount >= tournament.max_participants) {
      Swal.fire({
        icon: 'error',
        title: 'Turnamen Penuh',
        text: 'Maaf, turnamen ini sudah mencapai kapasitas maksimal',
        confirmButtonColor: '#033671'
      });
      return;
    }

    // Validate team name
    if (!teamName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama Tim Diperlukan',
        text: 'Silakan masukkan nama tim Anda',
        confirmButtonColor: '#033671'
      });
      return;
    }

    setRegistering(true);

    try {
      const user = session.user;

      // Request payment token from Midtrans
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: `TOUR-${id}`,
          gross_amount: tournament.registration_fee,
          customer_name: user.user_metadata?.full_name || user.email.split('@')[0],
          customer_email: user.email
        })
      });

      const { token } = await response.json();

      if (token) {
        // Open Midtrans Snap payment
        window.snap.pay(token, {
          onSuccess: async function(result) {
            // Insert into tournament_participants
            const { error: insertError } = await supabase
              .from('tournament_participants')
              .insert([{
                tournament_id: id,
                captain_id: user.id,
                team_name: teamName,
                payment_status: 'paid'
              }]);

            if (insertError) {
              console.error("Error inserting participant:", insertError);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Pembayaran berhasil tetapi gagal mencatat pendaftaran. Hubungi admin.',
                confirmButtonColor: '#033671'
              });
              return;
            }

            // Success!
            Swal.fire({
              icon: 'success',
              title: 'Pendaftaran Berhasil!',
              text: `Tim "${teamName}" telah terdaftar dalam turnamen ini.`,
              confirmButtonColor: '#033671'
            }).then(() => {
              // Refresh page to show updated data
              window.location.reload();
            });
          },
          
          onPending: function(result) {
            Swal.fire({
              icon: 'info',
              title: 'Menunggu Pembayaran',
              text: 'Silakan selesaikan pembayaran Anda.',
              confirmButtonColor: '#033671'
            });
            setRegistering(false);
          },
          
          onError: function(result) {
            Swal.fire({
              icon: 'error',
              title: 'Pembayaran Gagal',
              text: 'Terjadi kesalahan saat memproses pembayaran.',
              confirmButtonColor: '#e3342f'
            });
            setRegistering(false);
          },
          
          onClose: function() {
            Swal.fire({
              icon: 'warning',
              title: 'Dibatalkan',
              text: 'Anda menutup jendela pembayaran.',
              confirmButtonColor: '#f6993f'
            });
            setRegistering(false);
          }
        });
      } else {
        throw new Error('Failed to get payment token');
      }
    } catch (error) {
      console.error("Error registering:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memproses pendaftaran. Silakan coba lagi.',
        confirmButtonColor: '#033671'
      });
      setRegistering(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#033671] mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat data turnamen...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Turnamen Tidak Ditemukan</h2>
          <p className="text-slate-500 mb-6">Turnamen yang Anda cari tidak tersedia.</p>
          <button
            onClick={() => router.push('/tournament')}
            className="bg-[#033671] text-white px-6 py-3 rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors font-semibold"
          >
            Kembali ke Daftar Turnamen
          </button>
        </div>
      </div>
    );
  }

  const progressPercentage = (participantsCount / tournament.max_participants) * 100;
  const isFull = participantsCount >= tournament.max_participants;
  const slotsRemaining = tournament.max_participants - participantsCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Button */}
        <button
          onClick={() => router.push('/tournament')}
          className="flex items-center gap-2 text-[#033671] hover:text-[#87dd70] font-semibold mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Daftar Turnamen
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tournament Header */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-[#033671] to-[#045299] p-6 text-white">
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-block px-3 py-1 bg-[#87dd70] text-[#033671] text-xs font-bold rounded-full uppercase">
                    {tournament.facility?.category || 'Olahraga'}
                  </span>
                  <span className={`inline-block px-3 py-1 text-white text-xs font-semibold rounded-full ${
                    tournament.status === 'open' 
                      ? 'bg-green-500' 
                      : tournament.status === 'ongoing'
                      ? 'bg-blue-500'
                      : 'bg-gray-500'
                  }`}>
                    {tournament.status === 'open' ? 'PENDAFTARAN DIBUKA' : 
                     tournament.status === 'ongoing' ? 'BERLANGSUNG' : 'SELESAI'}
                  </span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{tournament.title}</h1>
                {tournament.description && (
                  <p className="text-slate-200 text-sm mt-3 leading-relaxed">
                    {tournament.description}
                  </p>
                )}
              </div>

              <div className="p-6 space-y-4">
                {/* Venue */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Venue</p>
                    <p className="text-sm font-bold text-slate-800">
                      {tournament.facility?.name || 'Venue TBA'}
                    </p>
                    {tournament.facility?.location && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {tournament.facility.location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Tanggal Mulai</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {formatDate(tournament.start_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Clock className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase">Tanggal Selesai</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {formatDate(tournament.end_date)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prize Pool & Registration Fee */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-4 bg-gradient-to-br from-[#87dd70] to-[#6bc557] rounded-lg text-center">
                    <Trophy className="w-6 h-6 text-[#033671] mx-auto mb-1" />
                    <p className="text-xs text-[#033671] font-semibold mb-1">Total Hadiah</p>
                    <p className="text-xl font-bold text-[#033671]">
                      {formatPrice(tournament.prize_pool)}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-100 rounded-lg text-center border-2 border-slate-200">
                    <DollarSign className="w-6 h-6 text-[#033671] mx-auto mb-1" />
                    <p className="text-xs text-slate-600 font-semibold mb-1">Biaya Registrasi</p>
                    <p className="text-xl font-bold text-[#033671]">
                      {formatPrice(tournament.registration_fee)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Sidebar - Registration Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#033671] sticky top-6">
              
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">Tim Terdaftar</span>
                  <span className={`text-2xl font-bold ${isFull ? 'text-red-500' : 'text-[#033671]'}`}>
                    {participantsCount}/{tournament.max_participants}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      isFull ? 'bg-red-500' : 'bg-[#87dd70]'
                    }`}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {isFull ? 'Turnamen penuh' : `${slotsRemaining} slot tersisa`}
                </p>
              </div>

              {/* Registration Form */}
              {alreadyRegistered ? (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-green-700">Tim Anda Sudah Terdaftar</p>
                </div>
              ) : isFull ? (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-center">
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-red-700">Turnamen Penuh</p>
                  <p className="text-xs text-red-600 mt-1">Tidak ada slot tersisa</p>
                </div>
              ) : tournament.status !== 'open' ? (
                <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg text-center">
                  <AlertCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">Pendaftaran Ditutup</p>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nama Tim *
                    </label>
                    <input
                      required
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      maxLength={50}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-[#87dd70] outline-none text-gray-900 placeholder:text-gray-400"
                      placeholder="e.g., Thunder Squad"
                      disabled={registering}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Maksimal 50 karakter
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full py-4 bg-[#033671] hover:bg-[#87dd70] hover:text-[#033671] text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {registering ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Daftar & Bayar
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-sm font-bold text-[#033671] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Informasi Pendaftaran
                </h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#87dd70] font-bold">•</span>
                    <span>Pembayaran langsung dikonfirmasi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#87dd70] font-bold">•</span>
                    <span>Pastikan data tim Anda benar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#87dd70] font-bold">•</span>
                    <span>Biaya tidak dapat dikembalikan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#87dd70] font-bold">•</span>
                    <span>Daftar minimal 7 hari sebelum turnamen</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

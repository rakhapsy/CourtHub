"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Trophy,
  CreditCard,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import Swal from 'sweetalert2';

export default function MabarDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [mabarSession, setMabarSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  useEffect(() => {
    fetchMabarSession();
    checkCurrentUser();
  }, [id]);

  const checkCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setCurrentUser(session.user);
    }
  };

  const fetchMabarSession = async () => {
    try {
      // Fetch mabar session with joined data
      const { data: sessionData, error: sessionError } = await supabase
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
          host:profiles!mabar_sessions_host_id_fkey(
            id,
            full_name
          )
        `)
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;
      setMabarSession(sessionData);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('mabar_participants')
        .select(`
          *,
          profile:profiles(
            id,
            full_name,
            phone
          )
        `)
        .eq('session_id', id)
        .eq('payment_status', 'paid');

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Check if current user already joined
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const hasJoined = participantsData?.some(p => p.profile_id === session.user.id);
        const isHost = sessionData?.host_id === session.user.id;
        setAlreadyJoined(hasJoined || isHost);
      }

    } catch (error) {
      console.error("Error fetching mabar session:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memuat data sesi Mabar',
        confirmButtonColor: '#033671'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMabar = async () => {
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Diperlukan',
        text: 'Silakan login terlebih dahulu untuk bergabung dengan Mabar',
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

    // Check if already joined
    if (alreadyJoined) {
      Swal.fire({
        icon: 'info',
        title: 'Sudah Bergabung',
        text: 'Anda sudah terdaftar dalam sesi Mabar ini',
        confirmButtonColor: '#033671'
      });
      return;
    }

    // Check if session is full
    const currentParticipants = participants.length + 1; // +1 for host
    if (currentParticipants >= mabarSession.max_players) {
      Swal.fire({
        icon: 'error',
        title: 'Sesi Penuh',
        text: 'Maaf, sesi Mabar ini sudah penuh',
        confirmButtonColor: '#033671'
      });
      return;
    }

    setJoining(true);

    try {
      const user = session.user;

      // Request payment token from Midtrans
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: `MABAR-${id}`,
          gross_amount: mabarSession.price_per_player,
          customer_name: user.user_metadata?.full_name || user.email.split('@')[0],
          customer_email: user.email
        })
      });

      const { token } = await response.json();

      if (token) {
        // Open Midtrans Snap payment
        window.snap.pay(token, {
          onSuccess: async function(result) {
            // Insert into mabar_participants
            const { error: insertError } = await supabase
              .from('mabar_participants')
              .insert([{
                session_id: id,
                profile_id: user.id,
                payment_status: 'paid'
              }]);

            if (insertError) {
              console.error("Error inserting participant:", insertError);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Pembayaran berhasil tetapi gagal mencatat partisipasi. Hubungi admin.',
                confirmButtonColor: '#033671'
              });
              return;
            }

            // Success!
            Swal.fire({
              icon: 'success',
              title: 'Berhasil Bergabung!',
              text: 'Anda telah terdaftar dalam sesi Mabar ini.',
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
            setJoining(false);
          },
          
          onError: function(result) {
            Swal.fire({
              icon: 'error',
              title: 'Pembayaran Gagal',
              text: 'Terjadi kesalahan saat memproses pembayaran.',
              confirmButtonColor: '#e3342f'
            });
            setJoining(false);
          },
          
          onClose: function() {
            Swal.fire({
              icon: 'warning',
              title: 'Dibatalkan',
              text: 'Anda menutup jendela pembayaran.',
              confirmButtonColor: '#f6993f'
            });
            setJoining(false);
          }
        });
      } else {
        throw new Error('Failed to get payment token');
      }
    } catch (error) {
      console.error("Error joining mabar:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memproses pembayaran. Silakan coba lagi.',
        confirmButtonColor: '#033671'
      });
      setJoining(false);
    }
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#033671] mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat data sesi Mabar...</p>
        </div>
      </div>
    );
  }

  if (!mabarSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Sesi Tidak Ditemukan</h2>
          <p className="text-slate-500 mb-6">Sesi Mabar yang Anda cari tidak tersedia.</p>
          <button
            onClick={() => router.push('/mabar')}
            className="bg-[#033671] text-white px-6 py-3 rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors font-semibold"
          >
            Kembali ke Daftar Mabar
          </button>
        </div>
      </div>
    );
  }

  const totalParticipants = participants.length + 1; // +1 for host
  const slotsRemaining = mabarSession.max_players - totalParticipants;
  const progressPercentage = (totalParticipants / mabarSession.max_players) * 100;
  const isFull = totalParticipants >= mabarSession.max_players;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Button */}
        <button
          onClick={() => router.push('/mabar')}
          className="flex items-center gap-2 text-[#033671] hover:text-[#87dd70] font-semibold mb-6 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Daftar Mabar
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-[#033671] to-[#045299] p-6 text-white">
                <div className="flex items-start justify-between mb-3">
                  <span className="inline-block px-3 py-1 bg-[#87dd70] text-[#033671] text-xs font-bold rounded-full uppercase">
                    {mabarSession.booking?.facility?.category || 'Olahraga'}
                  </span>
                  <span className="inline-block px-3 py-1 bg-white bg-opacity-20 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    {mabarSession.skill_level}
                  </span>
                </div>
                <h1 className="text-3xl font-bold mb-2">{mabarSession.title}</h1>
                <p className="text-slate-200 text-sm">
                  Diselenggarakan oleh {mabarSession.host?.full_name || 'Host'}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {/* Venue */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase">Venue</p>
                    <p className="text-sm font-bold text-slate-800">
                      {mabarSession.booking?.facility?.name || 'Nama Lapangan'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {mabarSession.booking?.facility?.location || 'Lokasi'}
                    </p>
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-[#033671] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Jadwal</p>
                    <p className="text-sm font-bold text-slate-800">
                      {formatDate(mabarSession.booking?.start_time)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-4 h-4 text-slate-600" />
                      <p className="text-sm text-slate-600">
                        {formatTime(mabarSession.booking?.start_time)} - {formatTime(mabarSession.booking?.end_time)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Alert */}
                {mabarSession.booking?.status === 'confirmed' && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Sesi Dikonfirmasi</span>
                  </div>
                )}
              </div>
            </div>

            {/* Players List */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-[#033671] mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Pemain Terdaftar
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Host */}
                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-[#033671] to-[#045299] rounded-lg text-white">
                  <div className="w-10 h-10 bg-[#87dd70] text-[#033671] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {getInitials(mabarSession.host?.full_name || 'Host')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {mabarSession.host?.full_name || 'Host'}
                    </p>
                    <span className="text-xs bg-[#87dd70] text-[#033671] px-2 py-0.5 rounded-full font-bold">
                      HOST
                    </span>
                  </div>
                </div>

                {/* Participants */}
                {participants.map((participant) => (
                  <div 
                    key={participant.id} 
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="w-10 h-10 bg-[#033671] text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                      {getInitials(participant.profile?.full_name || 'Pemain')}
                    </div>
                    <p className="text-sm font-semibold text-slate-700 truncate min-w-0">
                      {participant.profile?.full_name || 'Pemain'}
                    </p>
                  </div>
                ))}

                {/* Empty Slots */}
                {Array.from({ length: slotsRemaining }).map((_, index) => (
                  <div 
                    key={`empty-${index}`}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-dashed border-slate-300"
                  >
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-sm text-slate-400 font-medium">Slot Kosong</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar - Join Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-[#033671] sticky top-6">
              
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-slate-700">Pemain Terdaftar</span>
                  <span className={`text-2xl font-bold ${isFull ? 'text-red-500' : 'text-[#033671]'}`}>
                    {totalParticipants}/{mabarSession.max_players}
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
                  {isFull ? 'Sesi penuh' : `${slotsRemaining} slot tersisa`}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6 p-4 bg-gradient-to-br from-[#87dd70] to-[#6bc557] rounded-lg text-center">
                <p className="text-sm text-[#033671] font-semibold mb-1">Biaya per Pemain</p>
                <p className="text-3xl font-bold text-[#033671]">
                  {formatPrice(mabarSession.price_per_player)}
                </p>
              </div>

              {/* Join Button */}
              {alreadyJoined ? (
                <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-green-700">Anda Sudah Terdaftar</p>
                </div>
              ) : isFull ? (
                <button
                  disabled
                  className="w-full py-4 bg-slate-300 text-slate-500 font-bold rounded-lg cursor-not-allowed"
                >
                  Sesi Penuh
                </button>
              ) : (
                <button
                  onClick={handleJoinMabar}
                  disabled={joining}
                  className="w-full py-4 bg-[#033671] hover:bg-[#87dd70] hover:text-[#033671] text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {joining ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Memproses...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Join & Bayar Patungan
                    </>
                  )}
                </button>
              )}

              {/* Info */}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="text-sm font-bold text-[#033671] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Informasi
                </h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="text-[#87dd70] font-bold">•</span>
                    <span>Pembayaran langsung dikonfirmasi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#87dd70] font-bold">•</span>
                    <span>Datang 15 menit sebelum waktu mulai</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#87dd70] font-bold">•</span>
                    <span>Bawa perlengkapan olahraga pribadi</span>
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

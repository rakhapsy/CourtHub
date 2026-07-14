"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle, PlusCircle, X, MapPin, Trophy, Calendar, Users, 
  DollarSign, Lock, Crown, AlertCircle, TrendingUp, BarChart3,
  Download, Tag, Percent, Zap, Eye, EyeOff 
} from "lucide-react";
import { useRouter } from "next/navigation";
import Swal from 'sweetalert2';

export default function AdminDashboard() {
  // State Management
  const [activeTab, setActiveTab] = useState("facilities");
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const router = useRouter();

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFacility, setNewFacility] = useState({ 
    name: "", category: "Futsal", price_per_hour: "", location: "" 
  });

  // Promo Form State
  const [promoForm, setPromoForm] = useState({
    facility_id: "",
    promo_code: "",
    discount_percentage: "",
    valid_until: ""
  });

  // Helper Functions
  const isPlanYearly = () => subscription?.plan_name?.includes("Tahunan");
  const isPlanMonthly = () => subscription?.plan_name?.includes("Bulanan");
  const getFacilityLimit = () => isPlanYearly() ? 10 : 5;
  const isAtLimit = () => facilities.length >= getFacilityLimit();

  // Fetch Dashboard Data
  const fetchDashboardData = async (userId) => {
    setLoading(true);
    
    // Fetch Facilities
    const { data: facilitiesData } = await supabase
      .from("facilities")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (facilitiesData) setFacilities(facilitiesData);

    // Fetch Bookings
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select(`
        *,
        facilities!inner(name, owner_id),
        profiles(full_name)
      `)
      .eq("facilities.owner_id", userId)
      .order("start_time", { ascending: false });

    if (bookingsData) setBookings(bookingsData);

    // Fetch Promotions (if yearly plan)
    if (facilitiesData && facilitiesData.length > 0) {
      const facilityIds = facilitiesData.map(f => f.id);
      const { data: promosData } = await supabase
        .from("promotions")
        .select(`
          *,
          facility:facilities(name)
        `)
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false });

      if (promosData) setPromotions(promosData);
    }

    setLoading(false);
  };

  // Initialize
  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "partner") {
        router.push("/");
        return;
      }

      setUser(session.user);

      // Fetch subscription
      const { data: subscriptionData } = await supabase
        .from("partner_subscriptions")
        .select("*")
        .eq("partner_id", session.user.id)
        .single();

      setSubscription(subscriptionData);

      if (subscriptionData) {
        const now = new Date();
        const validUntil = new Date(subscriptionData.valid_until);
        const isActive = subscriptionData.status === 'active' && validUntil > now;
        setIsSubscriptionActive(isActive);

        if (isActive) {
          fetchDashboardData(session.user.id);
        } else {
          setLoading(false);
        }
      } else {
        setIsSubscriptionActive(false);
        setLoading(false);
      }
    };
    initData();
  }, [router]);

  // Handlers
  const handleAddFacility = async (e) => {
    e.preventDefault();
    
    if (isAtLimit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Limit Tercapai',
        text: `Anda sudah mencapai batas maksimal ${getFacilityLimit()} fasilitas`,
        confirmButtonColor: '#033671'
      });
      return;
    }

    const { error } = await supabase.from("facilities").insert({
      name: newFacility.name,
      category: newFacility.category,
      price_per_hour: parseInt(newFacility.price_per_hour),
      location: newFacility.location,
      owner_id: user.id,
      is_active: true
    });

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal menambahkan fasilitas',
        confirmButtonColor: '#033671'
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Fasilitas berhasil ditambahkan',
        confirmButtonColor: '#033671'
      });
      setIsModalOpen(false);
      setNewFacility({ name: "", category: "Futsal", price_per_hour: "", location: "" });
      fetchDashboardData(user.id);
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("promotions").insert({
      facility_id: promoForm.facility_id,
      promo_code: promoForm.promo_code.toUpperCase(),
      discount_percentage: parseInt(promoForm.discount_percentage),
      valid_until: promoForm.valid_until
    });

    if (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal membuat kode promo',
        confirmButtonColor: '#033671'
      });
    } else {
      Swal.fire({
        icon: 'success',
        title: 'Promo Dibuat!',
        text: 'Kode promo berhasil dibuat',
        confirmButtonColor: '#033671'
      });
      setPromoForm({
        facility_id: "",
        promo_code: "",
        discount_percentage: "",
        valid_until: ""
      });
      fetchDashboardData(user.id);
    }
  };

  const markAsPaid = async (bookingId) => {
    const { error } = await supabase
      .from("bookings")
      .update({ payment_status: "paid", status: "confirmed" })
      .eq("id", bookingId);

    if (!error) {
      fetchDashboardData(user.id);
    }
  };

  // Analytics Calculations
  const calculateMonthlyRevenue = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return bookings
      .filter(b => {
        const bookingDate = new Date(b.created_at);
        return bookingDate.getMonth() === currentMonth && 
               bookingDate.getFullYear() === currentYear &&
               b.payment_status === 'paid';
      })
      .reduce((sum, b) => sum + (b.total_price || 0), 0);
  };

  const calculateMonthlyBookings = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return bookings.filter(b => {
      const bookingDate = new Date(b.created_at);
      return bookingDate.getMonth() === currentMonth && 
             bookingDate.getFullYear() === currentYear;
    }).length;
  };

  const downloadMonthlyReport = () => {
    // Create CSV content
    const csv = [
      ['Tanggal', 'Fasilitas', 'Pemesan', 'Harga', 'Status'],
      ...bookings.map(b => [
        new Date(b.start_time).toLocaleString('id-ID'),
        b.facilities?.name || '',
        b.profiles?.full_name || 'N/A',
        b.total_price || 0,
        b.payment_status === 'paid' ? 'Lunas' : 'Pending'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Loading State
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Memuat dashboard...
      </div>
    );
  }

  // Locked Dashboard State
  if (!isSubscriptionActive) {
    const isExpired = subscription && new Date(subscription.valid_until) < new Date();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-[#033671]">
            <div className="bg-gradient-to-r from-[#033671] to-[#045299] p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
                <Lock className="w-10 h-10 text-[#033671]" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Dashboard Terkunci
              </h1>
              <p className="text-slate-200">
                {isExpired 
                  ? 'Langganan Anda telah berakhir' 
                  : 'Anda belum berlangganan'}
              </p>
            </div>

            <div className="p-8 space-y-6">
              {isExpired && subscription && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Langganan Anda berakhir pada:
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {new Date(subscription.valid_until).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="text-center py-6">
                <Crown className="w-16 h-16 text-[#87dd70] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#033671] mb-3">
                  Aktifkan Langganan Premium
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  Untuk mengakses Dashboard Mitra dan mengelola fasilitas, booking, serta turnamen Anda, 
                  silakan aktifkan atau perpanjang langganan premium CourtHub.
                </p>
              </div>

              <button
                onClick={() => router.push('/admin')}
                className="w-full py-4 bg-gradient-to-r from-[#033671] to-[#045299] text-white font-bold text-lg rounded-xl hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3 group"
              >
                <Crown className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {isExpired ? 'Perpanjang Langganan Sekarang' : 'Aktifkan Langganan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard (Active Subscription)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Subscription Badge */}
      {subscription && (
        <div className="mb-6 p-4 bg-gradient-to-r from-[#87dd70] to-[#6bc557] rounded-xl shadow-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-[#033671]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#033671]">
                {subscription.plan_name} • <span className="font-bold">AKTIF</span>
              </p>
              <p className="text-xs text-[#033671]">
                Berlaku sampai: <span className="font-bold">
                  {new Date(subscription.valid_until).toLocaleDateString('id-ID')}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-white text-[#033671] font-semibold text-sm rounded-lg hover:bg-[#033671] hover:text-white transition-colors"
          >
            Upgrade/Perpanjang
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#033671]">Dashboard Mitra</h1>
          <p className="text-slate-500 mt-1">Kelola bisnis olahraga Anda</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap space-x-1 border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab("facilities")}
          className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors ${
            activeTab === "facilities" 
              ? "bg-[#033671] text-white" 
              : "text-gray-500 hover:text-[#033671]"
          }`}
        >
          Fasilitas Saya
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors ${
            activeTab === "bookings" 
              ? "bg-[#033671] text-white" 
              : "text-gray-500 hover:text-[#033671]"
          }`}
        >
          Daftar Booking
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "analytics" 
              ? "bg-[#033671] text-white" 
              : "text-gray-500 hover:text-[#033671]"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics & Laporan
        </button>
        <button
          onClick={() => setActiveTab("promotions")}
          className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "promotions" 
              ? "bg-[#033671] text-white" 
              : "text-gray-500 hover:text-[#033671]"
          }`}
        >
          <Tag className="w-4 h-4" />
          Promosi & Diskon
          {isPlanYearly() && (
            <span className="px-2 py-0.5 bg-[#87dd70] text-[#033671] text-xs font-bold rounded-full">
              PRO
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: FASILITAS SAYA */}
      {activeTab === "facilities" && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">
                {facilities.length} / {getFacilityLimit()} fasilitas digunakan
              </p>
              <div className="w-64 h-2 bg-slate-200 rounded-full mt-2">
                <div 
                  className="h-2 bg-[#87dd70] rounded-full transition-all"
                  style={{ width: `${(facilities.length / getFacilityLimit()) * 100}%` }}
                />
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              disabled={isAtLimit()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm ${
                isAtLimit()
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#033671] text-white hover:bg-[#87dd70] hover:text-[#033671]'
              }`}
            >
              <PlusCircle className="w-5 h-5" />
              {isAtLimit() ? `Limit Tercapai (Max ${getFacilityLimit()})` : 'Tambah Fasilitas'}
            </button>
          </div>

          {facilities.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <MapPin className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">Belum ada fasilitas</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-[#033671] font-bold hover:underline"
              >
                + Tambah Fasilitas Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map((facility) => (
                <div key={facility.id} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-bold text-[#033671]">{facility.name}</h2>
                    <span className="bg-[#87dd70]/20 text-[#033671] text-xs px-3 py-1 rounded-full font-bold">
                      {facility.category}
                    </span>
                  </div>
                  <div className="flex items-center text-slate-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1 text-[#87dd70]" />
                    {facility.location}
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-[#033671] font-black text-xl">
                      Rp {facility.price_per_hour.toLocaleString("id-ID")} 
                      <span className="text-slate-400 text-sm font-medium ml-1">/ Jam</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAFTAR BOOKING */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b font-semibold text-gray-700">
            Daftar Booking Masuk
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#033671] text-white">
                  <th className="py-4 px-6 font-semibold text-sm">Pemesan</th>
                  <th className="py-4 px-6 font-semibold text-sm">Fasilitas</th>
                  <th className="py-4 px-6 font-semibold text-sm">Waktu</th>
                  <th className="py-4 px-6 font-semibold text-sm">Harga</th>
                  <th className="py-4 px-6 font-semibold text-sm">Status</th>
                  <th className="py-4 px-6 font-semibold text-sm">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-gray-500">
                      Belum ada booking
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="py-4 px-6 text-sm">
                        {booking.profiles?.full_name || "N/A"}
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-[#033671]">
                        {booking.facilities?.name}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {new Date(booking.start_time).toLocaleString("id-ID")}
                      </td>
                      <td className="py-4 px-6 text-sm font-semibold">
                        Rp {booking.total_price?.toLocaleString("id-ID")}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.payment_status === "paid" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {booking.payment_status === "paid" ? "Lunas" : "Pending"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        {booking.payment_status !== "paid" && (
                          <button
                            onClick={() => markAsPaid(booking.id)}
                            className="px-3 py-1.5 bg-[#87dd70] text-white text-xs font-semibold rounded"
                          >
                            Tandai Lunas
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ANALYTICS & LAPORAN */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Basic Analytics */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl font-bold text-[#033671] mb-6">
              Analytics Dasar
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-6 bg-gradient-to-br from-[#033671] to-[#045299] rounded-xl text-white">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-8 h-8" />
                  <p className="text-sm opacity-90">Pendapatan Bulan Ini</p>
                </div>
                <p className="text-3xl font-bold">
                  Rp {calculateMonthlyRevenue().toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-6 bg-gradient-to-br from-[#87dd70] to-[#6bc557] rounded-xl text-[#033671]">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-8 h-8" />
                  <p className="text-sm font-semibold">Total Booking Bulan Ini</p>
                </div>
                <p className="text-3xl font-bold">
                  {calculateMonthlyBookings()} Booking
                </p>
              </div>
            </div>
            <button
              onClick={downloadMonthlyReport}
              className="flex items-center gap-2 px-6 py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Laporan Bulanan (CSV)
            </button>
          </div>

          {/* Advanced Analytics (Yearly Only) */}
          <div className={`bg-white rounded-xl shadow-sm border p-6 relative ${
            !isPlanYearly() ? 'overflow-hidden' : ''
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#033671]">
                Analytics Advanced
              </h2>
              {isPlanYearly() && (
                <span className="px-3 py-1 bg-[#87dd70] text-[#033671] text-xs font-bold rounded-full">
                  PAKET TAHUNAN
                </span>
              )}
            </div>

            {isPlanYearly() ? (
              <div className="space-y-6">
                <div className="h-64 bg-slate-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Grafik Pendapatan Tahunan</p>
                    <p className="text-sm text-slate-400 mt-2">Placeholder - Implementasi Chart</p>
                  </div>
                </div>
                <button
                  onClick={downloadMonthlyReport}
                  className="flex items-center gap-2 px-6 py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download Laporan Tahunan (CSV)
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="blur-sm select-none pointer-events-none">
                  <div className="h-64 bg-slate-200 rounded-lg" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white rounded-xl shadow-2xl p-8 text-center max-w-md border-4 border-[#87dd70]">
                    <Lock className="w-12 h-12 text-[#033671] mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-[#033671] mb-2">
                      Upgrade ke Paket Tahunan
                    </h3>
                    <p className="text-slate-600 mb-4">
                      Akses Analytics Lanjutan dan fitur premium lainnya
                    </p>
                    <button
                      onClick={() => router.push('/admin')}
                      className="px-6 py-3 bg-[#033671] text-white font-bold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
                    >
                      Upgrade Sekarang
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

            {/* TAB 4: PROMOSI & DISKON */}
      {activeTab === "promotions" && (
        <div>
          {!isPlanYearly() ? (
            // MONTHLY PLAN - UPSELL UI
            <div className="bg-white rounded-xl shadow-2xl p-12 text-center border-4 border-[#87dd70]">
              <Lock className="w-20 h-20 text-[#033671] mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-[#033671] mb-4">
                Fitur Premium
              </h2>
              <p className="text-lg text-slate-600 mb-2">
                Fitur Promosi & Diskon hanya tersedia di Paket Tahunan
              </p>
              <p className="text-sm text-slate-500 mb-8">
                Buat kode promo, kelola diskon, dan tingkatkan penjualan Anda
              </p>
              
              <div className="bg-slate-50 rounded-xl p-6 mb-8 max-w-md mx-auto">
                <h3 className="font-bold text-[#033671] mb-4">Fitur yang Anda dapatkan:</h3>
                <ul className="space-y-2 text-sm text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#87dd70]" />
                    <span>Buat kode promo unlimited</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#87dd70]" />
                    <span>Atur diskon per fasilitas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#87dd70]" />
                    <span>Kelola masa berlaku promo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#87dd70]" />
                    <span>Analytics penggunaan promo</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => router.push('/admin')}
                className="px-8 py-4 bg-gradient-to-r from-[#033671] to-[#045299] text-white font-bold text-lg rounded-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 mx-auto"
              >
                <Zap className="w-6 h-6" />
                Upgrade Sekarang
              </button>
              
              <p className="text-xs text-slate-500 mt-4">
                Hemat 20% dengan paket tahunan • Rp 1.108.800/tahun
              </p>
            </div>
          ) : (
            // YEARLY PLAN - PROMO MANAGEMENT
            <div className="space-y-6">
              
              {/* Create Promo Form */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#87dd70] rounded-lg flex items-center justify-center">
                    <Tag className="w-6 h-6 text-[#033671]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#033671]">Buat Kode Promo Baru</h2>
                    <p className="text-sm text-slate-500">Tarik lebih banyak pelanggan dengan diskon menarik</p>
                  </div>
                </div>

                <form onSubmit={handleCreatePromo} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Facility Dropdown */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Fasilitas *
                      </label>
                      <select
                        required
                        value={promoForm.facility_id}
                        onChange={(e) => setPromoForm({...promoForm, facility_id: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-[#87dd70] outline-none bg-white"
                      >
                        <option value="">Pilih Fasilitas</option>
                        {facilities.map((facility) => (
                          <option key={facility.id} value={facility.id}>
                            {facility.name} ({facility.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Promo Code */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Kode Promo *
                      </label>
                      <input
                        required
                        type="text"
                        maxLength={20}
                        value={promoForm.promo_code}
                        onChange={(e) => setPromoForm({...promoForm, promo_code: e.target.value.toUpperCase()})}
                        placeholder="e.g., DISKON50"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-[#87dd70] outline-none uppercase"
                      />
                    </div>

                    {/* Discount Percentage */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Diskon (%) *
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min="1"
                          max="100"
                          value={promoForm.discount_percentage}
                          onChange={(e) => setPromoForm({...promoForm, discount_percentage: e.target.value})}
                          placeholder="10"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-[#87dd70] outline-none"
                        />
                        <Percent className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                      </div>
                    </div>

                    {/* Valid Until */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Berlaku Sampai *
                      </label>
                      <input
                        required
                        type="date"
                        value={promoForm.valid_until}
                        onChange={(e) => setPromoForm({...promoForm, valid_until: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-[#87dd70] outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full md:w-auto px-8 py-3 bg-[#033671] text-white font-bold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors flex items-center justify-center gap-2"
                  >
                    <Tag className="w-5 h-5" />
                    Buat Kode Promo
                  </button>
                </form>
              </div>

              {/* Active Promos List */}
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 bg-slate-50 border-b font-semibold text-gray-700 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-[#033671]" />
                  Kode Promo Aktif
                </div>

                {promotions.length === 0 ? (
                  <div className="text-center py-12">
                    <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Belum ada kode promo</p>
                    <p className="text-sm text-gray-400">Buat kode promo pertama Anda menggunakan form di atas</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {promotions.map((promo) => {
                      const isExpired = new Date(promo.valid_until) < new Date();
                      return (
                        <div key={promo.id} className="p-6 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="px-4 py-2 bg-[#033671] text-white font-mono font-bold text-lg rounded-lg">
                                  {promo.promo_code}
                                </div>
                                <div className="flex items-center gap-2 px-3 py-1 bg-[#87dd70] text-[#033671] rounded-full">
                                  <Percent className="w-4 h-4" />
                                  <span className="font-bold">{promo.discount_percentage}% OFF</span>
                                </div>
                                {isExpired && (
                                  <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                                    Expired
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mb-1">
                                <span className="font-semibold">Fasilitas:</span> {promo.facility?.name}
                              </p>
                              <p className="text-sm text-slate-600">
                                <span className="font-semibold">Berlaku sampai:</span>{' '}
                                {new Date(promo.valid_until).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Facility Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-[#033671]">Tambah Fasilitas Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddFacility} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Fasilitas</label>
                <input 
                  required 
                  type="text" 
                  value={newFacility.name} 
                  onChange={(e) => setNewFacility({...newFacility, name: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-[#87dd70] focus:border-[#87dd70] outline-none" 
                  placeholder="Lapangan Futsal A" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select 
                  value={newFacility.category} 
                  onChange={(e) => setNewFacility({...newFacility, category: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-[#87dd70] focus:border-[#87dd70] outline-none"
                >
                  <option value="Futsal">Futsal</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Basket">Basket</option>
                  <option value="Voli">Voli</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga per Jam (Rp)</label>
                <input 
                  required 
                  type="number" 
                  value={newFacility.price_per_hour} 
                  onChange={(e) => setNewFacility({...newFacility, price_per_hour: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-[#87dd70] focus:border-[#87dd70] outline-none" 
                  placeholder="150000" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                <input 
                  required 
                  type="text" 
                  value={newFacility.location} 
                  onChange={(e) => setNewFacility({...newFacility, location: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-md focus:ring-[#87dd70] focus:border-[#87dd70] outline-none" 
                  placeholder="Alamat lengkap..." 
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full bg-[#033671] text-white py-3 rounded-md font-bold hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
                >
                  Simpan Fasilitas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

                

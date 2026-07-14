"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Calendar, LayoutDashboard, Trophy, Tag, TrendingUp, Lock, Plus, X } from "lucide-react";
import Swal from 'sweetalert2';

export default function PartnerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [activeTab, setActiveTab] = useState("facilities");

  // Data states
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [promotions, setPromotions] = useState([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingFacilityId, setEditingFacilityId] = useState(null);
  const [newFacility, setNewFacility] = useState({ 
    name: "", 
    category: "Futsal", 
    price_per_hour: "", 
    location: "" 
  });

  // Promo form state
  const [promoForm, setPromoForm] = useState({
    facility_id: "",
    promo_code: "",
    discount_percentage: "",
    valid_until: ""
  });

  // Helper functions
  const isPlanYearly = () => {
    return subscription?.plan_name?.includes("Tahunan");
  };

  const isPlanMonthly = () => {
    return subscription?.plan_name?.includes("Bulanan");
  };

  const getFacilityLimit = () => {
    return isPlanYearly() ? 10 : 5;
  };

  const isAtLimit = () => {
    return facilities.length >= getFacilityLimit();
  };

  const calculateMonthlyRevenue = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return bookings
      .filter(b => {
        const bookingDate = new Date(b.created_at.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '').replace(/\+\d{2}$/, ''));
        return b.payment_status === 'paid' && bookingDate >= monthStart;
      })
      .reduce((sum, b) => sum + (b.total_price || 0), 0);
  };

  const calculateMonthlyBookings = () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return bookings.filter(b => {
      const bookingDate = new Date(b.created_at.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '').replace(/\+\d{2}$/, ''));
      return bookingDate >= monthStart;
    }).length;
  };

  const downloadMonthlyReport = () => {
    const now = new Date();
    const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyBookings = bookings.filter(b => {
      const bookingDate = new Date(b.created_at.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '').replace(/\+\d{2}$/, ''));
      return bookingDate >= monthStart;
    });
    
    let csv = "Tanggal,Fasilitas,Status,Total Harga,Status Pembayaran\\n";
    monthlyBookings.forEach(b => {
      const facility = facilities.find(f => f.id === b.facility_id);
      const cleanDate = b.created_at.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '').replace(/\+\d{2}$/, '');
      csv += `${new Date(cleanDate).toLocaleDateString('id-ID')},${facility?.name || 'N/A'},${b.status},${b.total_price},${b.payment_status}\\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan-Bulanan-${monthName}.csv`;
    a.click();
  };

  // Fetch dashboard data
  const fetchDashboardData = async (partnerId) => {
    // Fetch facilities
    const { data: facilitiesData } = await supabase
      .from("facilities")
      .select("*")
      .eq("owner_id", partnerId)
      .order("created_at", { ascending: false });
    
    if (facilitiesData) setFacilities(facilitiesData);

    // Fetch bookings
    const facilityIds = facilitiesData?.map(f => f.id) || [];
    if (facilityIds.length > 0) {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false });
      
      if (bookingsData) setBookings(bookingsData);

      // Fetch Promotions
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
    
    if (!isEditMode && isAtLimit()) {
      Swal.fire({
        icon: 'warning',
        title: 'Limit Tercapai',
        text: `Anda sudah mencapai batas maksimal ${getFacilityLimit()} fasilitas`,
        confirmButtonColor: '#033671'
      });
      return;
    }

    if (isEditMode) {
      // Update existing facility
      const { error } = await supabase
        .from("facilities")
        .update({
          name: newFacility.name,
          category: newFacility.category,
          price_per_hour: parseInt(newFacility.price_per_hour),
          location: newFacility.location,
        })
        .eq("id", editingFacilityId);

      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal mengupdate fasilitas',
          confirmButtonColor: '#033671'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Fasilitas berhasil diupdate',
          confirmButtonColor: '#033671'
        });
        closeModal();
        fetchDashboardData(user.id);
      }
    } else {
      // Add new facility
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
        closeModal();
        fetchDashboardData(user.id);
      }
    }
  };

  const handleEditFacility = (facility) => {
    setIsEditMode(true);
    setEditingFacilityId(facility.id);
    setNewFacility({
      name: facility.name,
      category: facility.category,
      price_per_hour: facility.price_per_hour.toString(),
      location: facility.location
    });
    setIsModalOpen(true);
  };

  const handleDeleteFacility = async (facilityId, facilityName) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Fasilitas?',
      text: `Apakah Anda yakin ingin menghapus "${facilityName}"? Tindakan ini tidak dapat dibatalkan.`,
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#033671',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      const { error } = await supabase
        .from("facilities")
        .delete()
        .eq("id", facilityId);

      if (error) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menghapus fasilitas',
          confirmButtonColor: '#033671'
        });
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Terhapus!',
          text: 'Fasilitas berhasil dihapus',
          confirmButtonColor: '#033671'
        });
        fetchDashboardData(user.id);
      }
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingFacilityId(null);
    setNewFacility({ name: "", category: "Futsal", price_per_hour: "", location: "" });
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
        title: 'Berhasil!',
        text: 'Kode promo berhasil dibuat',
        confirmButtonColor: '#033671'
      });
      setPromoForm({ facility_id: "", promo_code: "", discount_percentage: "", valid_until: "" });
      fetchDashboardData(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#033671] mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  // GATEKEEPING: If no active subscription, show locked UI
  if (!isSubscriptionActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border-2 border-red-200">
          <Lock className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#033671] mb-3">Dashboard Terkunci</h2>
          <p className="text-gray-600 mb-6">
            {subscription 
              ? "Langganan Anda telah berakhir. Silakan perpanjang untuk melanjutkan."
              : "Anda belum memiliki langganan aktif. Silakan berlangganan untuk mengakses dashboard."
            }
          </p>
          <button
            onClick={() => router.push("/admin/subscribe")}
            className="w-full py-3 bg-[#033671] text-white font-bold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
          >
            Aktifkan Langganan Sekarang
          </button>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD UI (If subscription is active)
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#033671]">Dashboard Mitra</h1>
              <p className="text-sm text-gray-500">Kelola fasilitas dan booking Anda</p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-xs text-gray-600">Paket: <span className="font-bold text-[#033671]">{subscription.plan_name}</span></p>
                  <p className="text-xs text-gray-500">Aktif sampai: {new Date(subscription.valid_until).toLocaleDateString('id-ID')}</p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin/subscribe")}
                className="mt-2 ml-2 gap-2 px-4 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap bg-[#033671] text-white hover:bg-[#87dd70] hover:text-[#033671]"
              >
                Perpanjang
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b mt-5 border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab("facilities")}
              className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "facilities" 
                  ? "bg-[#033671] text-white" 
                  : "text-gray-500 hover:text-[#033671]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Fasilitas Saya
            </button>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "bookings" 
                  ? "bg-[#033671] text-white" 
                  : "text-gray-500 hover:text-[#033671]"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Daftar Booking
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "analytics" 
                  ? "bg-[#033671] text-white" 
                  : "text-gray-500 hover:text-[#033671]"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Analytics & Laporan
            </button>
            <button
              onClick={() => setActiveTab("promotions")}
              className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "promotions" 
                  ? "bg-[#033671] text-white" 
                  : "text-gray-500 hover:text-[#033671]"
              }`}
            >
              <Tag className="w-4 h-4" />
              Promosi & Diskon
              {!isPlanYearly() && (
                <Lock className="w-3 h-3 text-yellow-500" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TAB 1: FASILITAS SAYA */}
        {activeTab === "facilities" && (
          <div>
            {/* Progress Bar */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 mb-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Penggunaan Slot Fasilitas</h3>
                <span className="text-sm font-bold text-[#033671]">
                  {facilities.length} / {getFacilityLimit()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-[#87dd70] h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(facilities.length / getFacilityLimit()) * 100}%` }}
                ></div>
              </div>
              {isAtLimit() && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ Anda telah mencapai batas maksimal. Upgrade paket untuk menambah fasilitas.
                </p>
              )}
            </div>

            {/* Add Facility Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={isAtLimit()}
              className={`mb-6 flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                isAtLimit()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-[#033671] text-white hover:bg-[#87dd70] hover:text-[#033671]"
              }`}
            >
              <Plus className="w-5 h-5" />
              {isAtLimit() ? `Limit Tercapai (Max ${getFacilityLimit()})` : "Tambah Fasilitas"}
            </button>

            {/* Facilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map((facility) => (
                <div key={facility.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-[#033671]">{facility.name}</h3>
                    <span className="px-3 py-1 bg-[#87dd70]/20 text-[#033671] text-xs font-semibold rounded-full">
                      {facility.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{facility.location}</p>
                  <p className="text-2xl font-bold text-[#87dd70] mb-4">
                    Rp {facility.price_per_hour.toLocaleString('id-ID')}
                    <span className="text-sm text-gray-500 font-normal"> /jam</span>
                  </p>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleEditFacility(facility)}
                      className="flex-1 px-4 py-2 bg-blue-50 text-blue-600 font-semibold text-sm rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteFacility(facility.id, facility.name)}
                      className="flex-1 px-4 py-2 bg-red-50 text-red-600 font-semibold text-sm rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {facilities.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <LayoutDashboard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada fasilitas. Klik tombol di atas untuk menambah.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DAFTAR BOOKING */}
        {activeTab === "bookings" && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fasilitas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bookings.map((booking) => {
                    const facility = facilities.find(f => f.id === booking.facility_id);
                    return (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(booking.created_at.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '').replace(/\+\d{2}$/, '')).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#033671]">
                          {facility?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(booking.start_time.replace(/Z$/, '').replace(/\+\d{2}:\d{2}$/, '').replace(/\+\d{2}$/, '')).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          Rp {booking.total_price.toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.payment_status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.payment_status === 'paid' ? 'Lunas' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {bookings.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada booking</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ANALYTICS & LAPORAN */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Basic Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Pendapatan Bulan Ini</h3>
                <p className="text-3xl font-bold text-[#033671]">
                  Rp {calculateMonthlyRevenue().toLocaleString('id-ID')}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Booking Bulan Ini</h3>
                <p className="text-3xl font-bold text-[#033671]">
                  {calculateMonthlyBookings()} Booking
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-[#033671] mb-4">Laporan Bulanan</h3>
              <button
                onClick={downloadMonthlyReport}
                className="px-6 py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
              >
                Download Laporan Bulanan (CSV)
              </button>
            </div>

            {/* Advanced Analytics (Yearly Only) */}
            {isPlanYearly() ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-bold text-[#033671] mb-4">Analytics Advanced</h3>
                <div className="bg-gray-100 rounded-lg p-8 text-center">
                  <TrendingUp className="w-16 h-16 text-[#033671] mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Grafik Pendapatan Tahunan</p>
                  <button className="px-6 py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors">
                    Download Laporan Tahunan (CSV)
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative bg-white rounded-lg shadow-sm border-2 border-yellow-200 p-6 overflow-hidden">
                <div className="absolute inset-0 bg-gray-200/60 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="bg-white rounded-xl p-8 shadow-xl text-center max-w-md border-2 border-yellow-300">
                    <Lock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-[#033671] mb-2">Fitur Premium</h4>
                    <p className="text-gray-600 mb-4">
                      Analytics Advanced hanya tersedia di Paket Tahunan
                    </p>
                    <button
                      onClick={() => router.push("/admin/subscribe")}
                      className="px-6 py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
                    >
                      Upgrade ke Paket Tahunan
                    </button>
                  </div>
                </div>
                <div className="blur-sm">
                  <h3 className="text-lg font-bold text-[#033671] mb-4">Analytics Advanced</h3>
                  <div className="bg-gray-100 rounded-lg p-8">
                    <p className="text-gray-600">Grafik Pendapatan Tahunan</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROMOSI & DISKON */}
        {activeTab === "promotions" && (
          <div>
            {!isPlanYearly() ? (
              // Upsell UI for Monthly Plan
              <div className="bg-white rounded-xl shadow-lg border-2 border-yellow-200 p-8 text-center">
                <Lock className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-[#033671] mb-3">Fitur Promosi & Diskon</h3>
                <p className="text-gray-600 mb-6">
                  Fitur ini hanya tersedia untuk Paket Tahunan
                </p>
                <div className="bg-[#87dd70]/10 rounded-lg p-6 mb-6 text-left">
                  <h4 className="font-bold text-[#033671] mb-3">Keuntungan Fitur Promosi:</h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#87dd70] rounded-full"></div>
                      Buat kode promo unlimited
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#87dd70] rounded-full"></div>
                      Atur diskon per fasilitas
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#87dd70] rounded-full"></div>
                      Tingkatkan booking hingga 3x lipat
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-[#87dd70] rounded-full"></div>
                      Tarik lebih banyak pelanggan dengan diskon strategis
                    </li>
                  </ul>
                </div>
                <button
                  onClick={() => router.push("/admin/subscribe")}
                  className="w-full py-4 bg-[#033671] text-white font-bold text-lg rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
                >
                  Upgrade Sekarang
                </button>
              </div>
            ) : (
              // Promo Management for Yearly Plan
              <div className="space-y-6">
                {/* Create Promo Form */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-[#033671] mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Buat Kode Promo Baru
                  </h3>
                  <form onSubmit={handleCreatePromo} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Fasilitas</label>
                        <select
                          required
                          value={promoForm.facility_id}
                          onChange={(e) => setPromoForm({...promoForm, facility_id: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                        >
                          <option value="">-- Pilih Fasilitas --</option>
                          {facilities.map(f => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Kode Promo</label>
                        <input
                          type="text"
                          required
                          maxLength={20}
                          value={promoForm.promo_code}
                          onChange={(e) => setPromoForm({...promoForm, promo_code: e.target.value.toUpperCase()})}
                          placeholder="DISKON50"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none font-mono text-gray-900 placeholder:text-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Diskon (%)</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="100"
                          value={promoForm.discount_percentage}
                          onChange={(e) => setPromoForm({...promoForm, discount_percentage: e.target.value})}
                          placeholder="50"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Berlaku Hingga</label>
                        <input
                          type="date"
                          required
                          value={promoForm.valid_until}
                          onChange={(e) => setPromoForm({...promoForm, valid_until: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
                    >
                      Buat Kode Promo
                    </button>
                  </form>
                </div>

                {/* Promo List */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-[#033671] mb-4">Daftar Kode Promo Aktif</h3>

                  {promotions.length === 0 ? (
                    <div className="text-center py-12">
                      <Tag className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                      <p className="text-gray-500">Belum ada promo. Buat kode promo pertama Anda di atas.</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {promotions.map((promo) => {
                        const isExpired = new Date(promo.valid_until) < new Date();
                        return (
                          <div key={promo.id} className="py-4 flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-[#87dd70]/20 rounded-lg flex items-center justify-center">
                                  <Tag className="w-6 h-6 text-[#033671]" />
                                </div>
                                <div>
                                  <p className="font-mono font-bold text-[#033671] text-lg">{promo.promo_code}</p>
                                  <p className="text-sm text-gray-600">{promo.facility.name}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <span className="inline-flex items-center px-4 py-2 bg-[#87dd70] text-white font-bold rounded-full text-sm">
                                  {promo.discount_percentage}% OFF
                                </span>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Berlaku hingga:</p>
                                <p className="text-sm font-semibold text-gray-700">
                                  {new Date(promo.valid_until).toLocaleDateString('id-ID')}
                                </p>
                                {isExpired && (
                                  <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-600 text-xs font-semibold rounded">
                                    Expired
                                  </span>
                                )}
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
      </div>

      {/* Add/Edit Facility Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[#033671]">
                {isEditMode ? 'Edit Fasilitas' : 'Tambah Fasilitas Baru'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddFacility} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Fasilitas</label>
                <input
                  type="text"
                  required
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({...newFacility, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                  placeholder="Lapangan Futsal A"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                <select
                  value={newFacility.category}
                  onChange={(e) => setNewFacility({...newFacility, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                >
                  <option value="Futsal">Futsal</option>
                  <option value="Padel">Padel</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Basketball">Basket</option>
                  <option value="Voli">Voli</option>
                  <option value="Tenis">Tenis</option>
                  <option value="Mini Soccer">Mini Soccer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Harga per Jam (Rp)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={newFacility.price_per_hour}
                  onChange={(e) => setNewFacility({...newFacility, price_per_hour: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                  placeholder="150000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi</label>
                <input
                  type="text"
                  required
                  value={newFacility.location}
                  onChange={(e) => setNewFacility({...newFacility, location: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none"
                  placeholder="Jl. Sudirman No. 123"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
              >
                {isEditMode ? 'Update Fasilitas' : 'Simpan Fasilitas'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

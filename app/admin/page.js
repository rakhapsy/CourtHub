"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { CheckCircle, PlusCircle, X, MapPin, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("facilities"); // "facilities" or "bookings"
  
  const [facilities, setFacilities] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFacility, setNewFacility] = useState({ name: "", category: "Futsal", price_per_hour: "", location: "" });

  const fetchDashboardData = async (userId) => {
    setLoading(true);
    // Fetch Facilities
    const { data: facilitiesData, error: facilitiesError } = await supabase
      .from("facilities")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    if (facilitiesData) setFacilities(facilitiesData);

    // Fetch Bookings (joined via facilities owner_id)
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        facilities!inner(name, owner_id),
        profiles(full_name)
      `)
      .eq("facilities.owner_id", userId)
      .order("start_time", { ascending: false });

    if (bookingsData) setBookings(bookingsData);
    setLoading(false);
  };

  useEffect(() => {
    const initData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
      if (profile?.role !== "partner") {
        router.push("/");
        return;
      }

      setUser(session.user);
      fetchDashboardData(session.user.id);
    };
    initData();
  }, [router]);

  const markAsPaid = async (bookingId) => {
    const { error } = await supabase
      .from("bookings")
      .update({ payment_status: "paid", status: "confirmed" })
      .eq("id", bookingId);

    if (error) {
      alert("Gagal mengupdate status.");
    } else {
      fetchDashboardData(user.id);
    }
  };

  const handleAddFacility = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("facilities").insert({
      name: newFacility.name,
      category: newFacility.category,
      price_per_hour: parseInt(newFacility.price_per_hour),
      location: newFacility.location,
      owner_id: user.id,
      is_active: true
    });

    if (error) {
      alert("Gagal menambahkan fasilitas");
    } else {
      alert("Fasilitas berhasil ditambahkan!");
      setIsModalOpen(false);
      setNewFacility({ name: "", category: "Futsal", price_per_hour: "", location: "" });
      fetchDashboardData(user.id);
    }
  };

  if (loading && !user) {
    return <div className="min-h-screen flex items-center justify-center">Memuat dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header & Add Button */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#033671]">Dashboard Mitra</h1>
          <p className="text-slate-500 mt-1">Kelola fasilitas dan pantau booking pelanggan Anda.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#033671] text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-[#87dd70] hover:text-[#033671] transition-colors shadow-sm"
        >
          <PlusCircle className="w-5 h-5" /> Tambah Fasilitas
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab("facilities")}
          className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors ${
            activeTab === "facilities" 
              ? "bg-[#033671] text-white border-b-0" 
              : "text-gray-500 hover:text-[#033671] hover:bg-gray-50"
          }`}
        >
          Fasilitas Saya
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`py-3 px-6 font-semibold text-sm rounded-t-lg transition-colors ${
            activeTab === "bookings" 
              ? "bg-[#033671] text-white border-b-0" 
              : "text-gray-500 hover:text-[#033671] hover:bg-gray-50"
          }`}
        >
          Daftar Booking
        </button>
      </div>

      {/* Tab 1: Fasilitas Saya */}
      {activeTab === "facilities" && (
        <div>
          {loading ? (
            <p className="text-gray-500">Memuat fasilitas...</p>
          ) : facilities.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
              <p className="text-gray-500 mb-4">Anda belum menambahkan fasilitas apapun.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-[#033671] font-bold hover:underline"
              >
                + Tambah Fasilitas Pertama Anda
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {facilities.map((facility) => (
                <div key={facility.id} className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm relative">
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-xl font-bold text-[#033671]">{facility.name}</h2>
                    <span className="bg-[#87dd70]/20 text-[#033671] text-xs px-3 py-1 rounded-full font-bold">
                      {facility.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-slate-500 text-sm mb-4">
                    <MapPin className="w-4 h-4 mr-1 text-[#87dd70]" />
                    {facility.location || "Lokasi belum ditentukan"}
                  </div>
                  
                  <div className="border-t border-slate-100 pt-4 mt-2">
                    <p className="text-[#033671] font-black text-xl">
                      Rp {facility.price_per_hour.toLocaleString("id-ID")} 
                      <span className="text-slate-400 text-sm font-medium ml-1">/ Jam</span>
                    </p>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-6 right-6">
                    {/* Placeholder for future active/inactive toggle */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Daftar Booking */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-gray-200 font-semibold text-gray-700">
            Daftar Booking Masuk
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <p className="text-gray-500 p-6">Memuat booking...</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#033671] text-white">
                    <th className="py-4 px-6 font-semibold text-sm">Nama Pemesan</th>
                    <th className="py-4 px-6 font-semibold text-sm">Fasilitas</th>
                    <th className="py-4 px-6 font-semibold text-sm">Waktu Mulai</th>
                    <th className="py-4 px-6 font-semibold text-sm">Total Harga</th>
                    <th className="py-4 px-6 font-semibold text-sm">Status</th>
                    <th className="py-4 px-6 font-semibold text-sm text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-500">
                        Belum ada data booking.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6 text-sm text-gray-900">
                          {booking.profiles?.full_name || "Tanpa Nama"}
                        </td>
                        <td className="py-4 px-6 text-sm font-medium text-[#033671]">
                          {booking.facilities?.name}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600">
                          {new Date(booking.start_time).toLocaleString("id-ID")}
                        </td>
                        <td className="py-4 px-6 text-sm font-semibold text-gray-900">
                          Rp {booking.total_price?.toLocaleString("id-ID")}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            booking.payment_status === "paid" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {booking.payment_status === "paid" ? "Lunas" : "Pending"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {booking.payment_status !== "paid" && (
                            <button
                              onClick={() => markAsPaid(booking.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#87dd70] hover:bg-[#72cc5a] text-white text-xs font-semibold rounded transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" /> Tandai Lunas
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah Fasilitas */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#033671]">Tambah Fasilitas Baru</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddFacility} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Fasilitas</label>
                <input required type="text" value={newFacility.name} onChange={(e) => setNewFacility({...newFacility, name: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-[#87dd70] focus:border-[#87dd70] outline-none" placeholder="Misal: Lapangan Futsal A" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select value={newFacility.category} onChange={(e) => setNewFacility({...newFacility, category: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-[#87dd70] focus:border-[#87dd70] outline-none">
                  <option value="Futsal">Futsal</option>
                  <option value="Badminton">Badminton</option>
                  <option value="Tennis">Tennis</option>
                  <option value="Basket">Basket</option>
                  <option value="Voli">Voli</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Harga per Jam (Rp)</label>
                <input required type="number" value={newFacility.price_per_hour} onChange={(e) => setNewFacility({...newFacility, price_per_hour: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-[#87dd70] focus:border-[#87dd70] outline-none" placeholder="150000" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                <input required type="text" value={newFacility.location} onChange={(e) => setNewFacility({...newFacility, location: e.target.value})} className="w-full px-3 py-2 border rounded-md focus:ring-[#87dd70] focus:border-[#87dd70] outline-none" placeholder="Alamat lengkap..." />
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-[#033671] text-white py-3 rounded-md font-bold hover:bg-[#87dd70] hover:text-[#033671] transition-colors">
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

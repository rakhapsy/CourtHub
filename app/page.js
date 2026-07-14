"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Users, Trophy, MapPin, TrendingUp, Handshake, Search } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Static filter data
  const locations = ["Jakarta", "Bogor", "Depok", "Tangerang", "Bekasi"];
  
  // Category mapping: Display Name => Database Value
  const categoryMapping = {
    "Futsal": "Futsal",
    "Padel": "Padel",
    "Badminton": "Badminton",
    "Basket": "Basketball",
    "Voli": "Voli",
    "Tennis": "Tennis",
    "Mini Soccer": "Mini Soccer"
  };

  const handleSearch = (e) => {
    e.preventDefault();
    
    // Build query params
    const params = new URLSearchParams();
    if (searchQuery) params.append("q", searchQuery);
    if (selectedLocation) params.append("location", selectedLocation);
    if (selectedCategory) {
      // Use database value from mapping
      const dbValue = categoryMapping[selectedCategory];
      params.append("category", dbValue);
    }
    
    // Navigate to search page with params
    router.push(`/cari-lapangan?${params.toString()}`);
  };
  return (
    <main className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#033671] via-[#033671] to-[#045091] text-white py-24 md:py-32 px-4 overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#87dd70] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#87dd70] rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            Satu Platform<br />
            Untuk Semua Kebutuhan<br />
            <span className="text-[#87dd70]">Olahragamu</span>
          </h1>
          <p className="text-lg md:text-2xl text-slate-200 mb-10 max-w-3xl mx-auto leading-relaxed">
            Sewa lapangan, cari teman mabar, dan ikuti turnamen dalam satu platform.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/cari-lapangan"
              className="px-8 py-4 bg-[#87dd70] text-[#033671] font-bold text-lg rounded-full hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Cari Lapangan
            </Link>
            <Link
              href="/mabar"
              className="px-8 py-4 border-2 border-white text-white font-bold text-lg rounded-full hover:bg-white hover:text-[#033671] transition-all duration-300"
            >
              Cari Lawan / Mabar
            </Link>
          </div>
        </div>
      </section>

      {/* Search Bar Section (Floating) */}
      <section className="relative -mt-16 px-4 z-20">
        <div className="max-w-6xl mx-auto">
          <form onSubmit={handleSearch} className="bg-[#87dd70] rounded-2xl shadow-2xl p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              
              {/* Aktivitas / Category */}
              <div className="md:col-span-3">
                <label className="flex text-xs font-semibold text-white mb-2 text-left items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Aktivitas
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none text-gray-800 bg-white font-medium"
                >
                  <option value="">Pilih Aktivitas</option>
                  {Object.keys(categoryMapping).map((displayName) => (
                    <option key={displayName} value={displayName}>
                      {displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lokasi */}
              <div className="md:col-span-3">
                <label className="flex text-xs font-semibold text-white mb-2 text-left items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Lokasi
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-3 border-0 rounded-lg focus:ring-2 focus:ring-[#87dd70] outline-none text-gray-800 bg-white font-medium"
                >
                  <option value="">Pilih Kota</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cabang Olahraga / Search Input */}
              <div className="md:col-span-4">
                <label className="flex text-xs font-semibold text-white mb-2 text-left items-center gap-2">
                  <Search className="w-4 h-4" />
                  Nama Lapangan
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama lapangan..."
                  className="w-full px-4 py-2 border-0 rounded-lg focus:ring-2 focus:ring-[#033671] outline-none text-gray-900 font-medium"
                />
              </div>

              {/* Tomukan Button */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full px-6 py-2 bg-[#033671] text-white font-bold rounded-lg hover:bg-white hover:text-[#033671] transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  Temukan
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Features/Ecosystem Section */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-[#033671] mb-4">
              Apa yang bisa kamu lakukan di CourtHub?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Ekosistem lengkap untuk semua kebutuhan olahraga Anda
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Sewa Lapangan */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-[#87dd70] group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#87dd70] to-[#6bc959] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#033671] mb-4">Sewa Lapangan</h3>
              <p className="text-gray-600 leading-relaxed">
                Booking fasilitas dengan harga transparan dan bayar via QRIS. Cepat, mudah, dan aman.
              </p>
              <Link 
                href="/cari-lapangan"
                className="inline-flex items-center mt-6 text-[#033671] font-semibold hover:text-[#87dd70] transition-colors group-hover:translate-x-2 transform duration-300"
              >
                Mulai Booking →
              </Link>
            </div>

            {/* Card 2: Join Mabar */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-[#87dd70] group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#87dd70] to-[#6bc959] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#033671] mb-4">Join Mabar</h3>
              <p className="text-gray-600 leading-relaxed">
                Tidak ada teman main? Gabung sesi mabar dan patungan otomatis dengan pemain lain.
              </p>
              <Link 
                href="/mabar"
                className="inline-flex items-center mt-6 text-[#033671] font-semibold hover:text-[#87dd70] transition-colors group-hover:translate-x-2 transform duration-300"
              >
                Cari Lawan →
              </Link>
            </div>

            {/* Card 3: Turnamen & Event */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-[#87dd70] group">
              <div className="w-16 h-16 bg-gradient-to-br from-[#87dd70] to-[#6bc959] rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#033671] mb-4">Turnamen & Event</h3>
              <p className="text-gray-600 leading-relaxed">
                Buktikan kehebatan timmu di berbagai kompetisi bergengsi dengan hadiah menarik.
              </p>
              <Link 
                href="/tournament"
                className="inline-flex items-center mt-6 text-[#033671] font-semibold hover:text-[#87dd70] transition-colors group-hover:translate-x-2 transform duration-300"
              >
                Lihat Turnamen →
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* Stats / Social Proof Section */}
      <section className="py-16 px-4 bg-[#033671] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="flex items-center justify-center mb-3">
                <MapPin className="w-8 h-8 text-[#87dd70] mr-2" />
                <p className="text-5xl md:text-6xl font-black text-[#87dd70]">100+</p>
              </div>
              <p className="text-xl font-semibold text-slate-200">Fasilitas Terdaftar</p>
              <p className="text-slate-400 mt-2">Di berbagai lokasi strategis</p>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-center mb-3">
                <Users className="w-8 h-8 text-[#87dd70] mr-2" />
                <p className="text-5xl md:text-6xl font-black text-[#87dd70]">500+</p>
              </div>
              <p className="text-xl font-semibold text-slate-200">Pemain Aktif</p>
              <p className="text-slate-400 mt-2">Komunitas yang terus berkembang</p>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-center mb-3">
                <Trophy className="w-8 h-8 text-[#87dd70] mr-2" />
                <p className="text-5xl md:text-6xl font-black text-[#87dd70]">10+</p>
              </div>
              <p className="text-xl font-semibold text-slate-200">Turnamen Sukses</p>
              <p className="text-slate-400 mt-2">Event seru setiap bulan</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick CTA Section (Bottom) */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12 border-2 border-[#87dd70]/30">
            <Handshake className="w-20 h-20 text-[#033671] mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-[#033671] mb-4">
              Punya Fasilitas Olahraga?
            </h2>
            <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
              Bergabunglah dengan jaringan kami dan tingkatkan revenue dengan sistem booking modern. 
              Dapatkan akses ke ribuan pemain aktif.
            </p>
            <Link
              href="/partner/register"
              className="inline-flex items-center gap-2 px-10 py-4 bg-[#033671] text-white font-bold text-lg rounded-full hover:bg-[#87dd70] hover:text-[#033671] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <TrendingUp className="w-5 h-5" />
              Gabung Menjadi Mitra
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

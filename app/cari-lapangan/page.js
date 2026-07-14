"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Search, Filter, X } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const [facilities, setFacilities] = useState([]);
  const [filteredFacilities, setFilteredFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get("location") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [showFilters, setShowFilters] = useState(false);

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
  
  // Reverse mapping for display
  const dbToCategoryDisplay = Object.fromEntries(
    Object.entries(categoryMapping).map(([k, v]) => [v, k])
  );

  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [facilities, searchQuery, selectedLocation, selectedCategory]);

  const fetchFacilities = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("facilities")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching facilities:", error);
    } else {
      setFacilities(data || []);
    }
    setLoading(false);
  };

  const applyFilters = () => {
    let filtered = [...facilities];

    // Search by name (case-insensitive)
    if (searchQuery) {
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by location (LIKE query - case-insensitive substring match)
    if (selectedLocation) {
      filtered = filtered.filter(f => 
        f.location && f.location.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    // Filter by category (exact match)
    if (selectedCategory) {
      filtered = filtered.filter(f => f.category === selectedCategory);
    }

    setFilteredFacilities(filtered);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("");
    setSelectedCategory("");
  };

  const hasActiveFilters = searchQuery || selectedLocation || selectedCategory;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#033671] mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat fasilitas...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-[#033671] text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-center">
            Cari Lapangan Olahraga
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto text-center mb-8">
            Temukan dan booking fasilitas olahraga terbaik di sekitarmu.
          </p>

          {/* Search & Filter Bar */}
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama lapangan..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-transparent outline-none text-gray-800"
                />
              </div>

              {/* Filter Toggle Button (Mobile) */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden px-4 py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors flex items-center justify-center gap-2"
              >
                <Filter className="w-5 h-5" />
                Filter
              </button>

              {/* Desktop Filters */}
              <div className="hidden md:flex gap-4">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-transparent outline-none text-gray-800 bg-white"
                >
                  <option value="">Semua Lokasi</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-transparent outline-none text-gray-800 bg-white"
                >
                  <option value="">Semua Kategori</option>
                  {Object.entries(categoryMapping).map(([displayName, dbValue]) => (
                    <option key={dbValue} value={dbValue}>
                      {displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="hidden md:flex items-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>

            {/* Mobile Filters Dropdown */}
            {showFilters && (
              <div className="md:hidden mt-4 pt-4 border-t space-y-3">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-transparent outline-none text-gray-800 bg-white"
                >
                  <option value="">Semua Lokasi</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#87dd70] focus:border-transparent outline-none text-gray-800 bg-white"
                >
                  <option value="">Semua Kategori</option>
                  {Object.entries(categoryMapping).map(([displayName, dbValue]) => (
                    <option key={dbValue} value={dbValue}>
                      {displayName}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Reset Filter
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-12 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#033671]">
              {hasActiveFilters ? "Hasil Pencarian" : "Semua Fasilitas"}
            </h2>
            <p className="text-gray-600 mt-1">
              Ditemukan {filteredFacilities.length} fasilitas
              {hasActiveFilters && " yang sesuai"}
            </p>
          </div>

          {/* Active Filters Tags */}
          {hasActiveFilters && (
            <div className="hidden md:flex items-center gap-2">
              {searchQuery && (
                <span className="px-3 py-1 bg-[#87dd70]/20 text-[#033671] text-sm rounded-full font-medium">
                  "{searchQuery}"
                </span>
              )}
              {selectedLocation && (
                <span className="px-3 py-1 bg-[#87dd70]/20 text-[#033671] text-sm rounded-full font-medium">
                  📍 {selectedLocation}
                </span>
              )}
              {selectedCategory && (
                <span className="px-3 py-1 bg-[#87dd70]/20 text-[#033671] text-sm rounded-full font-medium">
                  🏀 {dbToCategoryDisplay[selectedCategory] || selectedCategory}
                </span>
              )}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((facility) => (
            <div 
              key={facility.id} 
              className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm hover:shadow-lg hover:border-[#87dd70] transition-all duration-300 group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-xl font-bold text-[#033671] group-hover:text-[#033671]/80 transition-colors">
                    {facility.name}
                  </h3>
                  <span className="bg-[#87dd70]/20 text-[#033671] text-xs px-3 py-1 rounded-full font-bold whitespace-nowrap ml-2">
                    {facility.category}
                  </span>
                </div>

                <div className="flex items-center text-slate-500 text-sm mb-4">
                  <svg className="w-4 h-4 mr-1 text-[#87dd70]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  {facility.location || "Lokasi belum ditentukan"}
                </div>
              </div>

              <div>
                <p className="text-[#033671] font-black text-2xl mt-2">
                  Rp {facility.price_per_hour.toLocaleString("id-ID")} 
                  <span className="text-slate-400 text-sm font-medium ml-1">/ Jam</span>
                </p>

                <Link 
                  href={`/facility/${facility.id}`}
                  className="mt-5 w-full block text-center bg-[#033671] text-white py-3 rounded-lg font-bold hover:bg-[#87dd70] hover:text-[#033671] transition-colors duration-300"
                >
                  Booking Sekarang
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredFacilities.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Tidak ada hasil</h3>
            <p className="text-gray-500 mb-4">
              Coba ubah filter pencarian Anda
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-[#033671] text-white font-semibold rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors"
            >
              Reset Pencarian
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

// Loading fallback component
function SearchLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#033671] mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat halaman pencarian...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense wrapper
export default function CariLapangan() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}

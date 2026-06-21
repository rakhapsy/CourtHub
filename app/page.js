import { supabase } from "../lib/supabase";
import Link from "next/link";
import { CheckCircle, Zap, ShieldCheck } from "lucide-react";

export default async function Home() {
  const { data: facilities, error } = await supabase
    .from("facilities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching facilities:", error);
  }

  return (
    <main className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="bg-[#033671] text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Pesan Lapangan Olahraga <br className="hidden md:block"/> Semudah Membalik Telapak Tangan
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Temukan dan booking fasilitas olahraga terbaik di sekitarmu. Cepat, aman, dan tanpa ribet.
          </p>
          <a href="#katalog" className="inline-block bg-[#87dd70] text-[#033671] font-bold text-lg px-8 py-4 rounded-full hover:bg-white transition-colors duration-300 shadow-lg">
            Mulai Cari Lapangan
          </a>
        </div>
      </section>

      {/* Why Choose CourtHub */}
      <section className="py-16 px-4 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#033671]">Mengapa Memilih CourtHub?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-16 h-16 bg-[#87dd70]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#033671]">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#033671] mb-2">Booking Real-time</h3>
              <p className="text-slate-500">Cek ketersediaan jadwal secara langsung tanpa harus menelepon.</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-[#87dd70]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#033671]">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#033671] mb-2">Pembayaran Aman</h3>
              <p className="text-slate-500">Gunakan QRIS atau metode pembayaran lain dengan jaminan keamanan.</p>
            </div>
            <div className="p-6">
              <div className="w-16 h-16 bg-[#87dd70]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#033671]">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#033671] mb-2">Konfirmasi Instan</h3>
              <p className="text-slate-500">Dapatkan bukti booking langsung setelah pembayaran berhasil.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Katalog Lapangan */}
      <section id="katalog" className="py-16 px-4 max-w-7xl mx-auto">
        <div className="mb-10 text-center border-b-4 border-[#87dd70] pb-4 inline-block">
          <h2 className="text-3xl font-bold text-[#033671] tracking-tight">Katalog Fasilitas</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {facilities?.map((facility) => (
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
                  <svg className="w-4 h-4 mr-1 text-[#87dd70]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
      </section>
    </main>
  );
}

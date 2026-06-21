"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";

export default function PartnerRegister() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: "partner" } }
      });
      
      if (error) throw error;

      // Because triggers might not be set up to handle roles immediately, let us force update profile if needed
      // If profile is created via trigger, we might update it here.
      if (data?.user) {
        await supabase.from("profiles").upsert({ 
          id: data.user.id, 
          full_name: fullName, 
          role: "partner" 
        }, { onConflict: "id" });
      }

      setMessage({ type: "success", text: "Registrasi Mitra berhasil! Mengalihkan ke Dashboard..." });
      setTimeout(() => router.push("/admin"), 1500);
      
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="inline-block bg-[#87dd70]/20 text-[#033671] text-sm font-bold px-3 py-1 rounded-full mb-4">Mitra CourtHub</span>
        <h2 className="text-4xl font-extrabold text-[#033671]">
          Daftar Sebagai Mitra
        </h2>
        <p className="mt-2 text-sm text-slate-500 font-medium">
          Kelola lapangan Anda dan dapatkan lebih banyak pelanggan.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border-t-4 border-[#033671]">

          {message.text && (
            <div className={`mb-4 p-3 rounded-md text-sm font-medium ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
              {message.text}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm font-bold text-[#033671]">Nama Pemilik / Bisnis</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-[#87dd70] focus:border-[#87dd70] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#033671]">Email Bisnis</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-[#87dd70] focus:border-[#87dd70] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#033671]">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-[#87dd70] focus:border-[#87dd70] sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 rounded-md shadow-sm text-sm font-bold text-white bg-[#033671] hover:bg-[#87dd70] hover:text-[#033671] transition-colors disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Daftar Mitra"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

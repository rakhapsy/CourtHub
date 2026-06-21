"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from 'next/image';
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { User, LogOut, Calendar, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
        setProfile(data);
      } else {
        setUser(null);
        setProfile(null);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
        setProfile(data);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          <Link href="/" className="flex items-center gap-2">
            <img 
              src="/logo.png"
              alt="Logo CourtHub"
              className="h-8 sm:h-10 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#033671] transition-colors focus:outline-none"
                >
                  <div className="w-8 h-8 bg-[#033671] text-white rounded-full flex items-center justify-center font-bold">
                    {user.email.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block font-bold text-[#033671]">{user.email}</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-2">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-sm font-bold text-[#033671] truncate">{user.email}</p>
                      <p className="text-xs text-slate-500 capitalize">{profile?.role || "Customer"}</p>
                    </div>
                    
                    <div className="py-2">
                      <Link 
                        href="/my-bookings"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#033671] transition-colors"
                      >
                        <Calendar className="w-4 h-4" /> Riwayat Booking
                      </Link>
                      
                      {profile?.role === "partner" && (
                        <Link 
                          href="/admin"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#033671] transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4" /> Dashboard Mitra
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" /> Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/partner/register"
                  className="hidden sm:inline-block text-sm font-bold text-[#033671] px-5 py-2.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Jadi Mitra
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-bold bg-[#033671] text-white px-5 py-2.5 rounded-lg hover:bg-[#87dd70] hover:text-[#033671] transition-colors shadow-sm"
                >
                  Masuk / Daftar
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}

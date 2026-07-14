"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Check, Crown, Zap, Shield, TrendingUp, Lock } from "lucide-react";
import Swal from 'sweetalert2';

export default function SubscribePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    const initUser = async () => {
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

      // Fetch current subscription
      const { data: subData } = await supabase
        .from("partner_subscriptions")
        .select("*")
        .eq("partner_id", session.user.id)
        .single();

      setCurrentSubscription(subData);
      setLoading(false);
    };
    initUser();
  }, [router]);

  const handleSubscribe = async (planName, basePrice, ppn, totalPrice, duration) => {
    if (!user) return;

    setPaymentLoading(true);

    try {
      // Call Midtrans API
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: `SUB-${planName}-${session.user.id}`,
          gross_amount: totalPrice,
          customer_name: user.user_metadata?.full_name || 'Partner',
          customer_email: user.email
        })
      });

      const { token } = await response.json();

      if (token) {
        window.snap.pay(token, {
          onSuccess: async function(result) {
            // UPSERT subscription
            const now = new Date();
            const validUntil = new Date(now);
            validUntil.setDate(validUntil.getDate() + duration);

            const { error } = await supabase
              .from('partner_subscriptions')
              .upsert({
                partner_id: user.id,
                plan_name: planName,
                status: 'active',
                last_paid_at: now.toISOString(),
                valid_until: validUntil.toISOString()
              }, {
                onConflict: 'partner_id'
              });

            if (error) {
              console.error("Error updating subscription:", error);
              Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Pembayaran berhasil tetapi gagal memperbarui data.',
                confirmButtonColor: '#033671'
              });
              return;
            }

            Swal.fire({
              icon: 'success',
              title: 'Langganan Aktif!',
              text: `Selamat! Paket ${planName} Anda telah diaktifkan.`,
              confirmButtonColor: '#033671'
            }).then(() => {
              router.push('/admin');
              router.refresh();
            });
          },
          onPending: function(result) {
            Swal.fire({
              icon: 'info',
              title: 'Menunggu Pembayaran',
              text: 'Silakan selesaikan pembayaran Anda.',
              confirmButtonColor: '#033671'
            });
          },
          onError: function(result) {
            Swal.fire({
              icon: 'error',
              title: 'Pembayaran Gagal',
              text: 'Terjadi kesalahan saat memproses pembayaran.',
              confirmButtonColor: '#e3342f'
            });
          },
          onClose: function() {
            Swal.fire({
              icon: 'warning',
              title: 'Dibatalkan',
              text: 'Anda menutup jendela pembayaran.',
              confirmButtonColor: '#f6993f'
            });
          }
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memproses pembayaran',
        confirmButtonColor: '#033671'
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#033671] mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Pricing data
  const monthlyBase = 99000;
  const monthlyPPN = Math.round(monthlyBase * 0.12);
  const monthlyTotal = monthlyBase + monthlyPPN;

  const yearlyBase = 990000;
  const yearlyPPN = Math.round(yearlyBase * 0.12);
  const yearlyTotal = yearlyBase + yearlyPPN;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#87dd70] rounded-2xl mb-6">
            <Crown className="w-10 h-10 text-[#033671]" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#033671] mb-4">
            Pilih Paket Langganan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Kelola fasilitas olahraga Anda dengan sistem modern. Pilih paket yang sesuai dengan kebutuhan bisnis Anda.
          </p>
        </div>

        {/* Current Subscription Alert */}
        {currentSubscription && (
          <div className="max-w-4xl mx-auto mb-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Langganan Aktif: <span className="font-bold">{currentSubscription.plan_name}</span>
                </p>
                <p className="text-xs text-blue-700">
                  Berlaku hingga: {new Date(currentSubscription.valid_until).toLocaleDateString('id-ID')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* PAKET BULANAN */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-slate-200 hover:border-[#87dd70] transition-all duration-300">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-[#033671] mb-2">Paket Bulanan</h3>
              <p className="text-sm text-gray-500">Perfect untuk mencoba platform</p>
            </div>

            {/* Pricing */}
            <div className="text-center mb-8 pb-8 border-b border-gray-200">
              <div className="mb-2">
                <span className="text-gray-600 text-sm">Harga Dasar:</span>
                <p className="text-lg font-semibold text-gray-800">Rp {monthlyBase.toLocaleString('id-ID')}</p>
              </div>
              <div className="mb-4">
                <span className="text-gray-600 text-sm">PPN 12%:</span>
                <p className="text-md font-semibold text-gray-700">+ Rp {monthlyPPN.toLocaleString('id-ID')}</p>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <span className="text-gray-600 text-sm block mb-2">Total Bayar:</span>
                <p className="text-4xl font-black text-[#033671]">
                  Rp {monthlyTotal.toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-gray-500 mt-1">per bulan</p>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700"><strong>Maksimal 5 fasilitas</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Sistem booking real-time</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Pembayaran via Midtrans (QRIS, VA, dll)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Dashboard analytics dasar</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">Laporan bulanan (CSV)</span>
              </li>
              <li className="flex items-start gap-3 opacity-40">
                <Lock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-500 line-through">Fitur promosi & diskon</span>
              </li>
              <li className="flex items-start gap-3 opacity-40">
                <Lock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-500 line-through">Analytics advanced</span>
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe("Paket Bulanan", monthlyBase, monthlyPPN, monthlyTotal, 30)}
              disabled={paymentLoading}
              className="w-full py-4 bg-[#033671] text-white font-bold text-lg rounded-xl hover:bg-[#87dd70] hover:text-[#033671] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading ? "Memproses..." : "Pilih & Bayar"}
            </button>
          </div>

          {/* PAKET TAHUNAN - RECOMMENDED */}
          <div className="bg-gradient-to-br from-[#033671] to-[#045299] rounded-2xl shadow-2xl p-8 border-4 border-[#87dd70] relative overflow-hidden">
            {/* Recommended Badge */}
            <div className="absolute top-4 right-4">
              <div className="bg-[#87dd70] text-[#033671] px-4 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                <Zap className="w-3 h-3" />
                REKOMENDASI
              </div>
            </div>

            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Paket Tahunan</h3>
              <p className="text-sm text-slate-200">Hemat 2 bulan! Full access semua fitur</p>
            </div>

            {/* Pricing */}
            <div className="text-center mb-8 pb-8 border-b border-white/20">
              <div className="mb-2">
                <span className="text-slate-200 text-sm">Harga Dasar:</span>
                <p className="text-lg font-semibold text-white">Rp {yearlyBase.toLocaleString('id-ID')}</p>
              </div>
              <div className="mb-4">
                <span className="text-slate-200 text-sm">PPN 12%:</span>
                <p className="text-md font-semibold text-slate-100">+ Rp {yearlyPPN.toLocaleString('id-ID')}</p>
              </div>
              <div className="pt-4 border-t border-white/20">
                <span className="text-slate-200 text-sm block mb-2">Total Bayar:</span>
                <p className="text-4xl font-black text-[#87dd70]">
                  Rp {yearlyTotal.toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-slate-200 mt-1">per tahun (Hemat Rp 197.760)</p>
              </div>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white"><strong>Maksimal 10 fasilitas</strong></span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Sistem booking real-time</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Pembayaran via Midtrans (QRIS, VA, dll)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Dashboard analytics dasar</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-[#87dd70] mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white">Laporan bulanan & tahunan (CSV)</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 bg-[#87dd70] rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Crown className="w-3 h-3 text-[#033671]" />
                </div>
                <span className="text-sm text-[#87dd70] font-semibold">✨ Fitur promosi & diskon unlimited</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 bg-[#87dd70] rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <TrendingUp className="w-3 h-3 text-[#033671]" />
                </div>
                <span className="text-sm text-[#87dd70] font-semibold">✨ Analytics advanced dengan grafik</span>
              </li>
            </ul>

            <button
              onClick={() => handleSubscribe("Paket Tahunan", yearlyBase, yearlyPPN, yearlyTotal, 365)}
              disabled={paymentLoading}
              className="w-full py-4 bg-[#87dd70] text-[#033671] font-bold text-lg rounded-xl hover:bg-white transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading ? "Memproses..." : "Pilih & Bayar (Hemat 20%)"}
            </button>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#87dd70]" />
              <span>Pembayaran Aman</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#87dd70]" />
              <span>Aktivasi Instan</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#87dd70]" />
              <span>Support 24/7</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

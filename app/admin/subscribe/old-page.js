"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CheckCircle, Crown, Zap, TrendingUp, Shield, ArrowLeft } from "lucide-react";
import Swal from 'sweetalert2';

export default function SubscribePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);

  // Pricing Configuration
  const PPN_RATE = 0.12; // 12% VAT

  const pricingPlans = [
    {
      id: 'monthly',
      name: 'Paket Bulanan',
      basePrice: 99000,
      duration: 30, // days
      durationLabel: 'bulan',
      features: [
        'Kelola hingga 5 fasilitas',
        'Dashboard analytics',
        'Notifikasi booking real-time',
        'Support via email',
        'Laporan bulanan'
      ],
      badge: null,
      popular: false
    },
    {
      id: 'yearly',
      name: 'Paket Tahunan',
      basePrice: 990000,
      duration: 365, // days
      durationLabel: 'tahun',
      features: [
        'Kelola hingga 10 fasilitas',
        'Dashboard analytics advanced',
        'Notifikasi booking real-time',
        'Priority support 24/7',
        'Laporan bulanan & tahunan',
        'Fitur promosi & diskon',
        'API access'
      ],
      badge: 'Hemat 2 bulan',
      popular: true
    }
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'partner') {
        router.push('/');
        return;
      }

      setUser(session.user);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const calculatePricing = (basePrice) => {
    const ppn = Math.round(basePrice * PPN_RATE);
    const total = basePrice + ppn;
    return { basePrice, ppn, total };
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleSubscribe = async (plan) => {
    if (!user) {
      Swal.fire({
        icon: 'warning',
        title: 'Login Diperlukan',
        text: 'Silakan login terlebih dahulu',
        confirmButtonColor: '#033671'
      });
      router.push('/login');
      return;
    }

    setProcessingPlan(plan.id);

    try {
      const pricing = calculatePricing(plan.basePrice);

      // Request payment token from Midtrans
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: `SUB-${plan.id.toUpperCase()}-${user.id.substring(0, 8)}-${Date.now()}`,
          gross_amount: pricing.total, // CRITICAL: Send final total including PPN
          customer_name: user.user_metadata?.full_name || user.email.split('@')[0],
          customer_email: user.email
        })
      });

      const { token } = await response.json();

      if (token) {
        // Open Midtrans Snap payment
        window.snap.pay(token, {
          onSuccess: async function(result) {
            // Calculate valid_until date
            const now = new Date();
            const validUntil = new Date(now.getTime() + (plan.duration * 24 * 60 * 60 * 1000));

            // UPSERT into partner_subscriptions
            const { error: upsertError } = await supabase
              .from('partner_subscriptions')
              .upsert({
                partner_id: user.id,
                plan_name: plan.name,
                status: 'active',
                last_paid_at: now.toISOString(),
                valid_until: validUntil.toISOString()
              }, {
                onConflict: 'partner_id'
              });

            if (upsertError) {
              console.error("Error updating subscription:", upsertError);
              Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Pembayaran berhasil tetapi gagal mengaktifkan langganan. Hubungi admin.',
                confirmButtonColor: '#033671'
              });
              return;
            }

            // Success!
            Swal.fire({
              icon: 'success',
              title: 'Langganan Berhasil!',
              html: `
                <p>Anda telah berlangganan <strong>${plan.name}</strong></p>
                <p class="text-sm text-gray-600 mt-2">
                  Berlaku hingga: ${validUntil.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              `,
              confirmButtonColor: '#033671',
              confirmButtonText: 'Ke Dashboard'
            }).then(() => {
              router.push('/admin');
            });
          },
          
          onPending: function(result) {
            Swal.fire({
              icon: 'info',
              title: 'Menunggu Pembayaran',
              text: 'Silakan selesaikan pembayaran Anda.',
              confirmButtonColor: '#033671'
            });
            setProcessingPlan(null);
          },
          
          onError: function(result) {
            Swal.fire({
              icon: 'error',
              title: 'Pembayaran Gagal',
              text: 'Terjadi kesalahan saat memproses pembayaran.',
              confirmButtonColor: '#e3342f'
            });
            setProcessingPlan(null);
          },
          
          onClose: function() {
            Swal.fire({
              icon: 'warning',
              title: 'Dibatalkan',
              text: 'Anda menutup jendela pembayaran.',
              confirmButtonColor: '#f6993f'
            });
            setProcessingPlan(null);
          }
        });
      } else {
        throw new Error('Failed to get payment token');
      }
    } catch (error) {
      console.error("Error processing subscription:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Gagal memproses pembayaran. Silakan coba lagi.',
        confirmButtonColor: '#033671'
      });
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#033671] mx-auto mb-4"></div>
          <p className="text-slate-600">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Back Button */}
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-[#033671] hover:text-[#87dd70] font-semibold mb-8 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          Kembali ke Dashboard
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#033671] rounded-2xl mb-4">
            <Crown className="w-8 h-8 text-[#87dd70]" />
          </div>
          <h1 className="text-4xl font-bold text-[#033671] mb-4">
            Pilih Paket Langganan Anda
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Tingkatkan bisnis olahraga Anda dengan fitur premium CourtHub. 
            Kelola fasilitas dengan lebih efisien!
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {pricingPlans.map((plan) => {
            const pricing = calculatePricing(plan.basePrice);
            const isProcessing = processingPlan === plan.id;
            
            return (
              <div 
                key={plan.id}
                className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 ${
                  plan.popular 
                    ? 'border-4 border-[#87dd70] transform scale-105' 
                    : 'border-2 border-slate-200 hover:border-[#033671]'
                }`}
              >
                {/* Card Header */}
                <div className={`p-6 ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-[#033671] to-[#045299]' 
                    : 'bg-slate-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-2xl font-bold ${
                      plan.popular ? 'text-white' : 'text-[#033671]'
                    }`}>
                      {plan.name}
                    </h3>
                    {plan.badge && (
                      <span className="px-3 py-1 bg-[#87dd70] text-[#033671] text-xs font-bold rounded-full">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  {plan.popular && (
                    <div className="flex items-center gap-2 text-[#87dd70] text-sm font-semibold">
                      <Zap className="w-4 h-4" />
                      Paling Populer
                    </div>
                  )}
                </div>

                {/* Pricing Breakdown */}
                <div className="p-6 border-b border-slate-200 bg-slate-50">
                  <div className="space-y-2">
                    {/* Base Price */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Harga Dasar</span>
                      <span className="font-semibold text-slate-800">
                        {formatPrice(pricing.basePrice)}
                      </span>
                    </div>
                    
                    {/* PPN */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">PPN 12%</span>
                      <span className="font-semibold text-slate-800">
                        {formatPrice(pricing.ppn)}
                      </span>
                    </div>
                    
                    {/* Divider */}
                    <div className="border-t border-slate-300 my-2"></div>
                    
                    {/* Total */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-semibold">Total</span>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-[#033671]">
                          {formatPrice(pricing.total)}
                        </p>
                        <p className="text-sm text-slate-500">/ {plan.durationLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="p-6">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">
                    Fitur Termasuk:
                  </h4>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-[#87dd70] flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <div className="p-6 pt-0">
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={isProcessing}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.popular
                        ? 'bg-[#033671] text-white hover:bg-[#87dd70] hover:text-[#033671]'
                        : 'bg-slate-700 text-white hover:bg-[#033671]'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <Crown className="w-5 h-5" />
                        Pilih & Bayar
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#033671] mb-6 text-center">
            Mengapa Berlangganan CourtHub Premium?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#87dd70] rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-6 h-6 text-[#033671]" />
              </div>
              <h3 className="font-bold text-[#033671] mb-2">Tingkatkan Revenue</h3>
              <p className="text-sm text-slate-600">
                Kelola lebih banyak fasilitas dan maksimalkan pendapatan bisnis Anda
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#87dd70] rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-[#033671]" />
              </div>
              <h3 className="font-bold text-[#033671] mb-2">Efisiensi Maksimal</h3>
              <p className="text-sm text-slate-600">
                Dashboard analytics dan laporan otomatis menghemat waktu Anda
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[#87dd70] rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-[#033671]" />
              </div>
              <h3 className="font-bold text-[#033671] mb-2">Support Premium</h3>
              <p className="text-sm text-slate-600">
                Tim support kami siap membantu Anda 24/7 untuk paket tahunan
              </p>
            </div>
          </div>
        </div>

        {/* FAQ/Info */}
        <div className="bg-gradient-to-r from-[#033671] to-[#045299] rounded-2xl p-8 text-white text-center">
          <h3 className="text-xl font-bold mb-2">Punya Pertanyaan?</h3>
          <p className="text-slate-200 mb-4">
            Tim kami siap membantu Anda memilih paket yang tepat
          </p>
          <button className="bg-[#87dd70] text-[#033671] px-6 py-3 rounded-lg font-bold hover:bg-white transition-colors">
            Hubungi Sales
          </button>
        </div>
      </div>
    </div>
  );
}

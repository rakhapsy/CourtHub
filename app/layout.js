import './globals.css'
import Navbar from '../components/Navbar'
import Script from 'next/script'

export const metadata = {
  title: 'CourtHub | Pesan Lapangan Olahraga',
  description: 'Aplikasi booking lapangan futsal, badminton, dan kelas fitness secara real-time.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body suppressHydrationWarning className="antialiased bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        {/* Script Midtrans Sandbox */}
        <Script 
          src="https://app.sandbox.midtrans.com/snap/snap.js" 
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="beforeInteractive"
        />

        {/* Navbar Global */}
        <Navbar />
        
        {/* Konten halaman akan dirender */}
        <main className="flex-grow bg-gray-100">
          {children}
        </main>
        
        {/* Footer Global */}
        <footer className="bg-[#033671] text-white py-6 text-center text-sm font-medium">
          <p>© 2026 CourtHub. All rights reserved.</p>
        </footer>
      </body>
    </html>
  )
}
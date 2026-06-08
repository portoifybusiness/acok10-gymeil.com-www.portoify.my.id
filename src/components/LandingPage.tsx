/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Briefcase, 
  Check, 
  Sparkles, 
  FileText, 
  ShieldCheck, 
  Globe2, 
  CloudLightning, 
  ArrowRight,
  UserCheck,
  Mail,
  Upload
} from "lucide-react";
import { motion } from "motion/react";

function AdScriptSection({ scriptCode, id }: { scriptCode: string; id: string }) {
  if (!scriptCode) return null;

  // Render a clean, non-clashing iframe for executing the ad script independently.
  // This avoids double-render or target ID collisions on the same page.
  const isTower = id.includes("tower");
  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        ${scriptCode}
      </body>
    </html>
  `;

  return (
    <div className="w-full flex flex-col items-center justify-start py-2">
      <div className="text-[9px] uppercase tracking-widest text-[#df2d30] font-black pb-1 mb-2 border-b border-rose-100 w-full text-center">SPONSORED AD</div>
      <iframe
        title={`ad-frame-${id}`}
        srcDoc={iframeSrcDoc}
        style={{
          border: "none",
          width: "100%",
          height: isTower ? "600px" : "120px",
          backgroundColor: "transparent",
          overflow: "hidden"
        }}
        scrolling="no"
        id={`ad-iframe-${id}`}
      />
    </div>
  );
}

interface LandingPageProps {
  onNavigate: (page: string) => void;
  currentUser: any;
}

export default function LandingPage({ onNavigate, currentUser }: LandingPageProps) {
  const [packages, setPackages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [adConfig, setAdConfig] = useState<{ name: string; script: string; socialBarScript?: string; bannerActive?: boolean; socialActive?: boolean; } | null>(null);

  useEffect(() => {
    fetch("/api/packages")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data paket");
        return res.json();
      })
      .then((data) => {
        setPackages(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });

    fetch("/api/ads")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal mengambil data iklan");
        return res.json();
      })
      .then((data) => {
        if (data) {
          setAdConfig(data);
        }
      })
      .catch((err) => console.error("Error loading ads for landing page:", err));
  }, []);

  useEffect(() => {
    if (!adConfig?.socialBarScript || adConfig?.socialActive === false) return;
    
    // Inject the social bar scripts to execution environment dynamically
    const container = document.createElement("div");
    container.id = "portoify-social-bar-container";
    container.innerHTML = adConfig.socialBarScript;
    document.body.appendChild(container);
    
    // Select both loaded script tags and dynamic elements inside the container and append to body
    const scripts = Array.from(container.getElementsByTagName("script"));
    const injectedScripts: HTMLScriptElement[] = [];
    
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.innerHTML = oldScript.innerHTML;
      }
      document.body.appendChild(newScript);
      injectedScripts.push(newScript);
    });
    
    return () => {
      // Cleanup to prevent double trigger when navigating
      const existing = document.getElementById("portoify-social-bar-container");
      if (existing) existing.remove();
      injectedScripts.forEach(scr => scr.remove());
    };
  }, [adConfig?.socialBarScript]);

  const formatPrice = (price: number) => {
    if (price === 0) return "Gratis";
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 relative xl:px-44">
      {/* LEFT AND RIGHT NATIVE BANNER ADS */}
      {adConfig && adConfig.script && adConfig.bannerActive !== false && (
        <>
          {/* Left Ad Sidebar */}
          <div 
            id="active-ad-left-tower" 
            className="fixed left-3 top-24 bottom-6 w-36 hidden xl:flex flex-col items-center justify-start bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 p-3.5 z-40 overflow-hidden"
          >
            <AdScriptSection scriptCode={adConfig.script} id="left-tower" />
          </div>

          {/* Right Ad Sidebar */}
          <div 
            id="active-ad-right-tower" 
            className="fixed right-3 top-24 bottom-6 w-36 hidden xl:flex flex-col items-center justify-start bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-slate-200/80 p-3.5 z-40 overflow-hidden"
          >
            <AdScriptSection scriptCode={adConfig.script} id="right-tower" />
          </div>

          {/* Mobile bottom ad section so the ad is still displayed correctly on smaller screens */}
          <div id="mobile-inline-banner" className="block xl:hidden w-full max-w-4xl mx-auto px-4 mt-6">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-center items-center">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <AdScriptSection scriptCode={adConfig.script} id="mobile-left" />
                <AdScriptSection scriptCode={adConfig.script} id="mobile-right" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top Header Navigation */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 navbar-id">
        <div id="nav-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div id="nav-brand" className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate("landing")}>
            {/* Portoify Red Brand Emblem */}
            <img 
              id="logo-emblem" 
              src="https://i.ibb.co.com/ym8b3RFm/logo-portoify.png" 
              alt="Portoify Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-md"
              referrerPolicy="no-referrer"
            />
            <span id="logo-text" className="font-display font-extrabold text-2xl tracking-tight text-slate-900">
              Portoify<span className="text-brand">.</span>
            </span>
          </div>

          <div id="nav-links" className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#fitur" className="hover:text-brand transition-colors">Fitur</a>
            <a href="#harga" className="hover:text-brand transition-colors">Harga Paket</a>
            <a href="#keamanan" className="hover:text-brand transition-colors">Keamanan Berkas</a>
          </div>

          <div id="nav-actions" className="flex items-center gap-3">
            {currentUser ? (
              <button
                id="btn-goto-dashboard"
                onClick={() => onNavigate(currentUser.role === "admin" ? "admin-dashboard" : "user-dashboard")}
                className="px-5 py-2 bg-brand text-white hover:bg-brand-hover rounded-xl text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                Ke Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  id="btn-nav-login"
                  onClick={() => onNavigate("login")}
                  className="px-4 py-2 text-slate-700 hover:text-brand font-semibold text-sm cursor-pointer"
                >
                  Login
                </button>
                <button
                  id="btn-nav-register"
                  onClick={() => onNavigate("register")}
                  className="px-5 py-2 bg-brand hover:bg-brand-hover text-white font-bold text-sm rounded-xl shadow-sm transition cursor-pointer"
                >
                  Register
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Banner Section */}
      <section id="hero-banner" className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50 overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-brand text-xs font-bold rounded-full mb-6 border border-red-100 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Platform Karir Digital
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-display font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-6"
          >
            Buat <span className="text-brand">Portofolio</span> Profesional <br />
            Kamu dengan <span className="text-brand border-b-4 border-brand/20 pb-1">Satu Klik</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-sans"
          >
            Kelola CV/Resume online, Surat Lamaran Kerja, dan dokumen penting pendukung pelamar lainnya dalam satu Dashboard modern. Dilengkapi domain digital personal.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex justify-center items-center mb-16"
          >
            <button
              onClick={() => onNavigate("register")}
              className="px-8 py-4 bg-brand text-white hover:bg-brand-hover text-base font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Mulai Buat Gratis Sekarang <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>

        {/* Decorative background grid vector lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>
      </section>

      {/* Feature Section */}
      <section id="fitur" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 mb-4">
              Kelola File Pelamaran Kerja Secara Menyeluruh & All-in-One
            </h2>
            <p className="text-slate-600">
              Tidak perlu lagi mengirim lampiran PDF berukuran pulsa besar. Cukup kirimkan satu buah link digital personal yang cantik dan responsif kepada HRD perusahaan impian Anda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 transition hover:shadow-md">
              <div className="w-12 h-12 bg-red-100 text-brand rounded-2xl flex items-center justify-center mb-6">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">Portofolio Digital Online</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Tulis biodata, riwayat pendidikan, deskripsi pengalaman, link proyek unggulan, dan publikasikan secara instant di domain <code className="bg-slate-200 px-1 py-0.5 rounded text-xs font-mono">portoify.my.id/u/nama_kamu</code>.
              </p>
            </div>

            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 transition hover:shadow-md">
              <div className="w-12 h-12 bg-red-100 text-brand rounded-2xl flex items-center justify-center mb-6">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">CV & Surat Lamaran Kerja</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Isi satu kali, buat berkas lamaran berulang kali. Generator resume dan cover letter kami akan mengisi nama, alamat, usia, secara otomatis mengambil data profil Anda.
              </p>
            </div>

            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 transition hover:shadow-md">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">Gudang Dokumen Terenkripsi</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Simpan berkas berharga pendukung lamaran kerja Anda dengan aman menggunakan sistem enkripsi biner. Dijamin aman, bersih, dan bebas virus, siap digunakan kapan pun.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section matching exactly picture cards structure */}
      <section id="harga" className="py-20 bg-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-slate-900 mb-4">
              Layanan Ringan & Paket Terjangkau
            </h2>
            <p className="text-slate-600">
              Pilih paket layanan sesuai kebutuhan Anda untuk mendapatkan kemudahan akses berkas pendukung instan.
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 border-4 border-red-650 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-400 text-sm font-medium">Memuat paket layanan terbaik...</p>
            </div>
          ) : packages.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 max-w-xl mx-auto p-8 shadow-sm">
              <span className="text-4xl block mb-3">📦</span>
              <h3 className="font-bold text-slate-800 text-lg">Paket Layanan Belum Tersedia</h3>
              <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
                Administrator belum merilis paket harga kustom baru di sistem saat ini. Silakan hubungi tim helpdesk atau login untuk menikmati sandbox percobaan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
              {packages.map((pkg, idx) => {
                // Determine if this is a premium/popular card to highlight it nicely
                const isPopular = pkg.isFeatured || pkg.isPopular || pkg.name?.toLowerCase().includes("standart") || pkg.name?.toLowerCase().includes("standard") || pkg.name?.toLowerCase().includes("premium") || idx === 1;
                
                // Formulate the feature lines exactly like the Admin Dashboard, keeping it crystal clear
                const featureLines = [
                  `Masa Aktif ${pkg.durationDays || 30} Hari`,
                  ...(Array.isArray(pkg.features) 
                    ? pkg.features 
                    : (typeof pkg.features === "string" 
                        ? (pkg.features as string).split(",").map((f: any) => f.trim()).filter(Boolean) 
                        : []))
                ];

                return (
                  <div 
                    key={pkg.id} 
                    className={`bg-white border border-slate-200 hover:border-slate-350 shadow-lg rounded-[32px] overflow-hidden flex flex-col justify-between transition-all duration-300 p-0 ${
                      isPopular ? "lg:scale-105 ring-4 ring-red-500/10 z-10" : "hover:translate-y-[-6px]"
                    }`}
                  >
                    <div>
                      {/* Rich header banner styled EXACTLY like the red banner in Admin Dashboard / user design */}
                      <div className="relative bg-gradient-to-br from-[#ca1a1a] via-[#bb1717] to-[#8a1414] py-10 px-5 text-center overflow-hidden">
                        {/* Subtle glossy overlay strip path matching mockup */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none transform -skew-y-6 scale-110" />
                        
                        {isPopular && (
                          <div className="inline-block bg-black/40 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-full mb-3 tracking-widest">
                            PILIHAN UTAMA
                          </div>
                        )}
                        
                        <h3 className="text-xl sm:text-[22px] font-black uppercase tracking-wider text-white font-sans drop-shadow-md">
                          {pkg.name}
                        </h3>
                      </div>

                      {/* Red Price section and Duration */}
                      <div className="px-6 pt-8 pb-4 text-center">
                        <p className="text-3xl sm:text-[34px] font-black text-[#ca1a1a] tracking-tight mb-1">
                          {Number(pkg.price) === 0 ? "IDR 0" : `IDR ${Number(pkg.price || 0).toLocaleString("id-ID")}`}
                        </p>
                        <p className="text-[#8c1c1c] font-black text-xs sm:text-[13px] tracking-wide uppercase">
                          Masa Aktif {pkg.durationDays} Hari
                        </p>
                      </div>

                      {/* Fitur Layanan Checklist */}
                      <div className="px-6 sm:px-8 pb-6">
                        <h4 className="text-slate-900 font-extrabold text-sm sm:text-base mb-4 text-left font-sans border-b pb-2 border-slate-100">
                          Fitur Layanan
                        </h4>
                        
                        <ul className="space-y-3 px-1 text-xs text-slate-700">
                          {featureLines.map((line, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-3">
                              {/* Red circle check mark icon matching precisely */}
                              <span className="flex items-center justify-center w-5 h-5 bg-[#ca1a1a] rounded-full text-white text-[10px] shrink-0 font-bold mt-0.5 shadow-xs select-none">
                                ✓
                              </span>
                              <span className="font-semibold text-slate-800 leading-relaxed text-left text-[11px] sm:text-[12px]">
                                {line}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Centered/spaced action triggers styled exactly like user's mockup */}
                    <div className="px-6 pb-6 pt-4 border-t border-slate-100 mt-auto bg-slate-50/50">
                      <button
                        onClick={() => onNavigate("register")}
                        className={`w-full py-4 text-xs tracking-wider transition-all duration-300 font-extrabold rounded-2xl uppercase shadow-md hover:shadow-lg active:scale-97 cursor-pointer text-center ${
                          isPopular 
                            ? "bg-[#740f0f] hover:bg-[#8c1c1c] text-white" 
                            : "bg-[#e11d48] hover:bg-[#be123c] text-white"
                        }`}
                      >
                        {isPopular ? `AMBIL PAKET ${pkg.name?.toUpperCase() || "PREMIUM"}` : "BERLANGGANAN SEKARANG"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Security Statement Section */}
      <section id="keamanan" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100 font-semibold text-xs mb-6 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Perlindungan Berkas Terjamin Aman
          </div>
          <h2 className="text-3xl font-display font-black text-slate-900 mb-6">
            Apakah Aman Mengupload Dokumen Pribadi Saya Di Sini?
          </h2>
          <p className="text-slate-600 leading-relaxed text-base max-w-3xl mx-auto mb-8">
            Keamanan data pengguna adalah janji tertinggi Portoify. Seluruh berkas pendukung karir Anda disimpan secara binary terenkripsi pada folder sistem terisolasi yang aman dan terlindungi. Dokumen Anda tidak akan pernah bocor ke situs pihak ketiga atau robot pencari, dan diproteksi oleh protokol SSL 256-bit standar industri keamanan digital.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-2xl mx-auto mt-12">
            <div className="flex items-start gap-2.5">
              <span className="text-brand text-xl">✓</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Strict TLS Enkripsi</h4>
                <p className="text-xs text-slate-500 mt-0.5">Semua data terunggah dienkripsi saat transit.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-brand text-xl">✓</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Klausa Kerahasiaan</h4>
                <p className="text-xs text-slate-500 mt-0.5">Bebas dari iklan bertarget pihak ketiga.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-brand text-xl">✓</span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Hapus Sekali Klik</h4>
                <p className="text-xs text-slate-500 mt-0.5">Saat Anda menghapus, file musnah permanen.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Area Area */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 border-b border-slate-800 pb-12">
          {/* Logo and Pitch */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img 
                src="https://i.ibb.co.com/ym8b3RFm/logo-portoify.png" 
                alt="Portoify Logo" 
                className="w-9 h-9 rounded-xl object-cover shadow-md"
                referrerPolicy="no-referrer"
              />
              <span className="font-display font-extrabold text-xl text-white tracking-tight">Portoify<span className="text-brand">.</span></span>
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Kelola modern portofolio digital, CV/resume online, dan berkas pendukung lamaran kerja Anda secara profesional.
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-3 text-sm">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">Hubungi Kami</h4>
            <div className="space-y-2 text-slate-350">
              <p className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Nomor Telp:</span> 
                <span className="font-mono">0877-9756-4757</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Alamat Email:</span> 
                <a href="mailto:portoifybusiness@gmail.com" className="hover:text-brand transition-colors font-mono">portoifybusiness@gmail.com</a>
              </p>
              <p className="leading-relaxed">
                <span className="font-semibold text-slate-400 block mb-1">Alamat:</span>
                Jln Hang Lekui, Kavling Nongsa, Kota Batam, Kepulauan Riau, Kode Pos: 29466
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-xs text-slate-500 font-mono">
            &copy; 2026 Portoify.my.id. Built for Digital Professionals. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

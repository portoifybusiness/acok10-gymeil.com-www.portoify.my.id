/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Mail, Lock, User, KeyRound, ArrowLeft, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

interface LoginRegisterProps {
  initialMode?: "login" | "register" | "forgot";
  onNavigate: (page: string) => void;
  onLoginSuccess: (user: any) => void;
}

export default function LoginRegister({ initialMode = "login", onNavigate, onLoginSuccess }: LoginRegisterProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">(initialMode);
  
  // Login input state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // Forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [recoveryLink, setRecoveryLink] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [receivedOtp, setReceivedOtp] = useState("");

  // Reset password (read from link variables)
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  // Alert system
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Parse token if loaded directly via link query parameters (simulate real redirection)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const email = params.get("email");
    if (token && email) {
      setResetEmail(email);
      setResetToken(token);
      setMode("reset");
    }
  }, []);

  // Set timeout to clear notices
  const setNotice = (err = "", succ = "") => {
    setErrorMsg(err);
    setSuccessMsg(succ);
    if (err || succ) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      return setNotice("Harap isi Email dan Password!");
    }
    setNotice();
    setLoading(true);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await resp.json();
      setLoading(false);

      if (!resp.ok) {
        return setNotice(data.message || "Gagal masuk ke sistem.");
      }

      setNotice("", data.message || "Selamat Datang!");
      setTimeout(() => {
        onLoginSuccess(data.user);
        if (data.user.role === "admin") {
          onNavigate("admin-dashboard");
        } else {
          onNavigate("user-dashboard");
        }
      }, 800);
    } catch (err: any) {
      setLoading(false);
      setNotice("Koneksi gagal ke server. Periksa server.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail || !regPassword || !regConfirmPassword) {
      return setNotice("Semua input form pendaftaran wajib diisi!");
    }
    if (regPassword !== regConfirmPassword) {
      return setNotice("Password dan konfirmasi password tidak cocok!");
    }
    setNotice();
    setLoading(true);

    try {
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: regName, email: regEmail, password: regPassword })
      });
      const data = await resp.json();
      setLoading(false);

      if (!resp.ok) {
        return setNotice(data.message || "Gagal melakukan pendaftaran.");
      }

      setNotice("", data.message || "Registrasi berhasil! Silakan login.");
      // Reset inputs
      setLoginEmail(regEmail);
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
      
      setTimeout(() => {
        setMode("login");
      }, 1500);
    } catch (err) {
      setLoading(false);
      setNotice("Server error saat mendaftar.");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      return setNotice("Alamat email wajib diisi!");
    }
    setNotice();
    setLoading(true);

    try {
      const resp = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await resp.json();
      setLoading(false);

      if (!resp.ok) {
        return setNotice(data.message || "Email tidak ditemukan.");
      }

      setResetEmail(forgotEmail);
      setForgotStep("otp");
      if (data.otp) {
        setReceivedOtp(data.otp);
      }
      setNotice("", data.message);
    } catch (err) {
      setLoading(false);
      setNotice("Error memproses permintaan reset.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      return setNotice("Kode verifikasi OTP wajib diisi!");
    }
    if (!resetNewPassword) {
      return setNotice("Masukkan password baru Anda!");
    }
    setNotice();
    setLoading(true);

    try {
      const resp = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, token: resetToken, newPassword: resetNewPassword })
      });
      const data = await resp.json();
      setLoading(false);

      if (!resp.ok) {
        return setNotice(data.message || "Gagal ganti password.");
      }

      setNotice("", data.message);
      setLoginEmail(resetEmail);
      setResetNewPassword("");
      setResetToken("");
      setForgotStep("email");
      setReceivedOtp("");
      
      setTimeout(() => {
        setMode("login");
      }, 1500);
    } catch (err) {
      setLoading(false);
      setNotice("Terjadi error di database.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Alerts Notifications Header */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border-b border-red-200 text-red-700 flex items-center gap-3 text-sm font-semibold">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dynamic Inner views */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* LEFT SIDE: Authentic Branding & Image visual details */}
          <div className="hidden md:flex flex-col justify-between p-12 bg-slate-50 border-r border-slate-200">
            <div>
              <div className="flex items-center gap-2 mb-10 cursor-pointer" onClick={() => onNavigate("landing")}>
                <img 
                  src="https://i.ibb.co.com/ym8b3RFm/logo-portoify.png" 
                  alt="Portoify Logo" 
                  className="w-10 h-10 rounded-xl object-cover shadow-md"
                  referrerPolicy="no-referrer"
                />
                <span className="font-display font-black text-2xl tracking-tight text-slate-900">Portoify</span>
              </div>
              <h2 className="text-3xl font-display font-extrabold text-slate-900 leading-tight mb-4">
                Langkah Cepat Menuju Karir Impian Baru Anda
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6 font-sans">
                Masuk ke dashboard personal Anda untuk menyusun CV profesional berkualitas tinggi, mengedit draf lamaran kerja, atau mengunggah sertifikat kompetensi berharga agar dilirik rekruter top.
              </p>
              <div className="h-0.5 w-16 bg-brand rounded-full mb-6"></div>
              <p className="text-slate-400 text-xs italic font-sans leading-relaxed">
                "Penyusunan portofolio digital masa kini menjadi lebih praktis, profesional, dan terintegrasi aman dalam satu wadah digital."
              </p>
            </div>

            <button
              onClick={() => onNavigate("landing")}
              className="mt-8 text-xs font-semibold text-slate-500 hover:text-brand transition flex items-center gap-1.5 self-start cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Home Beranda
            </button>
          </div>

          {/* RIGHT SIDE: Interactive Forms depending on state (matches user screen graphics directly) */}
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            
            <div className="md:hidden flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <img 
                  src="https://i.ibb.co.com/ym8b3RFm/logo-portoify.png" 
                  alt="Portoify Logo" 
                  className="w-8 h-8 rounded-lg object-cover shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <span className="font-display font-bold text-lg text-slate-900">Portoify</span>
              </div>
              <button onClick={() => onNavigate("landing")} className="text-xs text-slate-500 font-bold">Home</button>
            </div>

            {/* --- 1. LOGIN MODE --- */}
            {mode === "login" && (
              <div className="space-y-6">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-display font-bold text-slate-900">Login</h3>
                  <p className="text-slate-500 text-sm mt-1">Masukkan email terdaftar Anda untuk masuk ke sistem.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 pt-2">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      id="input-login-email"
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 transition text-sm"
                      required
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="input-login-password"
                      type="password"
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 transition text-sm"
                      required
                    />
                  </div>

                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => { setNotice(); setMode("forgot"); }}
                      className="text-xs font-semibold text-brand hover:underline cursor-pointer"
                    >
                      Lupa Password?
                    </button>
                  </div>

                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Login"}
                  </button>
                </form>

                <div className="text-center pt-4 border-t border-slate-100 text-xs text-slate-500">
                  Belum punya akun?{" "}
                  <button
                    onClick={() => { setNotice(); setMode("register"); }}
                    className="text-brand font-bold hover:underline cursor-pointer ml-1"
                  >
                    Daftar Sekarang
                  </button>
                </div>
              </div>
            )}

            {/* --- 2. REGISTER MODE --- */}
            {mode === "register" && (
              <div className="space-y-6">
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-display font-bold text-slate-900">Daftar Akun Baru</h3>
                  <p className="text-slate-500 text-sm mt-1">Isi formulir lengkap di bawah ini untuk memulai.</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4 pt-2">
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <User className="w-5 h-5" />
                    </span>
                    <input
                      id="input-reg-name"
                      type="text"
                      placeholder="Full Name"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 transition text-sm"
                      required
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Mail className="w-5 h-5" />
                    </span>
                    <input
                      id="input-reg-email"
                      type="email"
                      placeholder="Email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 transition text-sm"
                      required
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="input-reg-password"
                      type="password"
                      placeholder="Password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 transition text-sm"
                      required
                    />
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      id="input-reg-confirm"
                      type="password"
                      placeholder="Confirm Password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 transition text-sm"
                      required
                    />
                  </div>

                  <button
                    id="btn-reg-submit"
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Daftar"}
                  </button>
                </form>

                <div className="text-center pt-4 border-t border-slate-100 text-xs text-slate-500">
                  Sudah punya akun?{" "}
                  <button
                    onClick={() => { setNotice(); setMode("login"); }}
                    className="text-brand font-bold hover:underline cursor-pointer ml-1"
                  >
                    Login Kembali
                  </button>
                </div>
              </div>
            )}

            {/* --- 3. FORGOT PASSWORD MODE --- */}
            {mode === "forgot" && (
              <div className="space-y-6">
                {forgotStep === "email" ? (
                  <>
                    <div>
                      <h3 className="text-2xl font-display font-bold text-slate-900">Lupa Password?</h3>
                      <p className="text-slate-500 text-sm mt-1">Sistem akan secara otomatis mengirimkan kode OTP unik 6-Digit ke alamat Gmail Anda.</p>
                    </div>

                    <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                          <Mail className="w-5 h-5" />
                        </span>
                        <input
                          type="email"
                          placeholder="Masukkan alamat email Gmail terdaftar"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 transition text-sm"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Kirim OTP ke Gmail Saya"}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <div>
                      <h3 className="text-2xl font-display font-bold text-slate-900">Validasi Kode OTP</h3>
                      <p className="text-slate-500 text-sm mt-1">Kami telah mengirimkan 6 digit kode OTP ke email <strong className="text-slate-800">{resetEmail}</strong>.</p>
                    </div>

                    <form onSubmit={handleResetPassword} className="space-y-4 pt-1">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                        <p><strong>Status Pengiriman:</strong> Sukses dikirim otomatis via SMTP Gmail</p>
                        <p><strong>Sasar Email:</strong> {resetEmail}</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Kode OTP 6-Digit</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                            <KeyRound className="w-5 h-5" />
                          </span>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="Contoh: 123456"
                            value={resetToken}
                            onChange={(e) => setResetToken(e.target.value.replace(/\D/g, ''))}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 tracking-widest font-mono text-center font-bold text-lg"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Sandi Baru Anda</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                            <Lock className="w-5 h-5" />
                          </span>
                          <input
                            type="password"
                            placeholder="Masukkan sandi baru"
                            value={resetNewPassword}
                            onChange={(e) => setResetNewPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 text-sm"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Verifikasi OTP & Reset Password"}
                      </button>
                    </form>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setResetToken("");
                          setResetNewPassword("");
                          setForgotStep("email");
                          setNotice();
                        }}
                        className="text-xs text-slate-500 hover:text-brand font-semibold underline"
                      >
                        Kirim ulang kode OTP / Edit email Anda
                      </button>
                    </div>
                  </>
                )}

                <div className="text-center pt-2">
                  <button
                    onClick={() => { setNotice(); setMode("login"); }}
                    className="text-xs text-slate-500 hover:text-brand font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Login
                  </button>
                </div>
              </div>
            )}

            {/* --- 4. RESET PASSWORD IN PROGRESS (Link Fallback) --- */}
            {mode === "reset" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-display font-bold text-slate-900">Ganti Password Baru</h3>
                  <p className="text-slate-500 text-sm mt-1">Masukkan kata sandi baru untuk akun {resetEmail}.</p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xxs font-mono text-slate-500 space-y-1">
                    <p><strong>Email:</strong> {resetEmail}</p>
                    <p><strong>Reset OTP/Token:</strong> {resetToken}</p>
                  </div>

                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                      <Lock className="w-5 h-5" />
                    </span>
                    <input
                      type="password"
                      placeholder="Masukkan Password Baru Anda"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:border-brand focus:ring-1 focus:ring-brand outline-none text-slate-800 transition text-sm"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Simpan Password Baru di Database Secure
                  </button>
                </form>

                <div className="text-center pt-2">
                  <button
                    onClick={() => { setNotice(); setMode("login"); }}
                    className="text-xs text-slate-500 hover:text-brand font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Batalkan Reset
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

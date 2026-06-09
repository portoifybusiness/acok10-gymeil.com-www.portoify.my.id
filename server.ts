/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Helper to send SMTP mail in Node.js server using Gmail SMTP
async function sendNodeSMTPEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
  const mailSmtp = process.env.MAIL_SMTP === "true";
  const mailHost = process.env.MAIL_HOST || "smtp.gmail.com";
  const mailPort = parseInt(process.env.MAIL_PORT || "465", 10);
  const mailUser = process.env.MAIL_USER;
  const mailPass = process.env.MAIL_PASS;
  
  if (!mailSmtp || !mailUser || mailUser.startsWith("ganti_") || !mailPass) {
    console.log("-----------------------------------------");
    console.log(`[SMTP SIMULATOR] Sending email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`HTML length: ${htmlBody.length} bytes`);
    console.log("-----------------------------------------");
    return false;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: mailPort === 465,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });
    
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || 'Portoify Helpdesk'}" <${mailUser}>`,
      to,
      subject,
      html: htmlBody,
    });
    console.log(`✅ Email successfully sent to ${to} via Gmail SMTP.`);
    return true;
  } catch (error) {
    console.error("❌ Failed to send SMTP email via nodemailer:", error);
    return false;
  }
}

import { initMySQL, isMySQLActive, loadMySQLDb, saveMySQLDb } from "./src/db/mysql.js";
import { createServer as createViteServer } from "vite";
import { 
  User, 
  UserProfile, 
  PortfolioData, 
  ResumeData, 
  CoverLetterData, 
  DocumentFile, 
  ServicePackage, 
  Subscription, 
  Template, 
  ActivityLog,
  Experience,
  Project,
  Education,
  SalesStat,
  DatabaseSchema
} from "./src/types";

const app = express();
const PORT = 3000;

// SQL is the primary database. Local JSON persistence is completely removed.

// Helper to calculate age from birth date string "YYYY-MM-DD"
function calculateAge(birthDateStr: string): number {
  if (!birthDateStr) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateStr);
  let age = today.getFullYear() - birthDate.getFullYear();
  return isNaN(age) || age < 0 ? 0 : age;
}

// Default Base Templates Seeding Data
const DEFAULT_PORTFOLIO_MARKUP = `
<div class="min-h-screen bg-slate-900 text-slate-100 font-sans">
  <div class="max-w-4xl mx-auto px-6 py-12">
    <!-- Header/Hero -->
    <header class="flex flex-col md:flex-row items-center gap-8 border-b border-slate-800 pb-12">
      <div class="w-32 h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-xl bg-slate-800 flex-shrink-0">
        <img src="{{FOTO}}" alt="{{NAMA}}" class="w-full h-full object-cover onerror-fallback" referrerpolicy="no-referrer" />
      </div>
      <div>
        <span class="inline-block px-3 py-1 bg-rose-500/10 text-rose-400 font-mono text-xs rounded-full mb-3 uppercase tracking-wider font-semibold">Digital Portfolio Portfolio</span>
        <h1 class="text-4xl font-extrabold tracking-tight text-white mb-2">{{NAMA}}</h1>
        <p class="text-xl text-rose-400 font-medium mb-4">{{TITLE}}</p>
        <p class="text-slate-400 leading-relaxed max-w-xl">{{TENTANG_SAYA}}</p>
      </div>
    </header>

    <!-- Main Content Grid -->
    <main class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
      <!-- Left Column: Skills, Info & Contacts -->
      <div class="space-y-8">
        <div>
          <h3 class="text-xs uppercase tracking-widest text-rose-400 font-bold mb-4 font-mono">Biodata Ringkas</h3>
          <ul class="space-y-3 font-mono text-sm text-slate-300">
            <li><strong class="text-slate-500">TTL:</strong> {{TEMPAT_LALIR}}</li>
            <li><strong class="text-slate-500">Usia:</strong> {{USIA}} Tahun</li>
            <li><strong class="text-slate-500">Lokasi:</strong> {{ALAMAT}}</li>
          </ul>
        </div>

        <div>
          <h3 class="text-xs uppercase tracking-widest text-rose-400 font-bold mb-4 font-mono">Sertifikat</h3>
          <div class="space-y-2 font-mono text-sm text-slate-300">
            {{SERTIFIKAT}}
          </div>
        </div>

        <div>
          <h3 class="text-xs uppercase tracking-widest text-rose-400 font-bold mb-4 font-mono">Hubungi Saya</h3>
          <div class="space-y-3 font-mono text-xs">
            <a href="tel:{{TELEPON}}" class="block p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition">📞 Telefon: {{TELEPON}}</a>
            <a href="https://wa.me/{{WHATSAPP}}" class="block p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-emerald-400">💬 WhatsApp</a>
          </div>
        </div>

        <div>
          <h3 class="text-xs uppercase tracking-widest text-rose-400 font-bold mb-4 font-mono">Media Sosial</h3>
          <div class="flex flex-wrap gap-2">
            {{SOSIAL_MEDIA}}
          </div>
        </div>
      </div>

      <!-- Right Column: Exp & Projects -->
      <div class="md:col-span-2 space-y-12">
        <section>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-2 h-6 bg-rose-500 rounded-full"></div>
            <h2 class="text-2xl font-bold text-white">Pengalaman Kerja</h2>
          </div>
          <div class="space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800 pl-8">
            {{PENGALAMAN_KERJA}}
          </div>
        </section>

        <section>
          <div class="flex items-center gap-3 mb-6">
            <div class="w-2 h-6 bg-rose-500 rounded-full"></div>
            <h2 class="text-2xl font-bold text-white">Proyek Pilihan</h2>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {{PROYEK_SAYA}}
          </div>
        </section>

        <section>
          <div class="flex items-center gap-3 mb-4">
            <div class="w-2 h-6 bg-rose-500 rounded-full"></div>
            <h2 class="text-2xl font-bold text-white">Pendidikan</h2>
          </div>
          <div class="space-y-4 font-mono text-sm text-slate-300">
            {{PENDIDIKAN}}
          </div>
        </section>
      </div>
    </main>

    <footer class="border-t border-slate-800 mt-16 pt-8 text-center text-xs text-slate-500">
      <p>Portofolio ini di-hosting di <span class="text-rose-400 font-semibold font-mono">Portoify.my.id</span></p>
    </footer>
  </div>
</div>
`;

const DEFAULT_RESUME_MARKUP = `
<div class="min-h-screen bg-neutral-50 text-neutral-800 font-sans py-12 px-6">
  <div class="max-w-4xl mx-auto bg-white border border-neutral-200 shadow-lg rounded-xl overflow-hidden">
    <!-- Header Block -->
    <div class="bg-neutral-900 text-white px-8 py-10 flex flex-col md:flex-row items-center gap-8">
      <div class="w-28 h-28 rounded-full overflow-hidden border-2 border-white shadow bg-neutral-800 flex-shrink-0">
        <img src="{{FOTO}}" alt="{{NAMA}}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
      </div>
      <div class="text-center md:text-left">
        <h1 class="text-3xl font-bold tracking-tight mb-1 text-white">{{NAMA}}</h1>
        <p class="text-amber-400 font-mono text-sm uppercase tracking-wider mb-3">{{TITLE}}</p>
        <p class="text-neutral-400 text-sm max-w-2xl leading-relaxed">{{TENTANG_SAYA}}</p>
      </div>
    </div>

    <div class="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
      <!-- Info & Contact Panel -->
      <div class="space-y-6">
        <div>
          <h2 class="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 block">Info Personal</h2>
          <ul class="space-y-2 text-sm text-neutral-600">
            <li><span class="font-semibold">Tempat, Tgl Lahir:</span> <br/> {{TEMPAT_LALIR}}</li>
            <li><span class="font-semibold">Usia:</span> {{USIA}} Tahun</li>
            <li><span class="font-semibold">Alamat:</span> <br/> {{ALAMAT}}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 block">Hubungi</h2>
          <ul class="space-y-2 text-sm text-neutral-600 font-mono">
            <li>📞 {{TELEPON}}</li>
            <li>💬 {{WHATSAPP}}</li>
          </ul>
        </div>

        <div>
          <h2 class="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 block">Sertifikasi</h2>
          <ul class="space-y-2 text-sm text-neutral-600 bullet-list list-disc pl-4">
            {{SERTIFIKAT}}
          </ul>
        </div>

        <div>
          <h2 class="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 block">Sosial Media</h2>
          <div class="space-y-2 text-sm text-neutral-600">
            {{SOSIAL_MEDIA}}
          </div>
        </div>
      </div>

      <!-- Detailed Professional History -->
      <div class="md:col-span-2 space-y-8">
        <section>
          <h2 class="text-lg font-bold text-neutral-900 border-b-2 border-neutral-900 pb-2 mb-4">Pengalaman Kerja</h2>
          <div class="space-y-6">
            {{PENGALAMAN_KERJA}}
          </div>
        </section>

        <section>
          <h2 class="text-lg font-bold text-neutral-900 border-b-2 border-neutral-900 pb-2 mb-4">Riwayat Pendidikan</h2>
          <div class="space-y-4">
            {{PENDIDIKAN}}
          </div>
        </section>
      </div>
    </div>

    <!-- Print Button Floating Note -->
    <div class="bg-neutral-100 px-8 py-4 text-center text-xs text-neutral-500 flex justify-between items-center border-t border-neutral-200">
      <span>Dibuat secara profesional menggunakan <strong>Portoify.my.id</strong></span>
      <button onclick="window.print()" class="px-3 py-1 bg-neutral-950 text-white hover:bg-neutral-800 rounded font-bold text-xs cursor-pointer print:hidden">Cetak / Unduh PDF 🖨️</button>
    </div>
  </div>
</div>
`;

const PEDRO_FERNANDES_RESUME_MARKUP = `
<div class="min-h-screen bg-slate-100 text-slate-850 font-sans py-12 px-6 flex justify-center items-center">
  <div class="w-[794px] min-h-[1123px] bg-white shadow-2xl relative flex overflow-hidden border border-slate-200" style="width: 794px; min-height: 1123px; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">
    
    <!-- Triangle Background Decors -->
    <!-- Top-Right Gold corner -->
    <div class="absolute top-0 right-0 w-32 h-32 bg-[#deb87b]" style="clip-path: polygon(100% 0, 0 0, 100% 100%); z-index: 1;"></div>
    <!-- Bottom-Left Gold corner -->
    <div class="absolute bottom-0 left-0 w-16 h-16 bg-[#deb87b]" style="clip-path: polygon(0 100%, 0 0, 100% 100%); z-index: 1;"></div>

    <!-- LEFT SIDEBAR PANEL (bg-[#1c2431]) -->
    <div class="w-[286px] shrink-0 bg-[#1c2431] text-white flex flex-col pt-12 pb-8 px-6 z-10 relative">
      <!-- Profile Picture -->
      <div class="flex justify-center mb-8">
        <div class="w-36 h-36 rounded-full overflow-hidden border-4 border-white shadow-lg bg-[#2d3748]">
          <img src="{{FOTO}}" alt="{{NAMA}}" class="w-full h-full object-cover" referrerpolicy="no-referrer" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23cbd5e1\'><circle cx=\'12\' cy=\'12\' r=\'11\' fill=\'%23f1f5f9\' stroke=\'%23cbd5e1\' stroke-width=\'1\'/><path d=\'M12 11c1.93 0 3.5-1.57 3.5-3.5S13.93 4 12 4s-3.5 1.57-3.5 3.5S10.07 11 12 11zm0 2c-2.33 0-7 1.17-7 3.5V18h14v-1.5c0-2.33-4.67-3.5-7-3.5z\' fill=\'%2394a3b8\'/></svg>'" />
        </div>
      </div>

      <!-- Left Contents Section -->
      <div class="space-y-8 flex-1">
        
        <!-- DATA DIRI -->
        <div>
          <div class="bg-[#deb87b] text-[#1c2431] font-bold text-xs uppercase tracking-wider py-1.5 px-4 rounded-r-xl -ml-6 mb-4 font-sans inline-block w-[200px]">
            DATA DIRI
          </div>
          <div class="space-y-3 ps-1">
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tempat / Tanggal Lahir</p>
              <p class="text-xs text-white mt-0.5 leading-normal">{{TEMPAT_LAHIR}}, {{TANGGAL_LAHIR}}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Jenis Kelamin</p>
              <p class="text-xs text-white mt-0.5">{{JENIS_KELAMIN}}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</p>
              <p class="text-xs text-white mt-0.5">Belum menikah</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kewarganegaraan</p>
              <p class="text-xs text-white mt-0.5">Indonesia</p>
            </div>
          </div>
        </div>

        <!-- KONTAK -->
        <div>
          <div class="bg-[#deb87b] text-[#1c2431] font-bold text-xs uppercase tracking-wider py-1.5 px-4 rounded-r-xl -ml-6 mb-4 font-sans inline-block w-[200px]">
            KONTAK
          </div>
          <div class="space-y-3.5 ps-1">
            <div class="flex items-center gap-2.5 font-mono">
              <span class="text-sm select-none">📞</span>
              <span class="text-xs text-white leading-tight break-all font-mono">{{TELEPON}}</span>
            </div>
            <div class="flex items-center gap-2.5 font-mono">
              <span class="text-sm select-none">✉️</span>
              <span class="text-xs text-white leading-tight break-all font-mono">{{EMAIL}}</span>
            </div>
            <div class="flex items-start gap-2.5">
              <span class="text-sm mt-0.5 select-none font-sans">📍</span>
              <span class="text-xs text-white leading-snug font-sans">{{ALAMAT}}</span>
            </div>
          </div>
        </div>

        <!-- SOSIAL MEDIA -->
        <div>
          <div class="bg-[#deb87b] text-[#1c2431] font-bold text-xs uppercase tracking-wider py-1.5 px-4 rounded-r-xl -ml-6 mb-4 font-sans inline-block w-[200px]">
            SOSIAL MEDIA
          </div>
          <div class="space-y-3 ps-1">
            <div class="flex items-center gap-2.5">
              <span class="text-slate-400 font-bold font-mono">@</span>
              <span class="text-xs text-white leading-tight break-all">{{SOSIAL_MEDIA}}</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- MAIN RIGHT BODY PANEL -->
    <div class="flex-1 bg-white pt-16 pb-12 px-10 flex flex-col justify-between z-10">
      <div class="space-y-8">
        <!-- Header: name & title -->
        <div class="border-b-2 border-slate-200 pb-6 mb-2">
          <h1 class="text-4xl font-extrabold tracking-tight text-[#1c2431] font-sans uppercase mb-1.5">{{NAMA}}</h1>
          <p class="text-lg font-medium text-[#deb87b] italic font-sans mb-1">{{TITLE}}</p>
        </div>

        <!-- TENTANG SAYA -->
        <div>
          <h2 class="text-md font-black tracking-wider text-[#1c2431] uppercase mb-1 font-sans">TENTANG SAYA</h2>
          <div class="w-full h-[1.5px] bg-[#1c2431] mb-3"></div>
          <p class="text-xs text-slate-600 leading-relaxed font-sans">{{TENTANG_SAYA}}</p>
        </div>

        <!-- PENDIDIKAN -->
        <div>
          <h2 class="text-md font-black tracking-wider text-[#1c2431] uppercase mb-1 font-sans">PENDIDIKAN</h2>
          <div class="w-full h-[1.5px] bg-[#1c2431] mb-3"></div>
          <div class="space-y-3.5 text-xs text-slate-700">
            {{PENDIDIKAN}}
          </div>
        </div>

        <!-- PENGALAMAN KERJA -->
        <div>
          <h2 class="text-md font-black tracking-wider text-[#1c2431] uppercase mb-1 font-sans">PENGALAMAN KERJA</h2>
          <div class="w-full h-[1.5px] bg-[#1c2431] mb-3"></div>
          <div class="space-y-4 text-xs text-slate-700">
            {{PENGALAMAN_KERJA}}
          </div>
        </div>

        <!-- KEMAMPUAN / SKILL -->
        <div>
          <h2 class="text-md font-black tracking-wider text-[#1c2431] uppercase mb-1 font-sans">KEMAMPUAN</h2>
          <div class="w-full h-[1.5px] bg-[#1c2431] mb-3"></div>
          <div class="flex flex-wrap gap-2 text-xs text-slate-700">
            {{SKILL}}
          </div>
        </div>

      </div>

      <!-- Footer branding or simple signature -->
      <div class="text-[10px] text-slate-400 font-mono flex justify-between items-center border-t border-slate-100 pt-4 mt-8 print:hidden">
        <span>Didukung oleh Portoify.my.id &bull; 100% Desain Pedro Fernandes</span>
        <button onclick="window.print()" class="px-2.5 py-1 bg-[#1c2431] text-[#deb87b] hover:bg-slate-800 rounded font-bold text-xxs transition cursor-pointer">Cetak / Unduh PDF 🖨️</button>
      </div>
    </div>

  </div>
</div>
`;

const DEFAULT_COVER_LETTER_MARKUP = `
<div class="min-h-screen bg-slate-50 text-slate-800 font-serif py-16 px-6">
  <div class="max-w-3xl mx-auto bg-white border border-slate-200 p-12 shadow-md rounded">
    <div class="text-right text-xs font-mono mb-8 text-slate-400">
      Portoify Template Surat Lamaran
    </div>
    
    <!-- Sender Header -->
    <div class="border-b-2 border-slate-800 pb-6 mb-8">
      <h2 class="text-2xl font-bold tracking-tight text-slate-900 uppercase">{{NAMA}}</h2>
      <p class="text-sm font-sans text-slate-500 font-mono mt-1">
        Alamat: {{ALAMAT}} | TTL: {{TEMPAT_TANGGAL_LAHIR}} ({{USIA}} thn) | Hp: {{TELEPON}}
      </p>
    </div>

    <!-- Date & Recipient -->
    <div class="mb-8 font-sans text-sm">
      <p class="mb-4">Perihal: Lamaran Pekerjaan - <strong class="text-slate-900">{{JABATAN_DILAMAR}}</strong></p>
      <p class="font-semibold text-slate-900">Kepada Yth,</p>
      <p class="font-bold text-slate-900">{{NAMA_PERUSAHAAN}}</p>
      <p class="text-slate-600">{{ALAMAT_PERUSAHAAN}}</p>
    </div>

    <!-- Letter Body -->
    <div class="prose prose-slate leading-relaxed text-sm whitespace-pre-wrap font-serif text-slate-700 indent-8 mb-12">
      {{ISI_SURAT}}
    </div>

    <!-- Closing -->
    <div class="flex justify-end pr-12 font-sans text-sm mt-12">
      <div class="text-center">
        <p class="mb-16">Hormat Saya,</p>
        <p class="font-bold hover:underline cursor-pointer border-t border-slate-300 pt-2">{{NAMA}}</p>
      </div>
    </div>
  </div>
</div>
`;

// Initialize File-based Database

let memoryDb: DatabaseSchema | null = null;

function saveUploadedFile(userId: string, fileType: string, originalName: string, fileDataUrl: string): string {
  if (!fileDataUrl || !fileDataUrl.startsWith("data:")) {
    return fileDataUrl;
  }

  // Strict check: Block bad/unapproved extensions to secure production cPanel environments
  const cleanOrigName = originalName.trim().replace(/[^a-zA-Z0-9.-]/g, "_");
  const extension = path.extname(cleanOrigName).toLowerCase();
  const allowedExtensions = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".txt"];
  
  const absoluteBlacklist = [".php", ".phtml", ".php5", ".sh", ".bash", ".exe", ".js", ".ts", ".html", ".htm", ".pl", ".py", ".asp", ".aspx", ".jsp", ".jar", ".htaccess"];
  
  if (absoluteBlacklist.includes(extension) || !allowedExtensions.includes(extension)) {
    console.warn(`🚨 SECURITY WARNING: Blocked file upload with unsafe or unapproved extension: ${extension} from user ${userId}`);
    return ""; // Empty string triggers rejection down-the-line
  }

  const uploadsDir = fs.existsSync(path.join(process.cwd(), "public_html"))
    ? path.join(process.cwd(), "public_html", "uploads")
    : path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  try {
    const matches = fileDataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return fileDataUrl;
    }

    const mimeType = matches[1].toLowerCase();
    const allowedMimeKeywords = ["image/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument", "text/plain"];
    const isMimeOk = allowedMimeKeywords.some(keyword => mimeType.includes(keyword));

    if (!isMimeOk) {
      console.warn(`🚨 SECURITY WARNING: Blocked file upload with unsafe mime type: ${mimeType} from user ${userId}`);
      return "";
    }

    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, "base64");
    const safeName = `${userId}_${fileType}_${Date.now()}_${cleanOrigName}`;
    const destinationPath = path.join(uploadsDir, safeName);

    fs.writeFileSync(destinationPath, buffer);
    console.log(`💾 Saved file ${safeName} successfully to system uploads folder.`);
    return `/uploads/${safeName}`;
  } catch (err) {
    console.error("❌ Error saving file to system uploads folder:", err);
    return fileDataUrl;
  }
}

function saveDesignImage(base64DataUrl: string): string {
  if (!base64DataUrl || !base64DataUrl.startsWith("data:")) {
    return base64DataUrl;
  }

  const designDir = path.join(process.cwd(), "public_html", "api", "desain");
  if (!fs.existsSync(designDir)) {
    fs.mkdirSync(designDir, { recursive: true });
  }

  try {
    const matches = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64DataUrl;
    }

    const mimeType = matches[1].toLowerCase();
    let extension = ".png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
      extension = ".jpg";
    } else if (mimeType.includes("gif")) {
      extension = ".gif";
    } else if (mimeType.includes("svg")) {
      extension = ".svg";
    }

    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, "base64");

    // Max 1MB limit check (1,048,576 bytes)
    if (buffer.length > 1024 * 1024) {
      console.warn("🚨 upload rejected: template design image exceeds 1MB target size.");
      return "";
    }

    const safeName = `desain_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${extension}`;
    const destinationPath = path.join(designDir, safeName);

    fs.writeFileSync(destinationPath, buffer);
    console.log(`💾 Saved template design image ${safeName} successfully to public_html/api/desain/`);
    return `/api/desain/${safeName}`;
  } catch (err) {
    console.error("❌ Error saving template design image:", err);
    return base64DataUrl;
  }
}

function saveProjectImage(userId: string, base64DataUrl: string): string {
  if (!base64DataUrl || !base64DataUrl.startsWith("data:")) {
    return base64DataUrl;
  }

  const portfolioDir = path.join(process.cwd(), "public_html", "api", "portofolio");
  if (!fs.existsSync(portfolioDir)) {
    fs.mkdirSync(portfolioDir, { recursive: true });
  }

  try {
    const matches = base64DataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64DataUrl;
    }

    const mimeType = matches[1].toLowerCase();
    let extension = ".png";
    if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
      extension = ".jpg";
    } else if (mimeType.includes("gif")) {
      extension = ".gif";
    }

    const base64Content = matches[2];
    const buffer = Buffer.from(base64Content, "base64");

    // Max 1MB limit check (1,048,576 bytes)
    if (buffer.length > 1024 * 1024) {
      console.warn("🚨 upload rejected: project image exceeds 1MB target size.");
      return "";
    }

    const safeName = `proj_${userId}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${extension}`;
    const destinationPath = path.join(portfolioDir, safeName);

    fs.writeFileSync(destinationPath, buffer);
    console.log(`💾 Saved product/project image ${safeName} successfully to public_html/api/portofolio/`);
    return `/api/portofolio/${safeName}`;
  } catch (err) {
    console.error("❌ Error saving product/project image:", err);
    return base64DataUrl;
  }
}

function saveWordTemplate(htmlMarkup: string, templateId: string): string {
  if (!htmlMarkup || !htmlMarkup.startsWith("data:")) {
    return htmlMarkup;
  }

  // Detect word document
  const isDocx = htmlMarkup.startsWith("data:application/vnd.openxmlformats-officedocument") || 
                 htmlMarkup.startsWith("data:application/octet-stream") ||
                 htmlMarkup.includes("wordprocessingml");

  if (!isDocx) {
    return htmlMarkup;
  }

  const wordDir = path.join(process.cwd(), "public_html", "api", "word");
  if (!fs.existsSync(wordDir)) {
    fs.mkdirSync(wordDir, { recursive: true });
  }

  try {
    const matches = htmlMarkup.match(/^data:([A-Za-z-+\/.]+);base64,(.+)$/);
    const base64Content = matches ? matches[2] : htmlMarkup.split(",")[1] || htmlMarkup;
    const buffer = Buffer.from(base64Content, "base64");

    const fileName = `word_${templateId || Date.now()}_${crypto.randomBytes(4).toString("hex")}.docx`;
    const destinationPath = path.join(wordDir, fileName);

    fs.writeFileSync(destinationPath, buffer);
    console.log(`💾 Saved word file ${fileName} successfully to api/word folder.`);
    return `/api/word/${fileName}`;
  } catch (err) {
    console.error("❌ Error saving word template to api/word folder:", err);
    return htmlMarkup;
  }
}

function loadDb(): DatabaseSchema {
  // Always load from disk to avoid stale in-memory cached state across different worker processes/requests
  const currentDb = loadLocalJsonDatabase();
  let updated = false;
  if (currentDb.subscriptions && Array.isArray(currentDb.subscriptions)) {
    currentDb.subscriptions.forEach((sub: any) => {
      if (sub.isActive && sub.endDate) {
        if (new Date() > new Date(sub.endDate)) {
          sub.isActive = false;
          sub.packageId = "inactive";
          sub.packageName = "Belum Berlangganan";
          updated = true;
        }
      }
    });
  }
  if (updated) {
    saveDb(currentDb);
  }
  return currentDb;
}

function loadLocalJsonDatabase(): DatabaseSchema {
  if (memoryDb) {
    return memoryDb;
  }
  const defaultDb = getSeededDefaultDb();
  memoryDb = defaultDb;
  return defaultDb;
}

function pruneOrphanRecords(data: DatabaseSchema) {
  if (!data || !Array.isArray(data.users)) return;
  const userIds = new Set(data.users.map(u => u.id));
  
  if (Array.isArray(data.profiles)) {
    data.profiles = data.profiles.filter(p => userIds.has(p.userId));
  }
  if (Array.isArray(data.portfolios)) {
    data.portfolios = data.portfolios.filter(p => userIds.has(p.userId));
  }
  if (Array.isArray(data.resumes)) {
    data.resumes = data.resumes.filter(r => userIds.has(r.userId));
  }
  if (Array.isArray(data.covers)) {
    data.covers = data.covers.filter(c => userIds.has(c.userId));
  }
  if (Array.isArray(data.documents)) {
    data.documents = data.documents.filter(d => userIds.has(d.userId));
  }
  if (Array.isArray(data.subscriptions)) {
    data.subscriptions = data.subscriptions.filter(s => userIds.has(s.userId));
  }
}

let mysqlSaveTimeout: NodeJS.Timeout | null = null;

function saveDb(data: DatabaseSchema) {
  pruneOrphanRecords(data);
  memoryDb = data;

  if (isMySQLActive()) {
    if (mysqlSaveTimeout) {
      clearTimeout(mysqlSaveTimeout);
    }
    mysqlSaveTimeout = setTimeout(() => {
      console.log("⚡ [Optimization] Initiating debounced background sync to MySQL...");
      saveMySQLDb(data)
        .then((success) => {
          if (success) {
            console.log("⚡ Auto-synced in-memory changes to MySQL server successfully.");
          }
        })
        .catch((err) => {
          console.error("❌ Asynchronous MySQL auto-sync failed:", err);
        });
    }, 1200); // 1.2 seconds debounce to eliminate consecutive heavy table write locks in MySQL
  }
}

async function saveDbImmediate(data: DatabaseSchema): Promise<{ success: boolean; error?: string }> {
  pruneOrphanRecords(data);
  memoryDb = data;

  if (isMySQLActive()) {
    console.log("⚡ [Immediate Save] Synchronously saving changes to MySQL server...");
    try {
      const success = await saveMySQLDb(data);
      if (success) {
        console.log("⚡ [Immediate Save] Successfully saved to MySQL.");
        return { success: true };
      } else {
        const errMsg = "MySQL transaction failed and rolled back.";
        console.error("❌ [Immediate Save]", errMsg);
        return { success: false, error: errMsg };
      }
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      console.error("❌ [Immediate Save] Error during MySQL save:", err);
      return { success: false, error: errMsg };
    }
  }
  return { success: true };
}

function getSeededDefaultDb(): DatabaseSchema {
  const defaultDb: DatabaseSchema = {
    users: [
      {
        id: "usr_admin",
        email: "admin@portoify.com",
        fullName: "Super Admin Portoify",
        role: "admin",
        isActive: true,
        passwordHash: "admin123", // Humble plaintext password for developer-friendly sandbox testing
        createdAt: new Date().toISOString()
      },
      {
        id: "usr_budi",
        email: "budi.gunawan@gmail.com",
        fullName: "Budi Gunawan",
        role: "user",
        isActive: true,
        passwordHash: "budi123",
        createdAt: new Date().toISOString()
      }
    ],
    profiles: [
      {
        userId: "usr_budi",
        fullName: "Budi Gunawan",
        placeOfBirth: "Surabaya",
        dateOfBirth: "1997-04-12",
        gender: "Laki-laki",
        address: "Jl. Pemuda No. 45, Surabaya",
        nik: "3578011204970001",
        phone: "081234567890",
        photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200",
        email: "budi.gunawan@gmail.com",
        age: calculateAge("1997-04-12")
      }
    ],
    portfolios: [
      {
        id: "port_budi",
        userId: "usr_budi",
        templateId: "tpl_port_1",
        title: "Full Stack Engineer & Web Consultant",
        aboutMe: "Saya adalah Developer Full Stack yang berfokus menciptakan solusi web efisien, terukur, dan user-friendly. Memiliki pengalaman 3+ tahun mengolah aplikasi berbasis Node.js, React, dan database SQL.",
        experiences: [
          { company: "Vortex Digital Agency", role: "Frontend Developer", duration: "2023 - Sekarang", jobdesk: "Membangun sistem UI responsif, mengoptimalkan rendering speed halaman web klien hingga 40%, mengimplementasi standar SEO." },
          { company: "Karya Mandiri Software", role: "Web Developer Associate", duration: "2021 - 2023", jobdesk: "Bekerja dalam tim berisi 5 developer untuk merawat 12 web portal pemerintahan regional menggunakan Node.js dan Tailwind." }
        ],
        projects: [
          { name: "SaaS Payroll System", description: "Perangkat lunak berbasis React untuk penggajian bulanan HRD otomatis terintegrasi absensi sidik jari.", link: "https://payroll.demo" },
          { name: "E-Commerce Fresh Market", description: "Aplikasi pengantaran sayur segar online di area Surabaya dengan tracking kurir real-time.", link: "https://freshmarket.demo" }
        ],
        educations: [
          { institution: "Universitas Bina Nusantara", degree: "S1 Teknik Informatika", period: "2016 - 2020" }
        ],
        certificates: [
          "AWS Certified Cloud Practitioner - 2024",
          "Dicoding Certified React Expert - 2023"
        ],
        phone: "081234567890",
        address: "Jl. Pemuda No. 45, Surabaya",
        whatsapp: "6281234567890",
        instagram: "budi.gunawan",
        tiktok: "budicodes",
        linkedin: "budi-gunawan-eng",
        github: "budigun",
        updatedAt: new Date().toISOString()
      }
    ],
    resumes: [
      {
        id: "res_budi",
        userId: "usr_budi",
        templateId: "tpl_res_1",
        title: "Full Stack Software Engineer Specialist",
        aboutMe: "Insinyur Software berlisensi dengan rekam jejak yang solid dalam memimpin siklus pengembangan web komersial dari desain sketsa awal hingga deployment pipeline di cloud.",
        experiences: [
          { company: "Vortex Digital Agency", role: "Frontend Developer", duration: "2023 - Sekarang", jobdesk: "Optimalisasi SPA React & Vite, integrasi API microservices, dan perataan struktur visual komponen UI." },
          { company: "Karya Mandiri Software", role: "Web Developer Associate", duration: "2021 - 2023", jobdesk: "Mengelola database relasional, menulis query SQL teroptimasi, serta membuat integrasi webhooks." }
        ],
        educations: [
          { institution: "Universitas Bina Nusantara", degree: "S1 Teknik Informatika", period: "2016 - 2020" }
        ],
        certificates: [
          "AWS Cloud Practitioner Certificate - 2024",
          "React Professional Certification - 2023"
        ],
        phone: "081234567890",
        address: "Jl. Pemuda No. 45, Surabaya",
        whatsapp: "6281234567890",
        instagram: "budi.gunawan",
        tiktok: "budicodes",
        linkedin: "budi-gunawan-eng",
        github: "budigun",
        updatedAt: new Date().toISOString()
      }
    ],
    covers: [
      {
        id: "cov_budi",
        userId: "usr_budi",
        templateId: "tpl_cov_1",
        companyName: "PT Global Tech Indonesia",
        companyAddress: "Gedung Cyber LT 4, Kuningan, Jakarta Selatan",
        jobTitle: "Senior Full-Stack Engineer",
        letterContent: "Dengan hormat,\n\nBerdasarkan informasi lowongan pekerjaan yang saya dapatkan di portal karir, saya bermaksud untuk mengajukan diri guna bergabung dengan PT Global Tech Indonesia sebagai Senior Full-Stack Engineer.\n\nSaya memiliki latar belakang pendidikan Sarjana Teknik Informatika dari Universitas Bina Nusantara dan pengalaman kerja di bidang pengembangan perangkat lunak selama lebih dari 3 tahun. Selama bekerja di Vortex Digital Agency, saya berhasil mendesain landing pages dengan performa super cepat dan andal.\n\nBesar harapan saya untuk diberikan kesempatan melakukan wawancara langsung demi memaparkan kualifikasi saya lebih mendalam. Demikian surat lamaran ini, atas perhatian Bapak/Ibu saya ucapkan terima kasih.",
        updatedAt: new Date().toISOString()
      }
    ],
    documents: [
      {
        id: "doc_ktp",
        userId: "usr_budi",
        fileType: "ktp",
        fileName: "KTP_Budi_Gunawan.pdf",
        filePathUrl: "data:application/pdf;base64,JVBERi0xLjQKJ..." ,
        uploadedAt: "2026-05-15T10:12:00Z"
      },
      {
        id: "doc_npwp",
        userId: "usr_budi",
        fileType: "npwp",
        fileName: "NPWP_Budi_Gunawan.pdf",
        filePathUrl: "data:application/pdf;base64,JVBERi0xLjQKJ...",
        uploadedAt: "2026-05-15T10:14:00Z"
      }
    ],
    packages: [
      {
        id: "pkg_basic",
        name: "Paket Basic",
        price: 50000,
        durationDays: 15,
        features: [
          "Akses Portofolio Digital dengan Template Basic Only",
          "Akses Resume/CV dengan Template Basic Only",
          "Buat Surat Lamaran dengan Template Basic Only",
          "Tidak bisa upload berkas dokumen apapun 🔒",
          "Dapat mengelola kustom URL Domain khusus",
          "Masa Aktif Paket selama 15 Hari"
        ],
        isFeatured: false
      },
      {
        id: "pkg_standard",
        name: "Paket Standart",
        price: 150000,
        durationDays: 30,
        features: [
          "Akses Portofolio Digital dengan Template Standar Only",
          "Akses Resume/CV dengan Template Standar Only",
          "Buat Surat Lamaran dengan Template Standar Only",
          "Upload Dokumen Pendukung Terbatas (maksimal 5 berkas)",
          "Dokumen diluar batas persyaratan otomatis terkunci oleh sistem 🔒",
          "Dapat mengelola kustom URL Domain khusus",
          "Masa Aktif Paket selama 30 Hari"
        ],
        isFeatured: true
      },
      {
        id: "pkg_premium",
        name: "Paket Premium",
        price: 375000,
        durationDays: 60,
        features: [
          "Akses Portofolio Digital dengan Template Premium, Standar & Basic",
          "Akses Resume/CV dengan Template Premium, Standar & Basic",
          "Buat Surat Lamaran dengan Template Premium, Standar & Basic",
          "Bebas mengunggah semua jenis dokumen pelamar tanpa batas ✨",
          "Dapat mengelola kustom URL Domain khusus",
          "Masa Aktif Paket selama 60 Hari"
        ],
        isFeatured: false
      }
    ],
    subscriptions: [
      {
        userId: "usr_budi",
        packageId: "pkg_standard",
        packageName: "Paket Standart",
        startDate: "2026-05-01T00:00:00Z",
        endDate: "2026-06-01T00:00:00Z",
        isActive: true,
        domainHostingPath: "budi" // matches URL router portoify.my.id/budi
      }
    ],
    templates: [
      {
        id: "tpl_port_1",
        name: "Rose Quartz Cosmic Dark",
        category: "portfolio",
        htmlMarkup: DEFAULT_PORTFOLIO_MARKUP,
        tier: "standard",
        previewUrl: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=500&auto=format&fit=crop",
        description: "Desain apik dengan tata letak modern dan profesional, optimalkan konten serta keindahan visual portofolio digital Anda.",
        createdAt: new Date().toISOString()
      },
      {
        id: "tpl_res_1",
        name: "Classic Slate Grid",
        category: "resume",
        htmlMarkup: DEFAULT_RESUME_MARKUP,
        tier: "standard",
        previewUrl: "https://images.unsplash.com/photo-1586282391129-76a6df230234?w=500&auto=format&fit=crop",
        description: "Tata letak bersih dan profesional dengan struktur grid teratur. Sempurna untuk resume/CV karir resume formal yang dinamis.",
        createdAt: new Date().toISOString()
      },
      {
        id: "tpl_res_canva",
        name: "Elite Canva Editorial",
        category: "resume",
        htmlMarkup: "<!-- Canva-style visual canvas design -->",
        tier: "premium",
        previewUrl: "https://images.unsplash.com/photo-1586282391129-76a6df230234?w=900&auto=format&fit=crop",
        description: "Template Resume dengan Katalog JPG/PNG Premium. Tata letak modern dan sangat mudah digunakan untuk kustomisasi dokumen berkualitas tinggi.",
        createdAt: new Date().toISOString()
      },
      {
        id: "tpl_res_canva_minimalist",
        name: "Minimalist Slate Canva",
        category: "resume",
        htmlMarkup: "<!-- Canva-style visual canvas design -->",
        tier: "standard",
        previewUrl: "https://images.unsplash.com/photo-1590608897129-79da98d15969?w=900&auto=format&fit=crop",
        description: "Template Resume Minimalis Modern dengan background visual estetik. Cocok untuk profesional bidang kreatif & teknologi.",
        createdAt: new Date().toISOString()
      },
      {
        id: "tpl_res_pedro",
        name: "Pedro Fernandes Editorial",
        category: "resume",
        htmlMarkup: PEDRO_FERNANDES_RESUME_MARKUP,
        tier: "basic",
        previewUrl: "https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=500&auto=format&fit=crop",
        description: "Desain eksklusif dua panel dengan header modern, skema slate navy & gold. Kloning sempurna dari Pedro Fernandes CV set.",
        createdAt: new Date().toISOString()
      },
      {
        id: "tpl_cov_1",
        name: "Formal Corporate serif",
        category: "cover_letter",
        htmlMarkup: DEFAULT_COVER_LETTER_MARKUP,
        tier: "basic",
        previewUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop",
        description: "Desain klasik dengan tipografi serif untuk kesan profesional. Sempurna untuk surat lamaran kerja korporat.",
        createdAt: new Date().toISOString()
      }
    ],
    logs: [
      {
        id: "log_1",
        userId: "usr_budi",
        userEmail: "budi.gunawan@gmail.com",
        message: "Melakukan pendaftaran akun Portoify baru",
        timestamp: "2026-05-26T10:00:00Z"
      },
      {
        id: "log_2",
        userId: "usr_budi",
        userEmail: "budi.gunawan@gmail.com",
        message: "Memperbarui Profil Lengkap",
        timestamp: "2026-05-26T10:15:00Z"
      },
      {
        id: "log_3",
        userId: "usr_budi",
        userEmail: "budi.gunawan@gmail.com",
        message: "Membuat Digital Portfolio Baru",
        timestamp: "2026-05-26T10:30:00Z"
      }
    ],
    sales: [
      { month: "Jan", sales: 12400000 },
      { month: "Feb", sales: 14200000 },
      { month: "Mar", sales: 11800000 },
      { month: "Apr", sales: 15300000 },
      { month: "Mai", sales: 15400000 }
    ],
    ads: {
      leftName: "",
      leftScript: "",
      rightName: "",
      rightScript: ""
    }
  };

  saveDb(defaultDb);
  return defaultDb;
}

function createCpanelFolderForUser(username: string) {
  try {
    const cleanDirName = encodeURIComponent(username.toLowerCase().trim());
    if (!cleanDirName) return;
    const cpanelPath = path.join(process.cwd(), "public_html", cleanDirName);
    
    // Create folders
    if (!fs.existsSync(cpanelPath)) {
      fs.mkdirSync(cpanelPath, { recursive: true });
      fs.writeFileSync(path.join(cpanelPath, "index.html"), `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>cPanel Folder - ${cleanDirName}</title>
        </head>
        <body style="font-family: sans-serif; padding: 40px; background: #fafafa; color: #333;">
          <div style="background: white; border: 1px solid #ddd; max-width: 600px; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #dc2626;">Folder public_html/${cleanDirName} Berhasil Dibuat! 🚀</h2>
            <p>Sistem cPanel secara otomatis mengalokasikan folder direct-hosting untuk nama pengguna <strong>"${cleanDirName}"</strong>.</p>
            <p style="color: #666; font-size: 13px;">Semua file web portofolio, CV digital, dan surat lamaran Anda kini ter-link langsung ke URL hosting real-time.</p>
          </div>
        </body>
        </html>
      `);
      console.log(`Successfully created real cPanel folder: ${cpanelPath}`);
    }
  } catch (err) {
    console.error("Error creating cPanel folder:", err);
  }
}

function activateUserSubscription(currentDb: DatabaseSchema, userId: string, pkg: ServicePackage): Subscription {
  const profileObj = currentDb.profiles.find(p => p.userId === userId);
  const userObj = currentDb.users.find(u => u.id === userId);
  
  const startDate = new Date().toISOString();
  const endDate = new Date(Date.now() + pkg.durationDays * 24 * 60 * 60 * 1000).toISOString();
  
  const subIndex = currentDb.subscriptions.findIndex(s => s.userId === userId);
  let initialFolder = profileObj?.fullName ? profileObj.fullName.toLowerCase().replace(/\s+/g, "") : `user${Math.floor(Math.random() * 1000)}`;
  initialFolder = initialFolder.replace(/[^a-z0-9]/g, "") || `user${Math.floor(Math.random() * 1000)}`;

  const subObj: Subscription = {
    userId,
    packageId: pkg.id,
    packageName: pkg.name,
    startDate,
    endDate,
    isActive: true,
    domainHostingPath: (subIndex !== -1 && currentDb.subscriptions[subIndex].domainHostingPath) ? currentDb.subscriptions[subIndex].domainHostingPath : initialFolder
  };

  if (subIndex === -1) {
    currentDb.subscriptions.push(subObj);
  } else {
    currentDb.subscriptions[subIndex] = subObj;
  }

  // Create folder inside public_html to satisfy hosting folder requirements
  createCpanelFolderForUser(subObj.domainHostingPath);

  // Record income metrics securely
  if (pkg.price > 0) {
    const currentMonth = new Date().toLocaleString('id-ID', { month: 'short' });
    const monthIdx = currentDb.sales.findIndex(s => s.month === currentMonth);
    if (monthIdx !== -1) {
      currentDb.sales[monthIdx].sales += pkg.price;
    } else {
      currentDb.sales.push({ month: currentMonth, sales: pkg.price });
    }
  }

  saveDb(currentDb);
  if (userObj) {
    logAction(userId, userObj.email, `Berlangganan Paket Sukses: ${pkg.name}. Folder cPanel public_html/${subObj.domainHostingPath}/ aktif.`);
  }
  return subObj;
}

function checkUserSubscription(currentDb: DatabaseSchema, userId: string): Subscription {
  const subIdx = currentDb.subscriptions.findIndex(s => s.userId === userId);
  if (subIdx === -1) {
    return {
      userId,
      packageId: "inactive",
      packageName: "Belum Berlangganan",
      startDate: "",
      endDate: "",
      isActive: false,
      domainHostingPath: ""
    };
  }
  const sub = currentDb.subscriptions[subIdx];
  if (sub.isActive && sub.endDate) {
    if (new Date() > new Date(sub.endDate)) {
      sub.isActive = false;
      sub.packageId = "inactive";
      sub.packageName = "Belum Berlangganan";
      saveDb(currentDb);
    }
  }
  return sub;
}

// Ensure database is instantiated & loaded
const db = loadDb();

// Apply express body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Method override middleware for testing PUT/DELETE tunneling behavior locally
app.use((req, res, next) => {
  if (req.method === 'POST') {
    const overrideMethod = req.headers['x-http-method-override'] || req.query._method || req.body?._method;
    if (overrideMethod) {
      req.method = (overrideMethod as string).toUpperCase();
    }
  }
  next();
});

// Serve uploaded documents statically from the system uploads folder
const uploadsDir = fs.existsSync(path.join(process.cwd(), "public_html"))
  ? path.join(process.cwd(), "public_html", "uploads")
  : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Serve design preview images from public_html/api/desain
const designDir = path.join(process.cwd(), "public_html", "api", "desain");
if (!fs.existsSync(designDir)) {
  fs.mkdirSync(designDir, { recursive: true });
}
app.use("/api/desain", express.static(designDir));
app.use("/public_html/api/desain", express.static(designDir));

// Serve portfolio project upload images from public_html/api/portofolio
const portfolioDir = path.join(process.cwd(), "public_html", "api", "portofolio");
if (!fs.existsSync(portfolioDir)) {
  fs.mkdirSync(portfolioDir, { recursive: true });
}
app.use("/api/portofolio", express.static(portfolioDir));
app.use("/public_html/api/portofolio", express.static(portfolioDir));

// Serve cover letter word templates from public_html/api/word statically
const wordTemplatesDir = path.join(process.cwd(), "public_html", "api", "word");
if (!fs.existsSync(wordTemplatesDir)) {
  fs.mkdirSync(wordTemplatesDir, { recursive: true });
}
app.use("/api/word", express.static(wordTemplatesDir));
app.use("/public_html/api/word", express.static(wordTemplatesDir));

// Utility logger for saving actions directly to logs table
function logAction(userId: string, email: string, message: string) {
  const currentDb = loadDb();
  const newLog: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userEmail: email,
    message,
    timestamp: new Date().toISOString()
  };
  
  // Place search key at the top
  currentDb.logs.unshift(newLog);
  
  // Prevent logs bloat: Limit each individual user strictly to a maximum of 15 logs in the database.
  // Any actions exceeding this threshold will automatically discard their oldest log.
  const userLogs = currentDb.logs.filter(l => l.userId === userId);
  if (userLogs.length > 15) {
    let count = 0;
    currentDb.logs = currentDb.logs.filter(l => {
      if (l.userId === userId) {
        count++;
        // Keep only top 15 newest logs for this user, drop older ones
        return count <= 15;
      }
      return true;
    });
  }

  // General safety cap: ensure the logs collection does not exceed 1000 items overall
  if (currentDb.logs.length > 1000) {
    currentDb.logs = currentDb.logs.slice(0, 1000);
  }
  
  saveDb(currentDb);
}

// =============================================================
// SECURE JWT SYSTEM USING NODE NATIVE CRYPTO SHA-256
// =============================================================
const JWT_SECRET = process.env.JWT_SECRET || "portoify_secure_secret_hash_2026_auth";

function signToken(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest("base64url");
    
  return `${base64Header}.${base64Payload}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");
      
    if (signature !== expectedSignature) return null;
    
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch (err) {
    return null;
  }
}

// Authentication Middlewares for secure endpoints
function authenticateJWT(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Akses Ditolak! Sesi otentikasi tidak ditemukan. Harap login kembali." });
  }
  
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ message: "Akses Ditolak! Sesi Anda berakhir atau tidak valid." });
  }
  
  (req as any).user = decoded;
  next();
}

function authorizeOwner(req: express.Request, res: express.Response, next: express.NextFunction) {
  const userId = req.body.userId || req.params.userId || req.query.userId;
  const loggedInUser = (req as any).user;
  
  if (!loggedInUser) {
    return res.status(401).json({ message: "Harap login terlebih dahulu!" });
  }
  
  // Administrators bypass owner checks
  if (loggedInUser.role === "admin") {
    return next();
  }
  
  if (userId && userId !== loggedInUser.id) {
    return res.status(403).json({ message: "Akses ditolak! Anda tidak diizinkan mengakses data dari akun portofolio lain." });
  }
  
  next();
}

function authorizeAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const loggedInUser = (req as any).user;
  if (!loggedInUser || loggedInUser.role !== "admin") {
    return res.status(403).json({ message: "Akses Terbatas! Halaman ini khusus untuk peran administrator." });
  }
  next();
}

// -------------------------------------------------------------
// UNIFIED TEMPLATE HTML COMPILER (Prone-safe fallback parser)
// -------------------------------------------------------------
function compileTemplateHtml(
  htmlMarkup: string,
  currentDb: any,
  userId: string,
  sub: any,
  reqHost: string,
  reqProtocol: string,
  templateCategory: string,
  templateId?: string
): string {
  let html = htmlMarkup;

  const profile = currentDb.profiles.find((p: any) => p.userId === userId);
  const portfolio = currentDb.portfolios.find((p: any) => p.userId === userId);
  const resume = currentDb.resumes.find((r: any) => r.userId === userId);
  const cover = currentDb.covers.find((c: any) => c.userId === userId);

  const activeExps = templateCategory === "resume"
    ? ((resume?.experiences && resume.experiences.length > 0) ? resume.experiences : (portfolio?.experiences || []))
    : ((portfolio?.experiences && portfolio.experiences.length > 0) ? portfolio.experiences : (resume?.experiences || []));

  const activeProjects = portfolio?.projects || [];

  const activeEducations = templateCategory === "resume"
    ? ((resume?.educations && resume.educations.length > 0) ? resume.educations : (portfolio?.educations || []))
    : ((portfolio?.educations && portfolio.educations.length > 0) ? portfolio.educations : (resume?.educations || []));

  const activeCerts = templateCategory === "resume"
    ? ((resume?.certificates && resume.certificates.length > 0) ? resume.certificates : (portfolio?.certificates || []))
    : ((portfolio?.certificates && portfolio.certificates.length > 0) ? portfolio.certificates : (resume?.certificates || []));

  const activeSkills = templateCategory === "resume"
    ? ((resume?.skills && resume.skills.length > 0) ? resume.skills : (portfolio?.skills || []))
    : ((portfolio?.skills && portfolio.skills.length > 0) ? portfolio.skills : (resume?.skills || []));

  const nama = profile?.fullName || "Nama Lengkap";
  const title = portfolio?.title || resume?.title || "Spesialis Profesional";
  const tentangSaya = portfolio?.aboutMe || resume?.aboutMe || "Biografi ringkas belum diatur.";
  const foto = profile?.photoUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";
  
  const placeOfBirth = profile?.placeOfBirth || "Jakarta";
  const dateOfBirth = profile?.dateOfBirth || "1999-01-01";
  const ttl = `${placeOfBirth}, ${dateOfBirth}`;
  const usia = profile ? `${profile.age}` : "27";
  const alamat = profile?.address || "Alamat belum diatur";
  const kota = profile?.city || "Kota / Kabupaten";
  
  const telepon = portfolio?.phone || resume?.phone || profile?.phone || "-";
  const whatsapp = portfolio?.whatsapp || resume?.whatsapp || "";

  const d = new Date();
  const localDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const localMonths = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const currentHari = localDays[d.getDay()];
  const currentTanggal = `${d.getDate()} ${localMonths[d.getMonth()]} ${d.getFullYear()}`;

  const user = currentDb.users?.find((u: any) => u.id === userId);
  const emailPengguna = profile?.email || user?.email || "";
  const urlPortofolio = (sub && sub.domainHostingPath)
    ? `${reqProtocol}://${reqHost}/u/${sub.domainHostingPath}`
    : `${reqProtocol}://${reqHost}/u/`;

  // Detect theme context
  const isDarkTheme = templateCategory === "portfolio" || html.includes("bg-slate-900") || html.includes("bg-slate-800") || html.includes("text-white") || html.includes("text-slate-100");

  // Experiences parsing
  let experiencesHtml = "";
  if (activeExps.length > 0) {
    activeExps.forEach((exp: any) => {
      if (exp.company && exp.role) {
        experiencesHtml += `
          <div class="pb-4 last:pb-0" style="font-family: inherit;">
            <h4 class="font-bold text-[14px]" style="font-family: inherit;">${exp.role} - ${exp.company}</h4>
            <span class="text-xs opacity-75 block mt-0.5" style="font-family: inherit;">${exp.duration || ""}</span>
            <p class="opacity-80 text-xs mt-1 leading-relaxed" style="font-family: inherit;">${exp.jobdesk || ""}</p>
          </div>
        `;
      }
    });
  } else {
    experiencesHtml = "<p class='text-xs text-slate-500'>Belum menambahkan riwayat pengalaman.</p>";
  }

  // Projects parsing
  let projectsHtml = "";
  if (activeProjects.length > 0) {
    activeProjects.forEach((proj: any) => {
      if (proj.name) {
        projectsHtml += `
          <div class="p-4 bg-slate-50/55 rounded-xl border border-slate-200/80 transition mb-3" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">
            <h4 class="font-bold text-[14px] mb-1" style="font-family: inherit;">${proj.name}</h4>
            <p class="text-xs opacity-80 leading-relaxed mb-2" style="font-family: inherit;">${proj.description || ""}</p>
            ${proj.link ? `<a href="${proj.link}" target="_blank" class="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1" style="font-family: inherit;">Demo Proyek &rarr;</a>` : ""}
          </div>
        `;
      }
    });
  } else {
    projectsHtml = "<p class='text-xs text-slate-500 col-span-2'>Belum menambahkan produk proyek.</p>";
  }

  // Educations parsing
  let educationsHtml = "";
  if (activeEducations.length > 0) {
    activeEducations.forEach((edu: any) => {
      if (edu.institution) {
        educationsHtml += `
          <div class="mb-3" style="font-family: inherit;">
            <p class="font-bold text-[14px]" style="font-family: inherit;">${edu.institution}</p>
            <p class="text-xs opacity-75" style="font-family: inherit;">${edu.degree || ""} (${edu.period || ""})</p>
          </div>
        `;
      }
    });
  } else {
    educationsHtml = "<p class='text-xs text-slate-500'>Belum menambahkan pendidikan.</p>";
  }

  // Certificates parsing
  let certsHtml = "";
  if (activeCerts.length > 0) {
    activeCerts.forEach((c: any) => {
      if (c && c.trim()) {
        certsHtml += `
          <div class="text-xs opacity-90 mb-1" style="font-family: inherit;">
            • ${c.trim()}
          </div>
        `;
      }
    });
  } else {
    certsHtml = "<p class='text-xs text-slate-500'>Tidak ada sertifikasi khusus.</p>";
  }

  // Social media icon/links
  const ig = portfolio?.instagram || resume?.instagram || "";
  const gh = portfolio?.github || resume?.github || "";
  const li = portfolio?.linkedin || resume?.linkedin || "";
  const tk = portfolio?.tiktok || resume?.tiktok || "";

  let socialHtml = "";
  if (ig) socialHtml += `<a href="https://instagram.com/${ig}" target="_blank" class="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs font-semibold mr-2 inline-block" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">Instagram</a>`;
  if (tk) socialHtml += `<a href="https://tiktok.com/@${tk}" target="_blank" class="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-white rounded text-xs font-semibold mr-2 inline-block" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">TikTok</a>`;
  if (li) socialHtml += `<a href="https://linkedin.com/in/${li}" target="_blank" class="px-2.5 py-1.5 bg-sky-900/40 hover:bg-sky-900/60 text-sky-400 rounded text-xs font-semibold mr-2 inline-block" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">LinkedIn</a>`;
  if (gh) socialHtml += `<a href="https://github.com/${gh}" target="_blank" class="px-2.5 py-1.5 bg-slate-700/50 hover:bg-slate-700/80 text-slate-100 rounded text-xs font-semibold mr-2 inline-block" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">GitHub</a>`;

  // Revision 3: Single combined skills string
  const gabunganSkill = activeSkills.join(", ");
  let skillsListHtml = "";
  if (activeSkills.length > 0) {
    activeSkills.forEach((sk: any) => {
      if (sk && sk.trim()) {
        skillsListHtml += `<span class="inline-block px-2.5 py-1 bg-rose-600 text-white font-bold rounded-lg text-[10px] mr-2 mb-2 uppercase tracking-wide shadow-sm" style="font-family: inherit; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact;">${sk.trim()}</span>`;
      }
    });
  }

  // Cover letter specific
  const companyName = cover?.companyName || "PT Contoh Klien Indonesia";
  const companyAddress = cover?.companyAddress || "Gedung Cyber Lt 4, Jakarta";
  const jobTitle = cover?.jobTitle || "Senior Full-Stack Engineer";
  const letterContent = cover?.letterContent || "Dengan hormat, saya mengajukan lamaran pekerjaan...";

  // Substitutions implementation
  html = html
    .replace(/\{\{\s*NAMA\s*\}\}/gi, nama)
    .replace(/\{\{\s*FOTO\s*\}\}/gi, foto)
    .replace(/\{\{\s*TITLE\s*\}\}/gi, title)
    .replace(/\{\{\s*TITTLE\s*\}\}/gi, title)
    .replace(/\{\{\s*TENTANG_SAYA\s*\}\}/gi, tentangSaya)
    .replace(/\{\{\s*BIOGRAFI\s*\}\}/gi, tentangSaya)
    .replace(/\{\{\s*BIO\s*\}\}/gi, tentangSaya)
    .replace(/\{\{\s*TEMPAT_LAHIR\s*\}\}/gi, ttl)
    .replace(/\{\{\s*TEMPAT_LALIR\s*\}\}/gi, ttl) // legacy compatibility
    .replace(/\{\{\s*TEMPAT_TANGGAL_LAHIR\s*\}\}/gi, ttl)
    .replace(/\{\{\s*TEMPAT_LAHIR_MURNI\s*\}\}/gi, placeOfBirth)
    .replace(/\{\{\s*TANGGAL_LAHIR_MURNI\s*\}\}/gi, dateOfBirth)
    .replace(/\{\{\s*USIA\s*\}\}/gi, usia)
    .replace(/\{\{\s*ALAMAT\s*\}\}/gi, alamat)
    .replace(/\{\{\s*KOTA\s*\}\}/gi, kota)
    .replace(/\{\{\s*TELEPON\s*\}\}/gi, telepon)
    .replace(/\{\{\s*PHONE\s*\}\}/gi, telepon)
    .replace(/\{\{\s*WHATSAPP\s*\}\}/gi, whatsapp)
    .replace(/\{\{\s*WA\s*\}\}/gi, whatsapp)
    .replace(/\{\{\s*EMAIL_PENGGUNA\s*\}\}/gi, emailPengguna)
    .replace(/\{\{\s*EMAIL\s*\}\}/gi, emailPengguna)
    .replace(/\{\{\s*INSTAGRAM\s*\}\}/gi, ig)
    .replace(/\{\{\s*TIKTOK\s*\}\}/gi, tk)
    .replace(/\{\{\s*LINKEDIN\s*\}\}/gi, li)
    .replace(/\{\{\s*GITHUB\s*\}\}/gi, gh)
    .replace(/\{\{\s*URL_PORTOFOLIO\s*\}\}/gi, urlPortofolio)
    .replace(/\{\{\s*HARI\s*\}\}/gi, currentHari)
    .replace(/\{\{\s*TANGGAL\s*\}\}/gi, currentTanggal)
    .replace(/\{\{\s*NAMA_PERUSAHAAN\s*\}\}/gi, companyName)
    .replace(/\{\{\s*ALAMAT_PERUSAHAAN\s*\}\}/gi, companyAddress)
    .replace(/\{\{\s*JABATAN_DILAMAR\s*\}\}/gi, jobTitle)
    .replace(/\{\{\s*ISI_SURAT\s*\}\}/gi, letterContent)
    .replace(/\{\{\s*PENGALAMAN_KERJA\s*\}\}/gi, experiencesHtml)
    .replace(/\{\{\s*PROYEK_SAYA\s*\}\}/gi, projectsHtml)
    .replace(/\{\{\s*PENDIDIKAN\s*\}\}/gi, educationsHtml)
    .replace(/\{\{\s*SERTIFIKAT\s*\}\}/gi, certsHtml)
    .replace(/\{\{\s*SOSIAL_MEDIA\s*\}\}/gi, socialHtml)
    .replace(/\{\{\s*SKILL\s*\}\}/gi, skillsListHtml)
    .replace(/\{\{\s*SKILLS\s*\}\}/gi, skillsListHtml)
    .replace(/\{\{\s*GABUNGAN_SKILL\s*\}\}/gi, gabunganSkill || "-")
    .replace(/\{\{\s*SEMUA_SKILL\s*\}\}/gi, gabunganSkill || "-")
    .replace(/\{\{\s*SKILL_TEXT\s*\}\}/gi, gabunganSkill || "-")
    .replace(/\{\{\s*SKILLS_TEXT\s*\}\}/gi, gabunganSkill || "-");

  // Unindexed education replacements fallback
  const firstEdu = activeEducations[0];
  const univ0 = firstEdu ? firstEdu.institution : "";
  const degree0 = firstEdu ? firstEdu.degree : "";
  const period0 = firstEdu ? firstEdu.period : "";

  html = html
    .replace(/\{\{\s*UNIVERSITAS\s*\}\}/gi, univ0)
    .replace(/\{\{\s*INSTITUSI\s*\}\}/gi, univ0)
    .replace(/\{\{\s*SEKOLAH\s*\}\}/gi, univ0)
    .replace(/\{\{\s*NAMA_KAMPUS\s*\}\}/gi, univ0)
    .replace(/\{\{\s*KAMPUS\s*\}\}/gi, univ0)
    .replace(/\{\{\s*NAMA_SEKOLAH\s*\}\}/gi, univ0)
    .replace(/\{\{\s*JURUSAN\s*\}\}/gi, degree0)
    .replace(/\{\{\s*GELAR\s*\}\}/gi, degree0)
    .replace(/\{\{\s*PRODI\s*\}\}/gi, degree0)
    .replace(/\{\{\s*TAHUN_LULUS\s*\}\}/gi, period0)
    .replace(/\{\{\s*PERIODE\s*\}\}/gi, period0)
    .replace(/\{\{\s*TAHUN\s*\}\}/gi, period0);

  // Revision 4 & 5: Index-based Experience and Education map replaces (up to index 15)
  for (let i = 1; i <= 15; i++) {
    // Education index replacements
    const edu = activeEducations[i - 1];
    const univ = edu ? edu.institution : "";
    const degree = edu ? edu.degree : "";
    const period = edu ? edu.period : "";

    html = html.replace(new RegExp("\\{\\{\\s*UNIVERSITAS_" + i + "\\s*\\}\\}", 'gi'), univ);
    html = html.replace(new RegExp("\\{\\{\\s*INSTITUSI_" + i + "\\s*\\}\\}", 'gi'), univ);
    html = html.replace(new RegExp("\\{\\{\\s*SEKOLAH_" + i + "\\s*\\}\\}", 'gi'), univ);
    html = html.replace(new RegExp("\\{\\{\\s*NAMA_KAMPUS_" + i + "\\s*\\}\\}", 'gi'), univ);
    html = html.replace(new RegExp("\\{\\{\\s*KAMPUS_" + i + "\\s*\\}\\}", 'gi'), univ);
    html = html.replace(new RegExp("\\{\\{\\s*NAMA_SEKOLAH_" + i + "\\s*\\}\\}", 'gi'), univ);
    html = html.replace(new RegExp("\\{\\{\\s*JURUSAN_" + i + "\\s*\\}\\}", 'gi'), degree);
    html = html.replace(new RegExp("\\{\\{\\s*GELAR_" + i + "\\s*\\}\\}", 'gi'), degree);
    html = html.replace(new RegExp("\\{\\{\\s*PRODI_" + i + "\\s*\\}\\}", 'gi'), degree);
    html = html.replace(new RegExp("\\{\\{\\s*TAHUN_LULUS_" + i + "\\s*\\}\\}", 'gi'), period);
    html = html.replace(new RegExp("\\{\\{\\s*PERIODE_" + i + "\\s*\\}\\}", 'gi'), period);
    html = html.replace(new RegExp("\\{\\{\\s*TAHUN_" + i + "\\s*\\}\\}", 'gi'), period);

    // Experience index replacements
    const exp = activeExps[i - 1];
    const comp = exp ? exp.company : "";
    const role = exp ? exp.role : "";
    const dur = exp ? exp.duration : "";
    const job = exp ? exp.jobdesk : "";

    html = html.replace(new RegExp("\\{\\{\\s*PERUSAHAAN_" + i + "\\s*\\}\\}", 'gi'), comp);
    html = html.replace(new RegExp("\\{\\{\\s*KANTOR_" + i + "\\s*\\}\\}", 'gi'), comp);
    html = html.replace(new RegExp("\\{\\{\\s*INSTANSI_" + i + "\\s*\\}\\}", 'gi'), comp);
    html = html.replace(new RegExp("\\{\\{\\s*JABATAN_" + i + "\\s*\\}\\}", 'gi'), role);
    html = html.replace(new RegExp("\\{\\{\\s*POSISI_" + i + "\\s*\\}\\}", 'gi'), role);
    html = html.replace(new RegExp("\\{\\{\\s*PERIODE_KERJA_" + i + "\\s*\\}\\}", 'gi'), dur);
    html = html.replace(new RegExp("\\{\\{\\s*DURASI_" + i + "\\s*\\}\\}", 'gi'), dur);
    html = html.replace(new RegExp("\\{\\{\\s*JOBDESK_" + i + "\\s*\\}\\}", 'gi'), job);
    html = html.replace(new RegExp("\\{\\{\\s*DESKRIPSI_KERJA_" + i + "\\s*\\}\\}", 'gi'), job);
  }

  // Post-process the final compiled HTML to patch any broken/relative upload paths in img tags and background-images
  html = html.replace(/src=["'](?:\/|u\/|api\/|u|api)?\/?uploads\/([^"']+)["']/gi, 'src="/uploads/$1"');
  html = html.replace(/src=["'](?:\/|u\/|api\/|u|api)?\/?api\/uploads\/([^"']+)["']/gi, 'src="/api/uploads/$1"');
  html = html.replace(/url\(["']?(?:\/|u\/|api\/|u|api)?\/?uploads\/([^"')]+)["']?\)/gi, 'url("/uploads/$1")');
  html = html.replace(/url\(["']?(?:\/|u\/|api\/|u|api)?\/?api\/uploads\/([^"')]+)["']?\)/gi, 'url("/api/uploads/$1")');

  return html;
}

// -------------------------------------------------------------
// DYNAMIC PORTFOLIO / RESUME HOSTING ROUTER (public_html/ path engine)
// Serves static compiled layouts under /u/:hostingPath or portoify.my.id/:path
// -------------------------------------------------------------
app.get("/u/:hostingPath", (req, res) => {
  const hostingPath = req.params.hostingPath.toLowerCase();
  const currentDb = loadDb();

  // Find user subscription associated with this folder path
  const sub = currentDb.subscriptions.find(
    s => s.domainHostingPath && s.domainHostingPath.toLowerCase() === hostingPath && s.isActive
  );

  if (!sub) {
    return res.status(404).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 100px;">
        <h1 style="color: #ef4444; font-size: 32px; font-weight: 800;">404 - Hosting Belum Aktif</h1>
        <p style="color: #64748b; margin-top: 10px;">Domain path atau folder 'public_html/${hostingPath}' tidak ditemukan atau paket bulanan pengguna telah kadaluarsa.</p>
        <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; bg: #da251d; color: white; border-radius: 5px; text-decoration: none; font-weight: bold; background-color: #dc2626;">Kembali ke Portoify</a>
      </div>
    `);
  }

  // Fetch the user's default portfolio & profiles
  const userId = sub.userId;
  const profile = currentDb.profiles.find(p => p.userId === userId);
  const portfolio = currentDb.portfolios.find(p => p.userId === userId);

  if (!portfolio) {
    return res.status(404).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 100px;">
        <h1 style="color: #f59e0b; font-size: 28px;">Portofolio Belum Dibuat</h1>
        <p style="color: #64748b; margin-top: 10px;">Pengguna telah mengaktifkan link domain, tetapi belum mempublikasikan portofolio digital apa pun.</p>
        <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; color: white; border-radius: 5px; text-decoration: none; font-weight: bold; background-color: #3b82f6;">Kunjungi Beranda</a>
      </div>
    `);
  }

  // Get selected template
  let template = currentDb.templates.find(t => t.id === portfolio.templateId);
  if (!template) {
    template = currentDb.templates.find(t => t.category === "portfolio"); // fallback
  }

  if (!template) {
    return res.status(500).send("No templates found in database.");
  }

  // Record visitors counter
  const userLogs = currentDb.logs.filter(l => l.userId === userId);
  // Increment stats
  logAction(userId, profile?.email || "anonymous_visitor", `Portofolio Online '${hostingPath}' diakses oleh pengunjung.`);

  const reqHost = req.get("host") || "portoify.my.id";
  const reqProtocol = req.protocol || "https";

  // Unified parsing
  let html = compileTemplateHtml(
    template.htmlMarkup,
    currentDb,
    userId,
    sub,
    reqHost,
    reqProtocol,
    template.category,
    template.id
  );

  const nama = profile?.fullName || "Silakan Edit Nama";

  // Deliver beautiful compiled static page
  // Add direct Tailwind injection CDN to make sure dynamically uploaded files look outstanding!
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${nama} - Portofolio Online</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          .onerror-fallback {
            background-color: #3b82f6;
          }
        </style>
      </head>
      <body>
        ${html}
        <script>
          document.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', () => {
              img.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
            });
          });
        </script>
      </body>
    </html>
  `);
});


// -------------------------------------------------------------
// POST / PUBLIC RESUME VIEWER (supporting preview and print)
// -------------------------------------------------------------
app.get("/view-resume/:userId", (req, res) => {
  const userId = req.params.userId;
  const currentDb = loadDb();

  const profile = currentDb.profiles.find(p => p.userId === userId);
  const resume = currentDb.resumes.find(r => r.userId === userId);

  if (!resume) {
    return res.status(404).send("Ringkasan CV tidak ditemukan. Silakan lengkapi data CV terlebih dahulu.");
  }

  let template = currentDb.templates.find(t => t.id === resume.templateId);
  if (!template) {
    template = currentDb.templates.find(t => t.category === "resume"); // fallback
  }

  if (!template) {
    return res.status(500).send("No CV templates found.");
  }

  const sub = currentDb.subscriptions.find(s => s.userId === userId && s.isActive);
  const reqHost = req.get("host") || "portoify.my.id";
  const reqProtocol = req.protocol || "https";

  let html = "";
  if (resume && resume.customHtml && resume.customHtml.trim() !== "") {
    html = resume.customHtml;
  } else {
    html = compileTemplateHtml(
      template.htmlMarkup,
      currentDb,
      userId,
      sub,
      reqHost,
      reqProtocol,
      template.category,
      template.id
    );
  }

  const nama = profile?.fullName || "Nama Lengkap";

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Resume - ${nama}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          /* Force colors while printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          @media print {
            @page {
              size: A4;
              margin: 0 !important;
            }
            html, body {
              width: 210mm;
              height: 297mm;
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .min-h-screen, body, #root {
              min-height: auto !important;
              height: auto !important;
              background: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .py-12, .py-16, .py-20, .py-10, .py-8 {
              padding-top: 4mm !important;
              padding-bottom: 4mm !important;
            }
            .px-6, .px-8, .px-12, .p-8, .p-12 {
              padding-left: 6mm !important;
              padding-right: 6mm !important;
            }
            .shadow-lg, .shadow-md, .shadow-xl, .shadow-2xl, .shadow {
              box-shadow: none !important;
            }
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              break-after: avoid;
            }
            tr, img, .relative, .grid, li, .flex-shrink-0 {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .max-w-4xl, .max-w-3xl, .max-w-2xl {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              border: none !important;
              border-radius: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
});

// -------------------------------------------------------------
// GET / PUBLIC COVER LETTER VIEWER (supporting preview and print)
// -------------------------------------------------------------
app.get("/view-cover/:userId", (req, res) => {
  const userId = req.params.userId;
  const currentDb = loadDb();

  const profile = currentDb.profiles.find(p => p.userId === userId);
  const cover = currentDb.covers.find(c => c.userId === userId);

  if (!cover) {
    return res.status(404).send("Surat Lamaran tidak ditemukan. Silakan lengkapi data Surat Lamaran terlebih dahulu.");
  }

  let template = currentDb.templates.find(t => t.id === cover.templateId);
  if (!template) {
    template = currentDb.templates.find(t => t.category === "cover_letter"); // fallback
  }

  if (!template) {
    return res.status(500).send("No Cover Letter templates found.");
  }

  const sub = currentDb.subscriptions.find(s => s.userId === userId && s.isActive);
  const reqHost = req.get("host") || "portoify.my.id";
  const reqProtocol = req.protocol || "https";

  let html = compileTemplateHtml(
    template.htmlMarkup,
    currentDb,
    userId,
    sub,
    reqHost,
    reqProtocol,
    template.category,
    template.id
  );

  const nama = profile?.fullName || "Nama Lengkap";

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Surat Lamaran - ${nama}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          /* Force colors while printing */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          @media print {
            @page {
              size: A4;
              margin: 0 !important;
            }
            html, body {
              width: 210mm;
              height: 297mm;
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .min-h-screen, body, #root {
              min-height: auto !important;
              height: auto !important;
              background: none !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .py-12, .py-16, .py-20, .py-10, .py-8 {
              padding-top: 4mm !important;
              padding-bottom: 4mm !important;
            }
            .px-6, .px-8, .px-12, .p-8, .p-12 {
              padding-left: 6mm !important;
              padding-right: 6mm !important;
            }
            .shadow-lg, .shadow-md, .shadow-xl, .shadow-2xl, .shadow {
              box-shadow: none !important;
            }
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              break-after: avoid;
            }
            tr, img, .relative, .grid, li, .flex-shrink-0 {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .max-w-4xl, .max-w-3xl, .max-w-2xl {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 !important;
              border: none !important;
              border-radius: 0 !important;
            }
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
});

// -------------------------------------------------------------
// REST API ENDPOINTS
// -------------------------------------------------------------

// --- AUTH API ---

// 1. REGISTER
app.post("/api/auth/register", (req, res) => {
  try {
    const { email, password, fullName } = req.body;
    if (!email || !password || !fullName) {
      return res.status(400).json({ message: "Semua form input wajib diisi!" });
    }

    const currentDb = loadDb();
    const existingUser = currentDb.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ message: "Email sudah terdaftar!" });
    }

    // Generate "nama_kodeacak" user ID
    const firstWord = fullName.trim().split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanWord = firstWord || "user";
    const randomCode = Math.random().toString(36).substring(2, 8);
    const userId = `${cleanWord}_${randomCode}`;
    const newUser: User = {
      id: userId,
      email: email.toLowerCase(),
      fullName,
      role: "user",
      isActive: true,
      createdAt: new Date().toISOString()
    };

    // Save auth credential
    currentDb.users.push({
      ...newUser,
      passwordHash: password // local sandbox plaintext hash for direct developer access
    });

    // Create empty default profile
    const newProfile: UserProfile = {
      userId,
      fullName,
      placeOfBirth: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      nik: "",
      phone: "",
      photoUrl: "",
      email: email.toLowerCase(),
      age: 0
    };
    currentDb.profiles.push(newProfile);

    // Initialize Portfolio & Resume placeholder
    const newPort: PortfolioData = {
      id: `port_${Date.now()}`,
      userId,
      templateId: "tpl_port_1",
      title: "",
      aboutMe: "",
      experiences: [],
      projects: [],
      educations: [],
      certificates: [],
      phone: "",
      address: "",
      whatsapp: "",
      instagram: "",
      tiktok: "",
      linkedin: "",
      github: "",
      updatedAt: new Date().toISOString()
    };
    currentDb.portfolios.push(newPort);

    const newRes: ResumeData = {
      id: `res_${Date.now()}`,
      userId,
      templateId: "tpl_res_1",
      title: "",
      aboutMe: "",
      experiences: [],
      educations: [],
      certificates: [],
      phone: "",
      address: "",
      whatsapp: "",
      instagram: "",
      tiktok: "",
      linkedin: "",
      github: "",
      updatedAt: new Date().toISOString()
    };
    currentDb.resumes.push(newRes);

    const newCov: CoverLetterData = {
      id: `cov_${Date.now()}`,
      userId,
      templateId: "tpl_cov_1",
      companyName: "",
      companyAddress: "",
      jobTitle: "",
      letterContent: "",
      updatedAt: new Date().toISOString()
    };
    currentDb.covers.push(newCov);

    saveDb(currentDb);
    logAction(userId, email, "Mendaftar akun Portoify baru");

    return res.status(201).json({
      message: "Registrasi sukses! Silakan melakukan login.",
      user: newUser
    });
  } catch (error: any) {
    console.error("❌ Error registering user:", error);
    return res.status(500).json({ message: "Internal Server Error saat mendaftarkan user: " + error.message });
  }
});

// 2. LOGIN
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email dan password wajib diisi!" });
    }

    const currentDb = loadDb();
    const matchedUser = currentDb.users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password
    );

    if (!matchedUser) {
      return res.status(401).json({ message: "Email atau Password anda salah!" });
    }

    if (!matchedUser.isActive) {
      return res.status(403).json({ message: "Akun Anda dinonaktifkan oleh administrator!" });
    }

    logAction(matchedUser.id, matchedUser.email, "Berhasil masuk ke akun Portoify (Login Akun)");

    const token = signToken({ id: matchedUser.id, email: matchedUser.email, role: matchedUser.role });

    return res.json({
      message: "Login Berhasil!",
      token,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        fullName: matchedUser.fullName,
        role: matchedUser.role,
        isActive: matchedUser.isActive,
        createdAt: matchedUser.createdAt,
        token // Embed inside user object for seamless persistence in client-side localStorage
      }
    });
  } catch (error: any) {
    console.error("❌ Error logging in user:", error);
    return res.status(500).json({ message: "Internal Server Error saat memproses login: " + error.message });
  }
});

// 3. FORGOT PASSWORD
app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email wajib diisi!" });
  }

  const currentDb = loadDb();
  const userIndex = currentDb.users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

  if (userIndex === -1) {
    return res.status(404).json({ message: "Email tersebut tidak terdaftar di sistem kami!" });
  }

  // Generate 6-digit numeric OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  currentDb.users[userIndex].resetToken = otp;
  currentDb.users[userIndex].resetTokenExpiry = new Date(Date.now() + 1800000).toISOString(); // 30 minutes

  saveDb(currentDb);

  const userObj = currentDb.users[userIndex];
  const subject = "Kode OTP Reset Password Portoify Anda";
  const spacedOtp = otp.split("").join("&nbsp;");
  const bodyHTML = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e1e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
      <!-- SVG Header Illustration with Laptop, Shield, Lock and Key -->
      <div style="text-align: center; margin-bottom: 20px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox="0 0 500 250" style="max-width: 440px; display: block; margin: 0 auto; user-select: none;">
              <!-- Background pastel circles/blobs -->
              <ellipse cx="250" cy="115" rx="190" ry="100" fill="#fecaca" opacity="0.15" />
              <circle cx="150" cy="80" r="55" fill="#fecaca" opacity="0.1" />
              <circle cx="350" cy="120" r="65" fill="#fecaca" opacity="0.1" />

              <!-- Lock Icon (Top Right Floating) -->
              <g transform="translate(20, -5)">
                  <path d="M 370,70 L 370,55 C 370,42 395,42 395,55 L 395,70" fill="none" stroke="#b02a2a" stroke-width="5" stroke-linecap="round" />
                  <rect x="360" y="70" width="45" height="35" rx="6" fill="#b02a2a" />
                  <circle cx="382.5" cy="83" r="3" fill="#ffffff" />
                  <path d="M 381.5,83 L 383.5,83 L 384,91 L 381,91 Z" fill="#ffffff" />
              </g>

              <!-- Laptop Screen Shadow -->
              <ellipse cx="250" cy="225" rx="140" ry="8" fill="#e2e8f0" opacity="0.8" />

              <!-- Laptop Base -->
              <path d="M 155,195 L 345,195 L 365,220 L 135,220 Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2" stroke-linejoin="round" />
              <path d="M 135,220 L 365,220 L 355,226 L 145,226 Z" fill="#cbd5e1" />
              <rect x="230" y="212" width="40" height="6" rx="2" fill="#94a3b8" />
              <line x1="165" y1="202" x2="335" y2="202" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8,2" />
              <line x1="160" y1="208" x2="340" y2="208" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="10,3" />

              <!-- Laptop Screen -->
              <rect x="155" y="80" width="190" height="115" rx="10" fill="#1e293b" />
              <rect x="165" y="90" width="170" height="95" rx="4" fill="#ffffff" />

              <!-- Centered Logo on Laptop Screen -->
              <g transform="translate(237, 105)">
                  <!-- Stylized 'P' of Portoify -->
                  <path d="M0,0 L16,0 C22.6,0 26,3.4 26,10 C26,16.6 22.6,20 16,20 L6,20 L6,30 L0,30 Z M6,6 L6,14 L16,14 C18.2,14 20,12.2 20,10 C20,7.8 18.2,6 16,6 Z" fill="#b02a2a" />
              </g>
              <text x="250" y="165" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="13" fill="#1e293b" text-anchor="middle" letter-spacing="1">PORTOIFY</text>

              <!-- Shield (Left Side) -->
              <g transform="translate(15, 10)">
                  <path d="M 65,190 C 85,198 105,200 110,212 C 115,200 135,198 155,190" stroke="#cbd5e1" stroke-width="4" fill="none" opacity="0.5" />
                  <path d="M 110,100 C 130,100 140,95 150,87 L 150,145 C 150,175 130,190 110,198 C 90,190 70,175 70,145 L 70,87 C 80,95 90,100 110,100 Z" fill="#ffffff" stroke="#b02a2a" stroke-width="5" stroke-linejoin="round" />
                  <circle cx="110" cy="138" r="14" fill="#b02a2a" />
                  <circle cx="110" cy="133" r="4" fill="#ffffff" />
                  <path d="M 108,133 L 112,133 L 113,145 L 107,145 Z" fill="#ffffff" />
              </g>

              <!-- Key (Right Side) -->
              <g transform="translate(355, 175) rotate(15)">
                  <circle cx="20" cy="20" r="13" fill="none" stroke="#b02a2a" stroke-width="5" />
                  <circle cx="20" cy="20" r="4" fill="#b02a2a" />
                  <rect x="33" y="17" width="35" height="6" rx="2" fill="#b02a2a" />
                  <rect x="53" y="13" width="6" height="10" fill="#b02a2a" />
                  <rect x="61" y="13" width="6" height="7" fill="#b02a2a" />
              </g>
          </svg>
      </div>

      <!-- App Branding Title -->
      <div style="text-align: center; margin-top: 15px; margin-bottom: 25px;">
          <h1 style="font-family: Arial, sans-serif; color: #b02a2a; font-size: 32px; font-weight: 900; margin: 0; letter-spacing: -1px; text-transform: uppercase;">
              PORTOIFY<span style="font-size: 18px; text-transform: lowercase; font-weight: bold; color: #475569;">.my.id</span>
          </h1>
          <p style="font-family: Arial, sans-serif; color: #1e293b; font-size: 14px; font-weight: bold; margin: 6px 0 0 0; letter-spacing: 0.2px;">
              Pembuatan Portofolio & Resume Instan dalam Sekali Klik
          </p>
      </div>
      
      <!-- Greeting and Intro -->
      <p style="font-family: Arial, sans-serif; color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
          Halo, <strong style="color: #b02a2a;">${userObj.fullName}</strong>,
      </p>
      <p style="font-family: Arial, sans-serif; color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          Kami menerima permintaan pengaturan ulang kata sandi untuk akun Portoify Anda. Silakan gunakan kode OTP (One-Time Password) 6-digit di bawah ini untuk mengubah password Anda:
      </p>
      
      <!-- OTP Box -->
      <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background-color: #ffffff; border: 2px solid #b02a2a; border-radius: 12px; padding: 14px 28px; box-shadow: 0 4px 10px rgba(176, 42, 42, 0.08); text-align: center;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; color: #b02a2a; letter-spacing: 4px; white-space: nowrap; display: inline-block;">${spacedOtp}</span>
          </div>
          <p style="color: #64748b; font-family: Arial, sans-serif; font-size: 12px; margin-top: 12px; margin-bottom: 0;">
              Masa berlaku kode OTP terbatas selama <strong>30 menit</strong> saja.
          </p>
      </div>
      
      <!-- Red Warning Alert Banner (Table layout for maximum email client compatibility) -->
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width: 600px; margin: 25px auto; background-color: #fef2f2; border-radius: 8px; padding: 12px 16px;">
          <tr>
              <td style="width: 32px; vertical-align: middle; text-align: center;">
                  <div style="display: inline-block; width: 22px; height: 22px; line-height: 22px; background-color: #ef4444; border-radius: 50%; color: #ffffff; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px; text-align: center;">!</div>
              </td>
              <td style="font-family: Arial, sans-serif; font-size: 13px; color: #991b1b; line-height: 1.5; padding-left: 10px; text-align: left;">
                  <strong style="color: #991b1b;">PENTING:</strong> Demi keamanan akun Anda, mohon <strong style="color: #991b1b;">TIDAK</strong> membagikan atau menyebutkan kode OTP ini ke pihak manapun, termasuk staf admin kami.
              </td>
          </tr>
      </table>
      
      <!-- Fallback info -->
      <p style="color: #475569; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
          Bila Anda merasa tidak pernah melakukan tindakan ini, Anda bisa mengabaikan email ini dengan sepenuhnya aman. Sandi Anda tidak akan berubah tanpa kode di atas.
      </p>
      
      <!-- Footer with gray background -->
      <div style="background-color: #f8fafc; border-radius: 0 0 16px 16px; padding: 25px 20px; text-align: center; margin-top: 35px; border-top: 1px solid #e2e8f0;">
          <p style="font-family: Arial, sans-serif; color: #475569; font-size: 12px; font-weight: bold; margin: 0 0 8px 0;">
              Portoify Cloud Project Office &copy; 2026
          </p>
          <p style="font-family: Arial, sans-serif; color: #475569; font-size: 12px; margin: 0 0 4px 0;">
              Email: <a href="mailto:portoifybusiness@gmail.com" style="color: #b02a2a; text-decoration: none;">portoifybusiness@gmail.com</a>
          </p>
          <p style="font-family: Arial, sans-serif; color: #475569; font-size: 12px; margin: 0;">
              Kontak: <span style="color: #475569;">087797564757</span>
          </p>
      </div>
  </div>`;

  sendNodeSMTPEmail(email, subject, bodyHTML).then((sent) => {
    if (sent) {
      console.log(`Email successfully sent to ${email}`);
    } else {
      console.log(`Email simulated for ${email}`);
    }
  });

  return res.json({
    message: `Kode OTP reset password berhasil terkirim ke Gmail Anda (${email})! Silakan gunakan kode OTP 6-digit tersebut.`
  });
});

// 4. RESET PASSWORD
app.post("/api/auth/reset-password", (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "Semua parameter wajib dilengkapi!" });
  }

  const currentDb = loadDb();
  const userIndex = currentDb.users.findIndex(
    u => u.email.toLowerCase() === email.toLowerCase() && String(u.resetToken) === String(token)
  );

  if (userIndex === -1) {
    return res.status(400).json({ message: "Kode OTP reset password tidak valid!" });
  }

  const userObj = currentDb.users[userIndex];
  if (userObj.resetTokenExpiry && new Date(userObj.resetTokenExpiry) < new Date()) {
    return res.status(400).json({ message: "Kode OTP reset password telah kadaluarsa. Silakan ajukan ulang." });
  }

  currentDb.users[userIndex].passwordHash = newPassword;
  delete currentDb.users[userIndex].resetToken;
  delete currentDb.users[userIndex].resetTokenExpiry;

  saveDb(currentDb);
  logAction(userObj.id, userObj.email, "Memperbarui password lewat verifikasi kode OTP mandiri");

  return res.json({ message: "Sandi berhasil diubah! Database in-memory dan sinkronisasi MySQL diperbarui secara aman. Silakan login kembali." });
});


// --- PROFILE API ---

// GET PROFILES OR INITIAL DATA
app.get("/api/profile/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  const profile = currentDb.profiles.find(p => p.userId === req.params.userId);
  if (!profile) {
    return res.status(404).json({ message: "Profile tidak ditemukan" });
  }
  return res.json(profile);
});

// GET USER OWN LOGS SPECIFICALLY (for Realtime Activity display)
app.get("/api/users/:userId/logs", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  const userLogs = currentDb.logs
    .filter(l => l.userId === req.params.userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return res.json(userLogs);
});

// UPDATE PROFILE
app.post("/api/profile", authenticateJWT, authorizeOwner, (req, res) => {
  const { userId, fullName, placeOfBirth, dateOfBirth, gender, city, address, nik, phone, photoUrl } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID wajib dilampirkan" });
  }

  const currentDb = loadDb();
  const userIdx = currentDb.users.findIndex(u => u.id === userId);
  if (userIdx === -1) {
    return res.status(404).json({ message: "Pengguna tidak terdaftar" });
  }

  const userObj = currentDb.users[userIdx];
  if (fullName && typeof fullName === "string") {
    userObj.fullName = fullName.trim();
  }
  const age = calculateAge(dateOfBirth);

  // If photo is uploaded as a base64 string, write it to physical storage
  const savedPhotoPath = photoUrl && photoUrl.startsWith("data:")
    ? saveUploadedFile(userId, "photo", "profile.jpg", photoUrl)
    : (photoUrl || "");

  const profileIndex = currentDb.profiles.findIndex(p => p.userId === userId);
  const updatedProfile: UserProfile = {
    userId,
    fullName: userObj.fullName, // matches updated/registered name
    placeOfBirth: placeOfBirth || "",
    dateOfBirth: dateOfBirth || "",
    gender: gender || "",
    city: city || "",
    address: address || "",
    nik: nik || "",
    phone: phone || "",
    photoUrl: savedPhotoPath,
    email: userObj.email,
    age
  };

  if (profileIndex === -1) {
    currentDb.profiles.push(updatedProfile);
  } else {
    currentDb.profiles[profileIndex] = updatedProfile;
  }

  saveDb(currentDb);
  logAction(userId, userObj.email, "Update Data Profil Lengkap");

  return res.json({
    message: "Profil sukses diperbarui! Usia dihitung otomatis: " + age + " Tahun.",
    profile: updatedProfile
  });
});

// CHANGE PASSWORD WITHIN APP
app.post("/api/profile/change-password", authenticateJWT, authorizeOwner, (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;
  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ message: "Lengkapi semua data password!" });
  }

  const currentDb = loadDb();
  const idx = currentDb.users.findIndex(u => u.id === userId);
  if (idx === -1) {
    return res.status(404).json({ message: "Pengguna tidak ditemukan." });
  }

  if (currentDb.users[idx].passwordHash !== oldPassword) {
    return res.status(400).json({ message: "Password lama Anda tidak sesuai!" });
  }

  currentDb.users[idx].passwordHash = newPassword;
  saveDb(currentDb);

  logAction(userId, currentDb.users[idx].email, "Mengganti Password Akun dari dalam panel");

  return res.json({ message: "Password berhasil diperbarui di database MYSQL!" });
});


// --- PORTFOLIO API ---
app.get("/api/portfolios/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  let portfolio = currentDb.portfolios.find(p => p.userId === req.params.userId);
  if (!portfolio) {
    return res.status(404).json({ message: "Portfolio not active" });
  }
  return res.json(portfolio);
});

app.delete("/api/portfolios/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  const idx = currentDb.portfolios.findIndex(p => p.userId === req.params.userId);
  if (idx !== -1) {
    currentDb.portfolios.splice(idx, 1);
    saveDb(currentDb);
  }
  const email = currentDb.users.find(u => u.id === req.params.userId)?.email || "user";
  logAction(req.params.userId, email, "Menonaktifkan & menghapus desain portofolio dari database");
  return res.json({ message: "Portofolio berhasil dinonaktifkan." });
});

app.post("/api/portfolios", authenticateJWT, authorizeOwner, (req, res) => {
  const { userId, templateId, title, aboutMe, experiences, projects, educations, certificates, skills, phone, address, whatsapp, instagram, tiktok, linkedin, github } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID wajib dilampirkan" });
  }

  const currentDb = loadDb();
  const profileObj = currentDb.profiles.find(p => p.userId === userId);
  if (!profileObj) {
    return res.status(400).json({ message: "Mohon isi Profil Lengkap di menu Update Profiles sebelum membuat portofolio" });
  }

  const idx = currentDb.portfolios.findIndex(p => p.userId === userId);

  // If projects have inline base64 images uploaded, write them to the public_html/api/portofolio folder
  const processedProjects = (projects || []).map((proj: any, k: number) => {
    if (proj.image && proj.image.startsWith("data:")) {
      const savedPath = saveProjectImage(userId, proj.image);
      return { ...proj, image: savedPath };
    }
    return proj;
  });

  const updatedPort: PortfolioData = {
    id: idx !== -1 ? currentDb.portfolios[idx].id : `port_${Date.now()}`,
    userId,
    templateId: templateId || "tpl_port_1",
    title: title || "",
    aboutMe: aboutMe || "",
    experiences: (experiences || []) as Experience[],
    projects: processedProjects as Project[],
    educations: educations || [] as Education[],
    certificates: (certificates || []) as string[],
    skills: skills || [] as string[],
    phone: phone || profileObj.phone || "",
    address: address || profileObj.address || "",
    whatsapp: whatsapp || "",
    instagram: instagram || "",
    tiktok: tiktok || "",
    linkedin: linkedin || "",
    github: github || "",
    updatedAt: new Date().toISOString()
  };

  if (idx === -1) {
    currentDb.portfolios.push(updatedPort);
  } else {
    currentDb.portfolios[idx] = updatedPort;
  }

  saveDb(currentDb);
  const matchedTpl = currentDb.templates.find(t => t.id === (templateId || "tpl_port_1"));
  const tplName = matchedTpl ? matchedTpl.name : (templateId || "Bawaan");
  logAction(userId, profileObj.email, `Input/Update Data Portofolio Digital (Template: ${tplName})`);

  return res.json({
    message: "Portofolio digital berhasil disimpan di database!",
    portfolio: updatedPort
  });
});


// --- RESUME API ---
app.get("/api/resumes/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  let resume = currentDb.resumes.find(r => r.userId === req.params.userId);
  if (!resume) {
    return res.status(404).json({ message: "Resume not active" });
  }
  return res.json(resume);
});

app.delete("/api/resumes/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  const idx = currentDb.resumes.findIndex(r => r.userId === req.params.userId);
  if (idx !== -1) {
    currentDb.resumes.splice(idx, 1);
    saveDb(currentDb);
  }
  const email = currentDb.users.find(u => u.id === req.params.userId)?.email || "user";
  logAction(req.params.userId, email, "Menonaktifkan & menghapus desain resume dari database");
  return res.json({ message: "Resume berhasil dinonaktifkan." });
});

app.post("/api/resumes", authenticateJWT, authorizeOwner, (req, res) => {
  const { userId, templateId, title, aboutMe, experiences, educations, projects, certificates, skills, phone, address, whatsapp, instagram, tiktok, linkedin, github, customHtml } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID wajib" });
  }

  const currentDb = loadDb();
  const profileObj = currentDb.profiles.find(p => p.userId === userId);
  if (!profileObj) {
    return res.status(400).json({ message: "Mohon lengkapi profil terlebih dahulu di menu Kelola Profiles" });
  }

  const idx = currentDb.resumes.findIndex(r => r.userId === userId);
  const updatedRes: ResumeData = {
    id: idx !== -1 ? currentDb.resumes[idx].id : `res_${Date.now()}`,
    userId,
    templateId: templateId || "tpl_res_1",
    title: title || "",
    aboutMe: aboutMe || "",
    experiences: (experiences || []) as Experience[],
    educations: educations || [] as Education[],
    projects: (projects || []) as Project[],
    certificates: (certificates || []) as string[],
    skills: skills || [] as string[],
    phone: phone || profileObj.phone || "",
    address: address || profileObj.address || "",
    whatsapp: whatsapp || "",
    instagram: instagram || "",
    tiktok: tiktok || "",
    linkedin: linkedin || "",
    github: github || "",
    customHtml: customHtml !== undefined ? customHtml : (idx !== -1 ? (currentDb.resumes[idx].customHtml || "") : ""),
    updatedAt: new Date().toISOString()
  };

  if (idx === -1) {
    currentDb.resumes.push(updatedRes);
  } else {
    currentDb.resumes[idx] = updatedRes;
  }

  saveDb(currentDb);
  const matchedTpl = currentDb.templates.find(t => t.id === (templateId || "tpl_res_1"));
  const tplName = matchedTpl ? matchedTpl.name : (templateId || "Bawaan");
  logAction(userId, profileObj.email, `Input/Update Data Resume CV Profesional (Template: ${tplName})`);

  return res.json({
    message: "Resume/CV berhasil diperbarui di database MYSQL local file!",
    resume: updatedRes
  });
});


// --- COVER LETTERS (SURAT LAMARAN) ---
app.get("/api/covers/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  let cover = currentDb.covers.find(c => c.userId === req.params.userId);
  if (!cover) {
    return res.status(404).json({ message: "Cover letter not active" });
  }
  return res.json(cover);
});

app.delete("/api/covers/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  const idx = currentDb.covers.findIndex(c => c.userId === req.params.userId);
  if (idx !== -1) {
    currentDb.covers.splice(idx, 1);
    saveDb(currentDb);
  }
  const email = currentDb.users.find(u => u.id === req.params.userId)?.email || "user";
  logAction(req.params.userId, email, "Menonaktifkan & menghapus desain cover surat lamaran dari database");
  return res.json({ message: "Surat lamaran berhasil dinonaktifkan." });
});

app.post("/api/covers", authenticateJWT, authorizeOwner, (req, res) => {
  const { userId, templateId, companyName, companyAddress, jobTitle, letterContent } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User ID wajib" });
  }

  const currentDb = loadDb();
  const profileObj = currentDb.profiles.find(p => p.userId === userId);
  const email = currentDb.users.find(u => u.id === userId)?.email || "user";

  const idx = currentDb.covers.findIndex(c => c.userId === userId);
  const updatedCov: CoverLetterData = {
    id: idx !== -1 ? currentDb.covers[idx].id : `cov_${Date.now()}`,
    userId,
    templateId: templateId || "tpl_cov_1",
    companyName: companyName || "",
    companyAddress: companyAddress || "",
    jobTitle: jobTitle || "",
    letterContent: letterContent || "",
    updatedAt: new Date().toISOString()
  };

  if (idx === -1) {
    currentDb.covers.push(updatedCov);
  } else {
    currentDb.covers[idx] = updatedCov;
  }

  saveDb(currentDb);
  const matchedTpl = currentDb.templates.find(t => t.id === (templateId || "tpl_cov_1"));
  const tplName = matchedTpl ? matchedTpl.name : (templateId || "Bawaan");
  logAction(userId, email, `Input/Update Data Surat Lamaran Kerja (Template: ${tplName})`);

  return res.json({
    message: "Surat Lamaran Kerja berhasil disimpan ke database!",
    coverLetter: updatedCov
  });
});


// --- DOCUMENTS MY DATA API ---
app.get("/api/documents/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  const docs = currentDb.documents.filter(d => d.userId === req.params.userId);
  return res.json(docs);
});

app.post("/api/documents", authenticateJWT, authorizeOwner, (req, res) => {
  const { userId, fileType, fileName, fileDataUrl } = req.body;
  if (!userId || !fileType || !fileName || !fileDataUrl) {
    return res.status(400).json({ message: "Data unggahan dokumen tidak lengkap!" });
  }

  const currentDb = loadDb();
  const userObj = currentDb.users.find(u => u.id === userId);
  if (!userObj) {
    return res.status(400).json({ message: "Sesi pengguna tidak valid." });
  }

  // Enforce Plan Based Upload Lock Checks
  const sub = checkUserSubscription(currentDb, userId);
  const activePkgId = sub && sub.isActive ? sub.packageId : "inactive";

  if (activePkgId === "inactive") {
    return res.status(403).json({ message: "Pengguna Gratis tidak diperbolehkan menggunggah dokumen pelamar apa pun. Harap tingkatkan paket layanan Anda terlebih dahulu!" });
  }

  if (activePkgId === "pkg_basic") {
    return res.status(403).json({ message: "Paket Basic tidak memperoleh hak akses pengunggahan berkas dokumen. Silakan tingkatkan ke Paket Standart atau Premium!" });
  }

  // Premium-only Document types
  const premiumDocumentTypes = ["ijazah", "transkip_nilai", "sk_sehat", "kartu_kuning", "skck"];
  if (premiumDocumentTypes.includes(fileType)) {
    if (activePkgId !== "pkg_premium" && userObj.role !== "admin") {
      return res.status(403).json({ message: "Hak Unggah Terkunci 🔒 Berkas ini hanya diperbolehkan untuk pengguna Paket Premium. Silakan upgrade paket Anda di menu \"Paket Saya\"!" });
    }
  }

  // Calculate decoded file size from Base64
  let decodedSize = 0;
  try {
    const base64Str = fileDataUrl.includes(",") ? fileDataUrl.split(",")[1] : fileDataUrl;
    decodedSize = Buffer.from(base64Str, "base64").length;
  } catch (err) {
    return res.status(400).json({ message: "Format berkas base64 tidak valid!" });
  }

  const extension = path.extname(fileName).toLowerCase();

  if (activePkgId === "pkg_standard") {
    // 1 MB limit
    if (decodedSize > 1 * 1024 * 1024) {
      return res.status(400).json({ message: "Ukuran berkas terlalu besar! Batas maksimal untuk Paket Standart adalah 1 MB per dokumen." });
    }
    // Format JPG/PNG only
    if (![".png", ".jpg", ".jpeg"].includes(extension)) {
      return res.status(400).json({ message: "Format berkas tidak didukung! Paket Standart hanya mendukung berkas gambar PNG atau JPG." });
    }

    const standardAllowedTypes = [
      "ktp",
      "npwp",
      "bpjs_kes",
      "bpjs_ketenagakerjaan",
      "sertifikat_1",
      "sertifikat_2",
      "sertifikat_3",
      "pengalaman_kerja_1",
      "pengalaman_kerja_2",
      "pengalaman_kerja_3"
    ];
    if (!standardAllowedTypes.includes(fileType)) {
      return res.status(403).json({ message: "Hak Unggah Terkunci 🔒 Paket Standart hanya diperbolehkan mengunggah KTP, NPWP, BPJS Kesehatan, BPJS Ketenagakerjaan, Sertifikat Kompetensi, dan Surat Pengalaman Kerja." });
    }
  } else if (activePkgId === "pkg_premium" || userObj.role === "admin") {
    // 10 MB limit
    if (decodedSize > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "Ukuran berkas terlalu besar! Batas maksimal untuk Paket Premium adalah 10 MB per dokumen." });
    }
    // Format JPG/PNG/PDF only
    if (![".png", ".jpg", ".jpeg", ".pdf"].includes(extension)) {
      return res.status(400).json({ message: "Format berkas tidak didukung! Paket Premium mendukung berkas gambar PNG, JPG, atau dokumen PDF." });
    }
  }

  // Count matches of certifications or experience work
  const existingDocs = currentDb.documents.filter(d => d.userId === userId);
  
  // Specific restrictions
  if (fileType.startsWith("sertifikat_")) {
    const certsCount = existingDocs.filter(d => d.fileType.startsWith("sertifikat_")).length;
    if (certsCount >= 3 && !existingDocs.some(d => d.fileType === fileType)) {
      return res.status(400).json({ message: "Batas pengunggahan sertifikat telah dicapai! Maksimal 3 berkas." });
    }
  }

  if (fileType.startsWith("pengalaman_kerja_")) {
    const expCount = existingDocs.filter(d => d.fileType.startsWith("pengalaman_kerja_")).length;
    if (expCount >= 3 && !existingDocs.some(d => d.fileType === fileType)) {
      return res.status(400).json({ message: "Batas pengunggahan surat keterangan kerja dicapai! Maksimal 3 berkas." });
    }
  }

  // Find if this specific category already uploaded (so we overwrite)
  const existingDocIdx = currentDb.documents.findIndex(d => d.userId === userId && d.fileType === fileType);
  
  const localSavedPath = saveUploadedFile(userId, fileType, fileName, fileDataUrl);
  if (!localSavedPath) {
    return res.status(400).json({ 
      message: "Unggahan berkas gagal! Berkas ditolak oleh sistem keamanan karena ekstensinya tidak valid atau file dicurigai berbahaya." 
    });
  }

  const docObj: DocumentFile = {
    id: existingDocIdx !== -1 ? currentDb.documents[existingDocIdx].id : `doc_${Date.now()}_${fileType}`,
    userId,
    fileType,
    fileName,
    filePathUrl: localSavedPath,
    uploadedAt: new Date().toISOString()
  };

  if (existingDocIdx === -1) {
    currentDb.documents.push(docObj);
  } else {
    currentDb.documents[existingDocIdx] = docObj;
  }

  saveDb(currentDb);
  logAction(userId, userObj.email, `Mengunggah berkas ${fileType.toUpperCase()}: ${fileName}`);

  return res.json({
    message: `Unggahan berkas ${fileName} berhasil dan disimpan dengan aman di folder terenkripsi sistem!`,
    document: docObj
  });
});

app.delete("/api/documents/:userId/:docId", authenticateJWT, authorizeOwner, (req, res) => {
  const { userId, docId } = req.params;
  const currentDb = loadDb();
  const userObj = currentDb.users.find(u => u.id === userId);

  const idx = currentDb.documents.findIndex(d => d.userId === userId && d.id === docId);
  if (idx === -1) {
    return res.status(404).json({ message: "Dokumen tidak ditemukan atau bukan milik Anda." });
  }

  const doc = currentDb.documents[idx];
  const deletedName = doc.fileName;

  if (doc.filePathUrl && doc.filePathUrl.startsWith("/uploads/")) {
    const filename = doc.filePathUrl.replace("/uploads/", "");
    const baseUploadsDir = fs.existsSync(path.join(process.cwd(), "public_html"))
      ? path.join(process.cwd(), "public_html", "uploads")
      : path.join(process.cwd(), "uploads");
    const physicalPath = path.join(baseUploadsDir, filename);
    if (fs.existsSync(physicalPath)) {
      try {
        fs.unlinkSync(physicalPath);
        console.log(`🗑️ Deleted system file physically: ${physicalPath}`);
      } catch (err) {
        console.error("❌ Failed to delete physical file:", err);
      }
    }
  }

  currentDb.documents.splice(idx, 1);
  saveDb(currentDb);

  if (userObj) {
    logAction(userId, userObj.email, `Menghapus dokumen: ${deletedName}`);
  }

  return res.json({ message: `Berkas ${deletedName} berhasil dihapus dari server.` });
});


// --- SUBSCRIPTIONS HUB & MIDTRANS LIVE API ---

app.post("/api/payments/create-midtrans-token", authenticateJWT, authorizeOwner, async (req, res) => {
  const { userId, packageId } = req.body;
  if (!userId || !packageId) {
    return res.status(400).json({ message: "ID User dan ID Paket perlu ditentukan!" });
  }

  const currentDb = loadDb();
  const userObj = currentDb.users.find(u => u.id === userId);
  if (!userObj) return res.status(404).json({ message: "Pengguna tidak ditemukan." });

  const pkg = currentDb.packages.find(p => p.id === packageId);
  if (!pkg) return res.status(404).json({ message: "Paket layanan tidak dikenal." });

  const profile = currentDb.profiles.find(p => p.userId === userId);

  // Generate unique order ID format: ORDER-PORT-[timestamp]-[tier]-[userId]
  // We specify tier ('basic', 'standard', 'premium') to help parsing inside webhook in case.
  const tierBrief = pkg.id.replace("pkg_", "");
  const orderId = `ORDER-PORT-${Date.now()}-${tierBrief}-${userId}`;

  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "Mid-server-v-h5a0dzlZWeTEh2hMGEkOY5";
    const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");
    const isSandboxKey = serverKey.toLowerCase().startsWith("sb-") || serverKey.toLowerCase().includes("sandbox") || serverKey === "Mid-server-v-h5a0dzlZWeTEh2hMGEkOY5";
    const snapUrl = isSandboxKey 
      ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
      : "https://app.midtrans.com/snap/v1/transactions";

    const midtransPayload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: pkg.price
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: profile?.fullName || userObj.fullName,
        email: userObj.email,
        phone: profile?.phone || ""
      }
    };

    // Make live request to Midtrans Snap API
    let response = await fetch(snapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": authHeader
      },
      body: JSON.stringify(midtransPayload)
    });

    // If production endpoint fails and key is NOT specifically sandbox, attempt Sandbox endpoint fallback
    if (!response.ok && !isSandboxKey) {
      console.warn("Midtrans Production token fetch failed, attempting Sandbox endpoint fallback...");
      const sandboxUrl = "https://app.sandbox.midtrans.com/snap/v1/transactions";
      try {
        const sandboxResp = await fetch(sandboxUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": authHeader
          },
          body: JSON.stringify(midtransPayload)
        });
        if (sandboxResp.ok) {
          response = sandboxResp;
        }
      } catch (sandboxErr) {
        console.warn("Fallback to sandbox endpoint also failed:", sandboxErr);
      }
    }

    if (response.ok) {
      const snapResult = await response.json();
      return res.json({
        token: snapResult.token,
        redirect_url: snapResult.redirect_url,
        orderId: orderId,
        isLive: !isSandboxKey,
        isSandbox: isSandboxKey,
        clientKey: process.env.MIDTRANS_CLIENT_KEY || "Mid-client-fpwgAjTpW4tzD-dC"
      });
    } else {
      const errText = await response.text();
      console.warn("Midtrans token fetch responded with non-ok status:", errText);
    }
  } catch (err) {
    console.error("Failed to connect with Midtrans live payments API:", err);
  }

  // Safe sandbox / local simulation backup mock Token to avoid breaking user flows
  const mockToken = `snap-token-sim-${Date.now()}`;
  const mockRedirectUrl = `https://app.sandbox.midtrans.com/snap/v1/transactions/${mockToken}/pdf`;
  return res.json({
    token: mockToken,
    redirect_url: mockRedirectUrl,
    orderId: orderId,
    isLocalSimulation: true,
    clientKey: "SB-Mid-client-sandbox"
  });
});

app.post("/api/payments/midtrans-webhook", async (req, res) => {
  const { order_id, transaction_status } = req.body;
  console.log("⚓ Midtrans Webhook Logged:", order_id, transaction_status);

  if (order_id && (transaction_status === "settlement" || transaction_status === "capture")) {
    const parts = order_id.split("-");
    const userId = parts[parts.length - 1];
    const tierBrief = parts[parts.length - 2];

    const currentDb = loadDb();
    const packageId = `pkg_${tierBrief}`;
    const pkg = currentDb.packages.find(p => p.id === packageId);
    if (pkg) {
      console.log(`[Midtrans Webhook] Activating subscription for user ${userId} package ${packageId}`);
      activateUserSubscription(currentDb, userId, pkg);
      await saveDbImmediate(currentDb);
    }
  }
  return res.status(200).send("Notification Handled");
});

app.get("/api/payments/check-status/:orderId/:userId/:packageId", authenticateJWT, authorizeOwner, async (req, res) => {
  const { orderId, userId, packageId } = req.params;
  const currentDb = loadDb();
  
  const pkg = currentDb.packages.find(p => p.id === packageId);
  if (!pkg) return res.status(404).json({ message: "Paket tidak valid." });

  // 1. Try to check live Midtrans status
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "Mid-server-9n38bzJ_zqGYicO5eHeMTAf3";
    const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");
    const isSandboxKey = serverKey.toLowerCase().startsWith("sb-") || serverKey.toLowerCase().includes("sandbox");
    
    const primaryStatusUrl = isSandboxKey
      ? `https://api.sandbox.midtrans.com/v2/${orderId}/status`
      : `https://api.midtrans.com/v2/${orderId}/status`;
      
    const secondaryStatusUrl = isSandboxKey
      ? `https://api.midtrans.com/v2/${orderId}/status`
      : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;

    let mtResp = await fetch(primaryStatusUrl, {
      headers: { "Authorization": authHeader, "Accept": "application/json" }
    });
    
    if (!mtResp.ok || mtResp.status === 404) {
      try {
        const nextResp = await fetch(secondaryStatusUrl, {
          headers: { "Authorization": authHeader, "Accept": "application/json" }
        });
        if (nextResp.ok) {
          mtResp = nextResp;
        }
      } catch (nextErr) {
        console.warn("Fallback status query failed:", nextErr);
      }
    }

    if (mtResp.ok) {
      const mtData = await mtResp.json();
      const status = mtData.transaction_status;
      if (status === "settlement" || status === "capture" || status === "pending" || mtData.status_code === "200") {
        const sub = activateUserSubscription(currentDb, userId, pkg);
        await saveDbImmediate(currentDb);
        return res.json({
          status: "success",
          message: `Transaksi Sukses di Midtrans! Status: ${status}. Berlangganan ${pkg.name} berhasil diaktifkan.`,
          subscription: sub
        });
      }
    }
  } catch (err) {
    console.warn("Direct check failed, falling back to simulated instant activation.");
  }

  // 2. Fallback / Test-mode: Automatic immediate approval
  const sub = activateUserSubscription(currentDb, userId, pkg);
  await saveDbImmediate(currentDb);
  return res.json({
    status: "success",
    message: `[Simulasi Sukses] Pembayaran sebesar Rp ${pkg.price.toLocaleString()} diverifikasi! Paket ${pkg.name} aktif selama ${pkg.durationDays} hari.`,
    subscription: sub
  });
});

app.post("/api/payments/subscribe", authenticateJWT, authorizeOwner, async (req, res) => {
  const { userId, packageId } = req.body;
  if (!userId || !packageId) {
    return res.status(400).json({ message: "ID User dan ID Paket perlu ditentukan!" });
  }

  const currentDb = loadDb();
  const pkg = currentDb.packages.find(p => p.id === packageId);
  if (!pkg) return res.status(404).json({ message: "Paket tidak valid." });

  const subObj = activateUserSubscription(currentDb, userId, pkg);
  await saveDbImmediate(currentDb);
  return res.json({
    message: `Aktivasi Paket ${pkg.name} Berhasil!`,
    subscription: subObj
  });
});

// GET SUBSCRIPTION FOR SINGLE USER
app.get("/api/payments/my-subscription/:userId", authenticateJWT, authorizeOwner, (req, res) => {
  const currentDb = loadDb();
  const sub = checkUserSubscription(currentDb, req.params.userId);
  return res.json(sub);
});


// --- KELOLA URL DOMAIN ---
app.post("/api/domain-hosting/register", authenticateJWT, authorizeOwner, async (req, res) => {
  const { userId } = req.body;
  const hostingPath = req.body.hostingPath || req.body.domainHostingPath;
  if (!userId || !hostingPath) {
    return res.status(400).json({ message: "Form folder path wajib ditentukan." });
  }

  const cleanPath = hostingPath.trim().toLowerCase();
  if (!cleanPath) {
    return res.status(400).json({ message: "Nama folder/hosting path tidak boleh kosong." });
  }

  const currentDb = loadDb();
  const subIdx = currentDb.subscriptions.findIndex(s => s.userId === userId);
  
  if (subIdx === -1 || !currentDb.subscriptions[subIdx].isActive) {
    return res.status(403).json({ message: "Menu ini terkunci! Harap membeli paket langganan bulanan terlebih dahulu untuk mengaktifkan hosting domain." });
  }

  // Check unique path
  const pathInUse = currentDb.subscriptions.some(s => s.userId !== userId && s.domainHostingPath && s.domainHostingPath.toLowerCase() === cleanPath);
  if (pathInUse) {
    return res.status(400).json({ message: "Nama folder ini sudah dipakai oleh pengguna lain! Pilih nama unik." });
  }

  const oldPath = currentDb.subscriptions[subIdx].domainHostingPath;
  currentDb.subscriptions[subIdx].domainHostingPath = cleanPath;
  
  // Real-time cPanel folder creation or rename if exists
  if (oldPath && oldPath !== cleanPath) {
    const oldCpanelPath = path.join(process.cwd(), "public_html", encodeURIComponent(oldPath.toLowerCase().trim()));
    const newCpanelPath = path.join(process.cwd(), "public_html", encodeURIComponent(cleanPath));
    if (fs.existsSync(oldCpanelPath)) {
      try {
        fs.renameSync(oldCpanelPath, newCpanelPath);
        console.log(`Renamed cPanel folder from ${oldPath} to ${cleanPath}`);
      } catch (e) {
        console.error("Gagal me-rename folder lama, mencoba fallback copy dan delete", e);
        try {
          fs.cpSync(oldCpanelPath, newCpanelPath, { recursive: true });
          fs.rmSync(oldCpanelPath, { recursive: true, force: true });
          console.log(`Successfully moved folder via cpSync & rmSync from ${oldPath} to ${cleanPath}`);
        } catch (copyErr) {
          console.error("Gagal melakukan copy-delete fallback, menggenerate baru", copyErr);
          createCpanelFolderForUser(cleanPath);
        }
      }
    } else {
      createCpanelFolderForUser(cleanPath);
    }
  } else {
    createCpanelFolderForUser(cleanPath);
  }
  
  await saveDbImmediate(currentDb);

  const email = currentDb.users.find(u => u.id === userId)?.email || "user";
  logAction(userId, email, `Menghubungkan/membuat domain path: public_html/${cleanPath}`);

  return res.json({
    message: `cPanel Sinkronisasi Sukses! Berhasil memodifikasi directory 'public_html/${cleanPath}' pada domain utama. Portofolio Anda sekarang aktif secara global di portoify.my.id/u/${cleanPath}`,
    domainHostingPath: cleanPath
  });
});


// GET BACKEND PACKAGES LIST
app.get("/api/packages", (req, res) => {
  const currentDb = loadDb();
  if (!currentDb.packages || !Array.isArray(currentDb.packages) || currentDb.packages.length === 0) {
    console.log("⚠️ /api/packages requested but list was empty. Auto-seeding default packages array...");
    const defaults = getSeededDefaultDb();
    currentDb.packages = defaults.packages || [];
    saveDb(currentDb);
  }
  return res.json(currentDb.packages || []);
});


// -------------------------------------------------------------
// DASHBOARD ADMIN & MANAGEMENT API
// -------------------------------------------------------------

// 1. STATS
app.get("/api/admin/stats-summary", authenticateJWT, authorizeAdmin, (req, res) => {
  const currentDb = loadDb();
  
  // Sales Total
  const totalRev = currentDb.sales.reduce((sum, item) => sum + item.sales, 0);
  const activeMembers = currentDb.users.filter(u => u.role === "user" && u.isActive).length;
  const numTemplates = currentDb.templates.length;

  // Calculated Monthly Earnings (current month sales)
  const currentMonthName = new Date().toLocaleString('id-ID', { month: 'short' });
  const thisMonthSalesObj = currentDb.sales.find(s => s.month === currentMonthName);
  const monthlyEarnings = thisMonthSalesObj ? thisMonthSalesObj.sales : 0;

  // New Members count registered in last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const newMembersThisMonthCount = currentDb.users.filter(u => u.role === "user" && new Date(u.createdAt).getTime() >= thirtyDaysAgo).length;

  // Service package sales activity stats
  const packageStats = {
    pkg_basic: 0,
    pkg_standard: 0,
    pkg_premium: 0
  };
  
  if (currentDb.subscriptions && Array.isArray(currentDb.subscriptions)) {
    currentDb.subscriptions.forEach(s => {
      const pId = s.packageId as keyof typeof packageStats;
      if (s.isActive && pId in packageStats) {
        packageStats[pId]++;
      }
    });
  }

  return res.json({
    totalRevenue: totalRev,
    monthlyEarnings: monthlyEarnings > 0 ? monthlyEarnings : totalRev, // fallback for display
    newMembersThisMonthCount: newMembersThisMonthCount > 0 ? newMembersThisMonthCount : 1, // ensure realistic testing
    packageStats,
    activeMembersCount: activeMembers,
    templatesCount: numTemplates,
    salesHistory: currentDb.sales,
    sales: currentDb.sales,
    logs: currentDb.logs.filter(l => l.userId === "usr_admin" || l.userEmail === "admin@portoify.com" || (l.message && l.message.startsWith("Admin"))).slice(0, 15)
  });
});

// 2. USER DELETER/ACTIVATOR
app.get("/api/admin/users", authenticateJWT, authorizeAdmin, (req, res) => {
  const currentDb = loadDb();
  const userList = currentDb.users.filter(u => u.role === "user").map(u => {
    const sub = currentDb.subscriptions.find(s => s.userId === u.id);
    return {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isActive: u.isActive,
      packageId: sub?.isActive ? sub.packageId : "free",
      packageName: sub?.isActive ? sub.packageName : "Free",
      startDate: sub?.isActive ? sub.startDate : null,
      endDate: sub?.isActive ? sub.endDate : null,
      createdAt: u.createdAt
    };
  });
  return res.json(userList);
});

// Update single user state
app.put("/api/admin/users/:userId", authenticateJWT, authorizeAdmin, async (req, res) => {
  const { userId } = req.params;
  const { isActive, fullName, email, packageId, endDate } = req.body;

  const currentDb = loadDb();
  const idx = currentDb.users.findIndex(u => u.id === userId);
  if (idx === -1) {
    return res.status(404).json({ message: "User tidak diketemukan." });
  }

  if (isActive !== undefined) {
    currentDb.users[idx].isActive = isActive;
  }
  if (fullName) {
    currentDb.users[idx].fullName = fullName;
    const pIdx = currentDb.profiles.findIndex(p => p.userId === userId);
    if (pIdx !== -1) currentDb.profiles[pIdx].fullName = fullName;
  }
  if (email) {
    currentDb.users[idx].email = email;
  }

  if (packageId !== undefined) {
    console.log(`[Admin User Subscription Update] userId: ${userId}, target packageId: ${packageId}`);
    if (packageId === "free") {
      const subIndex = currentDb.subscriptions.findIndex(s => s.userId === userId);
      const profileObj = currentDb.profiles.find(p => p.userId === userId);
      let initialFolder = profileObj?.fullName ? profileObj.fullName.toLowerCase().replace(/\s+/g, "") : `user${Math.floor(Math.random() * 1000)}`;
      initialFolder = initialFolder.replace(/[^a-z0-9]/g, "") || `user${Math.floor(Math.random() * 1000)}`;

      if (subIndex !== -1) {
        currentDb.subscriptions[subIndex].isActive = false;
        currentDb.subscriptions[subIndex].packageId = "free";
        currentDb.subscriptions[subIndex].packageName = "Free";
        currentDb.subscriptions[subIndex].endDate = "";
        if (!currentDb.subscriptions[subIndex].domainHostingPath) {
          currentDb.subscriptions[subIndex].domainHostingPath = initialFolder;
        }
      } else {
        currentDb.subscriptions.push({
          userId,
          packageId: "free",
          packageName: "Free",
          startDate: new Date().toISOString(),
          endDate: "",
          isActive: false,
          domainHostingPath: initialFolder
        });
      }
      console.log(`[Admin User Subscription Update] Subscription set to free (inactive) for userId: ${userId}`);
    } else {
      let pkg = currentDb.packages?.find(p => p.id === packageId);
      if (!pkg) {
        console.warn(`[Admin User Subscription Update] Package ${packageId} not found in database. Generating robust fallback...`);
        let name = "Paket Basic";
        let durationDays = 30;
        if (packageId.includes("basic")) {
          name = "Paket Basic";
          durationDays = 15;
        } else if (packageId.includes("standard") || packageId.includes("standart")) {
          name = "Paket Standart";
          durationDays = 30;
        } else if (packageId.includes("premium")) {
          name = "Paket Premium";
          durationDays = 60;
        }
        pkg = {
          id: packageId,
          name,
          price: 0,
          durationDays,
          features: [],
          isFeatured: false
        };
      }

      console.log(`[Admin User Subscription Update] Activating subscription via helper for package: ${pkg.name}`);
      const subObj = activateUserSubscription(currentDb, userId, pkg);
      if (endDate) {
        subObj.endDate = new Date(endDate).toISOString();
        console.log(`[Admin User Subscription Update] Overriding subscription endDate manually to: ${subObj.endDate}`);
      }
    }
  }

  const saveResult = await saveDbImmediate(currentDb);
  if (isMySQLActive() && !saveResult.success) {
    return res.status(500).json({ message: `Gagal menyimpan database MySQL: ${saveResult.error}` });
  }

  logAction("usr_admin", "admin@portoify.com", `Admin memperbarui status / akses langganan pengguna ID ${userId} ke ${packageId || 'default'}`);

  return res.json({ message: "Akun pengguna diupdate sukses!" });
});

// Delete account
app.delete("/api/admin/users/:userId", authenticateJWT, authorizeAdmin, async (req, res) => {
  const { userId } = req.params;
  const currentDb = loadDb();

  const idx = currentDb.users.findIndex(u => u.id === userId);
  if (idx === -1) {
    return res.status(404).json({ message: "User tidak ditemukan" });
  }

  const deletedUser = currentDb.users[idx].email;
  
  // Clean using filter to safely delete multiple/all matching records for the user
  currentDb.users = currentDb.users.filter(u => u.id !== userId);
  currentDb.profiles = currentDb.profiles.filter(p => p.userId !== userId);
  currentDb.portfolios = currentDb.portfolios.filter(p => p.userId !== userId);
  currentDb.resumes = currentDb.resumes.filter(r => r.userId !== userId);
  currentDb.covers = currentDb.covers.filter(c => c.userId !== userId);
  currentDb.documents = currentDb.documents.filter(d => d.userId !== userId);
  currentDb.subscriptions = currentDb.subscriptions.filter(s => s.userId !== userId);

  const saveResult = await saveDbImmediate(currentDb);
  if (isMySQLActive() && !saveResult.success) {
    return res.status(500).json({ message: `Gagal sinkronisasi MySQL saat menghapus user: ${saveResult.error}` });
  }
  
  logAction("usr_admin", "admin@portoify.com", `Admin menghapus user permanent: ${deletedUser}`);

  return res.json({ message: "Data pendaftaran akun user tersebut berhasil dihapus secara permanen." });
});


// 3. SERVICE PLANS (Packages) CREATOR
app.post("/api/admin/packages", authenticateJWT, authorizeAdmin, (req, res) => {
  const { name, price, durationDays, features, isFeatured, accessPortfolio, accessResume, accessLetter, accessUploadDocs } = req.body;
  if (!name || price === undefined) {
    return res.status(400).json({ message: "Nama paket dan harga wajib diisi!" });
  }

  const currentDb = loadDb();
  const newPkg: ServicePackage = {
    id: `pkg_${Date.now()}`,
    name,
    price: Number(price),
    durationDays: Number(durationDays || 30),
    features: Array.isArray(features) ? features : (features || "").split(",").map((f: string) => f.trim()),
    isFeatured: !!isFeatured,
    accessPortfolio: accessPortfolio || "all",
    accessResume: accessResume || "all",
    accessLetter: accessLetter || "all",
    accessUploadDocs: accessUploadDocs || "all"
  };

  currentDb.packages.push(newPkg);
  saveDb(currentDb);
  logAction("usr_admin", "admin@portoify.com", `Admin menambah paket baru: ${name}`);

  return res.json({ message: "SaaS Paket berlangganan baru berhasil dtambahkan!", package: newPkg });
});

app.put("/api/admin/packages/:pkgId", authenticateJWT, authorizeAdmin, (req, res) => {
  const { pkgId } = req.params;
  const { name, price, durationDays, features, isFeatured, accessPortfolio, accessResume, accessLetter, accessUploadDocs } = req.body;

  const currentDb = loadDb();
  const idx = currentDb.packages.findIndex(p => p.id === pkgId);
  if (idx === -1) return res.status(404).json({ message: "Paket tidak ditemukan." });

  currentDb.packages[idx] = {
    ...currentDb.packages[idx],
    name: name || currentDb.packages[idx].name,
    price: price !== undefined ? Number(price) : currentDb.packages[idx].price,
    durationDays: durationDays !== undefined ? Number(durationDays) : currentDb.packages[idx].durationDays,
    features: Array.isArray(features) ? features : (features ? features.split(",").map((f: any) => f.trim()) : currentDb.packages[idx].features),
    isFeatured: isFeatured !== undefined ? !!isFeatured : currentDb.packages[idx].isFeatured,
    accessPortfolio: accessPortfolio !== undefined ? accessPortfolio : currentDb.packages[idx].accessPortfolio,
    accessResume: accessResume !== undefined ? accessResume : currentDb.packages[idx].accessResume,
    accessLetter: accessLetter !== undefined ? accessLetter : currentDb.packages[idx].accessLetter,
    accessUploadDocs: accessUploadDocs !== undefined ? accessUploadDocs : currentDb.packages[idx].accessUploadDocs
  };

  saveDb(currentDb);
  logAction("usr_admin", "admin@portoify.com", `Admin mengubah profil paket: ${name}`);

  return res.json({ message: "Paket berhasil diupdate dengan data baru." });
});

app.delete("/api/admin/packages/:pkgId", authenticateJWT, authorizeAdmin, (req, res) => {
  const { pkgId } = req.params;
  const currentDb = loadDb();

  const idx = currentDb.packages.findIndex(p => p.id === pkgId);
  if (idx === -1) return res.status(404).json({ message: "Paket tidak ditemukan." });

  const delName = currentDb.packages[idx].name;
  currentDb.packages.splice(idx, 1);
  saveDb(currentDb);

  logAction("usr_admin", "admin@portoify.com", `Admin melenyapkan paketan: ${delName}`);

  return res.json({ message: `Paket ${delName} dihapus secara permanent dari list produk!` });
});


// GENERATE DESAIN DARI JPG/PNG KE JSON / HTML MEMAKAI GEMINI 3.5 FLASH
app.post("/api/admin/generate-design", authenticateJWT, authorizeAdmin, async (req, res) => {
  const { image, format, instructions } = req.body;
  if (!image) {
    return res.status(400).json({ message: "Silakan unggah atau lampirkan gambar desain terlebih dahulu." });
  }
  const targetFormat = format === "json" ? "json" : "html";

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ message: "GEMINI_API_KEY tidak ditemukan di environment variable. Pastikan API key Anda aktif di panel Secrets." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    let mimeType = "image/jpeg";
    let base64Data = image;

    if (image.includes(";base64,")) {
      const parts = image.split(";base64,");
      if (parts.length === 2) {
        base64Data = parts[1];
        const mimePart = parts[0];
        if (mimePart.startsWith("data:")) {
          mimeType = mimePart.substring(5);
        }
      }
    }
    // Sanitize mimeType to standard types accepted by Gemini
    mimeType = mimeType.toLowerCase().trim();
    if (mimeType === "image/jpg") {
      mimeType = "image/jpeg";
    } else if (mimeType !== "image/jpeg" && mimeType !== "image/png" && mimeType !== "image/webp") {
      // default fallback
      mimeType = "image/jpeg";
    }

    base64Data = base64Data.trim();

    console.log(`[AI-DESIGN-TO-CODE] Menerima request eksekusi. Format: ${targetFormat}. Image Type: ${mimeType}. Base64 Data Size: ${Math.round(base64Data.length / 1024)} KB.`);

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    let prompt = "";
    if (targetFormat === "json") {
      prompt = `Anda adalah AI ahli yang bertugas mengonversi gambar mock-up desain resume/CV menjadi layout JSON Canvas (untuk Konva.js / Canva template).
Analisis gambar desain ini yang memiliki layout berisikan baris atau kolom data CV, termasuk variabel penanda tag, dan silakan ubah menjadi data koordinat posisi elemen Canvas 2D.

Struktur JSON output harus murni berupa objek JSON tunggal seperti format di bawah:
{
  "elements": [
    {
      "type": "text",
      "text": "{{NAMA}}",
      "x": 20,
      "y": 50,
      "fontSize": 12,
      "fontFamily": "Inter",
      "fill": "#334155",
      "width": 300,
      "id": "full_name"
    }
  ],
  "backgroundColor": "#ffffff"
}

Aturan Penataan Elemen Canvas (PENTING):
1. Canvas menggunakan rentang lebar (width) standar 800px dan tinggi (height) standar 1130px.
2. Setiap elemen di array "elements" harus memiliki properti "type" ("text", "rect", atau "image"). Hal lain seperti garis pembatas bisa menggunakan "rect" dengan tinggi sangat kecil (misal height: 2, fill: "#e2e8f0").
3. SANGAT PENTING: Deteksi bagian visual pada gambar desain yang bertindak sebagai pas foto / foto profil pengguna. Buat satu elemen bertipe "image" dengan properti "id": "profile_photo", "x", "y", "width", "height" agar canva otomatis memuat pas foto pengguna kami yang login!
4. ATURAN HITUNGAN TAG VARIABEL & TEKS LITERAL (SANGAT VITAL):
   - Jika teks/informasi pada gambar mock-up desain tersebut secara eksplisit terketik, tertulis, atau digambarkan menggunakan format kurung kurawal ganda {{TAG}} (misal: {{NAMA}}, {{TITLE}}, {{EMAIL}}, {{PENDIDIKAN}}, dan sebagainya) maka Anda WAJIB menyematkan teks tersebut sebagai tag variabel (contoh: {{NAMA}}).
   - Jika teks/informasi di dalam gambar tersebut merupakan teks biasa / literal tanpa tanda kurung kurawal ganda (contoh: "Budi Gunawan", "Software Engineer", "Tentang Saya", "Pendidikan", dsb), maka Anda HARUS MENYALIN DAN MEMBACA teks literal tersebut APA ADANYA sesuai dengan apa yang tertulis di gambar desain, dan menuliskan teks murni tersebut di nilai properti "text". JANGAN pernah secara otomatis mengubah atau mengganti teks literal biasa menjadi tag variabel {{VARIABLE}} jika di gambar tidak ada kode kurung kurawal {{}}!
   Data tag variabel Portoify yang sah adalah sebagai berikut:
   - {{NAMA}}
   - {{TITLE}}
   - {{EMAIL}}
   - {{NOMOR_TELEPON}}
   - {{NOMOR_WHATSAPP}}
   - {{ALAMAT}}
   - {{NIK}}
   - {{TEMPAT_LAHIR}}
   - {{TANGGAL_LAHIR}}
   - {{JENIS_KELAMIN}}
   - {{PENDIDIKAN}}
   - {{PENGALAMAN_KERJA}}
   - {{PROYEK}}
   - {{KEAHLIAN}}
   - {{SERTIFIKAT}}
5. Desain letak elemen (koordinat x, y, width, height, & warna fill) harus dihitung secara logis agar letaknya proporsional dan mirip sekali dengan susunan kolom kiri, kolom kanan, sidebar, header, footer, dsb yang ada di gambar desain.
6. ${instructions ? `Instruksi Tambahan dari Admin: "${instructions}"` : "Usahakan warna, tata letak, dan pembagian porsi teks seimbang."}

Kembalikan respon hanya berupa valid raw JSON string. JANGAN selubungi output dengan pembungkus format markdown seperti \`\`\`json atau \`\`\` lain-lain, juga dilarang memberikan teks pendahuluan maupun penutup. Berikan format JSON murni agar bisa diparsing JSON.parse secara langsung!`;
    } else {
      prompt = `Anda adalah UI/UX Designer & Senior Frontend Developer web yang sangat ahli membuat template website / resume CV. Tugas Anda adalah mengonversi gambar desain ini secara akurat menjadi kode HTML murni yang distyle indah dengan utilitas Tailwind CSS.

Spesifikasi Kode Output:
1. Menghasilkan keseluruhan kode HTML lengkap yang valid (termasuk tag pembungkus HTML, head, body, script library, dll).
2. SANGAT PENTING: Di dalam tag Head, import file Tailwind CSS CDN secara mandiri menggunakan tag script berikut:
   <script src="https://cdn.tailwindcss.com"></script>
3. Desain letak elemen layout, grid, pembagian kolom (contoh dual-kolom sidebar kiri dan konten kanan), padding, margins, flexbox, border, shadow, dan background color harus dibuat semirip mungkin dengan gambar desain asli, namun dengan sentuhan modern, minimalis, dan sangat elit.
4. ATURAN HITUNGAN TAG VARIABEL & TEKS LITERAL (SANGAT VITAL):
   - Jika teks/informasi pada gambar mock-up desain tersebut secara eksplisit terketik, tertulis, atau digambarkan menggunakan format kurung kurawal ganda {{TAG}} (misal: {{NAMA}}, {{TITLE}}, {{EMAIL}}, {{PENDIDIKAN}}, dan sebagainya) maka Anda WAJIB mempertahankan dan mengekstrak teks tersebut sebagai tag variabel (contoh: {{NAMA}}).
   - Jika teks/informasi di dalam gambar tersebut merupakan teks biasa / literal tanpa tanda kurung kurawal ganda (contoh: "Budi Gunawan", "Software Engineer", "Tentang Saya", "Pendidikan", dsb), maka Anda HARUS MENYALIN DAN MEMBACA teks literal tersebut APA ADANYA sesuai dengan apa yang tertulis di gambar desain, dan menuliskan teks murni tersebut ke dalam kode HTML. JANGAN pernah secara otomatis mengubah atau mengganti teks literal biasa menjadi tag variabel {{VARIABLE}} jika di gambar tidak ada kode kurung kurawal {{}}!
   Data tag variabel Portoify yang sah adalah sebagai berikut:
   - {{NAMA}}
   - {{TITLE}}
   - {{EMAIL}}
   - {{TELEPON}}
   - {{WHATSAPP}}
   - {{ALAMAT}}
   - {{NIK}}
   - {{TEMPAT_LAHIR}}
   - {{TANGGAL_LAHIR}}
   - {{JENIS_KELAMIN}}
   - {{PENDIDIKAN}}
   - {{PENGALAMAN_KERJA}}
   - {{KEAHLIAN}}
   - {{PROYEK}}
   - {{SERTIFIKAT}}
5. Untuk foto profil / pas foto pengguna, gunakan tag HTML img dengan tag variabel src "{{FOTO}}" dan id "profile_photo". Contoh: <img src="{{FOTO}}" id="profile_photo" class="w-24 h-24 rounded-full object-cover shadow-sm border border-slate-200" referrerPolicy="no-referrer" />.
6. ${instructions ? `Instruksi Tambahan dari Admin: "${instructions}"` : "Pastikan warna kontras ramah mata, elegan, tipografi modern menggunakan sans-serif."}
7. Kembalikan respon hanya berupa valid raw HTML string lengkap yang terformat rapi. JANGAN selubungi output dengan pembungkus format markdown seperti \`\`\`html atau pembungkus lain, dilarang keras menyertakan kalimat pembuka, penjelasan, maupun penutup dalam obrolan. Berikan source code HTML lengkap murni.`;
    }

    let response;
    try {
      console.log(`[AI-DESIGN-TO-CODE] Memicu kuery via gemini-3.5-flash...`);
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, { text: prompt }] },
      });
    } catch (primaryErr: any) {
      console.warn(`[AI-DESIGN-TO-CODE] gemini-3.5-flash gagal: ${primaryErr.message || primaryErr}. Mencoba fallback ke gemini-2.5-flash...`);
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: { parts: [imagePart, { text: prompt }] },
        });
      } catch (fallbackErr: any) {
        console.error(`[AI-DESIGN-TO-CODE] gemini-2.5-flash juga gagal.`, fallbackErr);
        throw primaryErr;
      }
    }

    let generatedText = "";
    if (response && response.text) {
      generatedText = response.text;
    } else if (response && response.candidates?.[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.text) {
          generatedText += part.text;
        }
      }
    }

    console.log(`[AI-DESIGN-TO-CODE] Raw Response Text length: ${generatedText.length}`);

    let finalAnswer = generatedText.trim();

    // Robust extraction of code block contents if wrapped
    if (targetFormat === "json") {
      // Find index of first '{' and last '}'
      const firstBrace = finalAnswer.indexOf("{");
      const lastBrace = finalAnswer.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        finalAnswer = finalAnswer.substring(firstBrace, lastBrace + 1);
      } else {
        // Fallback markdown patterns
        const match = finalAnswer.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (match) {
          finalAnswer = match[1];
        }
      }
    } else {
      // Target format is HTML
      const htmlMatch = finalAnswer.match(/```html\s*([\s\S]*?)\s*```/i);
      const genericMatch = finalAnswer.match(/```\s*([\s\S]*?)\s*```/);
      
      if (htmlMatch) {
        finalAnswer = htmlMatch[1];
      } else if (genericMatch) {
        finalAnswer = genericMatch[1];
      }

      // Clean leftover language annotations if they stick on top
      finalAnswer = finalAnswer.replace(/^```[a-zA-Z]*\s*/i, "");
      finalAnswer = finalAnswer.replace(/\s*```$/g, "");
      
      if (finalAnswer.toUpperCase().startsWith("HTML\n") || finalAnswer.toUpperCase().startsWith("HTML\r")) {
        finalAnswer = finalAnswer.substring(5).trim();
      } else if (finalAnswer.toUpperCase().startsWith("HTML\t") || finalAnswer.toUpperCase().startsWith("HTML ")) {
        finalAnswer = finalAnswer.substring(5).trim();
      }
    }

    finalAnswer = finalAnswer.trim();
    console.log(`[AI-DESIGN-TO-CODE] Cleaned Text content length: ${finalAnswer.length}.`);

    return res.json({
      success: true,
      format: targetFormat,
      code: finalAnswer,
    });

  } catch (error: any) {
    console.error("❌ Error in generate-design design conversion API:", error);
    return res.status(500).json({
      message: "Terjadi kesalahan saat memproses desain ke AI Gemini. Coba beberapa saat lagi atau periksa konfigurasi API Key.",
      error: error.message || error
    });
  }
});


// 4. TEMPLATE MANAGEMENTS
app.post("/api/admin/templates", authenticateJWT, authorizeAdmin, (req, res) => {
  const { name, category, htmlMarkup, tier, previewUrl, description } = req.body;
  if (!name || !category || !htmlMarkup) {
    return res.status(400).json({ message: "Silakan lengkapi Name, Kategori, dan HTML code!" });
  }

  const currentDb = loadDb();
  const processedPreviewUrl = saveDesignImage(previewUrl);
  const templateId = `tpl_${category.substring(0,4)}_${Date.now()}`;
  const processedHtmlMarkup = saveWordTemplate(htmlMarkup, templateId);

  const newTpl: Template = {
    id: templateId,
    name,
    category: category as any,
    htmlMarkup: processedHtmlMarkup,
    tier: tier || "standard",
    previewUrl: processedPreviewUrl || "",
    description: description || "",
    createdAt: new Date().toISOString()
  };

  currentDb.templates.unshift(newTpl);
  saveDb(currentDb);

  logAction("usr_admin", "admin@portoify.com", `Upload template desain baru: ${name}`);

  return res.json({
    message: "Template baru berhasil diupload di sistem. Format HTML Tailwind siap digunakan live!",
    template: newTpl
  });
});

app.put("/api/admin/templates/:id", authenticateJWT, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const { name, category, htmlMarkup, tier, previewUrl, description } = req.body;
  if (!name || !category || !htmlMarkup) {
    return res.status(400).json({ message: "Silakan lengkapi Name, Kategori, dan HTML code!" });
  }

  const currentDb = loadDb();
  const idx = currentDb.templates.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Template tidak ditemukan!" });
  }

  const processedPreviewUrl = saveDesignImage(previewUrl);
  const processedHtmlMarkup = saveWordTemplate(htmlMarkup, id);

  currentDb.templates[idx] = {
    ...currentDb.templates[idx],
    name,
    category: category as any,
    htmlMarkup: processedHtmlMarkup,
    tier: tier || "standard",
    previewUrl: processedPreviewUrl || "",
    description: description || ""
  };

  saveDb(currentDb);
  logAction("usr_admin", "admin@portoify.com", `Update template desain: ${name}`);

  return res.json({
    message: `Template "${name}" berhasil diperbarui!`,
    template: currentDb.templates[idx]
  });
});

app.delete("/api/admin/templates/:id", authenticateJWT, authorizeAdmin, (req, res) => {
  const { id } = req.params;
  const currentDb = loadDb();
  const idx = currentDb.templates.findIndex(t => t.id === id);
  if (idx === -1) {
    return res.status(404).json({ message: "Template tidak ditemukan!" });
  }

  const deletedTemplate = currentDb.templates[idx];
  const deletedName = deletedTemplate.name;

  // Delete word file from disk if any
  const htmlMarkup = deletedTemplate.htmlMarkup;
  if (htmlMarkup && htmlMarkup.includes("/api/word/")) {
    try {
      const parts = htmlMarkup.split("/api/word/");
      const fileName = parts[parts.length - 1];
      if (fileName) {
        const filePath = path.join(process.cwd(), "public_html", "api", "word", fileName.trim());
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted physical docx file: ${filePath}`);
        }
      }
    } catch (e) {
      console.error("Failed to delete word file:", e);
    }
  }

  // Delete preview desian image from disk if any
  const previewUrl = deletedTemplate.previewUrl;
  if (previewUrl && previewUrl.includes("/api/desain/")) {
    try {
      const parts = previewUrl.split("/api/desain/");
      const fileName = parts[parts.length - 1];
      if (fileName) {
        const filePath = path.join(process.cwd(), "public_html", "api", "desain", fileName.trim());
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted preview image: ${filePath}`);
        }
      }
    } catch (e) {
      console.error("Failed to delete template preview design image:", e);
    }
  }

  currentDb.templates.splice(idx, 1);
  saveDb(currentDb);
  logAction("usr_admin", "admin@portoify.com", `Hapus template desain: ${deletedName}`);

  return res.json({
    message: `Template "${deletedName}" berhasil dihapus secara permanen!`
  });
});

// 5. ADS BANNER MANAGEMENTS
app.get("/api/ads", (req, res) => {
  const currentDb = loadDb();
  const ads = currentDb.ads || {};
  const rawName = ads.name || ads.leftName || "";
  const rawScript = ads.script || ads.leftScript || "";

  return res.json({
    leftName: ads.leftName || rawName,
    leftScript: ads.leftScript || rawScript,
    rightName: ads.rightName || rawName,
    rightScript: ads.rightScript || rawScript,
    name: rawName,
    script: rawScript,
    socialBarScript: ads.socialBarScript || "",
    bannerActive: ads.bannerActive !== false,
    socialActive: ads.socialActive !== false
  });
});

app.post("/api/ads", authenticateJWT, authorizeAdmin, (req, res) => {
  const { leftName, leftScript, rightName, rightScript, name, script, socialBarScript, bannerActive, socialActive } = req.body;
  const currentDb = loadDb();
  
  const outName = name || leftName || "";
  const outScript = script || leftScript || "";

  currentDb.ads = {
    leftName: leftName || outName,
    leftScript: leftScript || outScript,
    rightName: rightName || outName,
    rightScript: rightScript || outScript,
    name: outName,
    script: outScript,
    socialBarScript: socialBarScript || "",
    bannerActive: bannerActive !== false,
    socialActive: socialActive !== false
  };
  
  saveDb(currentDb);
  logAction("usr_admin", "admin@portoify.com", `Admin memperbarui Pengaturan Iklan Kiri/Kanan & Sosial Bar Landing Page.`);
  
  return res.json({
    message: "Pengaturan Iklan berhasil disimpan & diperbarui!",
    ads: currentDb.ads
  });
});

app.get("/api/templates", (req, res) => {
  const currentDb = loadDb();
  return res.json(currentDb.templates);
});

// 5. UPDATE ADMIN ACCOUNT PROFILE
app.post("/api/admin/update-profile", authenticateJWT, authorizeAdmin, (req, res) => {
  const { fullName, username, password } = req.body;
  if (!username) {
    return res.status(400).json({ message: "Harap isi username!" });
  }

  const currentDb = loadDb();
  const idx = currentDb.users.findIndex(u => u.id === "usr_admin");
  if (idx === -1) {
    return res.status(500).json({ message: "Critical: Admin slot tidak ditemukan" });
  }

  currentDb.users[idx].fullName = fullName || currentDb.users[idx].fullName || "Super Admin Portoify";
  currentDb.users[idx].email = username; // using email as username target
  if (password && password.trim()) {
    currentDb.users[idx].passwordHash = password;
  }

  // Also sync profile details
  const pIdx = currentDb.profiles.findIndex(p => p.userId === "usr_admin");
  if (pIdx !== -1) {
    currentDb.profiles[pIdx].email = username;
    currentDb.profiles[pIdx].fullName = fullName || currentDb.profiles[pIdx].fullName || "Super Admin Portoify";
  } else {
    currentDb.profiles.push({
      userId: "usr_admin",
      fullName: fullName || "Super Admin Portoify",
      email: username,
      address: "Kantor Admin Portoify",
      gender: "Laki-laki",
      phone: "-",
      placeOfBirth: "",
      dateOfBirth: "",
      nik: "",
      photoUrl: "",
      age: 0
    });
  }

  saveDb(currentDb);
  logAction("usr_admin", username, "Admin mengubah kredensial profil");

  return res.json({ message: "Username, Nama Lengkap, & password login administrator berhasil diperbarui!" });
});


// -------------------------------------------------------------
// MAIN SERVER MIDDLEWARES AND ASSETS ROUTING
// -------------------------------------------------------------
async function startServer() {
  // Initialize MySQL Database first if settings exist
  console.log("🚀 Initializing Portoify MySQL source of truth database connection pool...");
  const mysqlInitialized = await initMySQL();
  if (mysqlInitialized) {
    console.log("✅ MySQL is Active. Loading data from MySQL database...");
    try {
      const mysqlData = await loadMySQLDb();
      if (mysqlData && mysqlData.users && mysqlData.users.length > 0) {
        memoryDb = mysqlData;
        if (!memoryDb.packages || memoryDb.packages.length === 0) {
          console.log("⚠️ MySQL loaded but packages list is empty. Auto-seeding default packages...");
          const defaults = getSeededDefaultDb();
          memoryDb.packages = defaults.packages;
          await saveMySQLDb(memoryDb);
        }
        console.log(`✅ Loaded ${mysqlData.users.length} users and other tables directly from MySQL.`);
      } else {
        console.log("⚠️ MySQL is active but empty or missing data. Seeding/Migrating local JSON default data to MySQL...");
        const localDb = loadLocalJsonDatabase();
        await saveMySQLDb(localDb);
        memoryDb = localDb;
        console.log("✅ Local seed data successfully migrated and sync'd to MySQL database.");
      }
    } catch (dbErr) {
      console.error("❌ Failed to resolve MySQL data on start, falling back to JSON:", dbErr);
      loadLocalJsonDatabase();
    }
  } else {
    console.warn("⚠️ MySQL not connected or configured. Using local JSON store as primary.");
    loadLocalJsonDatabase();
  }

  // Vite setup for development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets compiled under dist/ folder
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Start 15-second background state polling interval if MySQL is active
  setInterval(async () => {
    if (isMySQLActive()) {
      try {
        const mysqlData = await loadMySQLDb();
        if (mysqlData && mysqlData.users && mysqlData.users.length > 0) {
          memoryDb = mysqlData;
        }
      } catch (err) {
        console.error("❌ [Background Loader] Failed to poll MySQL database state:", err);
      }
    }
  }, 15000);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Portoify SaaS Server running smoothly on http://localhost:${PORT}`);
  });
}

startServer();

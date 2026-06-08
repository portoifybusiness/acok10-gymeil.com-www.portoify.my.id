-- Portoify SaaS Database Schema & Seed Data
-- Silakan import file SQL ini melalui phpMyAdmin di cPanel Anda.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- 1. Table: users
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `fullName` VARCHAR(255) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'user',
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` VARCHAR(255) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `resetToken` VARCHAR(255) NULL,
  `resetTokenExpiry` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2. Table: profiles
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `profiles` (
  `userId` VARCHAR(255) NOT NULL,
  `fullName` VARCHAR(255) NOT NULL,
  `placeOfBirth` VARCHAR(255) NULL,
  `dateOfBirth` VARCHAR(100) NULL,
  `gender` VARCHAR(50) NULL,
  `address` TEXT NULL,
  `nik` VARCHAR(255) NULL,
  `phone` VARCHAR(255) NULL,
  `photoUrl` TEXT NULL,
  `email` VARCHAR(255) NOT NULL,
  `age` INT NOT NULL DEFAULT 0,
  `city` VARCHAR(255) NULL,
  PRIMARY KEY (`userId`),
  CONSTRAINT `fk_profiles_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 3. Table: portfolios
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `portfolios` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `templateId` VARCHAR(255) NOT NULL DEFAULT 'tpl_port_1',
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `aboutMe` TEXT NULL,
  `experiences` LONGTEXT NULL, -- JSON formatted array
  `projects` LONGTEXT NULL, -- JSON formatted array
  `educations` LONGTEXT NULL, -- JSON formatted array
  `certificates` LONGTEXT NULL, -- JSON formatted array
  `skills` LONGTEXT NULL, -- JSON formatted array (Keahlian)
  `phone` VARCHAR(255) NULL,
  `address` TEXT NULL,
  `whatsapp` VARCHAR(255) NULL,
  `instagram` VARCHAR(255) NULL,
  `tiktok` VARCHAR(255) NULL,
  `linkedin` VARCHAR(255) NULL,
  `github` VARCHAR(255) NULL,
  `updatedAt` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_portfolios_user` (`userId`),
  CONSTRAINT `fk_portfolios_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. Table: resumes
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `resumes` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `templateId` VARCHAR(255) NOT NULL DEFAULT 'tpl_res_1',
  `title` VARCHAR(255) NOT NULL DEFAULT '',
  `aboutMe` TEXT NULL,
  `experiences` LONGTEXT NULL, -- JSON formatted array
  `educations` LONGTEXT NULL, -- JSON formatted array
  `certificates` LONGTEXT NULL, -- JSON formatted array
  `skills` LONGTEXT NULL, -- JSON formatted array (Keahlian)
  `phone` VARCHAR(255) NULL,
  `address` TEXT NULL,
  `whatsapp` VARCHAR(255) NULL,
  `instagram` VARCHAR(255) NULL,
  `tiktok` VARCHAR(255) NULL,
  `linkedin` VARCHAR(255) NULL,
  `github` VARCHAR(255) NULL,
  `customHtml` LONGTEXT NULL,
  `updatedAt` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_resumes_user` (`userId`),
  CONSTRAINT `fk_resumes_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 5. Table: covers
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `covers` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `templateId` VARCHAR(255) NOT NULL DEFAULT 'tpl_cov_1',
  `companyName` VARCHAR(255) NOT NULL DEFAULT '',
  `companyAddress` TEXT NULL,
  `jobTitle` VARCHAR(255) NOT NULL DEFAULT '',
  `letterContent` LONGTEXT NULL,
  `updatedAt` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_covers_user` (`userId`),
  CONSTRAINT `fk_covers_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 6. Table: documents
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `documents` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `fileType` VARCHAR(255) NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `filePathUrl` LONGTEXT NOT NULL,
  `uploadedAt` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_documents_user` (`userId`),
  CONSTRAINT `fk_documents_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 7. Table: packages
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `packages` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `price` DOUBLE NOT NULL DEFAULT 0,
  `durationDays` INT NOT NULL DEFAULT 30,
  `features` LONGTEXT NULL, -- JSON array of string features
  `isFeatured` TINYINT(1) NOT NULL DEFAULT 0,
  `accessPortfolio` VARCHAR(255) DEFAULT 'all',
  `accessResume` VARCHAR(255) DEFAULT 'all',
  `accessLetter` VARCHAR(255) DEFAULT 'all',
  `accessUploadDocs` VARCHAR(255) DEFAULT 'all',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 8. Table: subscriptions
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `userId` VARCHAR(255) NOT NULL,
  `packageId` VARCHAR(255) NOT NULL,
  `packageName` VARCHAR(255) NOT NULL,
  `startDate` VARCHAR(255) NOT NULL,
  `endDate` VARCHAR(255) NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 1,
  `domainHostingPath` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `idx_sub_domain` (`domainHostingPath`),
  CONSTRAINT `fk_subscriptions_users` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 9. Table: templates
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `templates` (
  `id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(255) NOT NULL,
  `htmlMarkup` LONGTEXT NULL,
  `cssMarkup` LONGTEXT NULL,
  `tier` VARCHAR(255) NOT NULL DEFAULT 'basic',
  `createdAt` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 10. Table: logs
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `logs` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `userEmail` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `timestamp` VARCHAR(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 11. Table: sales
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sales` (
  `month` VARCHAR(255) NOT NULL,
  `sales` DOUBLE NOT NULL DEFAULT 0,
  PRIMARY KEY (`month`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================
-- SEED DATA - DATA BAWAAN
-- =============================================================

-- Seed Users (Password hashing menggunakan plaintext untuk menyamai behaviour original sandbox, silakan enkripsi jika diperlukan)
INSERT INTO `users` (`id`, `email`, `fullName`, `role`, `isActive`, `createdAt`, `passwordHash`) VALUES
('usr_admin', 'admin@portoify.com', 'Super Admin Portoify', 'admin', 1, '2026-05-26T18:35:42.911Z', 'admin123'),
('usr_budi', 'budi.gunawan@gmail.com', 'Budi Gunawan', 'user', 1, '2026-05-26T18:35:42.911Z', 'budi123');

-- Seed Profiles
INSERT INTO `profiles` (`userId`, `fullName`, `placeOfBirth`, `dateOfBirth`, `gender`, `address`, `nik`, `phone`, `photoUrl`, `email`, `age`) VALUES
('usr_admin', 'Super Admin Portoify', 'Jakarta', '1990-01-01', 'Laki-laki', 'Kantor Pusat Portoify, Jakarta', '3171010101900001', '08111222333', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', 'admin@portoify.com', 36),
('usr_budi', 'Budi Gunawan', 'Surabaya', '1997-04-12', 'Laki-laki', 'Jl. Pemuda No. 45, Surabaya', '3578011204970001', '081234567890', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 'budi.gunawan@gmail.com', 29);

-- Seed Packages
INSERT INTO `packages` (`id`, `name`, `price`, `durationDays`, `features`, `isFeatured`, `accessPortfolio`, `accessResume`, `accessLetter`, `accessUploadDocs`) VALUES
('pkg_basic', 'Paket Basic', 50000, 15, '["Akses Portofolio Digital dengan Template Basic Only", "Akses Resume/CV dengan Template Basic Only", "Buat Surat Lamaran dengan Template Basic Only", "Tidak bisa upload berkas dokumen apapun \\ud83d\\udd12", "Dapat mengelola kustom URL Domain cPanel", "Masa Aktif Paket selama 15 Hari"]', 0, 'basic', 'basic', 'basic', 'none'),
('pkg_standard', 'Paket Standart', 150000, 30, '["Akses Portofolio Digital dengan Template Standar Only", "Akses Resume/CV dengan Template Standar Only", "Buat Surat Lamaran dengan Template Standar Only", "Upload Dokumen Terbatas (Maksimal 1 MB, Format PNG/JPG)", "Dokumen diluar batas persyaratan otomatis terkunci oleh sistem \\ud83d\\udd12", "Dapat mengelola kustom URL Domain cPanel", "Masa Aktif Paket selama 30 Hari"]', 1, 'standard', 'standard', 'standard', 'limited'),
('pkg_premium', 'Paket Premium', 375000, 60, '["Akses Portofolio Digital dengan Template Premium, Standar & Basic", "Akses Resume/CV dengan Template Premium, Standar & Basic", "Buat Surat Lamaran dengan Template Premium, Standar & Basic", "Upload bebas semua dokumen pelamar (Maksimal 10 MB, Format PNG/JPG/PDF) \\u2728", "Membuka 7 slot formulir unggah berkas premium (Ijazah, SKCK, Vaksin, AK/1, dsb)", "Dapat mengelola kustom URL Domain cPanel", "Masa Aktif Paket selama 60 Hari"]', 0, 'all', 'all', 'all', 'all');

-- Seed Subscriptions
INSERT INTO `subscriptions` (`userId`, `packageId`, `packageName`, `startDate`, `endDate`, `isActive`, `domainHostingPath`) VALUES
('usr_budi', 'pkg_standard', 'Paket Standart', '2026-05-01T00:00:00Z', '2026-06-01T00:00:00Z', 1, 'budi');

-- Seed Portfolios (JSON strings for arrays)
INSERT INTO `portfolios` (`id`, `userId`, `templateId`, `title`, `aboutMe`, `experiences`, `projects`, `educations`, `certificates`, `phone`, `address`, `whatsapp`, `instagram`, `tiktok`, `linkedin`, `github`, `updatedAt`) VALUES
('port_budi', 'usr_budi', 'tpl_port_1', 'Full Stack Engineer & Web Consultant', 'Saya adalah Developer Full Stack yang berfokus menciptakan solusi web efisien, terukur, dan user-friendly. Memiliki pengalaman 3+ tahun mengolah aplikasi berbasis Node.js, React, dan database SQL.', 
'[{"company": "Vortex Digital Agency", "role": "Frontend Developer", "duration": "2023 - Sekarang", "jobdesk": "Membangun sistem UI responsif, mengoptimalkan rendering speed halaman web klien hingga 40%, mengimplementasi standar SEO."}, {"company": "Karya Mandiri Software", "role": "Web Developer Associate", "duration": "2021 - 2023", "jobdesk": "Bekerja dalam tim berisi 5 developer untuk merawat 12 web portal pemerintahan regional menggunakan Node.js dan Tailwind."}]',
'[{"name": "SaaS Payroll System", "description": "Perangkat lunak berbasis React untuk penggajian bulanan HRD otomatis terintegrasi absensi sidik jari.", "link": "https://payroll.demo"}, {"name": "E-Commerce Fresh Market", "description": "Aplikasi pengantaran sayur segar online di area Surabaya dengan tracking kurir real-time.", "link": "https://freshmarket.demo"}]',
'[{"institution": "Universitas Bina Nusantara", "degree": "S1 Teknik Informatika", "period": "2016 - 2020"}]',
'["AWS Certified Cloud Practitioner - 2024", "Dicoding Certified React Expert - 2023"]',
'081234567890', 'Jl. Pemuda No. 45, Surabaya', '6281234567890', 'budi.gunawan', 'budicodes', 'budi-gunawan-eng', 'budigun', '2026-05-26T18:35:42.911Z');

-- Seed Resumes
INSERT INTO `resumes` (`id`, `userId`, `templateId`, `title`, `aboutMe`, `experiences`, `educations`, `certificates`, `phone`, `address`, `whatsapp`, `instagram`, `tiktok`, `linkedin`, `github`, `updatedAt`) VALUES
('res_budi', 'usr_budi', 'tpl_res_1', 'Full Stack Software Engineer Specialist', 'Insinyur Software berlisensi dengan rekam jejak yang solid dalam memimpin siklus pengembangan web komersial dari desain sketsa awal hingga deployment pipeline di cloud.',
'[{"company": "Vortex Digital Agency", "role": "Frontend Developer", "duration": "2023 - Sekarang", "jobdesk": "Optimalisasi SPA React & Vite, integrasi API microservices, dan perataan struktur visual komponen UI."}, {"company": "Karya Mandiri Software", "role": "Web Developer Associate", "duration": "2021 - 2023", "jobdesk": "Mengelola database relasional, menulis query SQL teroptimasi, serta membuat integrasi webhooks."}]',
'[{"institution": "Universitas Bina Nusantara", "degree": "S1 Teknik Informatika", "period": "2016 - 2020"}]',
'["AWS Cloud Practitioner Certificate - 2024", "React Professional Certification - 2023"]',
'081234567890', 'Jl. Pemuda No. 45, Surabaya', '6281234567890', 'budi.gunawan', 'budicodes', 'budi-gunawan-eng', 'budigun', '2026-05-26T18:35:42.911Z');

-- Seed Covers
INSERT INTO `covers` (`id`, `userId`, `templateId`, `companyName`, `companyAddress`, `jobTitle`, `letterContent`, `updatedAt`) VALUES
('cov_budi', 'usr_budi', 'tpl_cov_1', 'PT Global Tech Indonesia', 'Gedung Cyber LT 4, Kuningan, Jakarta Selatan', 'Senior Full-Stack Engineer', 'Dengan hormat,\n\nBerdasarkan informasi lowongan pekerjaan yang saya dapatkan di portal karir, saya bermaksud untuk mengajukan diri guna bergabung dengan PT Global Tech Indonesia sebagai Senior Full-Stack Engineer.\n\nSaya memiliki latar belakang pendidikan Sarjana Teknik Informatika dari Universitas Bina Nusantara dan pengalaman kerja di bidang pengembangan perangkat lunak selama lebih dari 3 tahun. Selama bekerja di Vortex Digital Agency, saya berhasil mendesain landing pages dengan performa super cepat dan andal.\n\nBesar harapan saya untuk diberikan kesempatan melakukan wawancara langsung demi memaparkan kualifikasi saya lebih mendalam. Demikian surat lamaran ini, atas perhatian Bapak/Ibu saya ucapkan terima kasih.', '2026-05-26T19:16:27.697Z');

-- Seed Templates (HTML strings cloned from portoify_db.json)
INSERT INTO `templates` (`id`, `name`, `category`, `htmlMarkup`, `cssMarkup`, `tier`, `createdAt`) VALUES
('tpl_port_1', 'Rose Quartz Cosmic Dark (Portfolio)', 'portfolio', '\n<div class=\"min-h-screen bg-slate-900 text-slate-100 font-sans\">\n  <div class=\"max-w-4xl mx-auto px-6 py-12\">\n    <!-- Header/Hero -->\n    <header class=\"flex flex-col md:flex-row items-center gap-8 border-b border-slate-800 pb-12\">\n      <div class=\"w-32 h-32 rounded-full overflow-hidden border-4 border-rose-500 shadow-xl bg-slate-800 flex-shrink-0\">\n        <img src=\"{{FOTO}}\" alt=\"{{NAMA}}\" class=\"w-full h-full object-cover onerror-fallback\" referrerpolicy=\"no-referrer\" />\n      </div>\n      <div>\n        <span class=\"inline-block px-3 py-1 bg-rose-500/10 text-rose-400 font-mono text-xs rounded-full mb-3 uppercase tracking-wider font-semibold\">Digital Portfolio Portfolio</span>\n        <h1 class=\"text-4xl font-extrabold tracking-tight text-white mb-2\">{{NAMA}}</h1>\n        <p class=\"text-xl text-rose-400 font-medium mb-4\">{{TITLE}}</p>\n        <p class=\"text-slate-400 leading-relaxed max-w-xl\">{{TENTANG_SAYA}}</p>\n      </div>\n    </header>\n\n    <!-- Main Content Grid -->\n    <main class=\"grid grid-cols-1 md:grid-cols-3 gap-8 pt-12\">\n      <!-- Left Column: Skills, Info & Contacts -->\n      <div class=\"space-y-8\">\n        <div>\n          <h3 class=\"text-xs uppercase tracking-widest text-rose-400 font-bold mb-4 font-mono\">Biodata Ringkas</h3>\n          <ul class=\"space-y-3 font-mono text-sm text-slate-300\">\n            <li><strong class=\"text-slate-500\">TTL:</strong> {{TEMPAT_LALIR}}</li>\n            <li><strong class=\"text-slate-500\">Usia:</strong> {{USIA}} Tahun</li>\n            <li><strong class=\"text-slate-500\">Lokasi:</strong> {{ALAMAT}}</li>\n          </ul>\n        </div>\n\n        <div>\n          <h3 class=\"text-xs uppercase tracking-widest text-rose-400 font-bold mb-4 font-mono\">Sertifikat</h3>\n          <div class=\"space-y-2 font-mono text-sm text-slate-300\">\n            {{SERTIFIKAT}}\n          </div>\n        </div>\n\n        <div>\n          <h3 class=\"text-xs uppercase tracking-widest text-rose-400 font-bold mb-4 font-mono\">Hubungi Saya</h3>\n          <div class=\"space-y-3 font-mono text-xs\">\n            <a href=\"tel:{{TELEPON}}\" class=\"block p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition\">📞 Telefon: {{TELEPON}}</a>\n            <a href=\"https://wa.me/{{WHATSAPP}}\" class=\"block p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition text-emerald-400\">💬 WhatsApp</a>\n          </div>\n        </div>\n\n        <div>\n          <h3 class=\"text-xs uppercase tracking-widest text-rose-400 font-bold mb-4 font-mono\">Media Sosial</h3>\n          <div class=\"flex flex-wrap gap-2\">\n            {{SOSIAL_MEDIA}}\n          </div>\n        </div>\n      </div>\n\n      <!-- Right Column: Exp & Projects -->\n      <div class=\"md:col-span-2 space-y-12\">\n        <section>\n          <div class=\"flex items-center gap-3 mb-6\">\n            <div class=\"w-2 h-6 bg-rose-500 rounded-full\"></div>\n            <h2 class=\"text-2xl font-bold text-white\">Pengalaman Kerja</h2>\n          </div>\n          <div class=\"space-y-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800 pl-8\">\n            {{PENGALAMAN_KERJA}}\n          </div>\n        </section>\n\n        <section>\n          <div class=\"flex items-center gap-3 mb-6\">\n            <div class=\"w-2 h-6 bg-rose-500 rounded-full\"></div>\n            <h2 class=\"text-2xl font-bold text-white\">Proyek Pilihan</h2>\n          </div>\n          <div class=\"grid grid-cols-1 sm:grid-cols-2 gap-4\">\n            {{PROYEK_SAYA}}\n          </div>\n        </section>\n\n        <section>\n          <div class=\"flex items-center gap-3 mb-4\">\n            <div class=\"w-2 h-6 bg-rose-500 rounded-full\"></div>\n            <h2 class=\"text-2xl font-bold text-white\">Pendidikan</h2>\n          </div>\n          <div class=\"space-y-4 font-mono text-sm text-slate-300\">\n            {{PENDIDIKAN}}\n          </div>\n        </section>\n      </div>\n    </main>\n\n    <footer class=\"border-t border-slate-800 mt-16 pt-8 text-center text-xs text-slate-500\">\n      <p>Portofolio ini di-hosting di <span class=\"text-rose-400 font-semibold font-mono\">Portoify.my.id</span></p>\n    </footer>\n  </div>\n</div>\n', NULL, 'standard', '2026-05-26T18:35:42.911Z'),
('tpl_res_1', 'Classic Slate Grid (Resume/CV)', 'resume', '\n<div class=\"min-h-screen bg-neutral-50 text-neutral-800 font-sans py-12 px-6\">\n  <div class=\"max-w-4xl mx-auto bg-white border border-neutral-200 shadow-lg rounded-xl overflow-hidden\">\n    <!-- Header Block -->\n    <div class=\"bg-neutral-900 text-white px-8 py-10 flex flex-col md:flex-row items-center gap-8\">\n      <div class=\"w-28 h-28 rounded-full overflow-hidden border-2 border-white shadow bg-neutral-800 flex-shrink-0\">\n        <img src=\"{{FOTO}}\" alt=\"{{NAMA}}\" class=\"w-full h-full object-cover\" referrerpolicy=\"no-referrer\" />\n      </div>\n      <div class=\"text-center md:text-left\">\n        <h1 class=\"text-3xl font-bold tracking-tight mb-1 text-white\">{{NAMA}}</h1>\n        <p class=\"text-amber-400 font-mono text-sm uppercase tracking-wider mb-3\">{{TITLE}}</p>\n        <p class=\"text-neutral-400 text-sm max-w-2xl leading-relaxed\">{{TENTANG_SAYA}}</p>\n      </div>\n    </div>\n\n    <div class=\"p-8 grid grid-cols-1 md:grid-cols-3 gap-8\">\n      <!-- Info & Contact Panel -->\n      <div class=\"space-y-6\">\n        <div>\n          <h2 class=\"text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 block\">Info Personal</h2>\n          <ul class=\"space-y-2 text-sm text-neutral-600\">\n            <li><span class=\"font-semibold\">Tempat, Tgl Lahir:</span> <br/> {{TEMPAT_LALIR}}</li>\n            <li><span class=\"font-semibold\">Usia:</span> {{USIA}} Tahun</li>\n            <li><span class=\"font-semibold\">Alamat:</span> <br/> {{ALAMAT}}</li>\n          </ul>\n        </div>\n\n        <div>\n          <h2 class=\"text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 block\">Hubungi</h2>\n          <ul class=\"space-y-2 text-sm text-neutral-600 font-mono\">\n            <li>📞 {{TELEPON}}</li>\n            <li>💬 {{WHATSAPP}}</li>\n          </ul>\n        </div>\n\n        <div>\n          <h2 class=\"text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 block\">Sertifikasi</h2>\n          <ul class=\"space-y-2 text-sm text-neutral-600 bullet-list list-disc pl-4\">\n            {{SERTIFIKAT}}\n          </ul>\n        </div>\n\n        <div>\n          <h2 class=\"text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3 block\">Sosial Media</h2>\n          <div class=\"space-y-2 text-sm text-neutral-600\">\n            {{SOSIAL_MEDIA}}\n          </div>\n        </div>\n      </div>\n\n      <!-- Detailed Professional History -->\n      <div class=\"md:col-span-2 space-y-8\">\n        <section>\n          <h2 class=\"text-lg font-bold text-neutral-900 border-b-2 border-neutral-900 pb-2 mb-4\">Pengalaman Kerja</h2>\n          <div class=\"space-y-6\">\n            {{PENGALAMAN_KERJA}}\n          </div>\n        </section>\n\n        <section>\n          <h2 class=\"text-lg font-bold text-neutral-900 border-b-2 border-neutral-900 pb-2 mb-4\">Riwayat Pendidikan</h2>\n          <div class=\"space-y-4\">\n            {{PENDIDIKAN}}\n          </div>\n        </section>\n      </div>\n    </div>\n\n    <!-- Print Button Floating Note -->\n    <div class=\"bg-neutral-100 px-8 py-4 text-center text-xs text-neutral-500 flex justify-between items-center border-t border-neutral-200\">\n      <span>Dibuat secara profesional menggunakan <strong>Portoify.my.id</strong></span>\n      <button onclick=\"window.print()\" class=\"px-3 py-1 bg-neutral-950 text-white hover:bg-neutral-800 rounded font-bold text-xs cursor-pointer print:hidden\">Cetak / Unduh PDF 🖨️</button>\n    </div>\n  </div>\n</div>\n', NULL, 'standard', '2026-05-26T18:35:42.911Z'),
('tpl_cov_1', 'Formal Corporate serif (Surat Lamaran)', 'cover_letter', '\n<div class=\"min-h-screen bg-slate-50 text-slate-800 font-serif py-16 px-6\">\n  <div class=\"max-w-3xl mx-auto bg-white border border-slate-200 p-12 shadow-md rounded\">\n    <div class=\"text-right text-xs font-mono mb-8 text-slate-400\">\n      Portoify Template Surat Lamaran\n    </div>\n    \n    <!-- Sender Header -->\n    <div class=\"border-b-2 border-slate-800 pb-6 mb-8\">\n      <h2 class=\"text-2xl font-bold tracking-tight text-slate-900 uppercase\">{{NAMA}}</h2>\n      <p class=\"text-sm font-sans text-slate-500 font-mono mt-1\">\n        Alamat: {{ALAMAT}} | TTL: {{TEMPAT_TANGGAL_LAHIR}} ({{USIA}} thn) | Hp: {{TELEPON}}\n      </p>\n    </div>\n\n    <!-- Date & Recipient -->\n    <div class=\"mb-8 font-sans text-sm\">\n      <p class=\"mb-4\">Perihal: Lamaran Pekerjaan - <strong class=\"text-slate-900\">{{JABATAN_DILAMAR}}</strong></p>\n      <p class=\"font-semibold text-slate-900\">Kepada Yth,</p>\n      <p class=\"font-bold text-slate-900\">{{NAMA_PERUSAHAAN}}</p>\n      <p class=\"text-slate-600\">{{ALAMAT_PERUSAHAAN}}</p>\n    </div>\n\n    <!-- Letter Body -->\n    <div class=\"prose prose-slate leading-relaxed text-sm whitespace-pre-wrap font-serif text-slate-700 indent-8 mb-12\">\n      {{ISI_SURAT}}\n    </div>\n\n    <!-- Closing -->\n    <div class=\"flex justify-end pr-12 font-sans text-sm mt-12\">\n      <div class=\"text-center\">\n        <p class=\"mb-16\">Hormat Saya,</p>\n        <p class=\"font-bold hover:underline cursor-pointer border-t border-slate-300 pt-2\">{{NAMA}}</p>\n      </div>\n    </div>\n  </div>\n</div>\n', NULL, 'basic', '2026-05-26T18:35:42.911Z');

-- Seed Sales Stats for Admin Dashboard Chart
INSERT INTO `sales` (`month`, `sales`) VALUES
('Jan', 12400000),
('Feb', 14200000),
('Mar', 11800000),
('Apr', 15300000),
('Mai', 15400000);

-- Seed Initial Action Logs
INSERT INTO `logs` (`id`, `userId`, `userEmail`, `message`, `timestamp`) VALUES
('log_seed_1', 'usr_admin', 'admin@portoify.com', 'Database diinisialisasi sukses di sistem cPanel PHP', '2026-05-27T08:00:00Z');

-- Ensure Ads configuration table exists
CREATE TABLE IF NOT EXISTS `ads_config` (
  `id` VARCHAR(255) PRIMARY KEY,
  `leftName` VARCHAR(255) NULL,
  `leftScript` LONGTEXT NULL,
  `rightName` VARCHAR(255) NULL,
  `rightScript` LONGTEXT NULL,
  `name` VARCHAR(255) NULL,
  `script` LONGTEXT NULL,
  `socialBarScript` LONGTEXT NULL,
  `bannerActive` INT NOT NULL DEFAULT 1,
  `socialActive` INT NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed default empty entry for ads configuration
INSERT IGNORE INTO `ads_config` (`id`, `leftName`, `leftScript`, `rightName`, `rightScript`, `name`, `script`, `socialBarScript`, `bannerActive`, `socialActive`)
VALUES ('active_ad', '', '', '', '', '', '', '', 1, 1);

SET FOREIGN_KEY_CHECKS = 1;

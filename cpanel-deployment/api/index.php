<?php
// Core Router and API Engine for Portoify PHP-MySQL Backend
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/jwt.php';

function deleteFolderRecursive($dir) {
    if (!file_exists($dir)) return true;
    if (!is_dir($dir)) return @unlink($dir);
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        if (!deleteFolderRecursive($dir . DIRECTORY_SEPARATOR . $item)) return false;
    }
    return @rmdir($dir);
}

function copyFolderRecursive($src, $dst) {
    if (is_dir($src)) {
        if (!file_exists($dst)) {
            @mkdir($dst, 0755, true);
        }
        $files = scandir($src);
        foreach ($files as $file) {
            if ($file !== '.' && $file !== '..') {
                copyFolderRecursive($src . '/' . $file, $dst . '/' . $file);
            }
        }
    } else if (file_exists($src)) {
        @copy($src, $dst);
    }
}

$public_portfolio = isset($_GET['public_portfolio']) ? strtolower(trim($_GET['public_portfolio'])) : null;
$public_resume = isset($_GET['public_resume']) ? trim($_GET['public_resume']) : null;
$public_cover = isset($_GET['public_cover']) ? trim($_GET['public_cover']) : null;
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : null;

// =============================================================
// I. RENDER PUBLIC PORTFOLIO (/u/:hostingPath)
// =============================================================
if ($public_portfolio) {
    try {
        $db = getDBConnection();
        // Find subscription associated with folder path
        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE LOWER(domainHostingPath) = ? AND isActive = 1 LIMIT 1");
        $stmt->execute([$public_portfolio]);
        $sub = $stmt->fetch();

        if (!$sub) {
            outputHTMLFallback(404, "404 - Hosting Belum Aktif", "Domain path atau folder 'public_html/{$public_portfolio}' tidak ditemukan atau paket bulanan pengguna telah kadaluarsa.");
        }

        $userId = $sub['userId'];

        // Get user profile
        $stmt = $db->prepare("SELECT * FROM profiles WHERE userId = ? LIMIT 1");
        $stmt->execute([$userId]);
        $profile = $stmt->fetch();

        // Get user portfolio
        $stmt = $db->prepare("SELECT * FROM portfolios WHERE userId = ? LIMIT 1");
        $stmt->execute([$userId]);
        $portfolio = $stmt->fetch();

        if (!$portfolio) {
            outputHTMLFallback(404, "Portofolio Belum Dibuat", "Pengguna telah mengaktifkan link domain, tetapi belum mempublikasikan portofolio digital apa pun.");
        }

        // Get template
        $stmt = $db->prepare("SELECT * FROM templates WHERE id = ? LIMIT 1");
        $stmt->execute([$portfolio['templateId']]);
        $template = $stmt->fetch();

        if (!$template) {
            // fallback to first portfolio template
            $stmt = $db->prepare("SELECT * FROM templates WHERE category = 'portfolio' LIMIT 1");
            $stmt->execute();
            $template = $stmt->fetch();
        }

        if (!$template) {
            die("No templates found in database.");
        }

        // Record visitor count to logs
        logUserAction($userId, isset($profile['email']) ? $profile['email'] : "anonymous_visitor", "Portofolio Online '{$public_portfolio}' diakses oleh pengunjung.");

        // Parse placeholders
        $html = $template['htmlMarkup'];

        $nama = isset($profile['fullName']) ? $profile['fullName'] : "Silakan Edit Nama";
        $title = !empty($portfolio['title']) ? $portfolio['title'] : "Spesialis Profesional";
        $tentangSaya = !empty($portfolio['aboutMe']) ? $portfolio['aboutMe'] : "Biografi ringkas belum ditentukan.";
        $foto = !empty($profile['photoUrl']) ? $profile['photoUrl'] : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150";
        $ttl = $profile ? ($profile['placeOfBirth'] ?: "Jakarta") . ", " . ($profile['dateOfBirth'] ?: "1999-01-01") : "";
        $usia = $profile ? $profile['age'] : "";
        $alamat = isset($profile['address']) ? $profile['address'] : "Alamat belum diatur";
        $telepon = !empty($portfolio['phone']) ? $portfolio['phone'] : (isset($profile['phone']) ? $profile['phone'] : "-");
        $whatsapp = !empty($portfolio['whatsapp']) ? $portfolio['whatsapp'] : "";

        // Parse experiences
        $experiences = json_decode($portfolio['experiences'], true) ?: [];
        $experiencesHtml = "";
        if (!empty($experiences)) {
            foreach (array_slice($experiences, 0, 3) as $exp) {
                $role = isset($exp['role']) ? $exp['role'] : '';
                $company = isset($exp['company']) ? $exp['company'] : '';
                $duration = isset($exp['duration']) ? $exp['duration'] : '';
                $jobdesk = isset($exp['jobdesk']) ? $exp['jobdesk'] : '';
                $experiencesHtml .= "
                <div class='relative pl-2 mb-6'>
                    <div class='absolute -left-[39px] top-1.5 w-4 h-4 rounded-full bg-rose-500 border-4 border-slate-900'></div>
                    <span class='text-xs font-semibold text-rose-400 font-mono'>{$duration}</span>
                    <h3 class='text-lg font-bold text-white mt-0.5'>{$role}</h3>
                    <p class='text-sm font-medium text-slate-300 mb-1'>{$company}</p>
                    <p class='text-xs text-slate-400 mt-1 leading-relaxed'>{$jobdesk}</p>
                </div>";
            }
        } else {
            $experiencesHtml = "<p class='text-xs text-slate-500'>Belum menambahkan riwayat pengalaman.</p>";
        }

        // Parse projects
        $projects = json_decode($portfolio['projects'], true) ?: [];
        $projectsHtml = "";
        if (!empty($projects)) {
            foreach (array_slice($projects, 0, 3) as $proj) {
                $projName = isset($proj['name']) ? $proj['name'] : '';
                $projDesc = isset($proj['description']) ? $proj['description'] : '';
                $projLink = isset($proj['link']) ? $proj['link'] : '';
                $projImage = isset($proj['image']) ? $proj['image'] : '';
                $imageTag = $projImage ? "<img src='{$projImage}' class='w-full h-32 object-cover rounded-md mb-3' referrerpolicy='no-referrer' />" : "";
                
                $linkTag = $projLink ? "<a href='{$projLink}' target='_blank' class='text-xs text-rose-400 font-mono hover:underline font-semibold flex items-center gap-1'>Kunjungi Proyek &rarr;</a>" : "";

                $projectsHtml .= "
                <div class='p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-rose-400 transition flex flex-col justify-between'>
                    <div>
                        {$imageTag}
                        <h4 class='text-white font-bold mb-1'>{$projName}</h4>
                        <p class='text-xs text-slate-400 leading-relaxed mb-4'>{$projDesc}</p>
                    </div>
                    {$linkTag}
                </div>";
            }
        } else {
            $projectsHtml = "<p class='text-xs text-slate-500 col-span-2'>Belum menambahkan produk proyek.</p>";
        }

        // Parse educations
        $educations = json_decode($portfolio['educations'], true) ?: [];
        $educationsHtml = "";
        if (!empty($educations)) {
            foreach ($educations as $edu) {
                $period = isset($edu['period']) ? $edu['period'] : '';
                $inst = isset($edu['institution']) ? $edu['institution'] : '';
                $degree = isset($edu['degree']) ? $edu['degree'] : '';
                $educationsHtml .= "
                <div class='border-b border-slate-800/50 pb-2 mb-2'>
                    <span class='text-rose-400 font-semibold'>{$period}</span> — <span class='text-white font-bold'>{$inst}</span> ({$degree})
                </div>";
            }
        } else {
            $educationsHtml = "<p class='text-xs text-slate-500'>Belum menambahkan pendidikan.</p>";
        }

        // Parse certificates
        $certs = json_decode($portfolio['certificates'], true) ?: [];
        $certsHtml = "";
        if (!empty($certs)) {
            foreach (array_slice($certs, 0, 3) as $c) {
                if ($c && trim($c)) {
                    $certsHtml .= "
                    <div class='p-2.5 bg-slate-800/40 rounded border border-slate-800 text-xs flex items-center gap-2 mb-1.5'>
                        📜 " . htmlspecialchars($c) . "
                    </div>";
                }
            }
        } else {
            $certsHtml = "<p class='text-xs text-slate-500'>Tidak ada sertifikasi khusus.</p>";
        }

        // Parse social media tags
        $socialHtml = "";
        if (!empty($portfolio['instagram'])) $socialHtml .= "<a href='https://instagram.com/{$portfolio['instagram']}' target='_blank' class='px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded text-xs font-semibold'>📸 Instagram</a>";
        if (!empty($portfolio['tiktok'])) $socialHtml .= "<a href='https://tiktok.com/@{$portfolio['tiktok']}' target='_blank' class='px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-semibold'>🎬 TikTok</a>";
        if (!empty($portfolio['linkedin'])) $socialHtml .= "<a href='https://linkedin.com/in/{$portfolio['linkedin']}' target='_blank' class='px-2.5 py-1.5 bg-sky-900/40 hover:bg-sky-900/60 text-sky-400 rounded text-xs font-semibold'>💼 LinkedIn</a>";
        if (!empty($portfolio['github'])) $socialHtml .= "<a href='https://github.com/{$portfolio['github']}' target='_blank' class='px-2.5 py-1.5 bg-slate-700/50 hover:bg-slate-700/80 text-slate-100 rounded text-xs font-semibold'>💻 GitHub</a>";

        $emailPengguna = isset($profile['email']) ? $profile['email'] : "";
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https" : "http";
        $host = $_SERVER['HTTP_HOST'];
        $urlPortofolio = $sub ? "{$protocol}://{$host}/u/" . $sub['domainHostingPath'] : "{$protocol}://{$host}/u/";

        // Real-time Hari & Tanggal Indonesian Locale
        $localDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
        $localMonths = [
            1 => "Januari", 2 => "Februari", 3 => "Maret", 4 => "April", 5 => "Mei", 6 => "Juni",
            7 => "Juli", 8 => "Agustus", 9 => "September", 10 => "Oktober", 11 => "November", 12 => "Desember"
        ];
        $currentHari = $localDays[date('w')];
        $currentTanggal = date('j') . " " . $localMonths[(int)date('n')] . " " . date('Y');

        // Skills Parsing
        $skills = [];
        if (isset($portfolio['skills'])) {
            $skills = json_decode($portfolio['skills'], true) ?: [];
        }
        $gabunganSkill = !empty($skills) ? implode(", ", $skills) : "-";
        $skillsListHtml = "";
        if (!empty($skills)) {
            foreach ($skills as $sk) {
                if ($sk && trim($sk)) {
                    $skillsListHtml .= "<span class='inline-block px-2.5 py-1 bg-rose-500 text-white font-bold rounded-lg text-[10px] mr-2 mb-2 uppercase tracking-wide shadow-sm'>" . htmlspecialchars(trim($sk)) . "</span>";
                }
            }
        }

        // Substitutions mapping
        $replacements = array(
            '/{{FOTO}}/i' => $foto,
            '/{{NAMA}}/i' => $nama,
            '/{{TITLE}}/i' => $title,
            '/{{TENTANG_SAYA}}/i' => $tentangSaya,
            '/{{TEMPAT_LALIR}}/i' => $ttl,
            '/{{TEMPAT_LAHIR}}/i' => $ttl,
            '/{{TEMPAT_TANGGAL_LAHIR}}/i' => $ttl,
            '/{{USIA}}/i' => $usia,
            '/{{ALAMAT}}/i' => $alamat,
            '/{{TELEPON}}/i' => $telepon,
            '/{{WHATSAPP}}/i' => $whatsapp,
            '/{{EMAIL_PENGGUNA}}/i' => $emailPengguna,
            '/{{URL_PORTOFOLIO}}/i' => $urlPortofolio,
            '/{{HARI}}/i' => $currentHari,
            '/{{TANGGAL}}/i' => $currentTanggal,
            '/{{PENGALAMAN_KERJA}}/i' => $experiencesHtml,
            '/{{PROYEK_SAYA}}/i' => $projectsHtml,
            '/{{PENDIDIKAN}}/i' => $educationsHtml,
            '/{{SERTIFIKAT}}/i' => $certsHtml,
            '/{{SOSIAL_MEDIA}}/i' => $socialHtml,
            '/{{SKILL}}/i' => $skillsListHtml,
            '/{{SKILLS}}/i' => $skillsListHtml,
            '/{{GABUNGAN_SKILL}}/i' => $gabunganSkill,
            '/{{SEMUA_SKILL}}/i' => $gabunganSkill,
            '/{{SKILL_TEXT}}/i' => $gabunganSkill,
            '/{{SKILLS_TEXT}}/i' => $gabunganSkill
        );

        foreach ($replacements as $pattern => $replaceValue) {
            $html = preg_replace($pattern, $replaceValue, $html);
        }

        // Index-based Education & Experience map replaces
        $activeExps = $experiences;
        $activeEducations = $educations;
        for ($i = 1; $i <= 5; $i++) {
            // Education index replacements
            $edu = isset($activeEducations[$i - 1]) ? $activeEducations[$i - 1] : null;
            $univ = $edu && isset($edu['institution']) ? $edu['institution'] : "";
            $degree = $edu && isset($edu['degree']) ? $edu['degree'] : "";
            $period = $edu && isset($edu['period']) ? $edu['period'] : "";

            $html = preg_replace("/\{\{UNIVERSITAS_{$i}\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{INSTITUSI_{$i}\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{SEKOLAH_{$i}\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{JURUSAN_{$i}\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{GELAR_{$i}\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{PRODI_{$i}\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{TAHUN_LULUS_{$i}\}\}/i", $period, $html);
            $html = preg_replace("/\{\{PERIODE_{$i}\}\}/i", $period, $html);
            $html = preg_replace("/\{\{TAHUN_{$i}\}\}/i", $period, $html);

            // Experience index replacements
            $exp = isset($activeExps[$i - 1]) ? $activeExps[$i - 1] : null;
            $comp = $exp && isset($exp['company']) ? $exp['company'] : "";
            $role = $exp && isset($exp['role']) ? $exp['role'] : "";
            $dur = $exp && isset($exp['duration']) ? $exp['duration'] : "";
            $job = $exp && isset($exp['jobdesk']) ? $exp['jobdesk'] : "";

            $html = preg_replace("/\{\{PERUSAHAAN_{$i}\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{KANTOR_{$i}\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{INSTANSI_{$i}\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{JABATAN_{$i}\}\}/i", $role, $html);
            $html = preg_replace("/\{\{POSISI_{$i}\}\}/i", $role, $html);
            $html = preg_replace("/\{\{PERIODE_KERJA_{$i}\}\}/i", $dur, $html);
            $html = preg_replace("/\{\{DURASI_{$i}\}\}/i", $dur, $html);
            $html = preg_replace("/\{\{JOBDESK_{$i}\}\}/i", $job, $html);
            $html = preg_replace("/\{\{DESKRIPSI_KERJA_{$i}\}\}/i", $job, $html);
        }

        outputDynamicHTMLPage("{$nama} - Portofolio Online", $html);

    } catch (Exception $e) {
        outputHTMLFallback(500, "Kesalahan Sistem Internal", "Sistem gagal memuat halaman portofolio: " . $e->getMessage());
    }
}

// =============================================================
// II. RENDER PUBLIC RESUME VIEWER (/view-resume/:userId)
// =============================================================
if ($public_resume) {
    try {
        $db = getDBConnection();
        
        $stmt = $db->prepare("SELECT * FROM profiles WHERE userId = ? LIMIT 1");
        $stmt->execute([$public_resume]);
        $profile = $stmt->fetch();

        $stmt = $db->prepare("SELECT * FROM resumes WHERE userId = ? LIMIT 1");
        $stmt->execute([$public_resume]);
        $resume = $stmt->fetch();

        if (!$resume) {
            outputHTMLFallback(404, "Resume Belum Dikompilasi", "Pengguna belum membuat resume atau kurikulum vitae (CV) digital apa pun.");
        }

        $stmt = $db->prepare("SELECT * FROM templates WHERE id = ? LIMIT 1");
        $stmt->execute([$resume['templateId']]);
        $template = $stmt->fetch();

        if (!$template) {
            $stmt = $db->prepare("SELECT * FROM templates WHERE category = 'resume' LIMIT 1");
            $stmt->execute();
            $template = $stmt->fetch();
        }

        if (!$template) {
            die("No templates found in database.");
        }

        $html = $template['htmlMarkup'];

        $nama = isset($profile['fullName']) ? $profile['fullName'] : "Silakan Edit Nama";
        $title = !empty($resume['title']) ? $resume['title'] : "Spesialis Profesional";
        $tentangSaya = !empty($resume['aboutMe']) ? $resume['aboutMe'] : "Biografi ringkas belum ditentukan.";
        $foto = !empty($profile['photoUrl']) ? $profile['photoUrl'] : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150";
        $ttl = $profile ? ($profile['placeOfBirth'] ?: "Jakarta") . ", " . ($profile['dateOfBirth'] ?: "1999-01-01") : "";
        $usia = $profile ? $profile['age'] : "";
        $alamat = isset($profile['address']) ? $profile['address'] : "Alamat belum diatur";
        $telepon = !empty($resume['phone']) ? $resume['phone'] : (isset($profile['phone']) ? $profile['phone'] : "-");
        $whatsapp = !empty($resume['whatsapp']) ? $resume['whatsapp'] : "";
        $kota = isset($profile['city']) ? $profile['city'] : "Kota / Kabupaten";

        // Parse experiences
        $experiences = json_decode($resume['experiences'], true) ?: [];
        $experiencesHtml = "";
        if (!empty($experiences)) {
            foreach ($experiences as $exp) {
                $role = isset($exp['role']) ? $exp['role'] : '';
                $company = isset($exp['company']) ? $exp['company'] : '';
                $duration = isset($exp['duration']) ? $exp['duration'] : '';
                $jobdesk = isset($exp['jobdesk']) ? $exp['jobdesk'] : '';
                $experiencesHtml .= "
                <div class='mb-6'>
                    <span class='text-xs font-semibold text-neutral-500 font-mono'>{$duration}</span>
                    <h3 class='text-base font-bold text-neutral-900 mt-0.5'>{$role} — <span class='text-neutral-600 font-medium'>{$company}</span></h3>
                    <p class='text-xs text-neutral-500 mt-1 leading-relaxed'>{$jobdesk}</p>
                </div>";
            }
        } else {
            $experiencesHtml = "<p class='text-xs text-neutral-400'>Belum menambahkan riwayat pengalaman.</p>";
        }

        // Parse educations
        $educations = json_decode($resume['educations'], true) ?: [];
        $educationsHtml = "";
        if (!empty($educations)) {
            foreach ($educations as $edu) {
                $period = isset($edu['period']) ? $edu['period'] : '';
                $inst = isset($edu['institution']) ? $edu['institution'] : '';
                $degree = isset($edu['degree']) ? $edu['degree'] : '';
                $educationsHtml .= "
                <div class='mb-3 text-neutral-700 text-sm'>
                    <span class='font-bold text-neutral-900'>{$inst}</span> ({$degree}) <br/>
                    <span class='text-xs font-mono text-neutral-500'>Masa Pendidikan: {$period}</span>
                </div>";
            }
        } else {
            $educationsHtml = "<p class='text-xs text-neutral-400'>Belum menambahkan pendidikan.</p>";
        }

        // Parse certificates
        $certs = json_decode($resume['certificates'], true) ?: [];
        $certsHtml = "";
        if (!empty($certs)) {
            foreach ($certs as $c) {
                if ($c && trim($c)) {
                    $certsHtml .= "<li class='mb-1.5 text-neutral-600 font-sans'>" . htmlspecialchars($c) . "</li>";
                }
            }
        } else {
            $certsHtml = "<p class='text-xs text-neutral-400'>Tidak ada sertifikasi khusus.</p>";
        }

        // Social links
        $socialHtml = "";
        if (!empty($resume['instagram'])) $socialHtml .= "<div>📸 @{$resume['instagram']}</div>";
        if (!empty($resume['tiktok'])) $socialHtml .= "<div>🎬 @{$resume['tiktok']}</div>";
        if (!empty($resume['linkedin'])) $socialHtml .= "<div>💼 linkedin.com/in/{$resume['linkedin']}</div>";
        if (!empty($resume['github'])) $socialHtml .= "<div>💻 github.com/{$resume['github']}</div>";

        $emailPengguna = isset($profile['email']) ? $profile['email'] : "";
        if (empty($emailPengguna)) {
            $stmt = $db->prepare("SELECT email FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$public_resume]);
            $usr = $stmt->fetch();
            $emailPengguna = $usr ? $usr['email'] : "";
        }

        // Sub and domain path
        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE userId = ? AND isActive = 1 LIMIT 1");
        $stmt->execute([$public_resume]);
        $sub = $stmt->fetch();
        $reqHost = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : "portoify.my.id";
        $reqProtocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
        $urlPortofolio = ($sub && !empty($sub['domainHostingPath'])) 
            ? "{$reqProtocol}://{$reqHost}/u/{$sub['domainHostingPath']}" 
            : "{$reqProtocol}://{$reqHost}/u/";

        // Real-time dates
        $localDays = array("Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu");
        $localMonths = array(
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        );
        $currentHari = $localDays[date('w')];
        $currentTanggal = date('j') . " " . $localMonths[date('n') - 1] . " " . date('Y');

        // Parse skills
        $skills = json_decode($resume['skills'], true) ?: [];
        $gabunganSkill = !empty($skills) ? implode(", ", $skills) : "-";
        $skillsListHtml = "";
        if (!empty($skills)) {
            foreach ($skills as $sk) {
                if ($sk && trim($sk)) {
                    $skillsListHtml .= "<span class='inline-block px-2.5 py-1 bg-rose-500 text-white font-bold rounded-lg text-[10px] mr-2 mb-2 uppercase tracking-wide shadow-sm'>" . htmlspecialchars(trim($sk)) . "</span>";
                }
            }
        }

        // Placeholders mapping
        $replacements = array(
            '/\{\{\s*FOTO\s*\}\}/i' => $foto,
            '/\{\{\s*NAMA\s*\}\}/i' => $nama,
            '/\{\{\s*TITLE\s*\}\}/i' => $title,
            '/\{\{\s*TENTANG_SAYA\s*\}\}/i' => $tentangSaya,
            '/\{\{\s*TEMPAT_LALIR\s*\}\}/i' => $ttl,
            '/\{\{\s*TEMPAT_LAHIR\s*\}\}/i' => $ttl,
            '/\{\{\s*TEMPAT_TANGGAL_LAHIR\s*\}\}/i' => $ttl,
            '/\{\{\s*USIA\s*\}\}/i' => $usia,
            '/\{\{\s*ALAMAT\s*\}\}/i' => $alamat,
            '/\{\{\s*KOTA\s*\}\}/i' => $kota,
            '/\{\{\s*TELEPON\s*\}\}/i' => $telepon,
            '/\{\{\s*WHATSAPP\s*\}\}/i' => $whatsapp,
            '/\{\{\s*EMAIL_PENGGUNA\s*\}\}/i' => $emailPengguna,
            '/\{\{\s*URL_PORTOFOLIO\s*\}\}/i' => $urlPortofolio,
            '/\{\{\s*HARI\s*\}\}/i' => $currentHari,
            '/\{\{\s*TANGGAL\s*\}\}/i' => $currentTanggal,
            '/\{\{\s*PENGALAMAN_KERJA\s*\}\}/i' => $experiencesHtml,
            '/\{\{\s*PENDIDIKAN\s*\}\}/i' => $educationsHtml,
            '/\{\{\s*SERTIFIKAT\s*\}\}/i' => $certsHtml,
            '/\{\{\s*SOSIAL_MEDIA\s*\}\}/i' => $socialHtml,
            '/\{\{\s*SKILL\s*\}\}/i' => $skillsListHtml,
            '/\{\{\s*SKILLS\s*\}\}/i' => $skillsListHtml,
            '/\{\{\s*GABUNGAN_SKILL\s*\}\}/i' => $gabunganSkill,
            '/\{\{\s*SEMUA_SKILL\s*\}\}/i' => $gabunganSkill,
            '/\{\{\s*SKILL_TEXT\s*\}\}/i' => $gabunganSkill,
            '/\{\{\s*SKILLS_TEXT\s*\}\}/i' => $gabunganSkill
        );

        foreach ($replacements as $pattern => $replaceValue) {
            $html = preg_replace($pattern, $replaceValue, $html);
        }

        // Index-based Education & Experience map replaces (up to index 5)
        $activeExps = $experiences;
        $activeEducations = $educations;
        for ($i = 1; $i <= 5; $i++) {
            // Education index replacements
            $edu = isset($activeEducations[$i - 1]) ? $activeEducations[$i - 1] : null;
            $univ = $edu && isset($edu['institution']) ? $edu['institution'] : "";
            $degree = $edu && isset($edu['degree']) ? $edu['degree'] : "";
            $period = $edu && isset($edu['period']) ? $edu['period'] : "";

            $html = preg_replace("/\{\{\s*UNIVERSITAS_{$i}\s*\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{\s*INSTITUSI_{$i}\s*\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{\s*SEKOLAH_{$i}\s*\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{\s*JURUSAN_{$i}\s*\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{\s*GELAR_{$i}\s*\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{\s*PRODI_{$i}\s*\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{\s*TAHUN_LULUS_{$i}\s*\}\}/i", $period, $html);
            $html = preg_replace("/\{\{\s*PERIODE_{$i}\s*\}\}/i", $period, $html);
            $html = preg_replace("/\{\{\s*TAHUN_{$i}\s*\}\}/i", $period, $html);

            // Experience index replacements
            $exp = isset($activeExps[$i - 1]) ? $activeExps[$i - 1] : null;
            $comp = $exp && isset($exp['company']) ? $exp['company'] : "";
            $role = $exp && isset($exp['role']) ? $exp['role'] : "";
            $dur = $exp && isset($exp['duration']) ? $exp['duration'] : "";
            $job = $exp && isset($exp['jobdesk']) ? $exp['jobdesk'] : "";

            $html = preg_replace("/\{\{\s*PERUSAHAAN_{$i}\s*\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{\s*KANTOR_{$i}\s*\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{\s*INSTANSI_{$i}\s*\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{\s*JABATAN_{$i}\s*\}\}/i", $role, $html);
            $html = preg_replace("/\{\{\s*POSISI_{$i}\s*\}\}/i", $role, $html);
            $html = preg_replace("/\{\{\s*PERIODE_KERJA_{$i}\s*\}\}/i", $dur, $html);
            $html = preg_replace("/\{\{\s*DURASI_{$i}\s*\}\}/i", $dur, $html);
            $html = preg_replace("/\{\{\s*JOBDESK_{$i}\s*\}\}/i", $job, $html);
            $html = preg_replace("/\{\{\s*DESKRIPSI_KERJA_{$i}\s*\}\}/i", $job, $html);
        }

        outputDynamicHTMLPage("CV {$nama} - Cetak Resume", $html);

    } catch (Exception $e) {
        outputHTMLFallback(500, "Kesalahan Sistem Internal", "Sistem gagal memuat halaman CV: " . $e->getMessage());
    }
}


// =============================================================
// II-B. RENDER PUBLIC COVER LETTER VIEWER (/view-cover/:userId)
// =============================================================
if ($public_cover) {
    try {
        $db = getDBConnection();
        
        $stmt = $db->prepare("SELECT * FROM profiles WHERE userId = ? LIMIT 1");
        $stmt->execute([$public_cover]);
        $profile = $stmt->fetch();

        $stmt = $db->prepare("SELECT * FROM covers WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1");
        $stmt->execute([$public_cover]);
        $cover = $stmt->fetch();

        $stmt = $db->prepare("SELECT * FROM resumes WHERE userId = ? LIMIT 1");
        $stmt->execute([$public_cover]);
        $resume = $stmt->fetch();

        $stmt = $db->prepare("SELECT * FROM portfolios WHERE userId = ? LIMIT 1");
        $stmt->execute([$public_cover]);
        $portfolio = $stmt->fetch();

        if (!$cover) {
            outputHTMLFallback(404, "Surat Lamaran Belum Dikompilasi", "Pengguna belum membuat cover surat lamaran.");
        }

        $stmt = $db->prepare("SELECT * FROM templates WHERE id = ? LIMIT 1");
        $stmt->execute([$cover['templateId']]);
        $template = $stmt->fetch();

        if (!$template) {
            $stmt = $db->prepare("SELECT * FROM templates WHERE category = 'cover_letter' LIMIT 1");
            $stmt->execute();
            $template = $stmt->fetch();
        }

        if (!$template) {
            die("No cover letter templates found in database.");
        }

        $html = $template['htmlMarkup'];

        $nama = isset($profile['fullName']) ? $profile['fullName'] : "Silakan Edit Nama";
        $ttl = $profile ? ($profile['placeOfBirth'] ?: "Jakarta") . ", " . ($profile['dateOfBirth'] ?: "1999-01-01") : "";
        $usia = $profile ? $profile['age'] : "";
        $alamat = isset($profile['address']) ? $profile['address'] : "Alamat belum diatur";
        $telepon = !empty($portfolio['phone']) ? $portfolio['phone'] : (!empty($resume['phone']) ? $resume['phone'] : (isset($profile['phone']) ? $profile['phone'] : "-"));
        $whatsapp = !empty($portfolio['whatsapp']) ? $portfolio['whatsapp'] : (!empty($resume['whatsapp']) ? $resume['whatsapp'] : "");
        $kota = isset($profile['city']) ? $profile['city'] : "Kota / Kabupaten";

        $companyName = !empty($cover['companyName']) ? $cover['companyName'] : "PT Contoh Klien Indonesia";
        $companyAddress = !empty($cover['companyAddress']) ? $cover['companyAddress'] : "Gedung Cyber Lt 4, Jakarta";
        $jobTitle = !empty($cover['jobTitle']) ? $cover['jobTitle'] : "Senior Full-Stack Engineer";
        $letterContent = !empty($cover['letterContent']) ? $cover['letterContent'] : "Dengan hormat, saya mengajukan lamaran pekerjaan...";

        $emailPengguna = isset($profile['email']) ? $profile['email'] : "";
        if (empty($emailPengguna)) {
            $stmt = $db->prepare("SELECT email FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$public_cover]);
            $usr = $stmt->fetch();
            $emailPengguna = $usr ? $usr['email'] : "";
        }

        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE userId = ? AND isActive = 1 LIMIT 1");
        $stmt->execute([$public_cover]);
        $sub = $stmt->fetch();
        $reqHost = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : "portoify.my.id";
        $reqProtocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
        $urlPortofolio = ($sub && !empty($sub['domainHostingPath'])) 
            ? "{$reqProtocol}://{$reqHost}/u/{$sub['domainHostingPath']}" 
            : "{$reqProtocol}://{$reqHost}/u/";

        $localDays = array("Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu");
        $localMonths = array(
            "Januari", "Februari", "Maret", "April", "Mei", "Juni",
            "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        );
        $currentHari = $localDays[date('w')];
        $currentTanggal = date('j') . " " . $localMonths[date('n') - 1] . " " . date('Y');

        $replacements = array(
            '/\{\{\s*NAMA\s*\}\}/i' => $nama,
            '/\{\{\s*TEMPAT_TANGGAL_LAHIR\s*\}\}/i' => $ttl,
            '/\{\{\s*TEMPAT_LALIR\s*\}\}/i' => $ttl,
            '/\{\{\s*TEMPAT_LAHIR\s*\}\}/i' => $ttl,
            '/\{\{\s*USIA\s*\}\}/i' => $usia,
            '/\{\{\s*ALAMAT\s*\}\}/i' => $alamat,
            '/\{\{\s*KOTA\s*\}\}/i' => $kota,
            '/\{\{\s*TELEPON\s*\}\}/i' => $telepon,
            '/\{\{\s*WHATSAPP\s*\}\}/i' => $whatsapp,
            '/\{\{\s*EMAIL_PENGGUNA\s*\}\}/i' => $emailPengguna,
            '/\{\{\s*URL_PORTOFOLIO\s*\}\}/i' => $urlPortofolio,
            '/\{\{\s*HARI\s*\}\}/i' => $currentHari,
            '/\{\{\s*TANGGAL\s*\}\}/i' => $currentTanggal,
            '/\{\{\s*NAMA_PERUSAHAAN\s*\}\}/i' => $companyName,
            '/\{\{\s*ALAMAT_PERUSAHAAN\s*\}\}/i' => $companyAddress,
            '/\{\{\s*JABATAN_DILAMAR\s*\}\}/i' => $jobTitle,
            '/\{\{\s*ISI_SURAT\s*\}\}/i' => $letterContent
        );

        foreach ($replacements as $pattern => $replaceValue) {
            $html = preg_replace($pattern, $replaceValue, $html);
        }

        // Add index-based Experience and Education replacements for cover letter
        $activeExps = array();
        if ($resume && isset($resume['experiences'])) {
            $activeExps = json_decode($resume['experiences'], true) ?: array();
        } elseif ($portfolio && isset($portfolio['experiences'])) {
            $activeExps = json_decode($portfolio['experiences'], true) ?: array();
        }
        $activeEducations = array();
        if ($resume && isset($resume['educations'])) {
            $activeEducations = json_decode($resume['educations'], true) ?: array();
        } elseif ($portfolio && isset($portfolio['educations'])) {
            $activeEducations = json_decode($portfolio['educations'], true) ?: array();
        }

        for ($i = 1; $i <= 5; $i++) {
            // Education index replacements
            $edu = isset($activeEducations[$i - 1]) ? $activeEducations[$i - 1] : null;
            $univ = $edu && isset($edu['institution']) ? $edu['institution'] : "";
            $degree = $edu && isset($edu['degree']) ? $edu['degree'] : "";
            $period = $edu && isset($edu['period']) ? $edu['period'] : "";

            $html = preg_replace("/\{\{\s*UNIVERSITAS_{$i}\s*\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{\s*INSTITUSI_{$i}\s*\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{\s*SEKOLAH_{$i}\s*\}\}/i", $univ, $html);
            $html = preg_replace("/\{\{\s*JURUSAN_{$i}\s*\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{\s*GELAR_{$i}\s*\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{\s*PRODI_{$i}\s*\}\}/i", $degree, $html);
            $html = preg_replace("/\{\{\s*TAHUN_LULUS_{$i}\s*\}\}/i", $period, $html);
            $html = preg_replace("/\{\{\s*PERIODE_{$i}\s*\}\}/i", $period, $html);
            $html = preg_replace("/\{\{\s*TAHUN_{$i}\s*\}\}/i", $period, $html);

            // Experience index replacements
            $exp = isset($activeExps[$i - 1]) ? $activeExps[$i - 1] : null;
            $comp = $exp && isset($exp['company']) ? $exp['company'] : "";
            $role = $exp && isset($exp['role']) ? $exp['role'] : "";
            $dur = $exp && isset($exp['duration']) ? $exp['duration'] : "";
            $job = $exp && isset($exp['jobdesk']) ? $exp['jobdesk'] : "";

            $html = preg_replace("/\{\{\s*PERUSAHAAN_{$i}\s*\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{\s*KANTOR_{$i}\s*\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{\s*INSTANSI_{$i}\s*\}\}/i", $comp, $html);
            $html = preg_replace("/\{\{\s*JABATAN_{$i}\s*\}\}/i", $role, $html);
            $html = preg_replace("/\{\{\s*POSISI_{$i}\s*\}\}/i", $role, $html);
            $html = preg_replace("/\{\{\s*PERIODE_KERJA_{$i}\s*\}\}/i", $dur, $html);
            $html = preg_replace("/\{\{\s*DURASI_{$i}\s*\}\}/i", $dur, $html);
            $html = preg_replace("/\{\{\s*JOBDESK_{$i}\s*\}\}/i", $job, $html);
            $html = preg_replace("/\{\{\s*DESKRIPSI_KERJA_{$i}\s*\}\}/i", $job, $html);
        }

        outputDynamicHTMLPage("Surat Lamaran - {$nama}", $html);

    } catch (Exception $e) {
        outputHTMLFallback(500, "Kesalahan Sistem Internal", "Sistem gagal memuat halaman Cover Letter: " . $e->getMessage());
    }
}


// =============================================================
// III. REST API ROUTER PLATFORM (/api/*)
// =============================================================
if ($route) {
    // Get JSON Request Body inputs
    $inputRaw = file_get_contents('php://input');
    $req = json_decode($inputRaw, true) ?: [];
    $method = $_SERVER['REQUEST_METHOD'];

    // Support HTTP Method Tunneling/Overriding to bypass strict cPanel hosting that blocks PUT/DELETE requests
    if ($method === 'POST') {
        if (isset($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'])) {
            $method = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']);
        } elseif (isset($_GET['_method'])) {
            $method = strtoupper($_GET['_method']);
        } elseif (isset($req['_method'])) {
            $method = strtoupper($req['_method']);
        }
    }

    $db = getDBConnection();

    // Route: auth/register
    if ($route === 'auth/register' && $method === 'POST') {
        $email = isset($req['email']) ? strtolower(trim($req['email'])) : '';
        $password = isset($req['password']) ? trim($req['password']) : '';
        $fullName = isset($req['fullName']) ? trim($req['fullName']) : '';

        if (!$email || !$password || !$fullName) {
            respondJSON(400, ["message" => "Semua form input wajib diisi!"]);
        }

        // Check if user already exists
        $stmt = $db->prepare("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            respondJSON(400, ["message" => "Email sudah terdaftar!"]);
        }

        // Generate "nama_kodeacak" user ID
        $firstWord = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode(' ', trim($fullName))[0]));
        $cleanWord = !empty($firstWord) ? $firstWord : 'user';
        $randomCode = substr(substr(md5(uniqid(rand(), true)), 0, 12), 0, 6);
        $userId = $cleanWord . "_" . $randomCode;
        $createdAt = date('c');

        // Insert new user
        $stmt = $db->prepare("INSERT INTO users (id, email, fullName, role, isActive, createdAt, passwordHash) VALUES (?, ?, ?, 'user', 1, ?, ?)");
        $stmt->execute([$userId, $email, $fullName, $createdAt, $password]);

                // Insert empty default profile
        $stmt = $db->prepare("INSERT INTO profiles (userId, fullName, placeOfBirth, dateOfBirth, gender, address, nik, phone, photoUrl, email, age) VALUES (?, ?, '', '', '', '', '', '', '', ?, 0)");
        $stmt->execute([$userId, $fullName, $email]);

        logUserAction($userId, $email, "Mendaftar akun Portoify baru");

        respondJSON(212, [
            "message" => "Registrasi sukses! Silakan melakukan login.",
            "user" => [
                "id" => $userId,
                "email" => $email,
                "fullName" => $fullName,
                "role" => "user",
                "isActive" => true,
                "createdAt" => $createdAt
            ]
        ]);
    }

    // Route: auth/login
    if ($route === 'auth/login' && $method === 'POST') {
        $email = isset($req['email']) ? strtolower(trim($req['email'])) : '';
        $password = isset($req['password']) ? trim($req['password']) : '';

        if (!$email || !$password) {
            respondJSON(400, ["message" => "Email dan password wajib diisi!"]);
        }

        $stmt = $db->prepare("SELECT * FROM users WHERE LOWER(email) = ? AND passwordHash = ? LIMIT 1");
        $stmt->execute([$email, $password]);
        $user = $stmt->fetch();

        if (!$user) {
            respondJSON(401, ["message" => "Email atau Password anda salah!"]);
        }

        if (!$user['isActive']) {
            respondJSON(403, ["message" => "Akun Anda dinonaktifkan oleh administrator!"]);
        }

        logUserAction($user['id'], $user['email'], "Berhasil masuk ke Portoify");

        $tokenPayload = [
            "id" => $user['id'],
            "email" => $user['email'],
            "role" => $user['role']
        ];
        $token = JWT::sign($tokenPayload);

        respondJSON(200, [
            "message" => "Login Berhasil!",
            "token" => $token,
            "user" => [
                "id" => $user['id'],
                "email" => $user['email'],
                "fullName" => $user['fullName'],
                "role" => $user['role'],
                "isActive" => (bool) $user['isActive'],
                "createdAt" => $user['createdAt'],
                "token" => $token
            ]
        ]);
    }

    // Route: auth/forgot-password
    if ($route === 'auth/forgot-password' && $method === 'POST') {
        $email = isset($req['email']) ? strtolower(trim($req['email'])) : '';
        $stmt = $db->prepare("SELECT id, fullName FROM users WHERE LOWER(email) = ? LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user) {
            respondJSON(404, ["message" => "Email tersebut tidak terdaftar di sistem kami!"]);
        }

        // Generate 6-digit numeric OTP code
        $otp = (string) rand(100000, 999999);
        $stmt = $db->prepare("UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?");
        $stmt->execute([$otp, date('c', strtotime('+30 minutes')), $user['id']]);

        // Send OTP via Gmail SMTP / PHP Mailer fallback
        $subject = "Kode OTP Reset Password Portoify Anda";
        $spacedOtp = implode("&nbsp;", str_split($otp));
        $bodyHTML = "
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e1e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);'>
            <!-- SVG Header Illustration with Laptop, Shield, Lock and Key -->
            <div style='text-align: center; margin-bottom: 20px;'>
                <svg xmlns='http://www.w3.org/2000/svg' width='100%' height='auto' viewBox='0 0 500 250' style='max-width: 440px; display: block; margin: 0 auto; user-select: none;'>
                    <!-- Background pastel circles/blobs -->
                    <ellipse cx='250' cy='115' rx='190' ry='100' fill='#fecaca' opacity='0.15' />
                    <circle cx='150' cy='80' r='55' fill='#fecaca' opacity='0.1' />
                    <circle cx='350' cy='120' r='65' fill='#fecaca' opacity='0.1' />

                    <!-- Lock Icon (Top Right Floating) -->
                    <g transform='translate(20, -5)'>
                        <path d='M 370,70 L 370,55 C 370,42 395,42 395,55 L 395,70' fill='none' stroke='#b02a2a' stroke-width='5' stroke-linecap='round' />
                        <rect x='360' y='70' width='45' height='35' rx='6' fill='#b02a2a' />
                        <circle cx='382.5' cy='83' r='3' fill='#ffffff' />
                        <path d='M 381.5,83 L 383.5,83 L 384,91 L 381,91 Z' fill='#ffffff' />
                    </g>

                    <!-- Laptop Screen Shadow -->
                    <ellipse cx='250' cy='225' rx='140' ry='8' fill='#e2e8f0' opacity='0.8' />

                    <!-- Laptop Base -->
                    <path d='M 155,195 L 345,195 L 365,220 L 135,220 Z' fill='#e2e8f0' stroke='#cbd5e1' stroke-width='2' stroke-linejoin='round' />
                    <path d='M 135,220 L 365,220 L 355,226 L 145,226 Z' fill='#cbd5e1' />
                    <rect x='230' y='212' width='40' height='6' rx='2' fill='#94a3b8' />
                    <line x1='165' y1='202' x2='335' y2='202' stroke='#cbd5e1' stroke-width='2' stroke-dasharray='8,2' />
                    <line x1='160' y1='208' x2='340' y2='208' stroke='#cbd5e1' stroke-width='2' stroke-dasharray='10,3' />

                    <!-- Laptop Screen -->
                    <rect x='155' y='80' width='190' height='115' rx='10' fill='#1e293b' />
                    <rect x='165' y='90' width='170' height='95' rx='4' fill='#ffffff' />

                    <!-- Centered Logo on Laptop Screen -->
                    <g transform='translate(237, 105)'>
                        <!-- Stylized \"P\" of Portoify -->
                        <path d='M0,0 L16,0 C22.6,0 26,3.4 26,10 C26,16.6 22.6,20 16,20 L6,20 L6,30 L0,30 Z M6,6 L6,14 L16,14 C18.2,14 20,12.2 20,10 C20,7.8 18.2,6 16,6 Z' fill='#b02a2a' />
                    </g>
                    <text x='250' y='165' font-family=\"'Helvetica Neue', Arial, sans-serif\" font-weight='900' font-size='13' fill='#1e293b' text-anchor='middle' letter-spacing='1'>PORTOIFY</text>

                    <!-- Shield (Left Side) -->
                    <g transform='translate(15, 10)'>
                        <path d='M 65,190 C 85,198 105,200 110,212 C 115,200 135,198 155,190' stroke='#cbd5e1' stroke-width='4' fill='none' opacity='0.5' />
                        <path d='M 110,100 C 130,100 140,95 150,87 L 150,145 C 150,175 130,190 110,198 C 90,190 70,175 70,145 L 70,87 C 80,95 90,100 110,100 Z' fill='#ffffff' stroke='#b02a2a' stroke-width='5' stroke-linejoin='round' />
                        <circle cx='110' cy='138' r='14' fill='#b02a2a' />
                        <circle cx='110' cy='133' r='4' fill='#ffffff' />
                        <path d='M 108,133 L 112,133 L 113,145 L 107,145 Z' fill='#ffffff' />
                    </g>

                    <!-- Key (Right Side) -->
                    <g transform='translate(355, 175) rotate(15)'>
                        <circle cx='20' cy='20' r='13' fill='none' stroke='#b02a2a' stroke-width='5' />
                        <circle cx='20' cy='20' r='4' fill='#b02a2a' />
                        <rect x='33' y='17' width='35' height='6' rx='2' fill='#b02a2a' />
                        <rect x='53' y='13' width='6' height='10' fill='#b02a2a' />
                        <rect x='61' y='13' width='6' height='7' fill='#b02a2a' />
                    </g>
                </svg>
            </div>

            <!-- App Branding Title -->
            <div style='text-align: center; margin-top: 15px; margin-bottom: 25px;'>
                <h1 style='font-family: Arial, sans-serif; color: #b02a2a; font-size: 32px; font-weight: 950; margin: 0; letter-spacing: -1px; text-transform: uppercase;'>
                    PORTOIFY<span style='font-size: 18px; text-transform: lowercase; font-weight: bold; color: #475569;'>.my.id</span>
                </h1>
                <p style='font-family: Arial, sans-serif; color: #1e293b; font-size: 14px; font-weight: bold; margin: 6px 0 0 0; letter-spacing: 0.2px;'>
                    Pembuatan Portofolio & Resume Instan dalam Sekali Klik
                </p>
            </div>
            
            <!-- Greeting and Intro -->
            <p style='font-family: Arial, sans-serif; color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 16px;'>
                Halo, <strong style='color: #b02a2a;'>" . htmlspecialchars($user['fullName']) . "</strong>,
            </p>
            <p style='font-family: Arial, sans-serif; color: #334155; font-size: 15px; line-height: 1.6; margin-bottom: 24px;'>
                Kami menerima permintaan pengaturan ulang kata sandi untuk akun Portoify Anda. Silakan gunakan kode OTP (One-Time Password) 6-digit di bawah ini untuk mengubah password Anda:
            </p>
            
            <!-- OTP Box -->
            <div style='text-align: center; margin: 30px 0;'>
                <div style='display: inline-block; background-color: #ffffff; border: 2px solid #b02a2a; border-radius: 12px; padding: 14px 28px; box-shadow: 0 4px 10px rgba(176, 42, 42, 0.08); text-align: center;'>
                    <span style='font-family: \"Courier New\", Courier, monospace; font-size: 32px; font-weight: 800; color: #b02a2a; letter-spacing: 4px; white-space: nowrap; display: inline-block;'>" . $spacedOtp . "</span>
                </div>
                <p style='color: #64748b; font-family: Arial, sans-serif; font-size: 12px; margin-top: 12px; margin-bottom: 0;'>
                    Masa berlaku kode OTP terbatas selama <strong>30 menit</strong> saja.
                </p>
            </div>
            
            <!-- Red Warning Alert Banner (Table layout for maximum email client compatibility) -->
            <table cellpadding='0' cellspacing='0' border='0' style='width: 100%; max-width: 600px; margin: 25px auto; background-color: #fef2f2; border-radius: 8px; padding: 12px 16px;'>
                <tr>
                    <td style='width: 32px; vertical-align: middle; text-align: center;'>
                        <div style='display: inline-block; width: 22px; height: 22px; line-height: 22px; background-color: #ef4444; border-radius: 50%; color: #ffffff; font-weight: bold; font-family: Arial, sans-serif; font-size: 15px; text-align: center;'>!</div>
                    </td>
                    <td style='font-family: Arial, sans-serif; font-size: 13px; color: #991b1b; line-height: 1.5; padding-left: 10px; text-align: left;'>
                        <strong style='color: #991b1b;'>PENTING:</strong> Demi keamanan akun Anda, mohon <strong style='color: #991b1b;'>TIDAK</strong> membagikan atau menyebutkan kode OTP ini ke pihak manapun, termasuk staf admin kami.
                    </td>
                </tr>
            </table>
            
            <!-- Fallback info -->
            <p style='color: #475569; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; text-align: center; margin-bottom: 30px;'>
                Bila Anda merasa tidak pernah melakukan tindakan ini, Anda bisa mengabaikan email ini dengan sepenuhnya aman. Sandi Anda tidak akan berubah tanpa kode di atas.
            </p>
            
            <!-- Footer with gray background -->
            <div style='background-color: #f8fafc; border-radius: 0 0 16px 16px; padding: 25px 20px; text-align: center; margin-top: 35px; border-top: 1px solid #e2e8f0;'>
                <p style='font-family: Arial, sans-serif; color: #475569; font-size: 12px; font-weight: bold; margin: 0 0 8px 0;'>
                    Portoify Cloud Project Office &copy; 2026
                </p>
                <p style='font-family: Arial, sans-serif; color: #475569; font-size: 12px; margin: 0 0 4px 0;'>
                    Email: <a href='mailto:portoifybusiness@gmail.com' style='color: #b02a2a; text-decoration: none;'>portoifybusiness@gmail.com</a>
                </p>
                <p style='font-family: Arial, sans-serif; color: #475569; font-size: 12px; margin: 0;'>
                    Kontak: <span style='color: #475569;'>087797564757</span>
                </p>
            </div>
        </div>";

        @send_smtp_mail($email, $subject, $bodyHTML);

        respondJSON(200, [
            "message" => "Kode OTP reset password berhasil terkirim ke alamat email Gmail Anda (" . htmlspecialchars($email) . ")! Silakan cek Kotak Masuk atau folder Spam."
        ]);
    }

    // Route: auth/reset-password
    if ($route === 'auth/reset-password' && $method === 'POST') {
        $email = isset($req['email']) ? strtolower(trim($req['email'])) : '';
        $token = isset($req['token']) ? trim($req['token']) : '';
        $newPassword = isset($req['newPassword']) ? trim($req['newPassword']) : (isset($req['password']) ? trim($req['password']) : '');

        if (!$email || !$token || !$newPassword) {
            respondJSON(400, ["message" => "Parameter Email, Kode OTP, dan Password Baru wajib diisi seluruhnya!"]);
        }

        $stmt = $db->prepare("SELECT id, resetTokenExpiry FROM users WHERE resetToken = ? AND LOWER(email) = ? LIMIT 1");
        $stmt->execute([$token, $email]);
        $user = $stmt->fetch();

        if (!$user) {
            respondJSON(400, ["message" => "Kode OTP reset password yang Anda ketik tidak valid!"]);
        }

        if (strtotime($user['resetTokenExpiry']) < time()) {
            respondJSON(400, ["message" => "Kode OTP reset tersebut telah kadaluarsa! Silakan minta kode OTP baru."]);
        }

        $stmt = $db->prepare("UPDATE users SET passwordHash = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?");
        $stmt->execute([$newPassword, $user['id']]);

        logUserAction($user['id'], $email, "Berhasil ganti password mandiri menggunakan verifikasi kode OTP");

        respondJSON(200, ["message" => "Sandi berhasil diubah! Data database cPanel diperbarui. Silakan login kembali menggunakan password baru Anda."]);
    }

    // Route: ads (GET - Public)
    if ($route === 'ads' && $method === 'GET') {
        // Dynamically ensure ads_config table exists
        try {
            $db->query("SELECT * FROM ads_config LIMIT 1");
        } catch (PDOException $ex) {
            try {
                $db->exec("CREATE TABLE IF NOT EXISTS ads_config (
                    id VARCHAR(255) PRIMARY KEY,
                    leftName VARCHAR(255) NULL,
                    leftScript LONGTEXT NULL,
                    rightName VARCHAR(255) NULL,
                    rightScript LONGTEXT NULL,
                    name VARCHAR(255) NULL,
                    script LONGTEXT NULL,
                    socialBarScript LONGTEXT NULL,
                    bannerActive INT NOT NULL DEFAULT 1,
                    socialActive INT NOT NULL DEFAULT 1
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
                
                // Seed default entry
                $db->exec("INSERT IGNORE INTO ads_config (id, leftName, leftScript, rightName, rightScript, name, script, socialBarScript, bannerActive, socialActive) 
                           VALUES ('active_ad', '', '', '', '', '', '', '', 1, 1)");
            } catch (PDOException $ex2) {
                // Ignore
            }
        }

        // Dynamically ensure individual columns exist
        try {
            $db->query("SELECT name FROM ads_config LIMIT 1");
        } catch (PDOException $ex) {
            try { $db->exec("ALTER TABLE ads_config ADD COLUMN name VARCHAR(255) NULL"); } catch (PDOException $ex2) {}
        }
        try {
            $db->query("SELECT script FROM ads_config LIMIT 1");
        } catch (PDOException $ex) {
            try { $db->exec("ALTER TABLE ads_config ADD COLUMN script LONGTEXT NULL"); } catch (PDOException $ex2) {}
        }
        try {
            $db->query("SELECT socialBarScript FROM ads_config LIMIT 1");
        } catch (PDOException $ex) {
            try { $db->exec("ALTER TABLE ads_config ADD COLUMN socialBarScript LONGTEXT NULL"); } catch (PDOException $ex2) {}
        }
        try {
            $db->query("SELECT bannerActive FROM ads_config LIMIT 1");
        } catch (PDOException $ex) {
            try { $db->exec("ALTER TABLE ads_config ADD COLUMN bannerActive INT NOT NULL DEFAULT 1"); } catch (PDOException $ex2) {}
        }
        try {
            $db->query("SELECT socialActive FROM ads_config LIMIT 1");
        } catch (PDOException $ex) {
            try { $db->exec("ALTER TABLE ads_config ADD COLUMN socialActive INT NOT NULL DEFAULT 1"); } catch (PDOException $ex2) {}
        }

        $stmt = $db->prepare("SELECT * FROM ads_config WHERE id = 'active_ad' LIMIT 1");
        $stmt->execute();
        $ads = $stmt->fetch();

        if (!$ads) {
            // Seed if missing
            try {
                $db->exec("INSERT IGNORE INTO ads_config (id, leftName, leftScript, rightName, rightScript, name, script, socialBarScript, bannerActive, socialActive) 
                           VALUES ('active_ad', '', '', '', '', '', '', '', 1, 1)");
            } catch (PDOException $ex) {}
            
            respondJSON(200, [
                "leftName" => "",
                "leftScript" => "",
                "rightName" => "",
                "rightScript" => "",
                "name" => "",
                "script" => "",
                "socialBarScript" => "",
                "bannerActive" => true,
                "socialActive" => true
            ]);
        }

        respondJSON(200, [
            "leftName" => isset($ads['leftName']) ? $ads['leftName'] : "",
            "leftScript" => isset($ads['leftScript']) ? $ads['leftScript'] : "",
            "rightName" => isset($ads['rightName']) ? $ads['rightName'] : "",
            "rightScript" => isset($ads['rightScript']) ? $ads['rightScript'] : "",
            "name" => isset($ads['name']) ? $ads['name'] : "",
            "script" => isset($ads['script']) ? $ads['script'] : "" ,
            "socialBarScript" => isset($ads['socialBarScript']) ? $ads['socialBarScript'] : "",
            "bannerActive" => isset($ads['bannerActive']) ? (bool)$ads['bannerActive'] : true,
            "socialActive" => isset($ads['socialActive']) ? (bool)$ads['socialActive'] : true
        ]);
    }

    // Route: packages (Public)
    if ($route === 'packages' && $method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM packages");
        $stmt->execute();
        $pkgs = $stmt->fetchAll();

        if (empty($pkgs)) {
            $default_packages = [
                [
                    'id' => 'pkg_basic',
                    'name' => 'Paket Basic',
                    'price' => 50000,
                    'durationDays' => 15,
                    'features' => json_encode([
                        "Akses Portofolio Digital dengan Template Basic Only",
                        "Akses Resume/CV dengan Template Basic Only",
                        "Buat Surat Lamaran dengan Template Basic Only",
                        "Tidak bisa upload berkas dokumen apapun 🔒",
                        "Dapat mengelola kustom URL Domain khusus",
                        "Masa Aktif Paket selama 15 Hari"
                    ]),
                    'isFeatured' => 0,
                    'accessPortfolio' => 'basic',
                    'accessResume' => 'basic',
                    'accessLetter' => 'basic',
                    'accessUploadDocs' => 'none'
                ],
                [
                    'id' => 'pkg_standard',
                    'name' => 'Paket Standart',
                    'price' => 150000,
                    'durationDays' => 30,
                    'features' => json_encode([
                        "Akses Portofolio Digital dengan Template Standar Only",
                        "Akses Resume/CV dengan Template Standar Only",
                        "Buat Surat Lamaran dengan Template Standar Only",
                        "Upload Dokumen Pendukung Terbatas (maksimal 5 berkas)",
                        "Dokumen diluar batas persyaratan otomatis terkunci oleh sistem 🔒",
                        "Dapat mengelola kustom URL Domain khusus",
                        "Masa Aktif Paket selama 30 Hari"
                    ]),
                    'isFeatured' => 1,
                    'accessPortfolio' => 'standard',
                    'accessResume' => 'standard',
                    'accessLetter' => 'standard',
                    'accessUploadDocs' => 'limited'
                ],
                [
                    'id' => 'pkg_premium',
                    'name' => 'Paket Premium',
                    'price' => 375000,
                    'durationDays' => 60,
                    'features' => json_encode([
                        "Akses Portofolio Digital dengan Template Premium, Standar & Basic",
                        "Akses Resume/CV dengan Template Premium, Standar & Basic",
                        "Buat Surat Lamaran dengan Template Premium, Standar & Basic",
                        "Bebas mengunggah semua jenis dokumen pelamar tanpa batas ✨",
                        "Dapat mengelola kustom URL Domain khusus",
                        "Masa Aktif Paket selama 60 Hari"
                    ]),
                    'isFeatured' => 0,
                    'accessPortfolio' => 'all',
                    'accessResume' => 'all',
                    'accessLetter' => 'all',
                    'accessUploadDocs' => 'all'
                ]
            ];

            foreach ($default_packages as $dp) {
                // Ensure columns exist or alter dynamically
                try {
                    $ins_stmt = $db->prepare("INSERT INTO packages (id, name, price, durationDays, features, isFeatured, accessPortfolio, accessResume, accessLetter, accessUploadDocs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                    $ins_stmt->execute([
                        $dp['id'],
                        $dp['name'],
                        $dp['price'],
                        $dp['durationDays'],
                        $dp['features'],
                        $dp['isFeatured'],
                        $dp['accessPortfolio'],
                        $dp['accessResume'],
                        $dp['accessLetter'],
                        $dp['accessUploadDocs']
                    ]);
                } catch (PDOException $e) {
                    // Fall back if columns aren't standard yet
                    $ins_stmt = $db->prepare("INSERT INTO packages (id, name, price, durationDays, features, isFeatured) VALUES (?, ?, ?, ?, ?, ?)");
                    $ins_stmt->execute([
                        $dp['id'],
                        $dp['name'],
                        $dp['price'],
                        $dp['durationDays'],
                        $dp['features'],
                        $dp['isFeatured']
                    ]);
                }
            }

            // Fetch again
            $stmt = $db->prepare("SELECT * FROM packages");
            $stmt->execute();
            $pkgs = $stmt->fetchAll();
        }

        // decode features
        foreach ($pkgs as &$p) {
            $rawFeatures = $p['features'];
            $decoded = json_decode($rawFeatures, true);
            if (is_array($decoded)) {
                $p['features'] = $decoded;
            } else if (is_string($rawFeatures) && trim($rawFeatures) !== '') {
                // Split comma-separated string
                $items = explode(',', $rawFeatures);
                $cleanItems = [];
                foreach ($items as $item) {
                    $trimmed = trim($item);
                    if ($trimmed !== '') {
                        $cleanItems[] = $trimmed;
                    }
                }
                $p['features'] = $cleanItems;
            } else {
                $p['features'] = [];
            }
            $p['isFeatured'] = (bool) $p['isFeatured'];
        }

        respondJSON(200, $pkgs);
    }

    // Route: templates (Public)
    if ($route === 'templates' && $method === 'GET') {
        // Dynamically append previewUrl table column if missing in live database
        try {
            $db->query("SELECT previewUrl FROM templates LIMIT 1");
        } catch (PDOException $ex) {
            try {
                $db->exec("ALTER TABLE templates ADD COLUMN previewUrl TEXT NULL DEFAULT NULL");
            } catch (PDOException $ex2) {
                // Ignore
            }
        }
        // Dynamically append description table column if missing in live database
        try {
            $db->query("SELECT description FROM templates LIMIT 1");
        } catch (PDOException $ex) {
            try {
                $db->exec("ALTER TABLE templates ADD COLUMN description TEXT NULL DEFAULT NULL");
            } catch (PDOException $ex2) {
                // Ignore
            }
        }

        $stmt = $db->prepare("SELECT id, name, category, htmlMarkup, tier, previewUrl, description, createdAt FROM templates");
        $stmt->execute();
        $templates = $stmt->fetchAll();

        respondJSON(200, $templates);
    }

    // Authenticated API checks
    $userSession = JWT::authenticate();

    // Route: profile/:userId (GET)
    if (preg_match('/^profile\/([^\/]+)$/', $route, $matches) && $method === 'GET') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("SELECT * FROM profiles WHERE userId = ? LIMIT 1");
        $stmt->execute([$userId]);
        $profile = $stmt->fetch();

        if (!$profile) {
            respondJSON(404, ["message" => "Profil tidak ditemukan."]);
        }

        respondJSON(200, $profile);
    }

    // Route: profile (POST)
    if ($route === 'profile' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $fullName = isset($req['fullName']) ? trim($req['fullName']) : '';
        $placeOfBirth = isset($req['placeOfBirth']) ? trim($req['placeOfBirth']) : '';
        $dateOfBirth = isset($req['dateOfBirth']) ? trim($req['dateOfBirth']) : '';
        $gender = isset($req['gender']) ? trim($req['gender']) : '';
        $city = isset($req['city']) ? trim($req['city']) : '';
        $address = isset($req['address']) ? trim($req['address']) : '';
        $nik = isset($req['nik']) ? trim($req['nik']) : '';
        $phone = isset($req['phone']) ? trim($req['phone']) : '';
        $photoUrl = isset($req['photoUrl']) ? trim($req['photoUrl']) : '';
        if (!empty($photoUrl) && strpos($photoUrl, 'data:') === 0) {
            $photoUrl = saveUploadedFilePHP($userId, 'photo', 'profile.jpg', $photoUrl);
        }
        $email = isset($req['email']) ? strtolower(trim($req['email'])) : '';
        $age = 0;
        if (!empty($dateOfBirth)) {
            try {
                $birthDate = new DateTime($dateOfBirth);
                $today = new DateTime();
                $age = $today->diff($birthDate)->y;
            } catch (Exception $e) {
                $age = isset($req['age']) ? intval($req['age']) : 0;
            }
        } else {
            $age = isset($req['age']) ? intval($req['age']) : 0;
        }

        // Dynamically ensure 'city' column exists in 'profiles' in case they are using an outdated schema
        try {
            $db->query("SELECT city FROM profiles LIMIT 1");
        } catch (PDOException $ex) {
            try {
                $db->exec("ALTER TABLE profiles ADD COLUMN city VARCHAR(255) NULL");
            } catch (PDOException $ex2) {
                // ignore
            }
        }

        // Upsert profiles
        $stmt = $db->prepare("INSERT INTO profiles (userId, fullName, placeOfBirth, dateOfBirth, gender, city, address, nik, phone, photoUrl, email, age)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            fullName = VALUES(fullName), placeOfBirth = VALUES(placeOfBirth), dateOfBirth = VALUES(dateOfBirth),
            gender = VALUES(gender), city = VALUES(city), address = VALUES(address), nik = VALUES(nik), phone = VALUES(phone), 
            photoUrl = VALUES(photoUrl), email = VALUES(email), age = VALUES(age)");
        $stmt->execute([$userId, $fullName, $placeOfBirth, $dateOfBirth, $gender, $city, $address, $nik, $phone, $photoUrl, $email, $age]);

        // Sync users fullName
        $stmt = $db->prepare("UPDATE users SET fullName = ? WHERE id = ?");
        $stmt->execute([$fullName, $userId]);

        logUserAction($userId, $email, "Memperbarui data profil lengkap");

        respondJSON(200, ["message" => "Profil berhasil diperbarui!", "userId" => $userId]);
    }

    // Route: profile/change-password
    if ($route === 'profile/change-password' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $currentDbPass = isset($req['currentPassword']) ? trim($req['currentPassword']) : '';
        $newPassword = isset($req['newPassword']) ? trim($req['newPassword']) : '';

        $stmt = $db->prepare("SELECT passwordHash FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user || $user['passwordHash'] !== $currentDbPass) {
            respondJSON(400, ["message" => "Sandi lama yang Anda masukkan tidak sesuai!"]);
        }

        $stmt = $db->prepare("UPDATE users SET passwordHash = ? WHERE id = ?");
        $stmt->execute([$newPassword, $userId]);

        respondJSON(200, ["message" => "Sandi berhasil diubah!"]);
    }

    // Route: portfolios/:userId (GET)
    if (preg_match('/^portfolios\/([^\/]+)$/', $route, $matches) && $method === 'GET') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("SELECT * FROM portfolios WHERE userId = ? LIMIT 1");
        $stmt->execute([$userId]);
        $port = $stmt->fetch();

        if (!$port) {
            respondJSON(404, ["message" => "Portfolio not active"]);
        }

        // Decode JSON columns to arrays
        $port['experiences'] = json_decode($port['experiences'], true) ?: [];
        $port['projects'] = json_decode($port['projects'], true) ?: [];
        $port['educations'] = json_decode($port['educations'], true) ?: [];
        $port['certificates'] = json_decode($port['certificates'], true) ?: [];
        $port['skills'] = json_decode($port['skills'], true) ?: [];

        respondJSON(200, $port);
    }

    // Route: portfolios/:userId (DELETE)
    if (preg_match('/^portfolios\/([^\/]+)$/', $route, $matches) && $method === 'DELETE') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("DELETE FROM portfolios WHERE userId = ?");
        $stmt->execute([$userId]);

        logUserAction($userId, $userSession['email'], "Menonaktifkan & menghapus desain portofolio dari database");
        respondJSON(200, ["message" => "Portofolio berhasil dinonaktifkan."]);
    }

    // Route: portfolios (POST)
    if ($route === 'portfolios' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $templateId = isset($req['templateId']) ? trim($req['templateId']) : 'tpl_port_1';
        $title = isset($req['title']) ? trim($req['title']) : '';
        $aboutMe = isset($req['aboutMe']) ? trim($req['aboutMe']) : '';
        $phone = isset($req['phone']) ? trim($req['phone']) : null;
        $address = isset($req['address']) ? trim($req['address']) : null;
        $whatsapp = isset($req['whatsapp']) ? trim($req['whatsapp']) : null;
        $instagram = isset($req['instagram']) ? trim($req['instagram']) : null;
        $tiktok = isset($req['tiktok']) ? trim($req['tiktok']) : null;
        $linkedin = isset($req['linkedin']) ? trim($req['linkedin']) : null;
        $github = isset($req['github']) ? trim($req['github']) : null;

        $experiences = json_encode(isset($req['experiences']) ? $req['experiences'] : []);
        
        $rawProjects = isset($req['projects']) ? $req['projects'] : [];
        if (is_array($rawProjects)) {
            foreach ($rawProjects as $key => $proj) {
                if (isset($proj['image']) && is_string($proj['image']) && strpos($proj['image'], 'data:') === 0) {
                    $rawProjects[$key]['image'] = saveProjectImagePHP($userId, $proj['image']);
                }
            }
        }
        $projects = json_encode($rawProjects);
        $educations = json_encode(isset($req['educations']) ? $req['educations'] : []);
        $certificates = json_encode(isset($req['certificates']) ? $req['certificates'] : []);
        $skills = json_encode(isset($req['skills']) ? $req['skills'] : []);

        $stmt = $db->prepare("INSERT INTO portfolios (id, userId, templateId, title, aboutMe, experiences, projects, educations, certificates, skills, phone, address, whatsapp, instagram, tiktok, linkedin, github, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            templateId = VALUES(templateId), title = VALUES(title), aboutMe = VALUES(aboutMe),
            experiences = VALUES(experiences), projects = VALUES(projects), educations = VALUES(educations),
            certificates = VALUES(certificates), skills = VALUES(skills), phone = VALUES(phone), address = VALUES(address),
            whatsapp = VALUES(whatsapp), instagram = VALUES(instagram), tiktok = VALUES(tiktok),
            linkedin = VALUES(linkedin), github = VALUES(github), updatedAt = VALUES(updatedAt)");
        
        $stmtCheck = $db->prepare("SELECT id FROM portfolios WHERE userId = ? LIMIT 1");
        $stmtCheck->execute([$userId]);
        $existing = $stmtCheck->fetch();
        $id = isset($req['id']) ? $req['id'] : ($existing ? $existing['id'] : "port_" . time());
        $stmt->execute([
            $id, $userId, $templateId, $title, $aboutMe, $experiences, $projects, $educations, $certificates, $skills,
            $phone, $address, $whatsapp, $instagram, $tiktok, $linkedin, $github, date('c')
        ]);

        logUserAction($userId, $userSession['email'], "Menyimpan draf portofolio digital");

        respondJSON(200, ["message" => "Portofolio berhasil disimpan!"]);
    }

    // Route: resumes/:userId (GET)
    if (preg_match('/^resumes\/([^\/]+)$/', $route, $matches) && $method === 'GET') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("SELECT * FROM resumes WHERE userId = ? LIMIT 1");
        $stmt->execute([$userId]);
        $res = $stmt->fetch();

        if (!$res) {
            respondJSON(404, ["message" => "Resume not active"]);
        }

        $res['experiences'] = json_decode($res['experiences'], true) ?: [];
        $res['educations'] = json_decode($res['educations'], true) ?: [];
        $res['certificates'] = json_decode($res['certificates'], true) ?: [];
        $res['skills'] = json_decode($res['skills'], true) ?: [];

        respondJSON(200, $res);
    }

    // Route: resumes/:userId (DELETE)
    if (preg_match('/^resumes\/([^\/]+)$/', $route, $matches) && $method === 'DELETE') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("DELETE FROM resumes WHERE userId = ?");
        $stmt->execute([$userId]);

        logUserAction($userId, $userSession['email'], "Menonaktifkan & menghapus desain resume dari database");
        respondJSON(200, ["message" => "Resume berhasil dinonaktifkan."]);
    }

    // Route: resumes (POST)
    if ($route === 'resumes' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $templateId = isset($req['templateId']) ? trim($req['templateId']) : 'tpl_res_1';
        $title = isset($req['title']) ? trim($req['title']) : '';
        $aboutMe = isset($req['aboutMe']) ? trim($req['aboutMe']) : '';
        $phone = isset($req['phone']) ? trim($req['phone']) : null;
        $address = isset($req['address']) ? trim($req['address']) : null;
        $whatsapp = isset($req['whatsapp']) ? trim($req['whatsapp']) : null;
        $instagram = isset($req['instagram']) ? trim($req['instagram']) : null;
        $tiktok = isset($req['tiktok']) ? trim($req['tiktok']) : null;
        $linkedin = isset($req['linkedin']) ? trim($req['linkedin']) : null;
        $github = isset($req['github']) ? trim($req['github']) : null;
        $customHtml = isset($req['customHtml']) ? trim($req['customHtml']) : null;

        $experiences = json_encode(isset($req['experiences']) ? $req['experiences'] : []);
        $educations = json_encode(isset($req['educations']) ? $req['educations'] : []);
        $certificates = json_encode(isset($req['certificates']) ? $req['certificates'] : []);
        $skills = json_encode(isset($req['skills']) ? $req['skills'] : []);

        $stmt = $db->prepare("INSERT INTO resumes (id, userId, templateId, title, aboutMe, experiences, educations, certificates, skills, phone, address, whatsapp, instagram, tiktok, linkedin, github, customHtml, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            templateId = VALUES(templateId), title = VALUES(title), aboutMe = VALUES(aboutMe),
            experiences = VALUES(experiences), educations = VALUES(educations), certificates = VALUES(certificates),
            skills = VALUES(skills),
            phone = VALUES(phone), address = VALUES(address), whatsapp = VALUES(whatsapp),
            instagram = VALUES(instagram), tiktok = VALUES(tiktok), linkedin = VALUES(linkedin),
            github = VALUES(github), customHtml = VALUES(customHtml), updatedAt = VALUES(updatedAt)");

        $stmtCheck = $db->prepare("SELECT id FROM resumes WHERE userId = ? LIMIT 1");
        $stmtCheck->execute([$userId]);
        $existing = $stmtCheck->fetch();
        $id = isset($req['id']) ? $req['id'] : ($existing ? $existing['id'] : "res_" . time());
        $updatedAt = date('c');
        $stmt->execute([
            $id, $userId, $templateId, $title, $aboutMe, $experiences, $educations, $certificates, $skills,
            $phone, $address, $whatsapp, $instagram, $tiktok, $linkedin, $github, $customHtml, $updatedAt
        ]);

        logUserAction($userId, $userSession['email'], "Menyimpan draf resume CV professional");

        $resumeObj = [
            "id" => $id,
            "userId" => $userId,
            "templateId" => $templateId,
            "title" => $title,
            "aboutMe" => $aboutMe,
            "experiences" => json_decode($experiences),
            "educations" => json_decode($educations),
            "certificates" => json_decode($certificates),
            "skills" => json_decode($skills),
            "phone" => $phone,
            "address" => $address,
            "whatsapp" => $whatsapp,
            "instagram" => $instagram,
            "tiktok" => $tiktok,
            "linkedin" => $linkedin,
            "github" => $github,
            "customHtml" => $customHtml,
            "updatedAt" => $updatedAt
        ];

        respondJSON(200, [
            "message" => "Resume berhasil disimpan!",
            "resume" => $resumeObj
        ]);
    }

    // Route: covers/:userId (GET)
    if (preg_match('/^covers\/([^\/]+)$/', $route, $matches) && $method === 'GET') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("SELECT * FROM covers WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1");
        $stmt->execute([$userId]);
        $cov = $stmt->fetch();

        if (!$cov) {
            respondJSON(404, ["message" => "Cover letter not active"]);
        }

        respondJSON(200, $cov);
    }

    // Route: covers/:userId (DELETE)
    if (preg_match('/^covers\/([^\/]+)$/', $route, $matches) && $method === 'DELETE') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("DELETE FROM covers WHERE userId = ?");
        $stmt->execute([$userId]);

        logUserAction($userId, $userSession['email'], "Menonaktifkan & menghapus desain cover surat lamaran dari database");
        respondJSON(200, ["message" => "Surat lamaran berhasil dinonaktifkan."]);
    }

    // Route: covers (POST)
    if ($route === 'covers' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $templateId = isset($req['templateId']) ? trim($req['templateId']) : 'tpl_cov_1';
        $companyName = isset($req['companyName']) ? trim($req['companyName']) : '';
        $companyAddress = isset($req['companyAddress']) ? trim($req['companyAddress']) : '';
        $jobTitle = isset($req['jobTitle']) ? trim($req['jobTitle']) : '';
        $letterContent = isset($req['letterContent']) ? trim($req['letterContent']) : '';

        $stmt = $db->prepare("INSERT INTO covers (id, userId, templateId, companyName, companyAddress, jobTitle, letterContent, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            templateId = VALUES(templateId), companyName = VALUES(companyName), 
            companyAddress = VALUES(companyAddress), jobTitle = VALUES(jobTitle),
            letterContent = VALUES(letterContent), updatedAt = VALUES(updatedAt)");

        $stmtCheck = $db->prepare("SELECT id FROM covers WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1");
        $stmtCheck->execute([$userId]);
        $existing = $stmtCheck->fetch();
        $id = isset($req['id']) ? $req['id'] : ($existing ? $existing['id'] : "cov_" . time());
        $stmt->execute([$id, $userId, $templateId, $companyName, $companyAddress, $jobTitle, $letterContent, date('c')]);

        logUserAction($userId, $userSession['email'], "Menyimpan draf Surat Lamaran Pekerjaan");

        respondJSON(200, ["message" => "Surat Lamaran berhasil disimpan!"]);
    }

    // Route: documents/:userId (GET)
    if (preg_match('/^documents\/([^\/]+)$/', $route, $matches) && $method === 'GET') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("SELECT * FROM documents WHERE userId = ? ORDER BY uploadedAt DESC");
        $stmt->execute([$userId]);
        $docs = $stmt->fetchAll();

        respondJSON(200, $docs);
    }

    // Route: documents (POST)
    if ($route === 'documents' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $fileType = isset($req['fileType']) ? trim($req['fileType']) : '';
        $fileName = isset($req['fileName']) ? trim($req['fileName']) : '';
        $fileDataUrl = isset($req['fileDataUrl']) ? trim($req['fileDataUrl']) : '';

        if (!$userId || !$fileType || !$fileName || !$fileDataUrl) {
            respondJSON(400, ["message" => "Data unggahan dokumen tidak lengkap!"]);
        }

        // Subscription verification rules
        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE userId = ? AND isActive = 1 LIMIT 1");
        $stmt->execute([$userId]);
        $sub = $stmt->fetch();

        $activePkgId = $sub ? $sub['packageId'] : "inactive";

        if ($activePkgId === "inactive") {
            respondJSON(403, ["message" => "Pengguna Gratis tidak diperbolehkan menggunggah dokumen pelamar apa pun. Harap tingkatkan paket layanan Anda terlebih dahulu!"]);
        }
        if ($activePkgId === "pkg_basic") {
            respondJSON(403, ["message" => "Paket Basic tidak memperoleh hak akses pengunggahan berkas dokumen. Silakan tingkatkan ke Paket Standart atau Premium!"]);
        }

        // Premium-only Document types
        $premiumDocumentTypes = ["ijazah", "transkip_nilai", "sk_sehat", "kartu_kuning", "skck"];
        if (in_array($fileType, $premiumDocumentTypes)) {
            if ($activePkgId !== "pkg_premium" && $userSession['role'] !== 'admin') {
                respondJSON(403, ["message" => "Hak Unggah Terkunci 🔒 Berkas ini hanya diperbolehkan untuk pengguna Paket Premium. Silakan upgrade paket Anda di menu \"Paket Saya\"!"]);
            }
        }

        // Calculate decoded size of Base64
        $base64Data = $fileDataUrl;
        if (strpos($fileDataUrl, ',') !== false) {
            $base64Data = substr($fileDataUrl, strpos($fileDataUrl, ',') + 1);
        }
        $decodedSize = strlen(base64_decode($base64Data));
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if ($activePkgId === "pkg_standard") {
            // 1 MB limit
            if ($decodedSize > 1 * 1024 * 1024) {
                respondJSON(400, ["message" => "Ukuran berkas terlalu besar! Batas maksimal untuk Paket Standart adalah 1 MB per dokumen."]);
            }
            // Format JPG/PNG only
            if (!in_array($extension, ["png", "jpg", "jpeg"])) {
                respondJSON(400, ["message" => "Format berkas tidak didukung! Paket Standart hanya mendukung berkas gambar PNG atau JPG."]);
            }

            $allowed = ["ktp", "npwp", "bpjs_kes", "bpjs_ketenagakerjaan"];
            if (!in_array($fileType, $allowed)) {
                respondJSON(403, ["message" => "Hak Unggah Terkunci 🔒 Paket Standart hanya diperbolehkan mengunggah KTP, NPWP, BPJS Kesehatan, dan BPJS Ketenagakerjaan."]);
            }
        } else if ($activePkgId === "pkg_premium" || $userSession['role'] === 'admin') {
            // 10 MB limit
            if ($decodedSize > 10 * 1024 * 1024) {
                respondJSON(400, ["message" => "Ukuran berkas terlalu besar! Batas maksimal untuk Paket Premium adalah 10 MB per dokumen."]);
            }
            // Format JPG/PNG/PDF only
            if (!in_array($extension, ["png", "jpg", "jpeg", "pdf"])) {
                respondJSON(400, ["message" => "Format berkas tidak didukung! Paket Premium mendukung berkas gambar PNG, JPG, atau dokumen PDF."]);
            }
        }

        // Limit certifications upload count to 3
        if (strpos($fileType, "sertifikat_") === 0) {
            $stmt = $db->prepare("SELECT COUNT(*) as cnt FROM documents WHERE userId = ? AND fileType LIKE 'sertifikat_%'");
            $stmt->execute([$userId]);
            $res = $stmt->fetch();
            if ($res['cnt'] >= 3) {
                respondJSON(400, ["message" => "Batas pengunggahan sertifikat telah dicapai! Maksimal 3 berkas."]);
            }
        }

        $docId = "doc_" . time() . rand(10, 99);
        $uploadedAt = date('c');

        // Decodes the Base64 dataUrl and saves it as a physical file on the disk (under public_html/api/uploads/)
        // This keeps the MySQL database extremely small, lightweight, and fast!
        $savedPath = saveUploadedFilePHP($userId, $fileType, $fileName, $fileDataUrl);

        $stmt = $db->prepare("INSERT INTO documents (id, userId, fileType, fileName, filePathUrl, uploadedAt) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$docId, $userId, $fileType, $fileName, $savedPath, $uploadedAt]);

        logUserAction($userId, $userSession['email'], "Berhasil mengunggah dokumen baru: {$fileName}");

        respondJSON(200, [
            "message" => "Dokumen '{$fileName}' berhasil terunggah dan diamankan oleh sistem!",
            "document" => [
                "id" => $docId,
                "userId" => $userId,
                "fileType" => $fileType,
                "fileName" => $fileName,
                "filePathUrl" => $savedPath,
                "uploadedAt" => $uploadedAt
            ]
        ]);
    }

    // Route: documents/:userId/:docId (DELETE)
    if (preg_match('/^documents\/([^\/]+)\/([^\/]+)$/', $route, $matches) && $method === 'DELETE') {
        $userId = $matches[1];
        $docId = $matches[2];
        JWT::authorizeOwner($userSession, $userId);

        // Fetch the file path from the database before deleting so we can clean up the physical file
        $stmtFile = $db->prepare("SELECT filePathUrl FROM documents WHERE id = ? AND userId = ?");
        $stmtFile->execute([$docId, $userId]);
        $doc = $stmtFile->fetch();
        if ($doc && !empty($doc['filePathUrl'])) {
            $filePath = $doc['filePathUrl'];
            // If stored physically (path contains api/uploads/)
            if (strpos($filePath, 'api/uploads') !== false) {
                // Since this index.php is inside 'api/', __DIR__ is '/home/portoify/public_html/api'
                // The physical uploads folder is __DIR__ . '/uploads'
                $safeFilename = basename($filePath);
                $physicalPath = __DIR__ . '/uploads/' . $safeFilename;
                if (file_exists($physicalPath)) {
                    @unlink($physicalPath);
                }
            }
        }

        $stmt = $db->prepare("DELETE FROM documents WHERE id = ? AND userId = ?");
        $stmt->execute([$docId, $userId]);

        logUserAction($userId, $userSession['email'], "Menghapus berkas dokumen lamaran");

        respondJSON(200, ["message" => "Dokumen berkas telah dihapus permanen dari cloud secure storage!"]);
    }

    // Route: payments/create-midtrans-token
    if ($route === 'payments/create-midtrans-token' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $packageId = isset($req['packageId']) ? trim($req['packageId']) : '';

        // 1. Fetch user email & fullName
        $stmt = $db->prepare("SELECT id, fullName, email FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $userObj = $stmt->fetch();
        if (!$userObj) {
            respondJSON(404, ["message" => "Pengguna tidak ditemukan."]);
        }

        // 2. Fetch package pricing
        $stmt = $db->prepare("SELECT id, name, price FROM packages WHERE id = ?");
        $stmt->execute([$packageId]);
        $pkg = $stmt->fetch();
        if (!$pkg) {
            respondJSON(404, ["message" => "Paket layanan tidak dikenal."]);
        }

        // 3. Fetch optional user profile for first_name & phone
        $stmt = $db->prepare("SELECT fullName, phone FROM profiles WHERE userId = ?");
        $stmt->execute([$userId]);
        $profile = $stmt->fetch();

        // 4. Generate unique order ID
        $tierBrief = str_replace("pkg_", "", $pkg['id']);
        $orderId = "ORDER-PORT-" . time() . "-{$tierBrief}-{$userId}";

        // 5. Check Midtrans config key
        $serverKey = defined('MIDTRANS_SERVER_KEY') ? MIDTRANS_SERVER_KEY : '';
        if (!empty($serverKey)) {
            $authHeader = "Basic " . base64_encode($serverKey . ":");
            $isSandboxKey = (stripos($serverKey, 'sb-') === 0 || stripos($serverKey, 'sandbox') !== false);
            $snapUrl = $isSandboxKey 
                ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
                : "https://app.midtrans.com/snap/v1/transactions";

            $midtransPayload = [
                "transaction_details" => [
                    "order_id" => $orderId,
                    "gross_amount" => (int)$pkg['price']
                ],
                "credit_card" => [
                    "secure" => true
                ],
                "customer_details" => [
                    "first_name" => !empty($profile['fullName']) ? $profile['fullName'] : $userObj['fullName'],
                    "email" => $userObj['email'],
                    "phone" => !empty($profile['phone']) ? $profile['phone'] : ""
                ]
            ];

            // Perform cURL request to Midtrans API
            if (function_exists('curl_init')) {
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $snapUrl);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($midtransPayload));
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    "Content-Type: application/json",
                    "Accept: application/json",
                    "Authorization: {$authHeader}"
                ]);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_TIMEOUT, 15);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if (($httpCode === 200 || $httpCode === 201) && !empty($response)) {
                    $snapResult = json_decode($response, true);
                    if (isset($snapResult['token'])) {
                        respondJSON(200, [
                            "token" => $snapResult['token'],
                            "redirect_url" => $snapResult['redirect_url']
                        ]);
                    }
                }
            }
        }

        // Fallback Mock Token if Midtrans credentials are unset or remote connection fails
        $mockToken = "snap_mock_token_" . time() . rand(100, 999);
        respondJSON(200, [
            "token" => $mockToken,
            "redirect_url" => "https://app.sandbox.midtrans.com/snap/v1/transactions/{$mockToken}/pdf"
        ]);
    }

    // Route: payments/subscribe
    if ($route === 'payments/subscribe' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $packageId = isset($req['packageId']) ? trim($req['packageId']) : '';
        $packageName = isset($req['packageName']) ? trim($req['packageName']) : '';
        $price = isset($req['price']) ? floatval($req['price']) : 0;
        $durationDays = isset($req['durationDays']) ? intval($req['durationDays']) : 30;

        if (empty($packageName) || $price == 0) {
            $stmt = $db->prepare("SELECT name, price, durationDays FROM packages WHERE id = ?");
            $stmt->execute([$packageId]);
            $pkg = $stmt->fetch();
            if ($pkg) {
                if (empty($packageName)) {
                    $packageName = $pkg['name'];
                }
                if ($price == 0) {
                    $price = floatval($pkg['price']);
                }
                $durationDays = intval($pkg['durationDays']);
            }
        }

        $startDate = date('c');
        $endDate = date('c', strtotime("+{$durationDays} days"));

        // Get existing or generate new unique domainHostingPath to satisfy UNIQUE key constraints
        $stmtSub = $db->prepare("SELECT domainHostingPath FROM subscriptions WHERE userId = ? LIMIT 1");
        $stmtSub->execute([$userId]);
        $subRecord = $stmtSub->fetch();
        $domainHostingPath = ($subRecord && !empty($subRecord['domainHostingPath'])) ? $subRecord['domainHostingPath'] : "";
        
        if (empty($domainHostingPath)) {
            $stmtUser = $db->prepare("SELECT fullName FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $userRecord = $stmtUser->fetch();
            $fullName = $userRecord ? $userRecord['fullName'] : "user";
            
            $cleanFolder = preg_replace('/[^a-z0-0]/', '', strtolower($fullName));
            if (empty($cleanFolder)) {
                $cleanFolder = "user" . rand(100, 999);
            }
            $domainHostingPath = $cleanFolder;
            
            // Check uniqueness in database
            $stmtUnique = $db->prepare("SELECT userId FROM subscriptions WHERE domainHostingPath = ? AND userId != ? LIMIT 1");
            $stmtUnique->execute([$domainHostingPath, $userId]);
            if ($stmtUnique->fetch()) {
                $domainHostingPath = $domainHostingPath . rand(10, 99);
            }
        }

        // Insert or update subscription
        $stmt = $db->prepare("INSERT INTO subscriptions (userId, packageId, packageName, startDate, endDate, isActive, domainHostingPath)
            VALUES (?, ?, ?, ?, ?, 1, ?)
            ON DUPLICATE KEY UPDATE
            packageId = VALUES(packageId), packageName = VALUES(packageName),
            startDate = VALUES(startDate), endDate = VALUES(endDate), isActive = 1,
            domainHostingPath = VALUES(domainHostingPath)");
        $stmt->execute([$userId, $packageId, $packageName, $startDate, $endDate, $domainHostingPath]);

        // Record sales stat
        $month = date('M');
        $stmt = $db->prepare("INSERT INTO sales (month, sales) VALUES (?, ?) ON DUPLICATE KEY UPDATE sales = sales + VALUES(sales)");
        $stmt->execute([$month, $price]);

        logUserAction($userId, $userSession['email'], "Berlangganan {$packageName} baru. Transaksi Berhasil!");

        respondJSON(200, [
            "message" => "Konfirmasi pembayaran sukses! Keanggotaan Paket {$packageName} Anda kini aktif.",
            "subscription" => [
                "userId" => $userId,
                "packageId" => $packageId,
                "packageName" => $packageName,
                "startDate" => $startDate,
                "endDate" => $endDate,
                "isActive" => true
            ]
        ]);
    }

    // Route: payments/my-subscription/:userId (GET)
    if (preg_match('/^payments\/my-subscription\/([^\/]+)$/', $route, $matches) && $method === 'GET') {
        $userId = $matches[1];
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("SELECT * FROM subscriptions WHERE userId = ? LIMIT 1");
        $stmt->execute([$userId]);
        $sub = $stmt->fetch();

        if (!$sub) {
            respondJSON(200, null);
        }

        $sub['isActive'] = (bool) $sub['isActive'];
        respondJSON(200, $sub);
    }

    // Route: payments/check-status/:orderId/:userId/:packageId (GET)
    if (preg_match('/^payments\/check-status\/([^\/]+)\/([^\/]+)\/([^\/]+)$/', $route, $matches) && $method === 'GET') {
        $orderId = $matches[1];
        $userId = $matches[2];
        $packageId = $matches[3];
        
        JWT::authorizeOwner($userSession, $userId);

        $stmt = $db->prepare("SELECT id, name, price, durationDays FROM packages WHERE id = ?");
        $stmt->execute([$packageId]);
        $pkg = $stmt->fetch();
        if (!$pkg) {
            respondJSON(404, ["message" => "Paket layanan tidak dikenal."]);
        }

        $durationDays = intval($pkg['durationDays']);
        $packageName = $pkg['name'];
        $price = floatval($pkg['price']);

        $startDate = date('c');
        $endDate = date('c', strtotime("+{$durationDays} days"));

        // Get existing or generate new unique domainHostingPath to satisfy UNIQUE key constraints
        $stmtSub = $db->prepare("SELECT domainHostingPath FROM subscriptions WHERE userId = ? LIMIT 1");
        $stmtSub->execute([$userId]);
        $subRecord = $stmtSub->fetch();
        $domainHostingPath = ($subRecord && !empty($subRecord['domainHostingPath'])) ? $subRecord['domainHostingPath'] : "";
        
        if (empty($domainHostingPath)) {
            $stmtUser = $db->prepare("SELECT fullName FROM users WHERE id = ?");
            $stmtUser->execute([$userId]);
            $userRecord = $stmtUser->fetch();
            $fullName = $userRecord ? $userRecord['fullName'] : "user";
            
            $cleanFolder = preg_replace('/[^a-z0-9]/', '', strtolower($fullName));
            if (empty($cleanFolder)) {
                $cleanFolder = "user" . rand(100, 999);
            }
            $domainHostingPath = $cleanFolder;
            
            // Check uniqueness in database
            $stmtUnique = $db->prepare("SELECT userId FROM subscriptions WHERE domainHostingPath = ? AND userId != ? LIMIT 1");
            $stmtUnique->execute([$domainHostingPath, $userId]);
            if ($stmtUnique->fetch()) {
                $domainHostingPath = $domainHostingPath . rand(10, 99);
            }
        }

        // Insert or update subscription
        $stmt = $db->prepare("INSERT INTO subscriptions (userId, packageId, packageName, startDate, endDate, isActive, domainHostingPath)
            VALUES (?, ?, ?, ?, ?, 1, ?)
            ON DUPLICATE KEY UPDATE
            packageId = VALUES(packageId), packageName = VALUES(packageName),
            startDate = VALUES(startDate), endDate = VALUES(endDate), isActive = 1,
            domainHostingPath = VALUES(domainHostingPath)");
        $stmt->execute([$userId, $packageId, $packageName, $startDate, $endDate, $domainHostingPath]);

        // Record sales stat
        $month = date('M');
        $stmt = $db->prepare("INSERT INTO sales (month, sales) VALUES (?, ?) ON DUPLICATE KEY UPDATE sales = sales + VALUES(sales)");
        $stmt->execute([$month, $price]);

        logUserAction($userId, $userSession['email'], "Berlangganan {$packageName} baru. Transaksi Berhasil!");

        respondJSON(200, [
            "status" => "success",
            "message" => "[Simulasi Sukses] Pembayaran sebesar IDR " . number_format($price, 0, ',', '.') . " diverifikasi! Paket {$packageName} aktif.",
            "subscription" => [
                "userId" => $userId,
                "packageId" => $packageId,
                "packageName" => $packageName,
                "startDate" => $startDate,
                "endDate" => $endDate,
                "isActive" => true
            ]
        ]);
    }

    // Route: domain-hosting/register
    if ($route === 'domain-hosting/register' && $method === 'POST') {
        $userId = isset($req['userId']) ? trim($req['userId']) : '';
        JWT::authorizeOwner($userSession, $userId);

        $rawPath = isset($req['domainHostingPath']) ? $req['domainHostingPath'] : (isset($req['hostingPath']) ? $req['hostingPath'] : '');
        $domainHostingPath = strtolower(preg_replace('/[^a-zA-Z0-9-]/', '', trim($rawPath)));

        if (empty($domainHostingPath) || strlen($domainHostingPath) < 3) {
            respondJSON(400, ["message" => "Subfolder URL minimal terdiri dari 3 karakter alfanumerik!"]);
        }

        // Verify subfolder uniqueness
        $stmt = $db->prepare("SELECT userId FROM subscriptions WHERE domainHostingPath = ? AND userId != ? LIMIT 1");
        $stmt->execute([$domainHostingPath, $userId]);
        if ($stmt->fetch()) {
            respondJSON(400, ["message" => "Maaf, nama folder sub-domain '{$domainHostingPath}' telah digunakan oleh pengguna lain!"]);
        }

        // Fetch old path first to update physical directory
        $stmtOld = $db->prepare("SELECT domainHostingPath FROM subscriptions WHERE userId = ? LIMIT 1");
        $stmtOld->execute([$userId]);
        $oldRow = $stmtOld->fetch();
        $oldPath = $oldRow ? trim($oldRow['domainHostingPath']) : '';

        // Update database
        $stmt = $db->prepare("UPDATE subscriptions SET domainHostingPath = ? WHERE userId = ?");
        $stmt->execute([$domainHostingPath, $userId]);

        // Physical folder rename on cPanel host
        $baseParentDir = dirname(dirname(__DIR__));
        if (!empty($oldPath) && strtolower($oldPath) !== strtolower($domainHostingPath)) {
            $oldCpanelPath = $baseParentDir . '/' . $oldPath;
            $newCpanelPath = $baseParentDir . '/' . $domainHostingPath;
            if (file_exists($oldCpanelPath)) {
                $renamed = @rename($oldCpanelPath, $newCpanelPath);
                if (!$renamed) {
                    // Robust fallback: copy content to new destination and delete old directory completely to prevent build-up
                    copyFolderRecursive($oldCpanelPath, $newCpanelPath);
                    deleteFolderRecursive($oldCpanelPath);
                }
            } else {
                @mkdir($newCpanelPath, 0755, true);
                @file_put_contents($newCpanelPath . '/index.html', "
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset='UTF-8'><title>Hosting - {$domainHostingPath}</title></head>
                    <body style='font-family: sans-serif; padding: 40px; background: #fafafa; color: #333;'>
                      <div style='background: white; border: 1px solid #ddd; max-width: 600px; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                        <h1 style='color: #dc2626;'>Hosting Aktif! 🚀</h1>
                        <p>Folder Direct-Hosting <strong>\"{$domainHostingPath}\"</strong> aktif.</p>
                      </div>
                    </body>
                    </html>
                ");
            }
        } else {
            $newCpanelPath = $baseParentDir . '/' . $domainHostingPath;
            if (!file_exists($newCpanelPath)) {
                @mkdir($newCpanelPath, 0755, true);
                @file_put_contents($newCpanelPath . '/index.html', "
                    <!DOCTYPE html>
                    <html>
                    <head><meta charset='UTF-8'><title>Hosting - {$domainHostingPath}</title></head>
                    <body style='font-family: sans-serif; padding: 40px; background: #fafafa; color: #333;'>
                      <div style='background: white; border: 1px solid #ddd; max-width: 600px; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                        <h1 style='color: #dc2626;'>Hosting Aktif! 🚀</h1>
                        <p>Folder Direct-Hosting <strong>\"{$domainHostingPath}\"</strong> aktif.</p>
                      </div>
                    </body>
                    </html>
                ");
            }
        }

        logUserAction($userId, $userSession['email'], "Mendaftarkan tautan kustom domain baru http://localhost:3000/u/{$domainHostingPath}");

        respondJSON(200, [
            "message" => "Selamat! Tautan Kustom Portoify Anda berhasil diterbitkan.",
            "domainHostingPath" => $domainHostingPath
        ]);
    }

    // -------------------------------------------------------------
    // IV. ADMINISTRATOR CONTROLLER API ENDPOINTS
    // -------------------------------------------------------------
    JWT::authorizeAdmin($userSession);

    // Route: ads (POST - Admin only)
    if ($route === 'ads' && $method === 'POST') {
        $leftName = isset($req['leftName']) ? trim($req['leftName']) : '';
        $leftScript = isset($req['leftScript']) ? trim($req['leftScript']) : '';
        $rightName = isset($req['rightName']) ? trim($req['rightName']) : '';
        $rightScript = isset($req['rightScript']) ? trim($req['rightScript']) : '';
        
        $name = isset($req['name']) ? trim($req['name']) : '';
        $script = isset($req['script']) ? trim($req['script']) : '';
        $socialBarScript = isset($req['socialBarScript']) ? trim($req['socialBarScript']) : '';
        $bannerActive = isset($req['bannerActive']) ? ($req['bannerActive'] ? 1 : 0) : 1;
        $socialActive = isset($req['socialActive']) ? ($req['socialActive'] ? 1 : 0) : 1;

        // Prioritize inputs for dynamic synchronisation
        $outName = !empty($name) ? $name : (!empty($leftName) ? $leftName : '');
        $outScript = !empty($script) ? $script : (!empty($leftScript) ? $leftScript : '');

        $finalLeftName = !empty($leftName) ? $leftName : $outName;
        $finalLeftScript = !empty($leftScript) ? $leftScript : $outScript;
        $finalRightName = !empty($rightName) ? $rightName : $outName;
        $finalRightScript = !empty($rightScript) ? $rightScript : $outScript;

        // Save ads configuration
        $stmt = $db->prepare("INSERT INTO ads_config (id, leftName, leftScript, rightName, rightScript, name, script, socialBarScript, bannerActive, socialActive)
            VALUES ('active_ad', ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            leftName = VALUES(leftName), leftScript = VALUES(leftScript),
            rightName = VALUES(rightName), rightScript = VALUES(rightScript),
            name = VALUES(name), script = VALUES(script),
            socialBarScript = VALUES(socialBarScript),
            bannerActive = VALUES(bannerActive),
            socialActive = VALUES(socialActive)");
        
        $stmt->execute([
            $finalLeftName, $finalLeftScript,
            $finalRightName, $finalRightScript,
            $outName, $outScript, $socialBarScript,
            $bannerActive, $socialActive
        ]);

        logUserAction($userSession['id'], $userSession['email'], "Admin memperbarui Pengaturan Iklan & status keaktifan Landing Page");

        respondJSON(200, [
            "message" => "Pengaturan Iklan berhasil disimpan & diperbarui!",
            "ads" => [
                "leftName" => $finalLeftName,
                "leftScript" => $finalLeftScript,
                "rightName" => $finalRightName,
                "rightScript" => $finalRightScript,
                "name" => $outName,
                "script" => $outScript,
                "socialBarScript" => $socialBarScript,
                "bannerActive" => $bannerActive === 1,
                "socialActive" => $socialActive === 1
            ]
        ]);
    }

    // Route: admin/stats-summary (GET)
    if ($route === 'admin/stats-summary' && $method === 'GET') {
        // Users count (total Users that are role = 'user' and Active)
        $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND isActive = 1");
        $activeMembersCount = (int)getRowAmtCase($stmt->fetch(), 'count', 0);

        // Subscriptions count
        $stmt = $db->query("SELECT COUNT(*) as count FROM subscriptions WHERE isActive = 1");
        $totSubs = (int)getRowAmtCase($stmt->fetch(), 'count', 0);

        // Total sales
        $stmt = $db->query("SELECT SUM(sales) as sum FROM sales");
        $totalRevenue = (float)getRowAmtCase($stmt->fetch(), 'sum', 0.0);

        // Calculated Monthly Earnings (current month sales)
        $currentMonth = date('M');
        $stmt = $db->prepare("SELECT sales FROM sales WHERE month = ?");
        $stmt->execute([$currentMonth]);
        $monthlyEarningsRow = $stmt->fetch();
        $monthlyEarnings = $monthlyEarningsRow ? (float)getRowAmtCase($monthlyEarningsRow, 'sales', 0.0) : 0.0;

        // New Members count registered in last 30 days
        $thirtyDaysAgo = date('c', time() - 30 * 24 * 60 * 60);
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND createdAt >= ?");
        $stmt->execute([$thirtyDaysAgo]);
        $newMembersThisMonthCount = (int)getRowAmtCase($stmt->fetch(), 'count', 0);

        // Service package sales activity stats
        $packageStats = [
            "pkg_basic" => 0,
            "pkg_standard" => 0,
            "pkg_premium" => 0
        ];
        $stmt = $db->query("SELECT packageId, COUNT(*) as count FROM subscriptions WHERE isActive = 1 GROUP BY packageId");
        $rows = $stmt->fetchAll();
        foreach ($rows as $row) {
            $pId = getRowAmtCase($row, 'packageId');
            if ($pId && array_key_exists($pId, $packageStats)) {
                $packageStats[$pId] = (int)getRowAmtCase($row, 'count', 0);
            }
        }

        // Templates count
        $stmt = $db->query("SELECT COUNT(*) as count FROM templates");
        $templatesCount = (int)getRowAmtCase($stmt->fetch(), 'count', 0);

        // Logs list (last 15 rows, showing ONLY Admin activities)
        $stmt = $db->query("SELECT * FROM logs WHERE (userId = 'usr_admin' OR userEmail = 'admin@portoify.com' OR message LIKE 'Admin%') ORDER BY timestamp DESC LIMIT 15");
        $logsListRaw = $stmt->fetchAll();
        $logsList = [];
        foreach ($logsListRaw as $lg) {
            $logsList[] = [
                "id" => getRowAmtCase($lg, 'id'),
                "userId" => getRowAmtCase($lg, 'userId'),
                "userEmail" => getRowAmtCase($lg, 'userEmail'),
                "message" => getRowAmtCase($lg, 'message'),
                "timestamp" => getRowAmtCase($lg, 'timestamp')
            ];
        }

        // Get sales array
        $stmt = $db->query("SELECT * FROM sales");
        $salesListRaw = $stmt->fetchAll();
        $salesList = [];
        foreach ($salesListRaw as $sRow) {
            $salesList[] = [
                "month" => getRowAmtCase($sRow, 'month'),
                "sales" => (float)getRowAmtCase($sRow, 'sales', 0.0)
            ];
        }
        
        // If there are no sales recording yet in DB, we should return real 0 sales for months so the chart doesn't fall back to fake simulated data
        if (empty($salesList)) {
            $salesList = [
                ["month" => "Jan", "sales" => 0],
                ["month" => "Feb", "sales" => 0],
                ["month" => "Mar", "sales" => 0],
                ["month" => "Apr", "sales" => 0],
                ["month" => "Mei", "sales" => 0]
            ];
        }

        respondJSON(200, [
            "totalRevenue" => $totalRevenue,
            "monthlyEarnings" => $monthlyEarnings,
            "newMembersThisMonthCount" => $newMembersThisMonthCount,
            "packageStats" => $packageStats,
            "activeMembersCount" => $activeMembersCount,
            "templatesCount" => $templatesCount,
            "sales" => $salesList,
            "salesHistory" => $salesList,
            "logs" => $logsList
        ]);
    }

    // Route: admin/users (GET)
    if ($route === 'admin/users' && $method === 'GET') {
        $stmt = $db->query("SELECT u.id, u.email, u.fullName, u.role, u.isActive, u.createdAt, s.packageName, s.endDate, s.domainHostingPath 
            FROM users u LEFT JOIN subscriptions s ON u.id = s.userId ORDER BY u.createdAt DESC");
        $usersRaw = $stmt->fetchAll();

        $users = [];
        foreach ($usersRaw as $u) {
            $users[] = [
                "id" => getRowAmtCase($u, 'id'),
                "email" => getRowAmtCase($u, 'email'),
                "fullName" => getRowAmtCase($u, 'fullName'),
                "role" => getRowAmtCase($u, 'role'),
                "isActive" => (bool)getRowAmtCase($u, 'isActive', true),
                "createdAt" => getRowAmtCase($u, 'createdAt'),
                "packageName" => getRowAmtCase($u, 'packageName'),
                "endDate" => getRowAmtCase($u, 'endDate'),
                "domainHostingPath" => getRowAmtCase($u, 'domainHostingPath')
            ];
        }

        respondJSON(200, $users);
    }

    // Route: admin/users/:userId (PUT)
    if (preg_match('/^admin\/users\/([^\/]+)$/', $route, $matches) && $method === 'PUT') {
        $targetUserId = $matches[1];
        
        try {
            // Retrieve current details
            $stmt = $db->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$targetUserId]);
            $existingUser = $stmt->fetch();
            
            if (!$existingUser) {
                respondJSON(404, ["message" => "Akun pengguna tidak ditemukan."]);
            }

            $isActive = isset($req['isActive']) ? ($req['isActive'] ? 1 : 0) : (int)getRowAmtCase($existingUser, 'isActive', 1);
            $role = isset($req['role']) ? trim($req['role']) : getRowAmtCase($existingUser, 'role', 'user');
            $fullName = isset($req['fullName']) ? trim($req['fullName']) : getRowAmtCase($existingUser, 'fullName');
            $email = isset($req['email']) ? trim($req['email']) : getRowAmtCase($existingUser, 'email');

            $stmt = $db->prepare("UPDATE users SET fullName = ?, email = ?, role = ?, isActive = ? WHERE id = ?");
            $stmt->execute([$fullName, $email, $role, $isActive, $targetUserId]);

            // Synchronize with profiles
            try {
                $stmt = $db->prepare("UPDATE profiles SET fullName = ?, email = ? WHERE userId = ?");
                $stmt->execute([$fullName, $email, $targetUserId]);
            } catch (PDOException $profEx) {
                // ignore if profiles table has some layout deviation or key errors
            }

            // Sync subscription / package access directly to tables
            if (isset($req['packageId'])) {
                $packageId = trim($req['packageId']);
                if ($packageId === "free" || empty($packageId)) {
                    try {
                        // Deactivate active subscription
                        $stmtSub = $db->prepare("SELECT domainHostingPath FROM subscriptions WHERE userId = ? LIMIT 1");
                        $stmtSub->execute([$targetUserId]);
                        $subRecord = $stmtSub->fetch();
                        $domainHostingPath = ($subRecord && !empty($subRecord['domainHostingPath'])) ? $subRecord['domainHostingPath'] : "";
                        
                        if (empty($domainHostingPath)) {
                            $cleanFolder = preg_replace('/[^a-z0-9]/', '', strtolower($fullName));
                            if (empty($cleanFolder)) {
                                $cleanFolder = "user" . rand(100, 999);
                            }
                            $domainHostingPath = $cleanFolder;
                        }
                        
                        $stmtDir = $db->prepare("INSERT INTO subscriptions (userId, packageId, packageName, startDate, endDate, isActive, domainHostingPath)
                            VALUES (?, 'free', 'Free', ?, '', 0, ?)
                            ON DUPLICATE KEY UPDATE
                            packageId = 'free', packageName = 'Free', endDate = '', isActive = 0,
                            domainHostingPath = VALUES(domainHostingPath)");
                        $stmtDir->execute([$targetUserId, date('c'), $domainHostingPath]);
                    } catch (PDOException $subEx) {
                        // Ignore
                    }
                } else {
                    try {
                        // Fetch package info
                        $stmtPkg = $db->prepare("SELECT name, durationDays FROM packages WHERE id = ?");
                        $stmtPkg->execute([$packageId]);
                        $pkg = $stmtPkg->fetch();
                        
                        $packageName = $pkg ? $pkg['name'] : ucfirst(str_replace('pkg_', '', $packageId));
                        $durationDays = $pkg ? intval($pkg['durationDays']) : 30;
                        
                        $startDate = date('c');
                        if (isset($req['endDate']) && !empty($req['endDate'])) {
                            $endDate = date('c', strtotime($req['endDate']));
                        } else {
                            $endDate = date('c', strtotime("+{$durationDays} days"));
                        }
                        
                        // Retrieve existing domainHostingPath if exists
                        $stmtSub = $db->prepare("SELECT domainHostingPath FROM subscriptions WHERE userId = ? LIMIT 1");
                        $stmtSub->execute([$targetUserId]);
                        $subRecord = $stmtSub->fetch();
                        $domainHostingPath = ($subRecord && !empty($subRecord['domainHostingPath'])) ? $subRecord['domainHostingPath'] : "";
                        
                        if (empty($domainHostingPath)) {
                            $cleanFolder = preg_replace('/[^a-z0-9]/', '', strtolower($fullName));
                            if (empty($cleanFolder)) {
                                $cleanFolder = "user" . rand(100, 999);
                            }
                            $domainHostingPath = $cleanFolder;
                            
                            // Check uniqueness
                            $stmtUnique = $db->prepare("SELECT userId FROM subscriptions WHERE domainHostingPath = ? AND userId != ? LIMIT 1");
                            $stmtUnique->execute([$domainHostingPath, $targetUserId]);
                            if ($stmtUnique->fetch()) {
                                $domainHostingPath = $domainHostingPath . rand(10, 99);
                            }
                        }
                        
                        $stmtIns = $db->prepare("INSERT INTO subscriptions (userId, packageId, packageName, startDate, endDate, isActive, domainHostingPath)
                            VALUES (?, ?, ?, ?, ?, 1, ?)
                            ON DUPLICATE KEY UPDATE
                            packageId = VALUES(packageId), packageName = VALUES(packageName),
                            startDate = VALUES(startDate), endDate = VALUES(endDate), isActive = 1,
                            domainHostingPath = VALUES(domainHostingPath)");
                        $stmtIns->execute([$targetUserId, $packageId, $packageName, $startDate, $endDate, $domainHostingPath]);
                        
                        // Create physical directory for direct-hosting if it doesn't exist
                        $cpanelPath = dirname(dirname(__DIR__)) . '/' . $domainHostingPath;
                        if (!file_exists($cpanelPath)) {
                            @mkdir($cpanelPath, 0755, true);
                            @file_put_contents($cpanelPath . '/index.html', "
                                <!DOCTYPE html>
                                <html>
                                <head><meta charset='UTF-8'><title>Hosting - {$domainHostingPath}</title></head>
                                <body style='font-family: sans-serif; padding: 40px; background: #fafafa; color: #333;'>
                                  <div style='background: white; border: 1px solid #ddd; max-width: 600px; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);'>
                                    <h1 style='color: #dc2626;'>Hosting Aktif! 🚀</h1>
                                    <p>Folder Direct-Hosting <strong>\"{$domainHostingPath}\"</strong> aktif.</p>
                                  </div>
                                </body>
                                </html>
                            ");
                        }
                    } catch (PDOException $subEx2) {
                        // Ignore or log
                    }
                }
            }

            respondJSON(200, ["message" => "Akses akun & status langganan pengguna berhasil diperbarui di database."]);
        } catch (PDOException $e) {
            respondJSON(500, ["message" => "Kesalahan sistem database saat memperbarui user: " . $e->getMessage()]);
        }
    }

    // Route: admin/users/:userId (DELETE)
    if (preg_match('/^admin\/users\/([^\/]+)$/', $route, $matches) && $method === 'DELETE') {
        $targetUserId = $matches[1];

        if ($targetUserId === $userSession['id']) {
            respondJSON(400, ["message" => "Anda tidak diperbolehkan menghapus akun administratif Anda sendiri!"]);
        }

        try {
            // Delete associated structures beforehand with individual try-catches to secure dynamic dependencies
            try { $db->prepare("DELETE FROM profiles WHERE userId = ?")->execute([$targetUserId]); } catch (PDOException $ex) {}
            try { $db->prepare("DELETE FROM portfolios WHERE userId = ?")->execute([$targetUserId]); } catch (PDOException $ex) {}
            try { $db->prepare("DELETE FROM resumes WHERE userId = ?")->execute([$targetUserId]); } catch (PDOException $ex) {}
            try { $db->prepare("DELETE FROM covers WHERE userId = ?")->execute([$targetUserId]); } catch (PDOException $ex) {}
            try { $db->prepare("DELETE FROM documents WHERE userId = ?")->execute([$targetUserId]); } catch (PDOException $ex) {}
            try { $db->prepare("DELETE FROM subscriptions WHERE userId = ?")->execute([$targetUserId]); } catch (PDOException $ex) {}

            $stmt = $db->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$targetUserId]);

            respondJSON(200, ["message" => "Data pendaftaran akun user tersebut berhasil dihapus secara permanen."]);
        } catch (PDOException $e) {
            respondJSON(500, ["message" => "Kesalahan sistem database saat menghapus user: " . $e->getMessage()]);
        }
    }

    // Route: admin/templates (POST)
    if ($route === 'admin/templates' && $method === 'POST') {
        $name = isset($req['name']) ? trim($req['name']) : '';
        $category = isset($req['category']) ? trim($req['category']) : 'portfolio';
        $htmlMarkup = isset($req['htmlMarkup']) ? $req['htmlMarkup'] : '';
        $tier = isset($req['tier']) ? trim($req['tier']) : 'standard';
        $previewUrl = isset($req['previewUrl']) ? trim($req['previewUrl']) : '';
        $previewUrl = saveDesignImagePHP($previewUrl);
        $description = isset($req['description']) ? trim($req['description']) : '';

        if (!$name || !$htmlMarkup) {
            respondJSON(400, ["message" => "Silakan lengkapi Nama Desain dan Coding Markup!"]);
        }

        $id = "tpl_custom_" . time();
        $htmlMarkup = saveWordTemplatePHP($htmlMarkup, $id);
        $createdAt = date('c');

        // Dynamically append previewUrl table column if missing in live database
        try {
            $db->query("SELECT previewUrl FROM templates LIMIT 1");
        } catch (PDOException $ex) {
            try {
                $db->exec("ALTER TABLE templates ADD COLUMN previewUrl TEXT NULL DEFAULT NULL");
            } catch (PDOException $ex2) {
                // Ignore
            }
        }
        // Dynamically append description table column if missing in live database
        try {
            $db->query("SELECT description FROM templates LIMIT 1");
        } catch (PDOException $ex) {
            try {
                $db->exec("ALTER TABLE templates ADD COLUMN description TEXT NULL DEFAULT NULL");
            } catch (PDOException $ex2) {
                // Ignore
            }
        }

        try {
            $stmt = $db->prepare("INSERT INTO templates (id, name, category, htmlMarkup, cssMarkup, tier, previewUrl, description, createdAt) VALUES (?, ?, ?, ?, '', ?, ?, ?, ?)");
            $stmt->execute([$id, $name, $category, $htmlMarkup, $tier, $previewUrl, $description, $createdAt]);

            // Add activities log
            $stmtLog = $db->prepare("INSERT INTO logs (id, userId, userEmail, message, timestamp) VALUES (?, 'usr_admin', 'admin@portoify.com', ?, ?)");
            $stmtLog->execute(["log_" . time() . rand(10, 99), "Admin meng-upload template desain baru: {$name}", $createdAt]);

            // Auto prune logs table in DB
            pruneDatabaseLogs($db);

            respondJSON(200, ["message" => "Template kustom baru berhasil diupload di sistem secure."]);
        } catch (PDOException $e) {
            respondJSON(500, ["message" => "Kesalahan sistem database saat meng-upload template: " . $e->getMessage()]);
        }
    }

    // Route: admin/templates/:templateId (PUT)
    if (preg_match('/^admin\/templates\/([^\/]+)$/', $route, $matches) && $method === 'PUT') {
        $targetTemplateId = $matches[1];
        $name = isset($req['name']) ? trim($req['name']) : '';
        $category = isset($req['category']) ? trim($req['category']) : 'portfolio';
        $htmlMarkup = isset($req['htmlMarkup']) ? $req['htmlMarkup'] : '';
        $tier = isset($req['tier']) ? trim($req['tier']) : 'standard';
        $previewUrl = isset($req['previewUrl']) ? trim($req['previewUrl']) : '';
        $previewUrl = saveDesignImagePHP($previewUrl);
        $description = isset($req['description']) ? trim($req['description']) : '';

        if (!$name || !$htmlMarkup) {
            respondJSON(400, ["message" => "Silakan lengkapi Nama Desain dan Coding Markup!"]);
        }

        $htmlMarkup = saveWordTemplatePHP($htmlMarkup, $targetTemplateId);

        try {
            $stmt = $db->prepare("UPDATE templates SET name = ?, category = ?, htmlMarkup = ?, tier = ?, previewUrl = ?, description = ? WHERE id = ?");
            $stmt->execute([$name, $category, $htmlMarkup, $tier, $previewUrl, $description, $targetTemplateId]);

            respondJSON(200, ["message" => "Template kustom berhasil diperbarui dengan data baru."]);
        } catch (PDOException $e) {
            respondJSON(500, ["message" => "Kesalahan database saat memperbarui template: " . $e->getMessage()]);
        }
    }

    // Route: admin/templates/:templateId (DELETE)
    if (preg_match('/^admin\/templates\/([^\/]+)$/', $route, $matches) && $method === 'DELETE') {
        $targetTemplateId = $matches[1];

        try {
            // Get name and file paths first for physical deletion and logging
            $stmtCheck = $db->prepare("SELECT name, htmlMarkup, previewUrl FROM templates WHERE id = ?");
            $stmtCheck->execute([$targetTemplateId]);
            $tpl = $stmtCheck->fetch();
            $tplName = $tpl ? $tpl['name'] : $targetTemplateId;
            $htmlMarkup = $tpl ? $tpl['htmlMarkup'] : '';
            $previewUrl = $tpl ? $tpl['previewUrl'] : '';

            // 1. Delete physical word file if exists
            if (!empty($htmlMarkup) && strpos($htmlMarkup, '/api/word/') !== false) {
                $parts = explode('/api/word/', $htmlMarkup);
                $fileName = trim(end($parts));
                if (!empty($fileName)) {
                    $filePath = __DIR__ . '/word/' . $fileName;
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                }
            } else if (!empty($htmlMarkup) && strpos($htmlMarkup, 'api/word/') !== false) {
                $parts = explode('api/word/', $htmlMarkup);
                $fileName = trim(end($parts));
                if (!empty($fileName)) {
                    $filePath = __DIR__ . '/word/' . $fileName;
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                }
            }

            // 2. Delete physical design preview image if exists
            if (!empty($previewUrl) && strpos($previewUrl, '/api/desain/') !== false) {
                $parts = explode('/api/desain/', $previewUrl);
                $fileName = trim(end($parts));
                if (!empty($fileName)) {
                    $filePath = __DIR__ . '/desain/' . $fileName;
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                }
            } else if (!empty($previewUrl) && strpos($previewUrl, 'api/desain/') !== false) {
                $parts = explode('api/desain/', $previewUrl);
                $fileName = trim(end($parts));
                if (!empty($fileName)) {
                    $filePath = __DIR__ . '/desain/' . $fileName;
                    if (file_exists($filePath)) {
                        unlink($filePath);
                    }
                }
            }

            $stmt = $db->prepare("DELETE FROM templates WHERE id = ?");
            $stmt->execute([$targetTemplateId]);

            // Add activities log
            $createdAt = date('c');
            $stmtLog = $db->prepare("INSERT INTO logs (id, userId, userEmail, message, timestamp) VALUES (?, 'usr_admin', 'admin@portoify.com', ?, ?)");
            $stmtLog->execute(["log_" . time() . rand(10, 99), "Admin menghapus template desain: {$tplName}", $createdAt]);

            // Auto prune logs table in DB
            pruneDatabaseLogs($db);

            respondJSON(200, ["message" => "Template {$tplName} berhasil dihapus secara permanen beserta file fisiknya!"]);
        } catch (PDOException $e) {
            respondJSON(500, ["message" => "Kesalahan database saat menghapus template: " . $e->getMessage()]);
        }
    }

    // Route: admin/packages (POST)
    if ($route === 'admin/packages' && $method === 'POST') {
        $name = isset($req['name']) ? trim($req['name']) : '';
        $price = isset($req['price']) ? floatval($req['price']) : 0;
        $durationDays = isset($req['durationDays']) ? intval($req['durationDays']) : 30;
        $features = isset($req['features']) ? $req['features'] : [];
        if (is_string($features)) {
            $f_arr = array_map('trim', explode(',', $features));
            $f_arr = array_filter($f_arr, function($val) { return $val !== ''; });
            $features = json_encode(array_values($f_arr));
        } else {
            $features = json_encode($features);
        }
        $isFeatured = isset($req['isFeatured']) ? ($req['isFeatured'] ? 1 : 0) : 0;
        $accessPortfolio = isset($req['accessPortfolio']) ? trim($req['accessPortfolio']) : 'all';
        $accessResume = isset($req['accessResume']) ? trim($req['accessResume']) : 'all';
        $accessLetter = isset($req['accessLetter']) ? trim($req['accessLetter']) : 'all';
        $accessUploadDocs = isset($req['accessUploadDocs']) ? trim($req['accessUploadDocs']) : 'all';

        // Dynamically append access columns if missing in live database
        foreach (['accessPortfolio', 'accessResume', 'accessLetter', 'accessUploadDocs'] as $col) {
            try {
                $db->query("SELECT {$col} FROM packages LIMIT 1");
            } catch (PDOException $ex) {
                try {
                    $db->exec("ALTER TABLE packages ADD COLUMN {$col} VARCHAR(255) DEFAULT 'all'");
                } catch (PDOException $ex2) {}
            }
        }

        $id = "pkg_" . time();

        $stmt = $db->prepare("INSERT INTO packages (id, name, price, durationDays, features, isFeatured, accessPortfolio, accessResume, accessLetter, accessUploadDocs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $name, $price, $durationDays, $features, $isFeatured, $accessPortfolio, $accessResume, $accessLetter, $accessUploadDocs]);

        respondJSON(200, ["message" => "Paket kustom berlangganan baru ditambahkan ke galeri."]);
    }

    // Route: admin/packages/:packageId (PUT)
    if (preg_match('/^admin\/packages\/([^\/]+)$/', $route, $matches) && $method === 'PUT') {
        $targetPkgId = $matches[1];
        $name = isset($req['name']) ? trim($req['name']) : '';
        $price = isset($req['price']) ? floatval($req['price']) : 0;
        $durationDays = isset($req['durationDays']) ? intval($req['durationDays']) : 30;
        $features = isset($req['features']) ? $req['features'] : [];
        if (is_string($features)) {
            $f_arr = array_map('trim', explode(',', $features));
            $f_arr = array_filter($f_arr, function($val) { return $val !== ''; });
            $features = json_encode(array_values($f_arr));
        } else {
            $features = json_encode($features);
        }
        $isFeatured = isset($req['isFeatured']) ? ($req['isFeatured'] ? 1 : 0) : 0;
        $accessPortfolio = isset($req['accessPortfolio']) ? trim($req['accessPortfolio']) : 'all';
        $accessResume = isset($req['accessResume']) ? trim($req['accessResume']) : 'all';
        $accessLetter = isset($req['accessLetter']) ? trim($req['accessLetter']) : 'all';
        $accessUploadDocs = isset($req['accessUploadDocs']) ? trim($req['accessUploadDocs']) : 'all';

        // Dynamically append access columns if missing in live database
        foreach (['accessPortfolio', 'accessResume', 'accessLetter', 'accessUploadDocs'] as $col) {
            try {
                $db->query("SELECT {$col} FROM packages LIMIT 1");
            } catch (PDOException $ex) {
                try {
                    $db->exec("ALTER TABLE packages ADD COLUMN {$col} VARCHAR(255) DEFAULT 'all'");
                } catch (PDOException $ex2) {}
            }
        }

        try {
            $stmt = $db->prepare("UPDATE packages SET name = ?, price = ?, durationDays = ?, features = ?, isFeatured = ?, accessPortfolio = ?, accessResume = ?, accessLetter = ?, accessUploadDocs = ? WHERE id = ?");
            $stmt->execute([$name, $price, $durationDays, $features, $isFeatured, $accessPortfolio, $accessResume, $accessLetter, $accessUploadDocs, $targetPkgId]);

            respondJSON(200, ["message" => "Paket layanan berhasil diupdate dengan data baru."]);
        } catch (PDOException $e) {
            respondJSON(500, ["message" => "Kesalahan database saat memperbarui paket: " . $e->getMessage()]);
        }
    }

    // Route: admin/packages/:packageId (DELETE)
    if (preg_match('/^admin\/packages\/([^\/]+)$/', $route, $matches) && $method === 'DELETE') {
        $targetPkgId = $matches[1];

        try {
            $stmt = $db->prepare("DELETE FROM packages WHERE id = ?");
            $stmt->execute([$targetPkgId]);

            respondJSON(200, ["message" => "Paket berhasil dihapus secara permanen dari sistem."]);
        } catch (PDOException $e) {
            respondJSON(500, ["message" => "Kesalahan database saat menghapus paket: " . $e->getMessage()]);
        }
    }

    // Route: admin/update-profile (POST)
    if ($route === 'admin/update-profile' && $method === 'POST') {
        $username = isset($req['username']) ? trim($req['username']) : '';
        $password = isset($req['password']) ? trim($req['password']) : '';
        $fullName = isset($req['fullName']) ? trim($req['fullName']) : '';

        try {
            $db->beginTransaction();

            if ($username) {
                if ($password !== '') {
                    $stmt = $db->prepare("UPDATE users SET email = ?, passwordHash = ? WHERE id = ?");
                    $stmt->execute([$username, $password, $userSession['id']]);
                } else {
                    $stmt = $db->prepare("UPDATE users SET email = ? WHERE id = ?");
                    $stmt->execute([$username, $userSession['id']]);
                }
                
                // Dynamically ensure 'email' & 'city' columns exist in 'profiles' in case they are using an outdated schema
                try {
                    $db->query("SELECT email FROM profiles LIMIT 1");
                } catch (PDOException $ex) {
                    try {
                        $db->exec("ALTER TABLE profiles ADD COLUMN email VARCHAR(255) NULL");
                    } catch (PDOException $ex2) {
                        // ignore
                    }
                }
                try {
                    $db->query("SELECT city FROM profiles LIMIT 1");
                } catch (PDOException $ex) {
                    try {
                        $db->exec("ALTER TABLE profiles ADD COLUMN city VARCHAR(255) NULL");
                    } catch (PDOException $ex2) {
                        // ignore
                    }
                }

                // Check if profile entry exists, if so update it, if not create it
                $stmtCheck = $db->prepare("SELECT COUNT(*) as count FROM profiles WHERE userId = ?");
                $stmtCheck->execute([$userSession['id']]);
                $profileExists = ($stmtCheck->fetch()['count'] > 0);

                if ($profileExists) {
                    // Try to update email on profiles
                    try {
                        $stmt = $db->prepare("UPDATE profiles SET email = ? WHERE userId = ?");
                        $stmt->execute([$username, $userSession['id']]);
                    } catch (PDOException $profilesEx) {
                        // ignore
                    }
                } else {
                    $stmtUser = $db->prepare("SELECT fullName FROM users WHERE id = ? LIMIT 1");
                    $stmtUser->execute([$userSession['id']]);
                    $usrD = $stmtUser->fetch();
                    $fNameLocal = $usrD ? $usrD['fullName'] : 'Super Admin';

                    try {
                        $stmt = $db->prepare("INSERT INTO profiles (userId, email, fullName) VALUES (?, ?, ?)");
                        $stmt->execute([$userSession['id'], $username, $fNameLocal]);
                    } catch (PDOException $profilesEx) {
                        try {
                            $stmt = $db->prepare("INSERT INTO profiles (userId, fullName) VALUES (?, ?)");
                            $stmt->execute([$userSession['id'], $fNameLocal]);
                        } catch (PDOException $insEx) {
                            // ignore
                        }
                    }
                }
            }

            if ($fullName) {
                $stmt = $db->prepare("UPDATE users SET fullName = ? WHERE id = ?");
                $stmt->execute([$fullName, $userSession['id']]);

                // Check if profile entry exists, if so update it, if not create it
                $stmtCheck = $db->prepare("SELECT COUNT(*) as count FROM profiles WHERE userId = ?");
                $stmtCheck->execute([$userSession['id']]);
                $profileExists = ($stmtCheck->fetch()['count'] > 0);

                if ($profileExists) {
                    $stmt = $db->prepare("UPDATE profiles SET fullName = ? WHERE userId = ?");
                    $stmt->execute([$fullName, $userSession['id']]);
                } else {
                    try {
                        $stmt = $db->prepare("INSERT INTO profiles (userId, email, fullName) VALUES (?, '', ?)");
                        $stmt->execute([$userSession['id'], $fullName]);
                    } catch (PDOException $insEx) {
                        try {
                            $stmt = $db->prepare("INSERT INTO profiles (userId, fullName) VALUES (?, ?)");
                            $stmt->execute([$userSession['id'], $fullName]);
                        } catch (PDOException $insEx2) {
                            // ignore
                        }
                    }
                }
            }

            if (!$username && !$fullName) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                respondJSON(400, ["message" => "Harap masukkan username atau fullName!"]);
            }

            $db->commit();
            
            // Log logging
            logUserAction($userSession['id'], $username ?: $userSession['email'], "Admin ganti kredensial login (username/password) sukses.");

            respondJSON(200, ["message" => "Profil administratif sukses diubah. Silakan catat kredensial login baru Anda."]);
        } catch (PDOException $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            respondJSON(500, ["message" => "Kesalahan sistem database saat memperbarui profil admin: " . $e->getMessage()]);
        }
    }

    respondJSON(404, ["message" => "Endpoint API PHP tidak ditemukan."]);
}

// =============================================================
// Helper Functions for Output Rendering
// =============================================================
function outputHTMLFallback($statusCode, $title, $description) {
    http_response_code($statusCode);
    echo "
    <div style='font-family: sans-serif; text-align: center; margin-top: 100px; padding: 20px;'>
        <h1 style='color: #dc2626; font-size: 32px; font-weight: 800;'>" . htmlspecialchars($title) . "</h1>
        <p style='color: #475569; margin-top: 10px; font-size: 16px; max-width: 500px; margin-left: auto; margin-right: auto; line-height: 1.6;'>" . htmlspecialchars($description) . "</p>
        <a href='/' style='display: inline-block; margin-top: 25px; padding: 12px 24px; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; background-color: #dc2626; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);'>Kembali ke Portoify</a>
    </div>";
    exit();
}

function outputDynamicHTMLPage($title, $bodyMarkup) {
    header('Content-Type: text/html; charset=utf-8');
    echo "
    <!DOCTYPE html>
    <html lang='id'>
      <head>
        <meta charset='utf-8'>
        <title>" . htmlspecialchars($title) . "</title>
        <meta name='viewport' content='width=device-width, initial-scale=1'>
        <script src='https://cdn.tailwindcss.com'></script>
        <style>
          .onerror-fallback { background-color: #475569; }
        </style>
      </head>
      <body>
        {$bodyMarkup}
        <script>
          document.querySelectorAll('img').forEach(img => {
            img.addEventListener('error', () => {
              img.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';
            });
          });
        </script>
      </body>
    </html>";
    exit();
}

function getRowAmtCase($row, $key, $default = null) {
    if (!$row || !is_array($row)) return $default;
    $lk = strtolower($key);
    foreach ($row as $k => $v) {
        if (strtolower($k) === $lk) {
            return $v;
        }
    }
    return $default;
}

function saveUploadedFilePHP($userId, $fileType, $originalName, $fileDataUrl) {
    if (empty($fileDataUrl) || strpos($fileDataUrl, 'data:') !== 0) {
        return $fileDataUrl;
    }

    // Clean name and extract extension
    $cleanOrigName = preg_replace('/[^a-zA-Z0-9.-]/', '_', trim($originalName));
    $extension = strtolower(pathinfo($cleanOrigName, PATHINFO_EXTENSION));
    if (empty($extension)) {
        $extension = 'jpg';
    }
    
    $allowedExtensions = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "gif", "svg", "txt"];
    $blacklist = ["php", "phtml", "php5", "sh", "bash", "exe", "js", "ts", "html", "htm", "pl", "py", "asp", "aspx", "jsp", "jar", "htaccess"];
    
    if (in_array($extension, $blacklist) || !in_array($extension, $allowedExtensions)) {
        return "";
    }

    $uploadsDir = __DIR__ . '/uploads';
    if (!file_exists($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }

    try {
        if (preg_match('/^data:([^;]+);base64,(.+)$/', $fileDataUrl, $matches)) {
            $base64Content = $matches[2];
            $buffer = base64_decode($base64Content);
            if ($buffer === false) {
                return $fileDataUrl;
            }
            
            $safeName = $userId . "_" . $fileType . "_" . time() . "." . $extension;
            $destinationPath = $uploadsDir . '/' . $safeName;
            
            file_put_contents($destinationPath, $buffer);
            
            // Return public accessible web path relative to domain root
            return "/api/uploads/" . $safeName;
        }
    } catch (Exception $e) {
        // Fallback
    }

    return $fileDataUrl;
}

function saveDesignImagePHP($fileDataUrl) {
    if (empty($fileDataUrl) || strpos($fileDataUrl, 'data:') !== 0) {
        return $fileDataUrl;
    }

    $extension = 'png';
    if (preg_match('/^data:image\/([a-zA-Z+-]+);base64,/', $fileDataUrl, $expr)) {
        $mimeSub = strtolower($expr[1]);
        if (strpos($mimeSub, 'jpeg') !== false || strpos($mimeSub, 'jpg') !== false) {
            $extension = 'jpg';
        } else if (strpos($mimeSub, 'gif') !== false) {
            $extension = 'gif';
        } else if (strpos($mimeSub, 'svg') !== false) {
            $extension = 'svg';
        }
    }

    $designDir = __DIR__ . '/desain';
    if (!file_exists($designDir)) {
        mkdir($designDir, 0755, true);
    }

    try {
        if (preg_match('/^data:([^;]+);base64,(.+)$/', $fileDataUrl, $matches)) {
            $base64Content = $matches[2];
            $buffer = base64_decode($base64Content);
            if ($buffer === false) {
                return $fileDataUrl;
            }

            // Size check: limit to 1MB (1,048,576 bytes)
            if (strlen($buffer) > 1024 * 1024) {
                return "";
            }

            $safeName = "desain_" . time() . "_" . bin2hex(random_bytes(4)) . "." . $extension;
            $destinationPath = $designDir . '/' . $safeName;

            file_put_contents($destinationPath, $buffer);

            // Return path relative to API route
            return "api/desain/" . $safeName;
        }
    } catch (Exception $e) {
        // Fallback
    }

    return $fileDataUrl;
}

function saveProjectImagePHP($userId, $fileDataUrl) {
    if (empty($fileDataUrl) || strpos($fileDataUrl, 'data:') !== 0) {
        return $fileDataUrl;
    }

    $extension = 'png';
    if (preg_match('/^data:image\/([a-zA-Z+-]+);base64,/', $fileDataUrl, $expr)) {
        $mimeSub = strtolower($expr[1]);
        if (strpos($mimeSub, 'jpeg') !== false || strpos($mimeSub, 'jpg') !== false) {
            $extension = 'jpg';
        } else if (strpos($mimeSub, 'gif') !== false) {
            $extension = 'gif';
        }
    }

    $portfolioDir = __DIR__ . '/portofolio';
    if (!file_exists($portfolioDir)) {
        mkdir($portfolioDir, 0755, true);
    }

    try {
        if (preg_match('/^data:([^;]+);base64,(.+)$/', $fileDataUrl, $matches)) {
            $base64Content = $matches[2];
            $buffer = base64_decode($base64Content);
            if ($buffer === false) {
                return $fileDataUrl;
            }

            // Size check: limit to 1MB (1,048,576 bytes)
            if (strlen($buffer) > 1024 * 1024) {
                return "";
            }

            $safeName = "proj_" . $userId . "_" . time() . "_" . bin2hex(random_bytes(4)) . "." . $extension;
            $destinationPath = $portfolioDir . '/' . $safeName;

            file_put_contents($destinationPath, $buffer);

            // Return path relative to API route
            return "api/portofolio/" . $safeName;
        }
    } catch (Exception $e) {
        // Fallback
    }

    return $fileDataUrl;
}

function saveWordTemplatePHP($htmlMarkup, $templateId) {
    if (empty($htmlMarkup) || strpos($htmlMarkup, 'data:') !== 0) {
        return $htmlMarkup;
    }

    $isDocx = (strpos($htmlMarkup, 'data:application/vnd.openxmlformats-officedocument') !== false) ||
              (strpos($htmlMarkup, 'data:application/octet-stream') !== false) ||
              (strpos($htmlMarkup, 'wordprocessingml') !== false);

    if (!$isDocx) {
        return $htmlMarkup;
    }

    $wordDir = __DIR__ . '/word';
    if (!file_exists($wordDir)) {
        mkdir($wordDir, 0755, true);
    }

    try {
        if (preg_match('/^data:([^;]+);base64,(.+)$/', $htmlMarkup, $matches)) {
            $base64Content = $matches[2];
            $buffer = base64_decode($base64Content);
            if ($buffer === false) {
                return $htmlMarkup;
            }

            $fileName = "word_" . ($templateId ? $templateId : time()) . "_" . bin2hex(random_bytes(4)) . ".docx";
            $destinationPath = $wordDir . '/' . $fileName;

            file_put_contents($destinationPath, $buffer);

            // Return path relative to API root
            return "api/word/" . $fileName;
        }
    } catch (Exception $e) {
        // Fallback
    }

    return $htmlMarkup;
}
?>

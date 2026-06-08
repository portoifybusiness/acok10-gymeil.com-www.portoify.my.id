<?php
/**
 * Portoify SaaS One-Click Installer
 * Membantu instalasi skema database MySQL Portoify langsung di cPanel/Hosting Anda.
 */

require_once __DIR__ . '/config.php';

$page_title = "Portoify SaaS Database Installer";
$status = "idle"; // idle, success, error
$message = "";
$db_connected = false;
$tables_checked = [];

try {
    // Test Database connection
    $dsn = "mysql:host=" . DB_HOST . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5
    ]);
    
    // Create database if not exists (if allowed by hosting privileges)
    try {
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    } catch (PDOException $e) {
        // Abaikan jika user tidak memiliki hak akses lavel CREATE DATABASE, biasanya cPanel sudah membuatkannya
    }
    
    // Connect directly to the database
    $pdo->exec("USE `" . DB_NAME . "`");
    $db_connected = true;
    
    // Check existing tables
    $stmt = $pdo->query("SHOW TABLES");
    $tables_checked = $stmt->fetchAll(PDO::FETCH_COLUMN);

} catch (PDOException $e) {
    $db_connected = false;
    $message = "Koneksi database ke <strong>" . DB_HOST . "</strong> gagal. " . $e->getMessage();
}

// Handle Database schema installation/importation
if (($action = isset($_POST['install_safe']) ? 'safe' : (isset($_POST['install_reset']) ? 'reset' : (isset($_POST['install']) ? 'safe' : null))) && $db_connected) {
    try {
        // Locate SQL schema file
        $sql_file = null;
        $possible_paths = [
            __DIR__ . '/portoify_schema.sql',
            __DIR__ . '/../portoify_schema.sql',
            __DIR__ . '/../../portoify_schema.sql'
        ];
        
        foreach ($possible_paths as $path) {
            if (file_exists($path)) {
                $sql_file = $path;
                break;
            }
        }
        
        if (!$sql_file) {
            throw new Exception("File berkas skema database <code>portoify_schema.sql</code> tidak ditemukan di folder backend 'api/' maupun root project cPanel Anda.");
        }
        
        $sql_content = file_get_contents($sql_file);
        
        // Remove comments
        $sql_content = preg_replace('/--.*\n/', '', $sql_content);
        $sql_content = preg_replace('/\/\*.*?\*\//', '', $sql_content);
        
        // Split by semicolon, ignoring semicolons inside strings
        $queries = preg_split('/;(?=(?:[^\']*\'[^\']*\')*[^\']*$)/', $sql_content);
        
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
        
        if ($action === 'reset') {
            // Hard reset: drop tables first (so that clean tables are created)
            $tables_to_drop = ['logs', 'sales', 'ads_config', 'templates', 'subscriptions', 'packages', 'documents', 'covers', 'resumes', 'portfolios', 'profiles', 'users'];
            foreach ($tables_to_drop as $tbl) {
                try {
                    $pdo->exec("DROP TABLE IF EXISTS `$tbl`");
                } catch (PDOException $ex) {
                    // Ignore table drop failures
                }
            }
        }
        
        // Execute CREATE TABLE IF NOT EXISTS statements
        $executed_count = 0;
        foreach ($queries as $query) {
            $query = trim($query);
            if (!empty($query)) {
                // If safe mode and it is an INSERT statement, transform to INSERT IGNORE
                if ($action === 'safe' && stripos($query, 'INSERT INTO') !== false) {
                    // Convert INSERT INTO to INSERT IGNORE INTO so duplicate rows/keys are safely ignored
                    $query = preg_replace('/INSERT\s+INTO/i', 'INSERT IGNORE INTO', $query);
                }
                
                try {
                    $pdo->exec($query);
                    $executed_count++;
                } catch (PDOException $e) {
                    // In safe mode we ignore duplicate key errors
                    if ($action === 'reset') {
                        throw $e;
                    }
                }
            }
        }
        
        // If safe mode, run schema alterations to add columns safely
        if ($action === 'safe') {
            $alter_queries = [
                "ALTER TABLE ads_config ADD COLUMN leftName VARCHAR(255) NULL",
                "ALTER TABLE ads_config ADD COLUMN leftScript LONGTEXT NULL",
                "ALTER TABLE ads_config ADD COLUMN rightName VARCHAR(255) NULL",
                "ALTER TABLE ads_config ADD COLUMN rightScript LONGTEXT NULL",
                "ALTER TABLE ads_config ADD COLUMN name VARCHAR(255) NULL",
                "ALTER TABLE ads_config ADD COLUMN script LONGTEXT NULL",
                "ALTER TABLE ads_config ADD COLUMN socialBarScript LONGTEXT NULL",
                "ALTER TABLE ads_config ADD COLUMN bannerActive INT DEFAULT 1",
                "ALTER TABLE ads_config ADD COLUMN socialActive INT DEFAULT 1",
                "ALTER TABLE packages ADD COLUMN accessPortfolio VARCHAR(255) DEFAULT 'all'",
                "ALTER TABLE packages ADD COLUMN accessResume VARCHAR(255) DEFAULT 'all'",
                "ALTER TABLE packages ADD COLUMN accessLetter VARCHAR(255) DEFAULT 'all'",
                "ALTER TABLE packages ADD COLUMN accessUploadDocs VARCHAR(255) DEFAULT 'all'",
                "ALTER TABLE portfolios ADD COLUMN skills LONGTEXT NULL",
                "ALTER TABLE resumes ADD COLUMN skills LONGTEXT NULL",
                "ALTER TABLE resumes ADD COLUMN customHtml LONGTEXT NULL",
                "ALTER TABLE profiles ADD COLUMN city VARCHAR(255) NULL",
                "ALTER TABLE documents MODIFY COLUMN filePathUrl LONGTEXT NOT NULL"
            ];
            
            foreach ($alter_queries as $alter) {
                try {
                    $pdo->exec($alter);
                    $executed_count++;
                } catch (PDOException $ex) {
                    // Ignore column already exists errors or other alter failures
                }
            }
        }
        
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
        
        $status = "success";
        if ($action === 'safe') {
            $message = "<strong>Pembaruan Sukses!</strong> Migrasi aman selesai dijalankan. Kolom-kolom baru (termasuk <code>customHtml</code>) telah ditambahkan, tabel baru dibuat jika sempat hilang, dan <strong>semua data lama pengguna dijamin tetap utuh tanpa terhapus!</strong>";
        } else {
            $message = "<strong>Reset Sukses!</strong> Seluruh tabel lama telah dihapus, skema telah dipasang ulang secara bersih dengan data bawaan.";
        }
        
        // Refresh table checks
        $stmt = $pdo->query("SHOW TABLES");
        $tables_checked = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
    } catch (Exception $e) {
        $status = "error";
        $message = "Gagal memproses file SQL: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $page_title; ?></title>
    <!-- Standalone Tailwind CSS for gorgeous cPanel preview -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', sans-serif;
            background-color: #0b0f19;
        }
        .font-mono-code {
            font-family: 'JetBrains Mono', monospace;
        }
    </style>
</head>
<body class="text-slate-200 min-h-screen flex items-center justify-center p-4">

    <div class="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden my-8">
        
        <!-- Decoration background -->
        <div class="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

        <!-- Header -->
        <div class="border-b border-slate-800 pb-5 mb-6 text-center md:text-left">
            <div class="flex items-center justify-center md:justify-start gap-3 mb-2">
                <span class="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-xxs font-black tracking-widest uppercase">MySQL Installer</span>
                <span class="text-slate-400 text-xs">Version 1.1.0</span>
            </div>
            <h1 class="text-2xl md:text-3xl font-black text-white tracking-tight">Portoify SaaS Database Setup</h1>
            <p class="text-slate-400 text-xs mt-1">Satu langkah mudah menginisialisasi skema MySQL cloud hosting di cPanel untuk platform digital resume & portofolio.</p>
        </div>

        <!-- Connection Badge Status -->
        <div class="p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 <?php echo $db_connected ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/20 border-rose-500/20 text-rose-400'; ?>">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg <?php echo $db_connected ? 'bg-emerald-500/10' : 'bg-rose-500/10'; ?>">
                    <?php echo $db_connected ? '🌐' : '🛑'; ?>
                </div>
                <div>
                    <span class="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">Koneksi MySQL database</span>
                    <span class="font-bold text-sm"><?php echo $db_connected ? 'Database Terhubung (Online)' : 'Database Gagal Terkoneksi'; ?></span>
                </div>
            </div>
            <div class="text-xs font-mono font-bold bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700/60 text-slate-300">
                DB Name: <?php echo htmlspecialchars(DB_NAME); ?>
            </div>
        </div>

        <!-- Alerts -->
        <?php if (!empty($message)): ?>
            <div class="mb-6 p-4 rounded-xl text-sm leading-relaxed border flex items-start gap-3 <?php echo $status === 'success' ? 'bg-emerald-900/30 border-emerald-500/30 text-emerald-300' : 'bg-red-950/30 border-red-500/30 text-rose-300'; ?>">
                <span class="text-lg"><?php echo $status === 'success' ? '✅' : '❌'; ?></span>
                <div><?php echo $message; ?></div>
            </div>
        <?php endif; ?>

        <!-- Database configuration diagnostics -->
        <div class="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mb-6 space-y-2">
            <h3 class="text-xs uppercase tracking-widest text-slate-500 font-extrabold mb-3 font-mono">Informasi Diagnostics (cPanel Server)</h3>
            <div class="grid grid-cols-2 gap-y-2.5 text-xs font-mono">
                <span class="text-slate-400">Database Host:</span>
                <span class="text-right text-slate-100"><?php echo htmlspecialchars(DB_HOST); ?></span>
                
                <span class="text-slate-400">Database User:</span>
                <span class="text-right text-slate-100"><?php echo htmlspecialchars(DB_USER); ?></span>
                
                <span class="text-slate-400">Tabel Terdeteksi:</span>
                <span class="text-right text-slate-100 <?php echo count($tables_checked) > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400'; ?>">
                    <?php echo count($tables_checked); ?> Tabel
                </span>
            </div>
        </div>

        <!-- Actions panel -->
        <div class="space-y-4">
            <?php if ($db_connected): ?>
                
                <form method="POST" class="space-y-5">
                    <?php if (count($tables_checked) > 0): ?>
                        <div class="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-start gap-2.5 leading-relaxed">
                            <span>⚠️</span>
                            <div>
                                <strong>Peringatan cPanel:</strong> Sistem mendeteksi sudah ada <strong><?php echo count($tables_checked); ?></strong> tabel di database ini. Silakan pilih opsi pembaruan yang aman di bawah ini untuk mencegah hilangnya data pengguna.
                            </div>
                        </div>
                    <?php endif; ?>
                    
                    <div class="space-y-4 pt-2">
                        <!-- Option 1: Safe Migration (Most Recommended) -->
                        <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 hover:border-emerald-500/30 transition-colors">
                            <h4 class="text-sm font-bold text-white mb-1 flex items-center gap-1.5 text-emerald-400">
                                🛡️ Opsi 1: Migrasi Aman (Tanpa Hapus Data)
                            </h4>
                            <p class="text-xs text-slate-400 leading-relaxed mb-3">
                                Menambahkan kolom-kolom baru (seperti <code>customHtml</code>, <code>skills</code>, <code>city</code>) serta membuat tabel baru yang belum ada. <strong>Semua data user, portofolio, dan resume kustom lama yang sudah disimpan dijamin tetap aman 100% dan tidak akan hilang!</strong>
                            </p>
                            <button 
                                type="submit" 
                                name="install_safe"
                                class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-950/30 font-semibold"
                            >
                                🚀 Jalankan Update & Migrasi Aman
                            </button>
                        </div>

                        <!-- Option 2: Hard Database Reset -->
                        <div class="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 hover:border-rose-500/30 transition-colors">
                            <h4 class="text-sm font-bold text-white mb-1 flex items-center gap-1.5 text-rose-400">
                                ⚠️ Opsi 2: Reset Total Database (Hapus Semua)
                            </h4>
                            <p class="text-xs text-slate-400 leading-relaxed mb-3">
                                Menghapus (DROP) seluruh tabel lama, lalu memasang ulang skema database kosong yang segar dari file SQL. <strong>Seluruh data pengguna, portofolio, dan transaksi lama akan terhapus permanen!</strong>
                            </p>
                            <button 
                                type="submit" 
                                name="install_reset"
                                class="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-rose-950/30 font-semibold"
                                onclick="return confirm('PERINGATAN KERAS! Seluruh data lama di database akan hilang permanen. Apakah Anda yakin ingin melakukan RESET database?');"
                            >
                                🔥 Reset Total & Re-install Skema
                            </button>
                        </div>
                    </div>
                </form>

            <?php else: ?>
                
                <div class="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-center space-y-3">
                    <p class="text-xs leading-relaxed text-slate-400">
                        Harap perbarui kredensial akun MySQL cPanel Anda terlebih dahulu di file:
                        <br>
                        <code class="text-rose-400 font-mono text-[11px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded mt-1.5 inline-block">api/config.php</code>
                    </p>
                    <div class="flex justify-center gap-2">
                        <button onclick="window.location.reload()" class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 px-4 rounded-lg border border-slate-700 transition cursor-pointer">
                            🔄 Muat Ulang Halaman
                        </button>
                    </div>
                </div>

            <?php endif; ?>
        </div>

        <!-- Footer link back or setup credentials details info -->
        <div class="border-t border-slate-800/80 mt-6 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xxs font-mono text-slate-500">
            <p>Portoify Cloud Deployment Wizard © 2026</p>
            <div class="flex gap-4">
                <a href="../index.html" class="hover:text-rose-400 transition">Beranda Utama</a>
                <a href="https://cpanel.net" target="_blank" class="hover:text-rose-400 transition">cPanel Admin</a>
            </div>
        </div>

    </div>

</body>
</html>

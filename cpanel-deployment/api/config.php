<?php
// Configuration & Helpers for Portoify API Backend (PHP-MySQL Version)
// Silakan sesuaikan detail koneksi MySQL di bawah ini sesuai dengan cPanel Anda.

// 1. DATABASE CONFIGURATION
define('DB_HOST', 'localhost');
define('DB_USER', 'portoify_karmad');
define('DB_PASS', 'Karmad123#');
define('DB_NAME', 'portoify_saas');

// 1.5. SECRET KEY PAYMENT GATEWAY PRODUCTION (MIDTRANS)
define('MIDTRANS_MERCHANT_ID', 'M864521769');
define('MIDTRANS_CLIENT_KEY', 'Mid-client-fpwgAjTpW4tzD-dC');
define('MIDTRANS_SERVER_KEY', 'Mid-server-v-h5a0dzlZWeTEh2hMGEkOY5');

// 2. JWT SECURITY KEY
define('JWT_SECRET', 'portoify_secure_secret_hash_2026_auth');

// 3. CORS HEADERS Setup (Memungkinkan client-side React memanggil endpoint)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 4. DATABASE CONNECTION GLOBAL FUCTION
function getDBConnection() {
    static $conn = null;
    if ($conn === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $conn = new PDO($dsn, DB_USER, DB_PASS, array(
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ));
            // Auto migrate customHtml column if missing
            try {
                $conn->exec("ALTER TABLE resumes ADD COLUMN customHtml LONGTEXT NULL");
            } catch (PDOException $e) {
                // Ignore errors if column already exists
            }
        } catch (PDOException $e) {
            respondJSON(500, array(
                "message" => "Gagal terhubung ke database MySQL. Pastikan username, password, dan nama database di 'api/config.php' sudah benar.",
                "error" => $e->getMessage()
            ));
        }
    }
    return $conn;
}

// 5. HELPER: RESPOND WITH JSON FORMAT
function respondJSON($status_code, $data) {
    http_response_code($status_code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit();
}

// 5.5. HELPER: PRUNE OLD LOGS
function pruneDatabaseLogs($db) {
    try {
        // Probabilistic pruning: only run 5% of the time to avoid table locking bottlenecks
        if (rand(1, 100) > 5) {
            return;
        }
        // Only keep the latest 100 logs in the database to prevent storage accumulation
        $db->exec("DELETE FROM logs WHERE id NOT IN (
            SELECT id FROM (
                SELECT id FROM logs ORDER BY timestamp DESC LIMIT 100
            ) tmp
        )");
    } catch (Exception $e) {
        // Silent ignore
    }
}

// 6. HELPER: LOGGER ACTIVITY (Untuk tabel logs)
function logUserAction($userId, $email, $message) {
    try {
        $db = getDBConnection();
        $stmt = $db->prepare("INSERT INTO logs (id, userId, userEmail, message, timestamp) VALUES (?, ?, ?, ?, ?)");
        $id = "log_" . time() . "_" . bin2hex(random_bytes(2));
        $timestamp = date('c'); // ISO-8601 format
        $stmt->execute([$id, $userId, $email, $message, $timestamp]);
        
        // Auto prune to prevent database accumulation
        pruneDatabaseLogs($db);
    } catch (Exception $e) {
        // Abaikan jika penulisan log gagal agar request utama tidak putus
    }
}

// 7. GMAIL SMTP / PHP MAILER CONFIGURATION
define('MAIL_SMTP', true);
define('MAIL_HOST', 'smtp.gmail.com');
define('MAIL_PORT', 587);
define('MAIL_USER', 'portoifybusiness@gmail.com');
define('MAIL_PASS', 'qpzn atfg csov axdn');
define('MAIL_FROM_NAME', 'support-portoify');

/**
 * Sends HTML Email using Gmail SMTP socket client with automatic native mail() fallback.
 * Zero external libraries or heavy composers required for frictionless cPanel deployments!
 */
function send_smtp_mail($to, $subject, $bodyHTML) {
    // Dynamically resolve sender domain from current HTTP host to prevent SPF/spoofing drop inside mail() fallback
    $host_domain = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'portoify.my.id';
    $host_domain = preg_replace('/^www\./i', '', $host_domain);
    // Remove port if present
    $host_domain_parts = explode(':', $host_domain);
    $host_domain = $host_domain_parts[0];
    
    $local_from = "noreply@" . $host_domain;
    $from_name = defined('MAIL_FROM_NAME') ? MAIL_FROM_NAME : 'Portoify Helpdesk';
    
    // Sanitize from_name if it was set to an email address (very common spam trigger!)
    if (filter_var($from_name, FILTER_VALIDATE_EMAIL)) {
        $from_name = 'Portoify Support';
    }

    // Verify if default placeholders are still active (not yet customized by user)
    $has_custom_smtp = (defined('MAIL_SMTP') && MAIL_SMTP && !empty(MAIL_USER) && strpos(MAIL_USER, 'ganti_') !== 0);

    if (!$has_custom_smtp) {
        // Fallback to standard PHP mail() immediately
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=utf-8\r\n";
        $headers .= "From: \"$from_name\" <$local_from>\r\n";
        $headers .= "Reply-To: $local_from\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        return @mail($to, $subject, $bodyHTML, $headers);
    }

    $host = MAIL_HOST;
    $port = MAIL_PORT;
    $user = MAIL_USER;
    $pass = MAIL_PASS;
    $from = MAIL_USER;

    // Dynamically extract the true domain of the authenticated SMTP email for Message-ID alignment
    $mail_user_domain = 'gmail.com';
    if (strpos($user, '@') !== false) {
        $user_parts = explode('@', $user);
        $mail_user_domain = end($user_parts);
    }

    $server = ($port == 465) ? "ssl://$host" : $host;
    
    // Create a robust stream context that disables peer certificate validation.
    // Extremely crucial for cPanel environments which lack built-in / updated SSL CA Cert bundles!
    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ]);

    $socket = @stream_socket_client("$server:$port", $errno, $errstr, 10, STREAM_CLIENT_CONNECT, $context);
    
    if (!$socket) {
        // If SMTP server connection fails (firewall block or DNS error on cpanel),
        // gracefully fallback to standard PHP mail() with local domain to bypass anti-spoof checks
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=utf-8\r\n";
        $headers .= "From: \"$from_name\" <$local_from>\r\n";
        $headers .= "Reply-To: $local_from\r\n";
        $headers .= "X-Fallback-Mailer: PHP/" . phpversion() . "\r\n";
        return @mail($to, $subject, $bodyHTML, $headers);
    }

    // Helper reader
    $read_socket = function($sock) {
        $data = "";
        while ($str = fgets($sock, 515)) {
            $data .= $str;
            if (substr($str, 3, 1) == " ") { break; }
        }
        return $data;
    };

    $read_socket($socket); // Read SMTP Welcome banner

    fwrite($socket, "EHLO $host_domain\r\n");
    $read_socket($socket);

    if ($port == 587) {
        fwrite($socket, "STARTTLS\r\n");
        $read_socket($socket);
        if (!@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            fclose($socket);
            $headers = "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=utf-8\r\n";
            $headers .= "From: \"$from_name\" <$local_from>\r\n";
            return @mail($to, $subject, $bodyHTML, $headers);
        }
        fwrite($socket, "EHLO $host_domain\r\n");
        $read_socket($socket);
    }

    fwrite($socket, "AUTH LOGIN\r\n");
    $read_socket($socket);

    fwrite($socket, base64_encode($user) . "\r\n");
    $read_socket($socket);

    fwrite($socket, base64_encode($pass) . "\r\n");
    $read_socket($socket);

    fwrite($socket, "MAIL FROM: <$from>\r\n");
    $read_socket($socket);

    fwrite($socket, "RCPT TO: <$to>\r\n");
    $read_socket($socket);

    fwrite($socket, "DATA\r\n");
    $read_socket($socket);

    // Write headers and message data
    $headers = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "Content-Transfer-Encoding: 8bit\r\n";
    $headers .= "To: <$to>\r\n";
    $headers .= "From: \"$from_name\" <$from>\r\n";
    $headers .= "Reply-To: <$from>\r\n";
    $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
    $headers .= "Date: " . date('r') . "\r\n";
    $headers .= "Message-ID: <" . time() . "-" . uniqid() . "@$mail_user_domain>\r\n";
    $headers .= "Auto-Submitted: auto-generated\r\n";
    $headers .= "X-Priority: 1 (Highest)\r\n";
    $headers .= "Importance: High\r\n";
    $headers .= "X-Mailer: Portoify-Mailer/1.0\r\n";
    $headers .= "\r\n";

    // Clean body text by double-dotting any starting dots as required by SMTP spec
    $bodyHTML = str_replace("\n.", "\n..", $bodyHTML);

    fwrite($socket, $headers . $bodyHTML . "\r\n.\r\n");
    $read_socket($socket);

    fwrite($socket, "QUIT\r\n");
    $read_socket($socket);

    fclose($socket);
    return true;
}
?>

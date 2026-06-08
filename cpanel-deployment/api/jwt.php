<?php
require_once __DIR__ . '/config.php';

class JWT {
    // Helper function to encode base64url
    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // Helper function to decode base64url
    private static function base64url_decode($data) {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }

    // Sign a payload and return JWT token
    public static function sign($payload) {
        $header = json_encode(array("alg" => "HS256", "typ" => "JWT"));
        $base64Header = self::base64url_encode($header);
        $base64Payload = self::base64url_encode(json_encode($payload));
        
        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", JWT_SECRET, true);
        $base64Signature = self::base64url_encode($signature);
        
        return "$base64Header.$base64Payload.$base64Signature";
    }

    // Verify and decode a JWT token string
    public static function verify($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        list($header, $payload, $signature) = $parts;

        $expectedSignature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
        $base64ExpectedSignature = self::base64url_encode($expectedSignature);

        if ($signature !== $base64ExpectedSignature) {
            return null;
        }

        $decodedPayload = json_decode(self::base64url_decode($payload), true);
        return $decodedPayload;
    }

    // Extract Bearer token from HTTP Authorization Header
    public static function getBearerToken() {
        $headers = getallheaders();
        
        // Normalize Authorization header key (sometimes lowercase/uppercase issues exist)
        $authHeader = null;
        if (is_array($headers)) {
            foreach ($headers as $key => $val) {
                if (strcasecmp($key, 'Authorization') === 0) {
                    $authHeader = $val;
                    break;
                }
            }
        }

        // Fallback for Apache/cPanel CGI/FastCGI environments
        if (!$authHeader) {
            if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
                $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
            } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
                $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
            }
        }

        if (!$authHeader) {
            return null;
        }

        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }

    // Authenticate routing: returns decoded user payload or exits with 401
    public static function authenticate() {
        $token = self::getBearerToken();
        if (!$token) {
            respondJSON(401, array("message" => "Akses Ditolak! Sesi otentikasi tidak ditemukan. Harap login kembali."));
        }

        $decoded = self::verify($token);
        if (!$decoded) {
            respondJSON(401, array("message" => "Akses Ditolak! Sesi Anda berakhir atau tidak valid."));
        }

        return $decoded;
    }

    // Authorize owner checks
    public static function authorizeOwner($loggedInUser, $targetUserId) {
        if ($loggedInUser['role'] === 'admin') {
            return true;
        }
        if ($targetUserId && $loggedInUser['id'] !== $targetUserId) {
            respondJSON(403, array("message" => "Akses ditolak! Anda tidak diizinkan mengakses data dari akun portofolio lain."));
        }
        return true;
    }

    // Authorize admin checks
    public static function authorizeAdmin($loggedInUser) {
        if ($loggedInUser['role'] !== 'admin') {
            respondJSON(403, array("message" => "Akses Terbatas! Halaman ini khusus untuk peran administrator."));
        }
        return true;
    }
}

// Fallback for servers without getallheaders function
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = array();
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}
?>

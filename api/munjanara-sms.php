<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'POST only'], JSON_UNESCAPED_UNICODE);
    exit;
}

$input = json_decode(file_get_contents('php://input') ?: '{}', true);
if (!is_array($input)) {
    $input = $_POST;
}

$userid = getenv('MUNJANARA_USERID') ?: '';
$passwd = getenv('MUNJANARA_PASSWD') ?: '';
$sender = getenv('MUNJANARA_SENDER') ?: '';

// Hosting that cannot set environment variables may put credentials in this
// non-public server file. Never expose these values in browser JavaScript.
$localConfig = __DIR__ . '/munjanara-private.php';
if (is_file($localConfig)) {
    $private = require $localConfig;
    if (is_array($private)) {
        $userid = $private['userid'] ?? $userid;
        $passwd = $private['passwd'] ?? $passwd;
        $sender = $private['sender'] ?? $sender;
    }
}

$receiver = preg_replace('/[^0-9]/', '', (string)($input['to'] ?? '01041220321'));
$message = trim((string)($input['message'] ?? ''));

if ($userid === '' || $passwd === '' || $sender === '') {
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => '문자나라 계정정보가 설정되지 않았습니다.',
        'setup' => 'api/munjanara-private.php 또는 서버 환경변수 MUNJANARA_USERID, MUNJANARA_PASSWD, MUNJANARA_SENDER를 설정하세요.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($receiver === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => '수신번호 또는 문자내용이 없습니다.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sender = preg_replace('/[^0-9]/', '', $sender);
$params = [
    'userid' => $userid,
    'passwd' => $passwd,
    'sender' => $sender,
    'receiver' => $receiver,
    'message' => $message,
    'sender_name' => '중앙부동산',
    'receiver_name' => (string)($input['data']['name'] ?? ''),
    'end_alert' => '1',
    'allow_mms' => '1',
];

$ch = curl_init('https://munjanara.co.kr/send.sys');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($params, '', '&', PHP_QUERY_RFC3986),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 10,
]);

$raw = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($raw === false) {
    http_response_code(502);
    echo json_encode(['ok' => false, 'error' => $curlError], JSON_UNESCAPED_UNICODE);
    exit;
}

$ok = $httpCode >= 200 && $httpCode < 300 && preg_match('/^\s*1\|/', (string)$raw) === 1;
if (!$ok) {
    http_response_code(502);
}

echo json_encode([
    'ok' => $ok,
    'http_code' => $httpCode,
    'munjanara_result' => trim((string)$raw),
], JSON_UNESCAPED_UNICODE);

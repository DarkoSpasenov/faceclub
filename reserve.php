<?php
/**
 * Face Club – Lounge-Reservation
 * Empfängt das Formular, schickt eine E-Mail an den Club, eine Kopie an den Gast
 * (in seiner Sprache) und legt jede Anfrage zusätzlich in data/reservations.csv ab.
 * Getestet mit PHP 8.x auf Infomaniak-Webhosting.
 */

// ===== KONFIGURATION =====
const CLUB_EMAIL  = 'info@faceclub.ch';      // Empfänger der Anfragen
const FROM_EMAIL  = 'noreply@faceclub.ch';   // muss zur Domain gehören (SPF/DKIM)
const CLUB_NAME   = 'Face Club';
const CLUB_PHONE  = '+41 79 208 63 89';
const MIN_SECONDS = 4;                        // Anti-Spam: minimale Ausfüllzeit
const RATE_LIMIT  = 5;                        // max. Anfragen pro IP …
const RATE_WINDOW = 600;                      // … in Sekunden
const CSV_FILE    = __DIR__ . '/data/reservations.csv';
// =========================

date_default_timezone_set('Europe/Zurich');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function out(bool $ok, string $error = '', int $code = 200): void {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') out(false, 'method', 405);

// Nur Anfragen von der eigenen Seite
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$host   = $_SERVER['HTTP_HOST'] ?? '';
$hostOnly = strtolower(preg_replace('/:\d+$/', '', $host));
if ($origin !== '' && strtolower((string) parse_url($origin, PHP_URL_HOST)) !== $hostOnly) out(false, 'origin', 403);

// Honeypot: Bots bekommen "ok", es passiert nichts
if (!empty($_POST['website'])) out(true);

// Ausfüllzeit
$ts = (int) ($_POST['ts'] ?? 0);
if ($ts > 0 && (microtime(true) * 1000 - $ts) < MIN_SECONDS * 1000) out(false, 'too_fast', 429);

// Rate-Limit pro IP
$ipKey = sys_get_temp_dir() . '/fc_rl_' . hash('sha256', $_SERVER['REMOTE_ADDR'] ?? 'x');
$hits  = array_values(array_filter((array) json_decode((string) @file_get_contents($ipKey), true), fn($t) => $t > time() - RATE_WINDOW));
if (count($hits) >= RATE_LIMIT) out(false, 'rate', 429);
$hits[] = time();
@file_put_contents($ipKey, json_encode($hits), LOCK_EX);

function field(string $k, int $max = 200): string {
    $v = trim((string) ($_POST[$k] ?? ''));
    $v = str_replace(["\0"], '', $v);
    return mb_substr($v, 0, $max);
}
function line(string $v): string { return trim(preg_replace('/[\r\n\t]+/', ' ', $v)); }

$lang = in_array($_POST['lang'] ?? 'de', ['de', 'bks', 'en'], true) ? $_POST['lang'] : 'de';
$d = [
    'date'        => line(field('event', 10)),
    'event_title' => line(field('event_title', 150)),
    'table'       => (int) field('table', 3),
    'zone'        => line(field('zone', 40)),
    'min_spend'   => line(field('min_spend', 40)),
    'guests'      => (int) field('guests', 3),
    'arrival'     => line(field('arrival', 5)),
    'name'        => line(field('name', 100)),
    'phone'       => line(field('phone', 30)),
    'email'       => line(field('email', 150)),
    'message'     => str_replace("\r", '', field('message', 1000)),
    'accept'      => !empty($_POST['accept']),
];

// Validierung
$dt = DateTime::createFromFormat('!Y-m-d', $d['date']);
if (!$dt || $dt->format('Y-m-d') !== $d['date'])          out(false, 'date', 422);
if ($dt < new DateTime('today') || $dt > new DateTime('+1 year')) out(false, 'date', 422);
if ($d['table'] < 1 || $d['table'] > 99)                   out(false, 'table', 422);
if ($d['guests'] < 1 || $d['guests'] > 30)                 out(false, 'guests', 422);
if (!preg_match('/^\d{2}:\d{2}$/', $d['arrival']))         $d['arrival'] = '';
if (mb_strlen($d['name']) < 2)                             out(false, 'name', 422);
if (!preg_match('/^[0-9 +().\-\/]{7,25}$/', $d['phone']))  out(false, 'phone', 422);
if (!filter_var($d['email'], FILTER_VALIDATE_EMAIL))       out(false, 'email', 422);
if (!$d['accept'])                                         out(false, 'accept', 422);

$dateCH = $dt->format('d.m.Y');

// Sicherung als CSV (Ordner data/ ist per .htaccess gesperrt)
$csvOk = false;
if (is_dir(dirname(CSV_FILE)) || @mkdir(dirname(CSV_FILE), 0750, true)) {
    $new = !file_exists(CSV_FILE);
    if ($fh = @fopen(CSV_FILE, 'a')) {
        flock($fh, LOCK_EX);
        if ($new) fputcsv($fh, ['eingang', 'datum', 'event', 'lounge', 'zone', 'mindestkonsumation', 'personen', 'ankunft', 'name', 'telefon', 'email', 'sprache', 'nachricht'], ';');
        // Formelzeichen am Anfang neutralisieren (CSV-Injection in Excel)
        $safe = fn($v) => preg_match('/^(=|@|[+\-](?![\d\s]))/', (string) $v) ? "'" . $v : $v;
        fputcsv($fh, array_map($safe, [date('Y-m-d H:i'), $d['date'], $d['event_title'], $d['table'], $d['zone'], $d['min_spend'], $d['guests'], $d['arrival'], $d['name'], $d['phone'], $d['email'], $lang, $d['message']]), ';');
        flock($fh, LOCK_UN); fclose($fh);
        $csvOk = true;
    }
}

function sendMail(string $to, string $subject, string $body, string $replyTo = ''): bool {
    $headers = [
        'From: ' . mb_encode_mimeheader(CLUB_NAME, 'UTF-8') . ' <' . FROM_EMAIL . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];
    if ($replyTo !== '') $headers[] = 'Reply-To: ' . $replyTo;
    return @mail($to, mb_encode_mimeheader($subject, 'UTF-8'), $body, implode("\r\n", $headers), '-f' . FROM_EMAIL);
}

// E-Mail an den Club (immer Deutsch)
$langName = ['de' => 'Deutsch', 'bks' => 'BKS', 'en' => 'Englisch'][$lang];
$clubBody = "Neue Lounge-Anfrage\n"
    . "===================\n\n"
    . "Datum:          {$dateCH}\n"
    . "Event:          {$d['event_title']}\n"
    . "Lounge:         {$d['table']} ({$d['zone']})\n"
    . "Mindestkons.:   {$d['min_spend']}\n"
    . "Personen:       {$d['guests']}\n"
    . "Ankunft ca.:    " . ($d['arrival'] ?: '–') . "\n\n"
    . "Name:           {$d['name']}\n"
    . "Telefon:        {$d['phone']}\n"
    . "E-Mail:         {$d['email']}\n"
    . "Sprache:        {$langName}\n\n"
    . "Wünsche:\n" . ($d['message'] !== '' ? $d['message'] : '–') . "\n\n"
    . "Bitte dem Gast per Telefon oder E-Mail bestätigen (Antworten geht direkt an den Gast).\n"
    . "Eingang: " . date('d.m.Y H:i') . " über faceclub.ch\n";

$okClub = sendMail(CLUB_EMAIL, "Lounge {$d['table']} · {$dateCH} · {$d['name']}", $clubBody, $d['email']);

if (!$okClub && !$csvOk) out(false, 'send', 500);

// Bestätigung an den Gast
$T = [
    'de' => [
        'subj'  => "Deine Anfrage: Lounge %d am %s",
        'hello' => "Hallo %s",
        'intro' => "danke für deine Anfrage. Wir melden uns so schnell wie möglich per Telefon oder E-Mail.",
        'date' => 'Datum', 'event' => 'Event', 'lounge' => 'Lounge', 'guests' => 'Personen', 'arrival' => 'Ankunft ca.', 'min' => 'Mindestkonsumation',
        'note'  => "Wichtig: Die Reservation ist erst gültig, wenn wir sie bestätigt haben.",
        'q'     => "Fragen?",
    ],
    'bks' => [
        'subj'  => "Tvoj upit: separe %d, %s",
        'hello' => "Zdravo %s",
        'intro' => "hvala na upitu. Javićemo ti se što pre telefonom ili e-mailom.",
        'date' => 'Datum', 'event' => 'Događaj', 'lounge' => 'Separe', 'guests' => 'Broj osoba', 'arrival' => 'Dolazak oko', 'min' => 'Minimalna potrošnja',
        'note'  => "Važno: rezervacija važi tek kada je potvrdimo.",
        'q'     => "Pitanja?",
    ],
    'en' => [
        'subj'  => "Your request: lounge %d on %s",
        'hello' => "Hi %s",
        'intro' => "thanks for your request. We'll get back to you by phone or email as soon as possible.",
        'date' => 'Date', 'event' => 'Event', 'lounge' => 'Lounge', 'guests' => 'Guests', 'arrival' => 'Arrival approx.', 'min' => 'Minimum spend',
        'note'  => "Please note: the booking is only valid once we have confirmed it.",
        'q'     => "Questions?",
    ],
][$lang];

$guestBody = sprintf($T['hello'], $d['name']) . ",\n\n" . $T['intro'] . "\n\n"
    . "{$T['date']}: {$dateCH}\n"
    . "{$T['event']}: {$d['event_title']}\n"
    . "{$T['lounge']}: {$d['table']} ({$d['zone']})\n"
    . "{$T['guests']}: {$d['guests']}\n"
    . ($d['arrival'] ? "{$T['arrival']}: {$d['arrival']}\n" : '')
    . "{$T['min']}: {$d['min_spend']}\n\n"
    . $T['note'] . "\n\n"
    . $T['q'] . ' ' . CLUB_PHONE . "\n\n"
    . CLUB_NAME . "\nIndustriestrasse 29, 8305 Dietlikon\nwww.faceclub.ch\n";

sendMail($d['email'], sprintf($T['subj'], $d['table'], $dateCH), $guestBody, CLUB_EMAIL);

out(true);

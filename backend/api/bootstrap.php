<?php
declare(strict_types=1);

/** Ошибка, которая превращается в JSON-ответ с нужным HTTP-статусом. */
final class HttpError extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

function config(): array
{
    static $config = null;
    return $config ??= require __DIR__ . '/config.php';
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config()['db'];
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=%s', $c['host'], $c['port'], $c['name'], $c['charset']);
        $pdo = new PDO($dsn, $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ---------- ответы ----------

function json_out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit;
}

/** Тело запроса. Принимаем только application/json (это же защита от CSRF через формы). */
function read_json(): array
{
    $type = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($type, 'application/json') !== 0) {
        throw new HttpError(415, 'Content-Type must be application/json');
    }
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    try {
        $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        throw new HttpError(400, 'Invalid JSON');
    }
    if (!is_array($data)) {
        throw new HttpError(400, 'JSON object expected');
    }
    return $data;
}

// ---------- валидация ----------

function v_int(mixed $v, string $field, int $min, int $max): int
{
    if (!is_int($v) || $v < $min || $v > $max) {
        throw new HttpError(422, "Field '$field' must be an integer from $min to $max");
    }
    return $v;
}

function v_string(mixed $v, string $field, int $minLen, int $maxLen): string
{
    if (!is_string($v)) {
        throw new HttpError(422, "Field '$field' must be a string");
    }
    $v = trim($v);
    // длина в символах без зависимости от расширения mbstring; false => невалидный UTF-8
    $len = preg_match_all('/./su', $v);
    if ($len === false) {
        throw new HttpError(422, "Field '$field' is not valid UTF-8");
    }
    if ($len < $minLen || $len > $maxLen) {
        throw new HttpError(422, "Field '$field' must be $minLen-$maxLen characters long");
    }
    return $v;
}

/** Необязательный текст: null или пустая строка -> null. */
function v_optional_text(mixed $v, string $field, int $maxLen): ?string
{
    if ($v === null) {
        return null;
    }
    $s = v_string($v, $field, 0, $maxLen);
    return $s === '' ? null : $s;
}

function v_date(mixed $v, string $field): string
{
    if (is_string($v)) {
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $v);
        if ($d !== false && $d->format('Y-m-d') === $v) {
            return $v;
        }
    }
    throw new HttpError(422, "Field '$field' must be a date in YYYY-MM-DD format");
}

/** Целое число из query-строки. */
function q_int(string $name): int
{
    $v = filter_var($_GET[$name] ?? null, FILTER_VALIDATE_INT);
    if ($v === false || $v < 1) {
        throw new HttpError(422, "Query parameter '$name' must be a positive integer");
    }
    return $v;
}

// ---------- сессия / доступ ----------

function start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_name('gradebook_sid');
        session_set_cookie_params([
            'httponly' => true,
            'samesite' => 'Lax',
            'secure'   => !empty($_SERVER['HTTPS']),
        ]);
        session_start();
    }
}

function current_user(): ?array
{
    start_session();
    return $_SESSION['user'] ?? null;
}

/** Требует вход (и, опционально, конкретную роль). Возвращает пользователя из сессии. */
function require_user(?string $role = null): array
{
    $user = current_user();
    if ($user === null) {
        throw new HttpError(401, 'Not authenticated');
    }
    if ($role !== null && $user['role'] !== $role) {
        throw new HttpError(403, 'Forbidden for this role');
    }
    return $user;
}

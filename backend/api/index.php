<?php
declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/handlers/auth.php';
require __DIR__ . '/handlers/classes.php';
require __DIR__ . '/handlers/grades.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// [метод, regexp пути (после /api/), обработчик]
$routes = [
    ['GET',    '#^auth/options$#',             'auth_options'],
    ['POST',   '#^auth/login$#',               'auth_login'],
    ['POST',   '#^auth/logout$#',              'auth_logout'],
    ['GET',    '#^auth/me$#',                  'auth_me'],

    ['GET',    '#^classes$#',                  'classes_list'],
    ['GET',    '#^classes/(\d+)/students$#',   'class_students'],

    ['GET',    '#^subjects$#',                 'subjects_list'],
    ['GET',    '#^gradebook$#',                'gradebook_get'],
    ['PUT',    '#^grades$#',                   'grade_put'],
    ['DELETE', '#^grades/(\d+)$#',             'grade_delete'],
    ['PATCH',  '#^grades/(\d+)/feedback$#',    'grade_feedback'],

    ['GET',    '#^me/grades$#',                'my_grades'],
];

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
    $pos = strpos($path, '/api/');
    $route = $pos === false ? '' : trim(substr($path, $pos + 5), '/');

    $methodMismatch = false;
    foreach ($routes as [$m, $pattern, $handler]) {
        if (!preg_match($pattern, $route, $match)) {
            continue;
        }
        if ($m !== $method) {
            $methodMismatch = true;
            continue;
        }
        array_shift($match);
        $handler(...array_map('intval', $match));
    }
    throw new HttpError($methodMismatch ? 405 : 404, $methodMismatch ? 'Method not allowed' : 'Not found');
} catch (HttpError $e) {
    json_out(['error' => $e->getMessage()], $e->status);
} catch (PDOException $e) {
    error_log('DB error: ' . $e->getMessage());
    json_out(['error' => 'Database error'], 500);
} catch (Throwable $e) {
    error_log('Unhandled: ' . $e->getMessage());
    json_out(['error' => 'Server error'], 500);
}

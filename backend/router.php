<?php
// Роутер для встроенного сервера PHP. Запуск из КОРНЯ проекта:
//   php -S localhost:8000 -t frontend backend/router.php
// /api/*  -> backend/api/index.php,  всё остальное -> статика из frontend/
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/';
if (str_starts_with($path, '/api/')) {
    require __DIR__ . '/api/index.php';
    return true;
}
return false;

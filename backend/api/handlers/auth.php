<?php
declare(strict_types=1);

/** GET /api/auth/options — списки для экрана выбора роли (пароля в дизайне нет). */
function auth_options(): never
{
    $pdo = db();
    $teachers = $pdo->query('SELECT id, full_name FROM teachers ORDER BY full_name')->fetchAll();
    $students = $pdo->query(
        'SELECT s.id, s.full_name, c.name AS class_name
           FROM students s JOIN classes c ON c.id = s.class_id
          ORDER BY c.name, s.full_name'
    )->fetchAll();
    usort($students, fn ($a, $b) => strnatcasecmp($a['class_name'], $b['class_name']) ?: strcmp($a['full_name'], $b['full_name']));
    json_out(['teachers' => $teachers, 'students' => $students]);
}

/** POST /api/auth/login  {role: 'student'|'teacher', id: number} */
function auth_login(): never
{
    $b = read_json();
    $role = $b['role'] ?? null;
    $id = v_int($b['id'] ?? null, 'id', 1, PHP_INT_MAX);

    if ($role === 'teacher') {
        $st = db()->prepare('SELECT id, full_name AS name FROM teachers WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        $user = $row ? ['role' => 'teacher', 'id' => $row['id'], 'name' => $row['name']] : null;
    } elseif ($role === 'student') {
        $st = db()->prepare(
            'SELECT s.id, s.full_name AS name, s.class_id, c.name AS class_name
               FROM students s JOIN classes c ON c.id = s.class_id WHERE s.id = ?'
        );
        $st->execute([$id]);
        $row = $st->fetch();
        $user = $row ? [
            'role' => 'student', 'id' => $row['id'], 'name' => $row['name'],
            'class_id' => $row['class_id'], 'class_name' => $row['class_name'],
        ] : null;
    } else {
        throw new HttpError(422, "Field 'role' must be 'student' or 'teacher'");
    }

    if ($user === null) {
        throw new HttpError(404, 'User not found');
    }

    start_session();
    session_regenerate_id(true);
    $_SESSION['user'] = $user;
    json_out($user);
}

/** POST /api/auth/logout */
function auth_logout(): never
{
    read_json();
    start_session();
    $_SESSION = [];
    session_destroy();
    json_out(['ok' => true]);
}

/** GET /api/auth/me */
function auth_me(): never
{
    json_out(require_user());
}

<?php
declare(strict_types=1);

/** GET /api/classes — все классы (для выбора учителем). */
function classes_list(): never
{
    require_user('teacher');
    $rows = db()->query(
        'SELECT c.id, c.name, COUNT(s.id) AS students_count
           FROM classes c LEFT JOIN students s ON s.class_id = c.id
          GROUP BY c.id, c.name'
    )->fetchAll();
    usort($rows, fn ($a, $b) => strnatcasecmp($a['name'], $b['name']));
    json_out($rows);
}

function find_class(int $id): array
{
    $st = db()->prepare('SELECT id, name FROM classes WHERE id = ?');
    $st->execute([$id]);
    $class = $st->fetch();
    if (!$class) {
        throw new HttpError(404, 'Class not found');
    }
    return $class;
}

function students_of(int $classId): array
{
    $st = db()->prepare('SELECT id, full_name FROM students WHERE class_id = ? ORDER BY full_name');
    $st->execute([$classId]);
    return $st->fetchAll();
}

/** GET /api/classes/{id}/students */
function class_students(int $id): never
{
    require_user('teacher');
    json_out(['class' => find_class($id), 'students' => students_of($id)]);
}

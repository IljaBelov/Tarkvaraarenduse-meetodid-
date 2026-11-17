<?php
declare(strict_types=1);

const GRADE_COLS = 'g.id, g.student_id, g.class_id, g.teacher_id, g.subject, g.grade, g.lesson_date,
                    g.graded_at, g.teacher_comment, g.student_comment, g.student_rating';

/** GET /api/subjects — предметы, по которым уже есть оценки (подсказки для поля ввода). */
function subjects_list(): never
{
    require_user('teacher');
    $rows = db()->query('SELECT DISTINCT subject FROM grades ORDER BY subject')->fetchAll(PDO::FETCH_COLUMN);
    json_out($rows);
}

/** GET /api/gradebook?class_id=1&subject=Математика — таблица класса по предмету. */
function gradebook_get(): never
{
    require_user('teacher');
    $classId = q_int('class_id');
    $subject = v_string($_GET['subject'] ?? null, 'subject', 1, 100);

    $class = find_class($classId);
    $students = students_of($classId);

    $st = db()->prepare(
        'SELECT ' . GRADE_COLS . ' FROM grades g
          WHERE g.class_id = ? AND g.subject = ?
          ORDER BY g.lesson_date, g.id'
    );
    $st->execute([$classId, $subject]);
    $grades = $st->fetchAll();
    $dates = array_values(array_unique(array_column($grades, 'lesson_date')));

    json_out([
        'class'    => $class,
        'subject'  => $subject,
        'students' => $students,
        'dates'    => $dates,
        'grades'   => $grades,
    ]);
}

/**
 * PUT /api/grades — поставить или изменить оценку (одна клетка = ученик+предмет+дата урока).
 * Комментарий и звёзды ученика при переоценке НЕ затрагиваются.
 */
function grade_put(): never
{
    $teacher = require_user('teacher');
    $b = read_json();

    $studentId  = v_int($b['student_id'] ?? null, 'student_id', 1, PHP_INT_MAX);
    $subject    = v_string($b['subject'] ?? null, 'subject', 1, 100);
    $lessonDate = v_date($b['lesson_date'] ?? null, 'lesson_date');
    $grade      = v_int($b['grade'] ?? null, 'grade', 0, 5);
    $comment    = v_optional_text($b['teacher_comment'] ?? null, 'teacher_comment', 2000);

    $pdo = db();
    $st = $pdo->prepare('SELECT class_id FROM students WHERE id = ?');
    $st->execute([$studentId]);
    $classId = $st->fetchColumn();
    if ($classId === false) {
        throw new HttpError(404, 'Student not found');
    }

    $pdo->prepare(
        'INSERT INTO grades (student_id, class_id, teacher_id, subject, grade, lesson_date, teacher_comment)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            class_id        = VALUES(class_id),
            teacher_id      = VALUES(teacher_id),
            grade           = VALUES(grade),
            teacher_comment = VALUES(teacher_comment),
            graded_at       = CURRENT_TIMESTAMP'
    )->execute([$studentId, $classId, $teacher['id'], $subject, $grade, $lessonDate, $comment]);

    $st = $pdo->prepare(
        'SELECT ' . GRADE_COLS . ' FROM grades g WHERE g.student_id = ? AND g.subject = ? AND g.lesson_date = ?'
    );
    $st->execute([$studentId, $subject, $lessonDate]);
    json_out($st->fetch());
}

/** DELETE /api/grades/{id} */
function grade_delete(int $id): never
{
    require_user('teacher');
    $st = db()->prepare('DELETE FROM grades WHERE id = ?');
    $st->execute([$id]);
    if ($st->rowCount() === 0) {
        throw new HttpError(404, 'Grade not found');
    }
    json_out(['deleted' => true]);
}

function fetch_feed_grade(int $id, int $studentId): ?array
{
    $st = db()->prepare(
        'SELECT ' . GRADE_COLS . ', t.full_name AS teacher_name
           FROM grades g JOIN teachers t ON t.id = g.teacher_id
          WHERE g.id = ? AND g.student_id = ?'
    );
    $st->execute([$id, $studentId]);
    return $st->fetch() ?: null;
}

/** GET /api/me/grades — лента оценок текущего ученика. */
function my_grades(): never
{
    $user = require_user('student');
    $st = db()->prepare(
        'SELECT ' . GRADE_COLS . ', t.full_name AS teacher_name
           FROM grades g JOIN teachers t ON t.id = g.teacher_id
          WHERE g.student_id = ?
          ORDER BY g.lesson_date DESC, g.id DESC'
    );
    $st->execute([$user['id']]);
    json_out($st->fetchAll());
}

/**
 * PATCH /api/grades/{id}/feedback — ученик оставляет комментарий и/или ставит 1–5 звёзд
 * СВОЕЙ оценке. Передавать можно любое из полей; null очищает поле.
 */
function grade_feedback(int $id): never
{
    $user = require_user('student');
    $b = read_json();

    $sets = [];
    $args = [];
    if (array_key_exists('student_comment', $b)) {
        $sets[] = 'student_comment = ?';
        $args[] = v_optional_text($b['student_comment'], 'student_comment', 2000);
    }
    if (array_key_exists('student_rating', $b)) {
        $sets[] = 'student_rating = ?';
        $args[] = $b['student_rating'] === null ? null : v_int($b['student_rating'], 'student_rating', 1, 5);
    }
    if (!$sets) {
        throw new HttpError(422, 'Provide student_comment and/or student_rating');
    }

    // чужие оценки менять нельзя: условие student_id в WHERE
    $args[] = $id;
    $args[] = $user['id'];
    db()->prepare('UPDATE grades SET ' . implode(', ', $sets) . ' WHERE id = ? AND student_id = ?')->execute($args);

    $row = fetch_feed_grade($id, $user['id']);
    if ($row === null) {
        throw new HttpError(404, 'Grade not found');
    }
    json_out($row);
}

-- Тестовые данные. Запуск:  mysql -u root -p gradebook < db/seed.sql
SET NAMES utf8mb4;
USE gradebook;

INSERT INTO classes (name) VALUES ('9-А'), ('9-Б'), ('10-А');

INSERT INTO teachers (full_name) VALUES
  ('Волкова Наталья Петровна'),
  ('Смирнов Евгений Андреевич');

INSERT INTO students (full_name, class_id) VALUES
  ('Ковалёва Анна',    1), ('Титов Борис',     1), ('Юдина Вера',     1),
  ('Орлов Глеб',       1), ('Смирнова Дарья',  1), ('Фомин Егор',     1),
  ('Крылова Евгения',  2), ('Соколов Иван',    2), ('Морозова Екатерина', 2),
  ('Дорохов Лев',      2), ('Белова Мария',    2),
  ('Гусев Никита',     3), ('Никитина Ольга',  3), ('Волков Павел',   3);

INSERT INTO grades
  (student_id, class_id, teacher_id, subject, grade, lesson_date, teacher_comment, student_comment, student_rating)
VALUES
  (1, 1, 1, 'Математика', 5, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'Отличная контрольная!',               'Спасибо, старался', 5),
  (1, 1, 1, 'Математика', 4, DATE_SUB(CURDATE(), INTERVAL 7 DAY),  'Проверь оформление задач.',            NULL,               NULL),
  (1, 1, 2, 'Литература', 3, DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'Добавь аргументов в заключение.',      'Согласен, доработаю', 3),
  (2, 1, 1, 'Математика', 3, DATE_SUB(CURDATE(), INTERVAL 14 DAY), 'Не хватает последнего примера.',       NULL,               NULL),
  (3, 1, 1, 'Математика', 5, DATE_SUB(CURDATE(), INTERVAL 7 DAY),  NULL,                                   NULL,               NULL),
  (7, 2, 1, 'Математика', 4, DATE_SUB(CURDATE(), INTERVAL 7 DAY),  'Хорошо.',                              NULL,               NULL);

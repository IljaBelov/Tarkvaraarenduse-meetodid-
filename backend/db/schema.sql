-- ============================================================
--  Классный журнал — схема БД (MySQL 8 / MariaDB 10.5+)
--  Запуск:  mysql -u root -p < db/schema.sql
-- ============================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS gradebook
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE gradebook;

-- ---------- Справочники ----------

CREATE TABLE IF NOT EXISTS classes (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50)  NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_classes_name (name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS teachers (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(150) NOT NULL,
  class_id  INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_students_class (class_id),
  CONSTRAINT fk_students_class
    FOREIGN KEY (class_id) REFERENCES classes (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------- Универсальная таблица оценок ----------
-- Одна строка = одна оценка ученика по предмету за конкретный урок.

CREATE TABLE IF NOT EXISTS grades (
  id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,

  student_id      INT UNSIGNED     NOT NULL,                       -- id ученика
  class_id        INT UNSIGNED     NOT NULL,                       -- класс ученика на момент выставления
  teacher_id      INT UNSIGNED     NOT NULL,                       -- кто поставил
  subject         VARCHAR(100)     NOT NULL,                       -- предмет

  grade           TINYINT UNSIGNED NOT NULL,                       -- оценка 0..5
  lesson_date     DATE             NOT NULL,                       -- ЗА какую дату поставлена оценка
  graded_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP, -- КОГДА поставлена (обновляется при переоценке)

  teacher_comment TEXT             NULL,                           -- комментарий учителя
  student_comment TEXT             NULL,                           -- комментарий ученика
  student_rating  TINYINT UNSIGNED NULL,                           -- оценка оценки учеником, 1..5 звёзд

  PRIMARY KEY (id),

  -- одна клетка журнала: ученик + предмет + дата урока
  UNIQUE KEY uq_grade_cell (student_id, subject, lesson_date),
  KEY idx_grades_class_subject (class_id, subject, lesson_date),
  KEY idx_grades_student_date  (student_id, lesson_date),

  CONSTRAINT chk_grade_range  CHECK (grade BETWEEN 0 AND 5),
  CONSTRAINT chk_rating_range CHECK (student_rating IS NULL OR student_rating BETWEEN 1 AND 5),

  CONSTRAINT fk_grades_student FOREIGN KEY (student_id) REFERENCES students (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_grades_class   FOREIGN KEY (class_id)   REFERENCES classes  (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_grades_teacher FOREIGN KEY (teacher_id) REFERENCES teachers (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

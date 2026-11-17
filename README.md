# Классный журнал — бэкенд (PHP + MySQL + TypeScript)

## Структура проекта

```
projekt/
├─ designe.png            макет
├─ README.md
├─ backend/
│  ├─ router.php          роутер для `php -S`
│  ├─ db/
│  │  ├─ schema.sql       схема БД (4 таблицы)
│  │  └─ seed.sql         тестовые данные
│  └─ api/                PHP REST API
│     ├─ index.php          роутер запросов
│     ├─ bootstrap.php      PDO, сессии, валидация, ошибки
│     ├─ config.php         настройки БД (через переменные окружения)
│     └─ handlers/          auth.php · classes.php · grades.php
└─ frontend/
   ├─ index.html          редирект на role.html
   ├─ role.html · groups.html · grades.html · student.html
   ├─ design-board.html   статичный макет-доска (для справки)
   ├─ style.css
   ├─ src/                TypeScript (исходники)
   ├─ js/                 скомпилированный JS (уже собран)
   ├─ package.json
   └─ tsconfig.json
```

## Запуск

Нужно: **PHP 8.1+** (с `pdo_mysql`), **MySQL 8 / MariaDB 10.5+**, Node.js (только если правишь TS).

```bash
# 1. База (из корня проекта)
mysql -u root -p < backend/db/schema.sql
mysql -u root -p < backend/db/seed.sql          # тестовые данные (необязательно)

# отдельный пользователь вместо root:
mysql -u root -p -e "CREATE USER 'root'@'localhost' IDENTIFIED BY 'MySQL1234';
                     GRANT ALL ON root.* TO 'root'@'localhost';"

# 2. Сервер (тоже из корня проекта): статика из frontend/, /api/* -> backend/api
DB_USER=root DB_PASS=MySQL1234 php -S localhost:8000 -t frontend backend/router.php

# 3. Открыть http://localhost:8000
```

Windows (PowerShell):

```powershell
$env:DB_USER="root"; $env:DB_PASS="MySQL1234"
php -S localhost:8000 -t frontend backend/router.php
```

Переменные окружения: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`.
Страницы нужно открывать **через сервер**, а не двойным кликом по файлу (ES-модули + cookie-сессия).
Фронт ходит в API по относительному пути `api/…`, поэтому фронт и API должны отдаваться с одного адреса.

Правка TypeScript (в папке `frontend/`): `npm install`, затем `npm run build` (или `npm run watch`) — результат кладётся в `frontend/js/`.

### Apache вместо `php -S` (не проверялось)

```apache
DocumentRoot /путь/к/проекту/frontend
Alias /api /путь/к/проекту/backend/api
<Directory /путь/к/проекту/backend/api>
    FallbackResource /api/index.php
    Require all granted
</Directory>
```

## Универсальная таблица `grades`

Одна строка = одна оценка ученика по предмету за конкретный урок.

| поле | тип | что это |
|---|---|---|
| `id` | BIGINT | |
| `student_id` | INT FK | id ученика |
| `class_id` | INT FK | его класс **на момент выставления** |
| `teacher_id` | INT FK | кто поставил |
| `subject` | VARCHAR(100) | предмет |
| `grade` | TINYINT 0–5 | оценка (CHECK) |
| `lesson_date` | DATE | **за какую** дату оценка |
| `graded_at` | DATETIME | **когда** выставлена (обновляется при переоценке) |
| `teacher_comment` | TEXT NULL | комментарий учителя |
| `student_comment` | TEXT NULL | комментарий ученика |
| `student_rating` | TINYINT 1–5 NULL | оценка оценки учеником, звёзды (CHECK) |

`UNIQUE (student_id, subject, lesson_date)` — это «клетка журнала»: повторное выставление
в ту же клетку обновляет строку, а не плодит дубли. Комментарий и звёзды ученика при
переоценке учителем **сохраняются**.
Справочники: `classes`, `students` (→ `classes`), `teachers`.

## API

Все ответы — JSON, ошибки — `{"error": "..."}`. Запись только с `Content-Type: application/json`.

| метод | путь | роль | что делает |
|---|---|---|---|
| GET | `/api/auth/options` | — | списки учителей и учеников для экрана выбора роли |
| POST | `/api/auth/login` `{role,id}` | — | вход (PHP-сессия) |
| POST | `/api/auth/logout` | любая | выход |
| GET | `/api/auth/me` | любая | текущий пользователь |
| GET | `/api/classes` | учитель | список классов |
| GET | `/api/classes/{id}/students` | учитель | ученики класса |
| GET | `/api/subjects` | учитель | предметы, по которым уже есть оценки |
| GET | `/api/gradebook?class_id=&subject=` | учитель | таблица: ученики + даты + оценки |
| PUT | `/api/grades` `{student_id,subject,lesson_date,grade,teacher_comment}` | учитель | поставить / изменить оценку |
| DELETE | `/api/grades/{id}` | учитель | удалить оценку |
| GET | `/api/me/grades` | ученик | лента своих оценок |
| PATCH | `/api/grades/{id}/feedback` `{student_comment?,student_rating?}` | ученик | комментарий и 1–5 звёзд **своей** оценке (`null` — очистить) |

## Что стоит знать

- **Пароля нет** — в дизайне его не было, поэтому вход = выбор себя из списка. Права проверяются на
  сервере (ученик не может ставить оценки и менять чужие), но подменить личность может кто угодно.
  Для реального использования добавь `password_hash` в `students`/`teachers` и проверку в `auth_login`.
- Любой учитель может ставить оценки любому классу и по любому предмету (таблицы «учитель ↔ класс/предмет» нет).
- Классы, учеников и учителей пока добавляют через SQL (в дизайне нет экрана администратора).
- Предмет вводится текстом (подсказки из уже существующих); отдельной таблицы предметов нет — как ты и описал.
- Все запросы — подготовленные (PDO), весь пользовательский текст в DOM вставляется через `textContent`.

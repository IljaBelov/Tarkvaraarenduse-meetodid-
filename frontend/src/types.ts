// Типы, зеркалящие ответы PHP API.

export type Role = 'student' | 'teacher';

export interface User {
  role: Role;
  id: number;
  name: string;
  class_id?: number;
  class_name?: string;
}

export interface LoginOptions {
  teachers: { id: number; full_name: string }[];
  students: { id: number; full_name: string; class_name: string }[];
}

export interface ClassInfo {
  id: number;
  name: string;
  students_count: number;
}

export interface Student {
  id: number;
  full_name: string;
}

/** Строка универсальной таблицы grades. Даты — строки 'YYYY-MM-DD' / 'YYYY-MM-DD HH:MM:SS'. */
export interface Grade {
  id: number;
  student_id: number;
  class_id: number;
  teacher_id: number;
  subject: string;
  grade: number; // 0..5
  lesson_date: string; // за какую дату
  graded_at: string; // когда выставлена
  teacher_comment: string | null;
  student_comment: string | null;
  student_rating: number | null; // 1..5 звёзд
}

/** Оценка в ленте ученика (+ имя учителя). */
export interface FeedGrade extends Grade {
  teacher_name: string;
}

export interface Gradebook {
  class: { id: number; name: string };
  subject: string;
  students: Student[];
  dates: string[];
  grades: Grade[];
}

export interface SaveGradeInput {
  student_id: number;
  subject: string;
  lesson_date: string;
  grade: number;
  teacher_comment: string | null;
}

export interface Feedback {
  student_comment?: string | null;
  student_rating?: number | null;
}

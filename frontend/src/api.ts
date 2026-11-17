import type {
  ClassInfo, Feedback, FeedGrade, Grade, Gradebook, LoginOptions, Role, SaveGradeInput, Student, User,
} from './types.js';

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

// Относительный путь: работает и в корне сайта, и в подпапке.
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const hasBody = body !== undefined;
  const res = await fetch(`api/${path}`, {
    method,
    credentials: 'same-origin',
    headers: hasBody ? { 'Content-Type': 'application/json' } : {},
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      /* не JSON — упадём ниже по статусу */
    }
  }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Ошибка сервера (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  // --- авторизация ---
  options: () => request<LoginOptions>('GET', 'auth/options'),
  login: (role: Role, id: number) => request<User>('POST', 'auth/login', { role, id }),
  logout: () => request<{ ok: true }>('POST', 'auth/logout', {}),
  me: () => request<User>('GET', 'auth/me'),

  // --- учитель ---
  classes: () => request<ClassInfo[]>('GET', 'classes'),
  classStudents: (classId: number) =>
    request<{ class: { id: number; name: string }; students: Student[] }>('GET', `classes/${classId}/students`),
  subjects: () => request<string[]>('GET', 'subjects'),
  gradebook: (classId: number, subject: string) =>
    request<Gradebook>('GET', `gradebook?class_id=${classId}&subject=${encodeURIComponent(subject)}`),
  saveGrade: (input: SaveGradeInput) => request<Grade>('PUT', 'grades', input),
  deleteGrade: (id: number) => request<{ deleted: true }>('DELETE', `grades/${id}`),

  // --- ученик ---
  myGrades: () => request<FeedGrade[]>('GET', 'me/grades'),
  sendFeedback: (gradeId: number, fb: Feedback) =>
    request<FeedGrade>('PATCH', `grades/${gradeId}/feedback`, fb),
};

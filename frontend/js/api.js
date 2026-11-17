export class ApiError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
// Относительный путь: работает и в корне сайта, и в подпапке.
async function request(method, path, body) {
    const hasBody = body !== undefined;
    const res = await fetch(`api/${path}`, {
        method,
        credentials: 'same-origin',
        headers: hasBody ? { 'Content-Type': 'application/json' } : {},
        body: hasBody ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        }
        catch {
            /* не JSON — упадём ниже по статусу */
        }
    }
    if (!res.ok) {
        const msg = data?.error ?? `Ошибка сервера (${res.status})`;
        throw new ApiError(res.status, msg);
    }
    return data;
}
export const api = {
    // --- авторизация ---
    options: () => request('GET', 'auth/options'),
    login: (role, id) => request('POST', 'auth/login', { role, id }),
    logout: () => request('POST', 'auth/logout', {}),
    me: () => request('GET', 'auth/me'),
    // --- учитель ---
    classes: () => request('GET', 'classes'),
    classStudents: (classId) => request('GET', `classes/${classId}/students`),
    subjects: () => request('GET', 'subjects'),
    gradebook: (classId, subject) => request('GET', `gradebook?class_id=${classId}&subject=${encodeURIComponent(subject)}`),
    saveGrade: (input) => request('PUT', 'grades', input),
    deleteGrade: (id) => request('DELETE', `grades/${id}`),
    // --- ученик ---
    myGrades: () => request('GET', 'me/grades'),
    sendFeedback: (gradeId, fb) => request('PATCH', `grades/${gradeId}/feedback`, fb),
};

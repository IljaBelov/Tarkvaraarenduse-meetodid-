import { api, ApiError } from './api.js';
import type { Role, User } from './types.js';

/** querySelector, который падает с понятной ошибкой, если элемента нет в HTML. */
export function $<T extends HTMLElement = HTMLElement>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Не найден элемент ${selector}`);
  return el;
}

/** Создать элемент. Текст ставится через textContent — XSS-безопасно. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

/** '2026-10-21' -> '21.10' (без Date, чтобы не словить сдвиг часового пояса). */
export function fmtDate(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
}

export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let toastTimer: number | undefined;
export function toast(message: string, isError = false): void {
  let el = document.getElementById('toast');
  if (!el) {
    el = h('div', 'toast');
    el.id = 'toast';
    document.body.append(el);
  }
  el.textContent = message;
  el.classList.toggle('toast-error', isError);
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el?.classList.remove('show'), 2500);
}

/** Единая реакция на ошибку API: 401 -> на экран выбора роли, остальное -> тост. */
export function reportError(e: unknown): void {
  if (e instanceof ApiError && e.status === 401) {
    location.href = 'role.html';
    return;
  }
  console.error(e);
  toast(e instanceof Error ? e.message : 'Что-то пошло не так', true);
}

/** Пускает на страницу только нужную роль, иначе отправляет на role.html. */
export async function requireRole(role: Role): Promise<User> {
  try {
    const user = await api.me();
    if (user.role === role) return user;
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401)) throw e;
  }
  location.href = 'role.html';
  return new Promise<User>(() => {}); // страница уходит, дальше код не идёт
}

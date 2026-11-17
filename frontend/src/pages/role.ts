import { api } from '../api.js';
import { $, h, reportError, toast } from '../common.js';
import type { Role } from '../types.js';

async function login(role: Role, select: HTMLSelectElement): Promise<void> {
  const id = Number(select.value);
  if (!id) {
    toast('Выберите себя в списке', true);
    return;
  }
  try {
    await api.login(role, id);
    location.href = role === 'teacher' ? 'groups.html' : 'student.html';
  } catch (e) {
    reportError(e);
  }
}

async function main(): Promise<void> {
  const teacherSelect = $<HTMLSelectElement>('#teacherSelect');
  const studentSelect = $<HTMLSelectElement>('#studentSelect');

  try {
    const opts = await api.options();

    for (const t of opts.teachers) {
      const o = h('option', '', t.full_name);
      o.value = String(t.id);
      teacherSelect.append(o);
    }

    // ученики сгруппированы по классам
    const groups = new Map<string, HTMLOptGroupElement>();
    for (const s of opts.students) {
      let g = groups.get(s.class_name);
      if (!g) {
        g = h('optgroup');
        g.label = s.class_name;
        groups.set(s.class_name, g);
        studentSelect.append(g);
      }
      const o = h('option', '', s.full_name);
      o.value = String(s.id);
      g.append(o);
    }
  } catch (e) {
    reportError(e);
  }

  $('#teacherLogin').addEventListener('click', () => void login('teacher', teacherSelect));
  $('#studentLogin').addEventListener('click', () => void login('student', studentSelect));
}

void main();

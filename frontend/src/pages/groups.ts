import { api } from '../api.js';
import { $, h, reportError, requireRole } from '../common.js';

async function main(): Promise<void> {
  await requireRole('teacher');
  const grid = $('#groupsGrid');

  try {
    const classes = await api.classes();
    grid.replaceChildren();
    if (classes.length === 0) {
      grid.append(h('p', 'empty', 'Классов пока нет'));
      return;
    }
    for (const c of classes) {
      const a = h('a', 'grupe', c.name);
      a.href = `grades.html?class_id=${c.id}`;
      a.title = `Учеников: ${c.students_count}`;
      grid.append(a);
    }
  } catch (e) {
    reportError(e);
  }
}

void main();

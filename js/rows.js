// One assignment row: check circle (toggles done) + title/class/time, tapping the text opens it in Classroom.
import { h, icon, tick } from './ui.js';
import { isDone, dayLabel, isoDay } from './dates.js';
import { subjectIcon } from './fx.js';

// 'in 45 min' / 'in 3 hr' for work due later today that isn't done yet.
export function dueSoon(a, now = Date.now()) {
  const ms = Date.parse(a.dueAt) - now;
  if (!(ms > 0) || a.due !== isoDay(new Date(now))) return '';
  const m = Math.round(ms / 6e4);
  return m < 60 ? `in ${Math.max(1, m)} min` : `in ${Math.round(m / 60)} hr`;
}

export function assignmentRow(a, ctx, { showDay = false, onToggle } = {}) {
  const done = isDone(a, ctx.state.done);
  const row = h('div', { class: `row plan-row dd-row${done ? ' done' : ''}`, dataset: { id: a.id } });
  const check = h('button', {
    class: 'pcheck', type: 'button', role: 'checkbox', 'aria-checked': String(done),
    'aria-label': `${done ? 'Mark not done' : 'Mark done'}: ${a.title}`,
    onclick() {
      const now = !isDone(a, ctx.state.done);
      const classroomSays = a.state === 'TURNED_IN' || a.state === 'RETURNED';
      // Store only when it differs from Classroom, so Classroom stays the source of truth.
      if (now === classroomSays) delete ctx.state.done[a.id]; else ctx.state.done[a.id] = now;
      ctx.save();
      tick();
      row.classList.toggle('done', now);
      check.setAttribute('aria-checked', String(now));
      check.setAttribute('aria-label', `${now ? 'Mark not done' : 'Mark done'}: ${a.title}`);
      if (onToggle) onToggle(now, check);
    },
  }, icon('check'));

  const when = [showDay ? dayLabel(a.due) : null, a.time || null].filter(Boolean).join(' · ');
  const meta = [a.course, when].filter(Boolean).join(' · ');
  const text = h('div', { class: 't' }, a.title, h('small', null, meta));
  const status = a.state === 'RETURNED' ? h('span', { class: 'tag' }, 'Graded')
    : a.state === 'TURNED_IN' ? h('span', { class: 'tag good' }, 'Turned in')
    : a.late ? h('span', { class: 'tag bad' }, 'Late')
    : !done && dueSoon(a) && Date.parse(a.dueAt) - Date.now() < 6 * 36e5 ? h('span', { class: 'tag hot' }, dueSoon(a)) : null;

  const body = a.link
    ? h('a', { class: 'dd-open', href: a.link, target: '_blank', rel: 'noopener', 'aria-label': `${a.title}, open in Classroom` }, text, status, subjectIcon(a.course))
    : h('div', { class: 'dd-open' }, text, status, subjectIcon(a.course));
  row.append(check, body);
  return row;
}

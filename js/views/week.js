// Week (#/week?w=YYYY-MM-DD): Monday–Sunday, one box per day. Arrows move a week at a time.
import { h, icon, box } from '../ui.js';
import { isoDay, weekStart, weekDays, addDays, shortDate, dayLabel, isDone } from '../dates.js';
import { assignmentRow } from '../rows.js';
import { subjectOf } from '../fx.js';

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function render(el, params, ctx) {
  const today = isoDay();
  const start = /^\d{4}-\d{2}-\d{2}$/.test(params.w || '') ? weekStart(params.w) : weekStart(today);
  const days = weekDays(ctx.state.cache.assignments, start);
  const thisWeek = start === weekStart(today);
  const left = days.reduce((n, d) => n + d.items.filter(a => !isDone(a, ctx.state.done)).length, 0);

  const nav = h('div', { class: 'dd-weeknav' },
    h('a', { class: 'icon-btn', href: `#/week?w=${addDays(start, -7)}`, 'aria-label': 'Previous week' }, icon('back')),
    h('a', { class: 'icon-btn dd-flip', href: `#/week?w=${addDays(start, 7)}`, 'aria-label': 'Next week' }, icon('back')));

  el.append(
    h('div', { class: 'lt-row' }, h('h1', { class: 'lt' }, thisWeek ? 'This week' : start === weekStart(addDays(today, 7)) ? 'Next week' : `Week of ${shortDate(start)}`), nav),
    h('p', { class: 'sub' }, `${shortDate(start)} – ${shortDate(addDays(start, 6))} · ${left} left`,
      thisWeek ? null : [' · ', h('a', { href: '#/week' }, 'Back to this week')]),
  );

  if (!ctx.state.feed.url) {
    el.append(h('div', { class: 'empty' }, h('div', { class: 'ico' }, icon('classroom')),
      h('p', null, 'Connect Google Classroom in ', h('a', { href: '#/settings', class: 'dd-link' }, 'Settings'), ' to see your week.')));
    return;
  }

  // Day strip: tap a day to jump to it. Dots show what's due (colored by subject).
  el.append(h('div', { class: 'dd-strip', role: 'list' }, days.map(({ day, items }, i) => {
    const open = items.filter(a => !isDone(a, ctx.state.done));
    return h('a', { role: 'listitem', class: `dd-sday${day === today ? ' today' : ''}${day < today ? ' past' : ''}`, href: `#/week?w=${start}`,
      'aria-label': `${dayLabel(day, today)}: ${items.length ? `${open.length} left` : 'nothing due'}`,
      onclick(e) { e.preventDefault(); const t = document.getElementById(`d-${day}`); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); } },
      h('span', { class: 'dd-swd' }, WD[i]),
      h('b', { class: 'num' }, String(Number(day.slice(8)))),
      h('span', { class: 'dd-dots' }, items.slice(0, 4).map(a => h('i', { class: isDone(a, ctx.state.done) ? 'off' : '', dataset: { s: subjectOf(a.course) } }))));
  })));

  for (const { day, items } of days) {
    const past = day < today;
    const label = dayLabel(day, today);
    const meta = items.length ? `${items.filter(a => !isDone(a, ctx.state.done)).length} left` : '';
    const b = box(label, meta,
      items.length
        ? h('div', { class: 'group' }, items.map(a => assignmentRow(a, ctx, { onToggle: () => setTimeout(() => ctx.rerender(), 450) })))
        : h('p', { class: 'box-note dd-none' }, 'Nothing due'),
      { class: `dd-dbox${day === today ? ' accent' : ''}${past ? ' dd-past' : ''}`, icon: day === today ? 'today' : null });
    b.id = `d-${day}`;
    el.append(b);
  }
}

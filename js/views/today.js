// Today (#/today): progress ring for today, anything missing, today's list, and the next few days.
import { h, icon, box } from '../ui.js';
import { isoDay, longDate, dayLabel, plan, ago, isDone, weekStart, addDays, daysBetween } from '../dates.js';
import { assignmentRow } from '../rows.js';
import { ring, confetti } from '../fx.js';

function greeting(name) {
  const hr = new Date().getHours();
  const part = hr < 5 ? 'Up late' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : part;
}

export function render(el, params, ctx) {
  const today = isoDay();
  const list = ctx.state.cache.assignments;
  const connected = !!(ctx.state.feed.url && ctx.state.feed.key);
  const p = plan(list, ctx.state.done, today, 3);
  const doneToday = p.today.filter(a => isDone(a, ctx.state.done)).length;
  const left = p.today.length - doneToday;
  const ws = weekStart(today);
  const weekLeft = list.filter(a => daysBetween(ws, a.due) < 7 && a.due >= today && !isDone(a, ctx.state.done)).length;

  const refreshBtn = h('button', { class: `icon-btn dd-refresh${ctx.refreshing ? ' spin' : ''}`, type: 'button', 'aria-label': 'Refresh from Classroom', onclick: () => ctx.refresh(true) }, icon('refresh'));
  const status = !connected ? 'Not connected to Classroom'
    : ctx.lastError ? ctx.lastError
    : ctx.refreshing ? 'Checking Classroom…'
    : `Updated ${ago(ctx.state.cache.updated)}`;

  // The next thing that isn't done, today first.
  const next = [...p.today, ...p.soon].find(a => !isDone(a, ctx.state.done));
  const mood = !connected ? null
    : !p.today.length ? 'Nothing due today. Get ahead or take a break.'
    : !left ? 'Everything due today is done. Nice work.'
    : left === 1 ? 'One more thing and today is done.'
    : `${left} things left today. You’ve got this.`;

  el.append(
    h('h1', { class: 'sr-only lt' }, 'Today'),
    box(null, null, [
      h('div', { class: 'dd-hero-top' },
        h('div', { class: 'hm-hi' },
          h('div', { class: 'dd-kicker' }, longDate(today)),
          h('div', { class: 'lt hm-title' }, greeting(ctx.state.settings.name))),
        connected ? refreshBtn : null),
      connected ? h('div', { class: 'hm-ready dd-ready' },
        ring(doneToday, p.today.length),
        h('div', { class: 'hm-rmeta' },
          h('div', { class: 'dd-mood' }, mood),
          next ? h('div', { class: 'dd-next' }, h('span', null, 'Next up'), h('b', null, next.title),
            h('small', null, [dayLabel(next.due, today), next.time].filter(Boolean).join(' · '))) : null)) : null,
      h('div', { class: 'hm-chip' }, h('span', { class: `tag${ctx.lastError ? ' bad' : ''}` }, status)),
    ], { class: 'dd-hero', label: 'Today' }),
  );

  if (!connected) {
    el.append(box('Connect Google Classroom', null, [
      h('p', { class: 'box-note dd-lead' }, 'Link your school Classroom once and your assignments show up here automatically.'),
      h('a', { class: 'cta', href: '#/settings' }, 'Set it up'),
    ], { class: 'accent', icon: 'classroom' }));
    return;
  }

  el.append(h('div', { class: 'hm-tiles' },
    tile(left ? 'hot' : '', 'today', String(left), 'left today', '#/today'),
    tile(weekLeft ? '' : 'good', 'week', String(weekLeft), 'left this week', '#/week')));

  if (p.overdue.length) {
    el.append(box('Missing', `${p.overdue.length}`, h('div', { class: 'group' },
      p.overdue.map(a => assignmentRow(a, ctx, { showDay: true, onToggle: () => later(ctx) }))), { icon: 'alert', class: 'dd-missing' }));
  }

  const onTodayToggle = (nowDone, from) => {
    const all = p.today.every(a => isDone(a, ctx.state.done));
    if (nowDone && all) confetti(from);
    later(ctx, all && nowDone ? 900 : 450);
  };
  el.append(box('Due today', p.today.length ? `${left} of ${p.today.length} left` : '',
    p.today.length
      ? [h('div', { class: 'group' }, p.today.map(a => assignmentRow(a, ctx, { onToggle: onTodayToggle }))),
         left === 0 ? h('div', { class: 'plan-done' }, icon('check'), 'All done for today') : null]
      : h('div', { class: 'plan-done' }, icon('party'), 'Nothing due today'),
    { icon: 'today' }));

  const days = [1, 2, 3].map(n => addDays(today, n)).map(d => ({ d, items: p.soon.filter(a => a.due === d) })).filter(x => x.items.length);
  el.append(box('Coming up', h('a', { href: '#/week' }, 'See week'),
    days.length
      ? days.map(({ d, items }) => [h('h3', { class: 'dd-day' }, dayLabel(d, today)), h('div', { class: 'group' }, items.map(a => assignmentRow(a, ctx)))])
      : h('p', { class: 'box-note dd-none' }, 'Nothing due in the next 3 days.'),
    { icon: 'clock' }));
}

// Re-render after the check mark has had time to draw.
let timer = 0;
function later(ctx, ms = 450) { clearTimeout(timer); timer = setTimeout(() => ctx.rerender(), ms); }

function tile(cls, ico, value, label, href) {
  return h('a', { class: `box tile ${cls}`, href },
    h('div', { class: 'tile-ico' }, icon(ico)),
    h('div', { class: 'tile-v num' }, value),
    h('div', { class: 'tile-l' }, label));
}

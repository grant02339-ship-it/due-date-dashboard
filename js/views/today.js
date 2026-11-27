// Today (#/today): quick glance at what's due today and what to do tonight (due the next school day).
import { h, icon, box } from '../ui.js';
import { isoDay, longDate, dayLabel, plan, ago, isDone } from '../dates.js';
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
  const connected = !!ctx.state.feed.url;
  const p = plan(list, ctx.state.done, today);
  const doneToday = p.today.filter(a => isDone(a, ctx.state.done)).length;
  const left = p.today.length - doneToday;
  const tonightLeft = p.tomorrow.filter(a => !isDone(a, ctx.state.done)).length;
  const nextName = dayLabel(p.next, today); // 'Tomorrow' or 'Monday'

  const updated = ctx.state.cache.updated;
  const stale = !updated || Date.now() - Date.parse(updated) > 6 * 36e5;
  const syncBtn = h('button', { class: `dd-sync${stale ? ' hot' : ''}`, type: 'button', onclick: () => ctx.sync() }, icon('refresh'), h('span', null, 'Sync'));
  const status = !connected ? 'Not connected to Classroom'
    : ctx.lastError ? ctx.lastError
    : !updated ? 'Not synced yet. Tap Sync.'
    : `Synced ${ago(updated)}${stale ? ' · tap Sync for the latest' : ''}`;

  // The next thing that isn't done, today first.
  const next = [...p.today, ...p.tomorrow].find(a => !isDone(a, ctx.state.done));
  const mood = !connected ? null
    : !updated ? 'Tap Sync to bring in your Classroom assignments.'
    : !p.today.length && !tonightLeft ? `Nothing due today or ${nextName === 'Tomorrow' ? 'tomorrow' : `by ${nextName}`}. Enjoy it.`
    : !p.today.length ? `Nothing due today. ${tonightLeft} to do for ${nextName === 'Tomorrow' ? 'tomorrow' : nextName}.`
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
        connected ? syncBtn : null),
      connected && !updated ? h('p', { class: 'dd-mood dd-first' }, mood) : null,
      connected && updated ? h('div', { class: 'hm-ready dd-ready' },
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

  // Homework for tonight: whatever is due the next school day (Monday on Fridays).
  const weekend = nextName !== 'Tomorrow';
  el.append(box(weekend ? `Due by ${nextName}` : 'Due tomorrow',
    p.tomorrow.length ? (weekend ? 'Do this weekend' : 'Do tonight') : '',
    p.tomorrow.length
      ? h('div', { class: 'group' }, p.tomorrow.map(a => assignmentRow(a, ctx, { showDay: weekend, onToggle: () => later(ctx) })))
      : h('p', { class: 'box-note dd-none' }, weekend ? `Nothing due by ${nextName}.` : 'Nothing due tomorrow.'),
    { icon: 'clock', class: p.tomorrow.some(a => !isDone(a, ctx.state.done)) ? 'dd-tonight' : '' }));

  // The rest of the week, as one tappable line.
  const n = p.laterWeek.length;
  el.append(h('a', { class: 'box dd-later', href: '#/week' },
    h('div', { class: 'tile-ico' }, icon('week')),
    h('div', { class: 't' }, n ? `${n} more due later this week` : 'Nothing else due this week',
      h('small', null, n ? [...new Set(p.laterWeek.map(a => dayLabel(a.due, today)))].join(' · ') : 'See your week')),
    h('span', { class: 'chev' }, icon('chevron'))));
}

// Re-render after the check mark has had time to draw.
let timer = 0;
function later(ctx, ms = 450) { clearTimeout(timer); timer = setTimeout(() => ctx.rerender(), ms); }

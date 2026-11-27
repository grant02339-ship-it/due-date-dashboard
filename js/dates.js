// Date helpers and the "what's due" logic. Pure functions (no DOM), covered by tests/dates.test.js.
// Days are local calendar dates as 'YYYY-MM-DD' strings.

const pad = n => String(n).padStart(2, '0');
export const isoDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export function addDays(day, n) { const d = parseDay(day); d.setDate(d.getDate() + n); return isoDay(d); }
export const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / 864e5);

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'Today' | 'Tomorrow' | 'Yesterday' | 'Friday' (this week) | 'Fri, Dec 12'
export function dayLabel(day, today = isoDay()) {
  const n = daysBetween(today, day);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  const d = parseDay(day);
  if (n > 1 && n < 7) return WD[d.getDay()];
  return `${WD[d.getDay()].slice(0, 3)}, ${MO[d.getMonth()]} ${d.getDate()}`;
}
// 'Thursday, November 27'
export function longDate(day) {
  const d = parseDay(day);
  return `${WD[d.getDay()]}, ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()]} ${d.getDate()}`;
}
export const shortDate = day => { const d = parseDay(day); return `${MO[d.getMonth()]} ${d.getDate()}`; };

// 'just now' | '5 min ago' | '2 hr ago' | 'Nov 26'
export function ago(iso, now = Date.now()) {
  if (!iso) return 'never';
  const m = Math.floor((now - Date.parse(iso)) / 6e4);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} hr ago`;
  return shortDate(isoDay(new Date(Date.parse(iso))));
}

// Turned in on Classroom, or checked off in the app.
export const isDone = (a, doneMap = {}) =>
  doneMap[a.id] != null ? !!doneMap[a.id] : a.state === 'TURNED_IN' || a.state === 'RETURNED';

// Splits assignments into what the Today screen needs.
// overdue: due before today and not done (newest first). today: due today. soon: next `ahead` days.
export function plan(list, doneMap = {}, today = isoDay(), ahead = 3) {
  const overdue = [], todayList = [], soon = [];
  for (const a of list) {
    const n = daysBetween(today, a.due);
    if (n < 0) { if (!isDone(a, doneMap)) overdue.push(a); }
    else if (n === 0) todayList.push(a);
    else if (n <= ahead) soon.push(a);
  }
  overdue.sort((x, y) => (x.dueAt < y.dueAt ? 1 : -1));
  return { overdue, today: todayList, soon };
}

// Monday of the week containing `day`.
export function weekStart(day) { const d = parseDay(day); return addDays(day, -((d.getDay() + 6) % 7)); }

// [{day, items}] for the 7 days starting at `start`.
export function weekDays(list, start) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    return { day, items: list.filter(a => a.due === day) };
  });
}

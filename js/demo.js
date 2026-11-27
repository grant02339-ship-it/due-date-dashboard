// Sample assignments for ?demo previews. Dates are relative to today so the screens always look full.
import { defaultState } from './store.js';
import { isoDay, addDays } from './dates.js';

export function sampleState() {
  const t = isoDay();
  const at = (day, hm) => new Date(`${day}T${hm}:00`).toISOString();
  const a = (n, course, title, hm, extra = {}) => {
    const due = addDays(t, n);
    const [hh, mm] = hm.split(':').map(Number);
    const time = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
    return { id: `demo:${course}:${title}`, course, title, due, time, dueAt: at(due, hm), link: '', type: 'ASSIGNMENT', points: 100, state: 'NEW', late: false, ...extra };
  };
  const s = defaultState();
  s.settings.name = 'Grant';
  s.feed = { url: 'https://script.google.com/macros/s/demo/exec', key: 'demo-key-0000000000' };
  s.cache = {
    updated: new Date(Date.now() - 4 * 60000).toISOString(),
    assignments: [
      a(-2, 'English 11 CP-2', 'Gatsby Ch. 4 reading questions', '23:59'),
      a(0, 'Honors Precalculus', 'Unit 4 Practice Set: Logarithms', '08:00'),
      a(0, 'Honors Physics', 'Lab report: Projectile motion', '23:59'),
      a(0, 'Français 4H', 'Vocabulaire chapitre 5', '23:59', { state: 'TURNED_IN' }),
      a(1, 'AP Business with Personal Finance', 'Budget project draft', '23:59'),
      a(2, 'Honors Physics', 'Problem set 7', '08:00'),
      a(3, 'English 11 CP-2', 'Essay outline', '23:59'),
      a(5, 'Honors Precalculus', 'Unit 4 Test', '08:00'),
      a(6, 'Physical Education 2026-2027', 'Fitness log', '23:59'),
    ],
  };
  return s;
}

// Visual extras: subject colors/icons, the progress ring (Study Buddy's readiness ring), confetti.
import { h, reducedMotion } from './ui.js';

/* ---------- Subjects ---------- */
// Matched in order against the class name; the key picks a color (css/dd.css) and an icon.
const SUBJECTS = [
  ['math', /calc|algebra|geometry|math|stat|trig/i],
  ['science', /physics|chem|bio|science|anatomy|earth|enviro/i],
  ['english', /english|literature|writing|composition|\bela\b|reading/i],
  ['language', /fran|french|spanish|espa|german|latin|chinese|mandarin|japanese|italian|asl/i],
  ['business', /business|finance|econ|marketing|account|deca|entrepren/i],
  ['history', /history|gov|civics|social|psych|socio|geograph/i],
  ['pe', /physical ed|\bpe\b|health|gym|fitness|sport/i],
  ['art', /art|music|band|choir|orchestra|theat|drama|design|photo/i],
  ['tech', /computer|coding|program|engineering|robot|tech/i],
];
export function subjectOf(course = '') {
  for (const [key, re] of SUBJECTS) if (re.test(course)) return key;
  return 'other';
}

const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const SUBJECT_ICONS = {
  math: `<svg viewBox="0 0 24 24" ${S}><path d="M17 5H7l6 7-6 7h10"/></svg>`,
  science: `<svg viewBox="0 0 24 24" ${S}><path d="M9.5 3h5M10 3v6L4.8 18a2 2 0 001.7 3h11a2 2 0 001.7-3L14 9V3"/><path d="M7.5 14h9"/></svg>`,
  english: `<svg viewBox="0 0 24 24" ${S}><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M9 7.5h6"/></svg>`,
  language: `<svg viewBox="0 0 24 24" ${S}><path d="M20.5 11.5a8 8 0 01-11.7 7.1L4 20l1.3-4.4a8 8 0 1115.2-4.1z"/><path d="M9 10h6M9 13.5h4"/></svg>`,
  business: `<svg viewBox="0 0 24 24" ${S}><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>`,
  history: `<svg viewBox="0 0 24 24" ${S}><path d="M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 21h18"/></svg>`,
  pe: `<svg viewBox="0 0 24 24" ${S}><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>`,
  art: `<svg viewBox="0 0 24 24" ${S}><path d="M12 3a9 9 0 000 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.6 1.6-1.6H17a4 4 0 004-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7" r="1" fill="currentColor"/><circle cx="15" cy="7.5" r="1" fill="currentColor"/></svg>`,
  tech: `<svg viewBox="0 0 24 24" ${S}><path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>`,
  other: `<svg viewBox="0 0 24 24" ${S}><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>`,
};
export function subjectIcon(course) {
  const key = subjectOf(course);
  const t = document.createElement('template');
  t.innerHTML = SUBJECT_ICONS[key];
  const svg = t.content.firstElementChild;
  svg.setAttribute('aria-hidden', 'true');
  return h('span', { class: 'sj', dataset: { s: key } }, svg);
}

/* ---------- Ring ---------- */
const R = 56, C = 2 * Math.PI * R;
const played = new Set();
// done of total; animates the first time each key shows this session.
export function ring(done, total, key = 'today') {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 132 132');
  svg.setAttribute('aria-hidden', 'true');
  const mk = cls => {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('class', cls);
    c.setAttribute('cx', '66'); c.setAttribute('cy', '66'); c.setAttribute('r', String(R));
    c.setAttribute('fill', 'none'); c.setAttribute('stroke-width', '14');
    svg.append(c);
    return c;
  };
  mk('track');
  const fill = mk('fill');
  fill.style.strokeDasharray = String(C);
  const pct = total ? done / total : 1;
  const target = C * (1 - pct);
  const big = total ? h('b', null, `${done}`, h('i', null, `/${total}`)) : h('b', { class: 'dd-free' }, 'Free');
  const el = h('div', { class: `ring dd-ring${pct >= 1 ? ' full' : ''}`, role: 'img',
    'aria-label': total ? `${done} of ${total} done today` : 'Nothing due today' },
    svg, h('div', { class: 'ring-num' }, h('div', null, big, h('span', null, total ? 'done today' : 'nothing due'))));
  if (pct <= 0) fill.classList.add('zero');
  if (pct > 0 && !played.has(key) && !reducedMotion()) {
    played.add(key);
    fill.style.strokeDashoffset = String(C);
    requestAnimationFrame(() => setTimeout(() => {
      fill.getBoundingClientRect();
      fill.classList.add('anim');
      fill.style.strokeDashoffset = String(target);
    }, 250));
  } else {
    played.add(key);
    fill.style.strokeDashoffset = String(target);
  }
  return el;
}

/* ---------- Confetti ---------- */
const COLORS = ['#F07A34', '#FFB27A', '#FFC845', '#3DBE7A', '#4C8DF6', '#B07CF0', '#F5EFE6'];
export function confetti(originEl) {
  if (reducedMotion() || typeof document.body.animate !== 'function') return;
  const r = originEl ? originEl.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const layer = h('div', { class: 'dd-confetti', 'aria-hidden': 'true' });
  document.body.append(layer);
  const N = 70;
  for (let i = 0; i < N; i++) {
    const p = h('i', { style: `left:${x0}px;top:${y0}px;background:${COLORS[i % COLORS.length]};${i % 3 ? '' : 'border-radius:50%;'}` });
    layer.append(p);
    const ang = (Math.PI * 2 * i) / N + Math.random() * 0.4;
    const v = 140 + Math.random() * 220;
    const dx = Math.cos(ang) * v, dy = Math.sin(ang) * v - 160;
    const rot = (Math.random() - 0.5) * 900;
    p.animate([
      { transform: 'translate(-50%,-50%) rotate(0) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${dy * 0.6}px)) rotate(${rot * 0.6}deg) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 380}px)) rotate(${rot}deg) scale(.6)`, opacity: 0 },
    ], { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
  }
  setTimeout(() => layer.remove(), 2400);
}

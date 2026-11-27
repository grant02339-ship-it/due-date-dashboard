// Settings (#/settings): Classroom connection, name, theme, about.
import { h, icon, box } from '../ui.js';
import { APP_VERSION } from '../version.js';
import { validUrl } from '../feed.js';
import { ago } from '../dates.js';

function seg(name, label, options, value, onPick) {
  return h('div', { class: 'xp-seg st-seg', role: 'radiogroup', 'aria-label': label },
    options.map(([v, text]) => h('label', null,
      h('input', { type: 'radio', name, value: v, checked: v === value, onchange: () => onPick(v) }),
      h('span', null, text))));
}

export function render(el, params, ctx) {
  const s = ctx.state;
  const note = text => h('p', { class: 'box-note' }, text);

  // Classroom connection
  const urlIn = h('input', { class: 'st-input dd-wide', id: 'st-url', type: 'url', inputmode: 'url', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'https://script.google.com/…/exec', value: s.feed.url });
  const keyIn = h('input', { class: 'st-input dd-wide', id: 'st-key', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Paste your key', value: s.feed.key });
  const msg = h('p', { class: 'box-note', role: 'status' });
  const connected = !!(s.feed.url && s.feed.key);
  if (connected) msg.textContent = ctx.lastError ? ctx.lastError : `Connected. Last updated ${ago(s.cache.updated)}, ${s.cache.assignments.length} assignments.`;

  const connectBtn = h('button', { class: 'cta', type: 'button', async onclick() {
    const url = urlIn.value.trim(), key = keyIn.value.trim();
    if (!validUrl(url)) { msg.textContent = 'That doesn’t look like an Apps Script web app link. It should end in /exec.'; return; }
    if (key.length < 16) { msg.textContent = 'The key looks too short. Copy the whole thing from the Apps Script log.'; return; }
    s.feed = { url, key };
    ctx.save();
    connectBtn.disabled = true;
    msg.textContent = 'Checking Classroom… this can take up to 30 seconds the first time.';
    const r = await ctx.refresh(true, { quiet: true });
    connectBtn.disabled = false;
    msg.textContent = r.ok ? `Connected! Found ${s.cache.assignments.length} assignments.` : r.error;
  } }, connected ? 'Save and refresh' : 'Connect');

  const disconnect = connected ? h('button', { class: 'row dd-danger', type: 'button', onclick() {
    s.feed = { url: '', key: '' };
    s.cache = { updated: null, assignments: [] };
    s.done = {};
    ctx.save();
    ctx.rerender();
  } }, h('div', { class: 'ico' }, icon('close')), h('div', { class: 't' }, 'Disconnect', h('small', null, 'Removes the link and the saved list from this phone'))) : null;

  const nameIn = h('input', { class: 'st-input', id: 'st-name', type: 'text', maxlength: '24', autocomplete: 'given-name', placeholder: 'Optional', value: s.settings.name,
    onchange() { s.settings.name = nameIn.value.trim().slice(0, 24); ctx.save(); } });

  const themeSeg = seg('st-theme', 'Theme', [['auto', 'Auto'], ['dark', 'Dark'], ['light', 'Light']],
    ['auto', 'dark', 'light'].includes(s.settings.theme) ? s.settings.theme : 'auto',
    v => { s.settings.theme = v; ctx.save(); ctx.applyTheme(v); });

  el.append(
    h('h1', { class: 'lt' }, 'Settings'),
    box('Google Classroom', connected ? h('span', { class: 'tag good' }, 'Connected') : null, [
      h('div', { class: 'group st-group' },
        h('label', { class: 'st-row st-stack', for: 'st-url' }, h('span', { class: 'st-label' }, 'Web app link'), urlIn),
        h('label', { class: 'st-row st-stack', for: 'st-key' }, h('span', { class: 'st-label' }, 'Private key'), keyIn)),
      connectBtn, msg,
      disconnect ? h('div', { class: 'group dd-gap' }, disconnect) : null,
      note('Your assignments come from a small Google Apps Script running on your own school account. They’re saved only on this phone.')], { icon: 'classroom' }),
    box('You', null, [
      h('div', { class: 'group st-group' }, h('label', { class: 'st-row', for: 'st-name' }, h('span', { class: 'st-label' }, 'Your name'), nameIn)),
      note('Used to greet you on Today.')]),
    box('Appearance', null, [
      h('div', { class: 'group st-group' }, h('div', { class: 'st-row st-stack' }, h('span', { class: 'st-label' }, 'Theme'), themeSeg)),
      note('Auto matches your phone’s light or dark setting.')]),
    box('About', null, [
      h('div', { class: 'group' }, h('div', { class: 'row' }, h('div', { class: 'ico' }, icon('info')),
        h('div', { class: 't' }, 'Due Date Dashboard', h('small', null, `Version ${APP_VERSION}`)))),
      note('Not affiliated with or endorsed by Google. Read-only: the app never changes anything in Classroom.')]),
    h('div', { class: 'st-credit' },
      h('span', null, 'Developed by'),
      h('img', { src: 'icons/prov.svg', alt: 'PROV Software', width: '210', height: '46' })));
}

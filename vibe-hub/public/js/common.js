// Shared helpers: API calls, toasts, avatars, and the rotating quote banner.
const Vibe = (() => {
  async function api(path, { method = 'GET', body } = {}) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
    let data = {};
    try { data = await res.json(); } catch { /* empty */ }
    if (!res.ok) {
      const err = new Error(data.error || `Request failed (${res.status})`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  let toastTimer;
  function toast(text) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  const AVATAR_COLORS = ['#ff6b4a', '#1fa595', '#7a5cfa', '#e0a100', '#e04f8c', '#2f80ed', '#16a34a', '#a0522d'];
  function colorFor(name = '') {
    let h = 0;
    for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[h % AVATAR_COLORS.length];
  }
  function avatar(name) {
    const el = document.createElement('span');
    el.className = 'avatar';
    el.style.background = colorFor(name);
    el.textContent = (name || '?').slice(0, 1);
    el.title = name;
    return el;
  }

  // Build DOM safely: h('div', {class: 'x', onclick}, 'text', childEl)
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v; // only used with trusted, static strings
      else el.setAttribute(k, v === true ? '' : v);
    }
    children.flat().forEach((c) => {
      if (c == null || c === false) return;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return el;
  }

  // ---- Motivational quotes: change every 10 seconds ----
  async function startQuotes() {
    const textEl = document.getElementById('quoteText');
    const bar = document.getElementById('quoteProgress');
    if (!textEl) return;
    let quotes = [];
    try { quotes = (await api('/api/quotes')).quotes; } catch { /* offline */ }
    if (!quotes.length) quotes = [{ text: 'Every day is a fresh start.', author: 'Unknown' }];
    let i = 0;
    const show = () => {
      const q = quotes[i % quotes.length];
      textEl.classList.add('fade');
      setTimeout(() => {
        textEl.replaceChildren(`“${q.text}”`, h('span', { class: 'author' }, `— ${q.author}`));
        textEl.title = `${q.text} — ${q.author}`;
        textEl.classList.remove('fade');
      }, 450);
      bar.classList.remove('run');
      void bar.offsetWidth; // restart the CSS animation
      bar.classList.add('run');
      i++;
    };
    show();
    setInterval(show, 10_000);
  }

  return { api, toast, avatar, colorFor, h, startQuotes };
})();

document.addEventListener('DOMContentLoaded', Vibe.startQuotes);

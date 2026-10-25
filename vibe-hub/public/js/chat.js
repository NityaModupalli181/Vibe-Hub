// Daily group chat room: messages, reactions, typing, online members and meetup plans with RSVPs.
const Chat = (() => {
  const { toast, h, avatar } = Vibe;
  const QUICK = ['Who’s free today? 🙋', 'I can do evening 🌆', 'Morning works for me ☀️', 'Where should we meet? 📍', 'Count me in! 🙌'];

  function mount(view, socket, activityKey, me) {
    view.append(document.getElementById('tpl-chat').content.cloneNode(true));
    const $ = (sel) => view.querySelector(sel);
    const shell = $('.chat-shell');
    const list = $('[data-messages]');
    const input = $('[data-input]');
    let reactionsAllowed = ['👍', '❤️', '😂', '🔥'];
    let lastSender = null;
    let lastTime = 0;
    const typers = new Map();
    let resetAt = 0;

    // Mobile tabs
    view.querySelectorAll('[data-mtab]').forEach((b) => b.addEventListener('click', () => {
      shell.dataset.tab = b.dataset.mtab;
      view.querySelectorAll('[data-mtab]').forEach((x) => x.classList.toggle('active', x === b));
    }));

    /* ---------- rendering ---------- */
    const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const nearBottom = () => list.scrollHeight - list.scrollTop - list.clientHeight < 120;
    const scrollDown = (force) => { if (force || nearBottom()) list.scrollTop = list.scrollHeight; };

    function renderReactions(container, messageId, reactions) {
      container.replaceChildren(...Object.entries(reactions || {}).filter(([, users]) => users.length).map(([emoji, users]) =>
        h('button', {
          class: users.includes(me.username) ? 'me' : '',
          title: users.join(', '),
          onclick: () => socket.emit('react', { messageId, emoji }),
        }, `${emoji} ${users.length}`)));
    }

    function addMessage(m, { animate = true } = {}) {
      list.querySelector('.empty-chat')?.remove();
      if (m.kind === 'system') {
        list.append(h('div', { class: 'sys-msg' }, m.body));
        lastSender = null;
        scrollDown(animate);
        return;
      }
      const mine = m.user_id === me.id;
      const t = new Date(m.created_at).getTime();
      const cont = lastSender === m.username && t - lastTime < 3 * 60 * 1000;
      lastSender = m.username;
      lastTime = t;

      const reactionsEl = h('div', { class: 'reactions' });
      const bar = h('div', { class: 'react-bar' }, ...reactionsAllowed.map((e) =>
        h('button', { title: `React ${e}`, onclick: () => socket.emit('react', { messageId: m.id, emoji: e }) }, e)));
      const el = h('div', { class: `msg${mine ? ' mine' : ''}${cont ? ' cont' : ''}`, 'data-id': m.id, tabindex: '0' },
        avatar(m.username),
        h('div', { class: 'bubble-wrap' },
          bar,
          h('div', { class: 'who' }, mine ? 'You' : m.username),
          h('div', { class: 'bubble' }, m.body),
          reactionsEl,
          !cont && h('div', { class: 'time' }, fmtTime(m.created_at))));
      renderReactions(reactionsEl, m.id, m.reactions);
      const stick = mine || nearBottom();
      list.append(el);
      if (stick) list.scrollTop = list.scrollHeight;
    }

    function notice(text) {
      list.append(h('div', { class: 'notice' }, text));
      lastSender = null;
      scrollDown();
    }

    function renderMembers(online) {
      $('[data-online-count]').textContent = online.length;
      $('[data-members]').replaceChildren(...online.map((u) =>
        h('li', {}, avatar(u.username), u.id === me.id ? `${u.username} (you)` : u.username)));
    }

    function planCard(p) {
      const myVote = ['yes', 'maybe', 'no'].find((v) => p.votes[v].includes(me.username));
      const btn = (v, label) => h('button', {
        class: `${v}${myVote === v ? ' on' : ''}`,
        onclick: () => socket.emit('meetup:vote', { meetupId: p.id, vote: v }),
      }, `${label} ${p.votes[v].length}`);
      return h('div', { class: 'plan', 'data-plan': p.id },
        h('h4', {}, p.title),
        h('div', { class: 'where' }, `📍 ${p.place}`),
        h('div', { class: 'where' }, `🕒 ${p.time_text}`),
        h('div', { class: 'small muted' }, `proposed by ${p.username}`),
        h('div', { class: 'rsvp' }, btn('yes', '✅ In'), btn('maybe', '🤔 Maybe'), btn('no', '❌ Out')),
        p.votes.yes.length ? h('div', { class: 'going' }, `Going: ${p.votes.yes.join(', ')}`) : null);
    }
    function upsertPlan(p) {
      const plans = $('[data-plans]');
      plans.querySelector('.muted.empty')?.remove();
      const existing = plans.querySelector(`[data-plan="${p.id}"]`);
      if (existing) existing.replaceWith(planCard(p));
      else plans.prepend(planCard(p));
    }

    function renderTyping() {
      const names = [...typers.keys()];
      $('[data-typing]').textContent = !names.length ? ''
        : names.length === 1 ? `${names[0]} is typing…`
          : names.length === 2 ? `${names[0]} and ${names[1]} are typing…` : 'Several people are typing…';
    }

    /* ---------- join the room ---------- */
    function join() {
      socket.emit('join', { activity: activityKey }, (res) => {
        if (res?.error) {
          view.replaceChildren(h('div', { class: 'empty-state' }, h('div', { class: 'big' }, '🤷'),
            h('p', {}, 'That activity doesn’t exist.'), h('a', { class: 'btn', href: '#/group' }, 'Back to activities')));
          return;
        }
        reactionsAllowed = res.reactions;
        resetAt = Date.now() + res.resetsInMs;
        const a = res.activity;
        $('[data-emoji]').textContent = a.emoji;
        $('[data-name]').textContent = a.name;
        $('[data-blurb]').textContent = a.blurb;
        $('[data-title]').textContent = `${a.emoji} ${a.name} — today’s group`;
        $('[data-day]').textContent = new Date(res.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        input.placeholder = `Message the ${a.name.toLowerCase()} group…`;

        list.replaceChildren(h('div', { class: 'day-divider' }, 'Today'));
        lastSender = null;
        if (!res.messages.length) {
          list.append(h('div', { class: 'empty-chat' }, h('div', { class: 'big' }, a.emoji),
            h('p', {}, `You’re the first one here today! Say hi and suggest a time to play ${a.name.toLowerCase()}.`)));
        }
        res.messages.forEach((m) => addMessage(m, { animate: false }));
        scrollDown(true);
        renderMembers(res.online);

        const plans = $('[data-plans]');
        plans.replaceChildren();
        if (!res.meetups.length) plans.append(h('p', { class: 'small muted empty' }, 'No plans yet. Be the first to propose one!'));
        res.meetups.forEach(upsertPlan);
      });
    }

    /* ---------- socket events ---------- */
    const handlers = {
      message: (m) => { if (m.activity === activityKey) { typers.delete(m.username); renderTyping(); addMessage(m); } },
      notice,
      presence: renderMembers,
      typing: ({ username, isTyping }) => {
        clearTimeout(typers.get(username));
        if (isTyping) typers.set(username, setTimeout(() => { typers.delete(username); renderTyping(); }, 4000));
        else typers.delete(username);
        renderTyping();
      },
      reaction: ({ messageId, reactions }) => {
        const el = list.querySelector(`.msg[data-id="${messageId}"] .reactions`);
        if (el) renderReactions(el, messageId, reactions);
      },
      'meetup:new': upsertPlan,
      'meetup:update': upsertPlan,
      'room:reset': () => { toast('🌅 A new day — joining today’s fresh group chat'); join(); },
      connect: () => { $('[data-conn]').classList.remove('off'); $('[data-conn]').textContent = 'Connected'; join(); },
      disconnect: () => { $('[data-conn]').classList.add('off'); $('[data-conn]').textContent = 'Reconnecting…'; },
    };
    Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
    if (socket.connected) join();

    /* ---------- composer ---------- */
    let typingTimer = null;
    let typingSent = false;
    function send(text) {
      const body = text.trim();
      if (!body) return;
      socket.emit('message', { body }, (res) => { if (res?.error) toast(res.error); });
      socket.emit('typing', false);
      typingSent = false;
    }
    $('[data-composer]').addEventListener('submit', (e) => {
      e.preventDefault();
      send(input.value);
      input.value = '';
      input.style.height = '';
      input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('[data-composer]').requestSubmit(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
      if (!typingSent) { socket.emit('typing', true); typingSent = true; }
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => { socket.emit('typing', false); typingSent = false; }, 2500);
    });
    $('[data-quick]').append(...QUICK.map((q) => h('button', { type: 'button', onclick: () => send(q) }, q)));

    /* ---------- plans ---------- */
    $('[data-plan-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      socket.emit('meetup:create', data, (res) => {
        if (res?.error) return toast(res.error);
        form.reset();
        toast('Plan posted! 📅');
      });
    });

    /* ---------- countdown to the daily reset ---------- */
    const countdownEl = $('[data-countdown]');
    const tick = setInterval(() => {
      if (!resetAt) return;
      const left = Math.max(0, resetAt - Date.now());
      const hh = String(Math.floor(left / 3600000)).padStart(2, '0');
      const mm = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
      const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
      countdownEl.textContent = `${hh}:${mm}:${ss}`;
    }, 1000);

    // Cleanup when navigating away
    return () => {
      clearInterval(tick);
      clearTimeout(typingTimer);
      typers.forEach((t) => clearTimeout(t));
      Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn));
      socket.emit('leave');
    };
  }

  return { mount };
})();

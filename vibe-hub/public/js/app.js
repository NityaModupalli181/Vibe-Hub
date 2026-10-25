// Main single-page app: routing + home, solo activities, saved items and the group lobby.
(() => {
  const { api, toast, h } = Vibe;
  const view = document.getElementById('view');
  let me = null;
  let cleanup = null; // called when leaving a view
  const socket = io({ autoConnect: false });

  /* ------------------------- Boot ------------------------- */
  async function boot() {
    try {
      const data = await api('/api/auth/me');
      me = { ...data.user, stats: data.stats };
    } catch {
      location.replace('/');
      return;
    }
    document.getElementById('navUser').textContent = `@${me.username}`;
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
      location.replace('/');
    });
    socket.connect();
    socket.on('connect_error', (err) => { if (err.message === 'unauthorized') location.replace('/'); });
    window.addEventListener('hashchange', route);
    route();
  }

  /* ------------------------- Router ------------------------- */
  const routes = [
    [/^#\/home$/, renderHome],
    [/^#\/solo$/, renderSolo],
    [/^#\/solo\/doodle$/, () => Doodle.mount(view)],
    [/^#\/solo\/cooking$/, renderCooking],
    [/^#\/solo\/reading$/, renderReading],
    [/^#\/solo\/makeup$/, renderMakeup],
    [/^#\/saved$/, renderSaved],
    [/^#\/group$/, renderGroup],
    [/^#\/group\/([\w-]+)$/, (m) => Chat.mount(view, socket, m[1], me)],
  ];

  function route() {
    if (cleanup) { cleanup(); cleanup = null; }
    const hash = location.hash || '#/home';
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', hash.startsWith(`#/${a.dataset.nav}`)));
    view.className = 'view';
    void view.offsetWidth;
    for (const [re, fn] of routes) {
      const m = hash.match(re);
      if (m) {
        view.replaceChildren();
        cleanup = fn(m) || null;
        window.scrollTo(0, 0);
        return;
      }
    }
    location.hash = '#/home';
  }

  const crumbs = (href, label) => h('div', { class: 'crumbs' }, h('a', { href }, `← ${label}`));
  const loading = () => h('div', { class: 'spinner', 'aria-label': 'Loading' });

  async function saveFavorite(kind, payload, btn) {
    try {
      const r = await api('/api/solo/favorites', { method: 'POST', body: { kind, payload } });
      toast(r.duplicate ? 'Already in your saved list' : 'Saved! Find it under “Saved” ⭐');
      if (btn) { btn.textContent = '⭐ Saved'; btn.disabled = true; }
    } catch (e) { toast(e.message); }
  }

  /* ------------------------- Home ------------------------- */
  function renderHome() {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    view.append(
      h('div', { class: 'hello' },
        h('h1', {}, `${greet}, ${me.username} 👋`),
        h('p', { class: 'muted' }, 'What are you in the mood for today?')),
      h('div', { class: 'big-choices' },
        h('a', { class: 'big-choice solo', href: '#/solo' },
          h('div', { class: 'emoji-cloud' }, ...['✏️', '🍳', '📖', '💄'].map((e) => h('span', {}, e))),
          h('span', { class: 'pill' }, 'Option 1'),
          h('h2', {}, 'Solo activity'),
          h('p', {}, 'Doodle the drawing of the day, cook something new, read a story or poem, or try a makeup look.'),
          h('span', { class: 'go' }, 'Start solo →')),
        h('a', { class: 'big-choice group', href: '#/group' },
          h('div', { class: 'emoji-cloud' }, ...['🏸', '⚽', '🏀', '💃'].map((e) => h('span', {}, e))),
          h('span', { class: 'pill', style: 'color:var(--ink)' }, 'Option 2'),
          h('h2', {}, 'Group activity'),
          h('p', {}, 'Join today’s chat for table tennis, badminton, bowling, dance, basketball, football or gym — and plan a meetup.'),
          h('span', { class: 'go' }, 'Find your people →'))),
      h('div', { class: 'stats-row' },
        stat(me.stats.doodles, 'doodles drawn'),
        stat(me.stats.favorites, 'things saved'),
        stat(me.stats.messages, 'messages sent')),
    );
  }
  const stat = (n, label) => h('div', { class: 'stat' }, h('b', {}, n), h('span', { class: 'small muted' }, label));

  /* ------------------------- Solo menu ------------------------- */
  function renderSolo() {
    const items = [
      ['#/solo/doodle', '✏️', 'bg-violet', 'Doodle', 'A fresh drawing prompt every day. Draw it right here and see everyone else’s.'],
      ['#/solo/cooking', '🍳', 'bg-sun', 'Cooking', 'Pick veg or non-veg and get a recipe to cook today.'],
      ['#/solo/reading', '📖', 'bg-teal', 'Reading', 'A short story, a poem, or a random article from the internet.'],
      ['#/solo/makeup', '💄', 'bg-coral', 'Makeup', 'Makeup inspo with colour palettes, products and steps.'],
    ];
    view.append(
      crumbs('#/home', 'Home'),
      h('h1', {}, 'Solo activities'),
      h('p', { class: 'muted', style: 'margin-bottom:24px' }, 'Some me-time. Pick one:'),
      h('div', { class: 'tiles' }, ...items.map(([href, emoji, bg, title, desc]) =>
        h('a', { class: 'tile', href },
          h('div', { class: `tile-emoji ${bg}` }, emoji),
          h('h3', {}, title),
          h('p', { class: 'muted small' }, desc)))),
    );
  }

  /* ------------------------- Cooking ------------------------- */
  function renderCooking() {
    let diet = null;
    let current = null;
    const out = h('div');
    const vegBtn = h('button', { class: 'veg', onclick: () => choose('veg') },
      h('span', { class: 'big' }, '🥦'), h('b', {}, h('span', { class: 'diet-dot veg' }), 'Vegetarian'),
      h('span', { class: 'small muted' }, 'Veggies, paneer, pasta & more'));
    const nonvegBtn = h('button', { class: 'nonveg', onclick: () => choose('nonveg') },
      h('span', { class: 'big' }, '🍗'), h('b', {}, h('span', { class: 'diet-dot nonveg' }), 'Non-vegetarian'),
      h('span', { class: 'small muted' }, 'Chicken, seafood, beef & eggs'));

    view.append(
      crumbs('#/solo', 'Solo activities'),
      h('h1', {}, 'What are we cooking? 🍳'),
      h('p', { class: 'muted' }, 'Choose one and we’ll find you a recipe.'),
      h('div', { class: 'choice-pair' }, vegBtn, nonvegBtn),
      out,
    );

    async function choose(d) {
      diet = d;
      vegBtn.classList.toggle('active', d === 'veg');
      nonvegBtn.classList.toggle('active', d === 'nonveg');
      out.replaceChildren(loading());
      try {
        const { recipe } = await api(`/api/solo/recipe?diet=${d}&exclude=${encodeURIComponent(current?.title || '')}`);
        current = recipe;
        out.replaceChildren(recipeCard(recipe));
      } catch (e) { out.replaceChildren(h('div', { class: 'alert error' }, e.message)); }
    }

    function recipeCard(r) {
      const saveBtn = h('button', { class: 'btn soft', onclick: (e) => saveFavorite('recipe', r, e.currentTarget) }, '⭐ Save recipe');
      return h('article', { class: 'card recipe' },
        r.image ? h('img', { class: 'recipe-img', src: r.image, alt: r.title, loading: 'lazy' })
          : h('div', { class: 'recipe-img' }, r.diet === 'veg' ? '🥗' : '🍲'),
        h('div', {},
          h('h2', {}, r.title),
          h('div', { class: 'recipe-meta' },
            h('span', { class: 'pill' }, h('span', { class: `diet-dot ${r.diet}` }), r.diet === 'veg' ? 'Veg' : 'Non-veg'),
            r.cuisine && h('span', { class: 'pill' }, `🌍 ${r.cuisine}`),
            r.minutes && h('span', { class: 'pill' }, `⏱ ${r.minutes} min`),
            r.serves && h('span', { class: 'pill' }, `🍽 Serves ${r.serves}`),
            h('span', { class: 'pill' }, `Source: ${r.source}`)),
          h('h3', {}, 'Ingredients'),
          h('ul', { class: 'ingredients' }, ...r.ingredients.map((i) => {
            const li = h('li', {}, h('input', { type: 'checkbox', 'aria-label': i }), h('span', {}, i));
            li.addEventListener('click', (e) => {
              const cb = li.querySelector('input');
              if (e.target !== cb) cb.checked = !cb.checked;
              li.classList.toggle('done', cb.checked);
            });
            return li;
          })),
          h('h3', { style: 'margin-top:20px' }, 'Method'),
          h('ol', {}, ...r.steps.map((s) => h('li', {}, s))),
          h('div', { class: 'content-actions' },
            h('button', { class: 'btn', onclick: () => choose(diet) }, '🔀 Another recipe'),
            saveBtn,
            r.sourceUrl && h('a', { class: 'btn ghost', href: r.sourceUrl, target: '_blank', rel: 'noopener' }, 'View original ↗'),
            r.video && h('a', { class: 'btn ghost', href: r.video, target: '_blank', rel: 'noopener' }, '▶ Video'))));
    }
  }

  /* ------------------------- Reading ------------------------- */
  function renderReading() {
    const kinds = [['any', '🎲 Surprise me'], ['story', '📚 Short story'], ['poem', '🪶 Poem'], ['article', '📰 Article from the internet']];
    let kind = 'any';
    let current = null;
    const out = h('div');
    const chips = h('div', { class: 'chips', style: 'margin:16px 0 24px' }, ...kinds.map(([k, label]) =>
      h('button', { class: `chip${k === kind ? ' active' : ''}`, 'data-k': k, onclick: () => { kind = k; load(); } }, label)));

    const progress = h('div', { class: 'reading-progress' }, h('div'));
    const onScroll = () => {
      const art = out.querySelector('.reading');
      if (!art) return;
      const rect = art.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (rect.height + 40)));
      progress.firstChild.style.width = `${pct * 100}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    view.append(crumbs('#/solo', 'Solo activities'), h('h1', {}, 'Time to read 📖'),
      h('p', { class: 'muted' }, 'Grab a cup of something warm. Pick what you feel like:'), chips, progress, out);

    async function load() {
      chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.k === kind));
      out.replaceChildren(loading());
      try {
        const { reading } = await api(`/api/solo/reading?kind=${kind}&exclude=${encodeURIComponent(current?.title || '')}`);
        current = reading;
        const saveBtn = h('button', { class: 'btn soft', onclick: (e) => saveFavorite('reading', reading, e.currentTarget) }, '⭐ Save');
        out.replaceChildren(h('article', { class: 'card reading' },
          h('div', { class: 'kind-tag' }, `${reading.kind} · ${reading.minutes} min read`),
          h('h2', {}, reading.title),
          h('p', { class: 'muted' }, `by ${reading.author}`),
          reading.image && h('img', { src: reading.image, alt: '' }),
          h('div', { class: `body${reading.kind === 'poem' ? ' poem' : ''}` }, reading.body),
          h('div', { class: 'content-actions' },
            h('button', { class: 'btn', onclick: load }, 'Read something else →'),
            saveBtn,
            reading.sourceUrl && h('a', { class: 'btn ghost', href: reading.sourceUrl, target: '_blank', rel: 'noopener' },
              reading.source === 'Wikipedia' ? 'Read full article ↗' : `Source: ${reading.source} ↗`)),
          !reading.sourceUrl && h('p', { class: 'small muted', style: 'margin-top:14px' }, `From the ${reading.source}.`)));
        onScroll();
      } catch (e) { out.replaceChildren(h('div', { class: 'alert error' }, e.message)); }
    }
    load();
    return () => window.removeEventListener('scroll', onScroll);
  }

  /* ------------------------- Makeup ------------------------- */
  function renderMakeup() {
    let vibe = 'any';
    let current = null;
    const out = h('div');
    const chips = h('div', { class: 'chips', style: 'margin:16px 0 24px' });
    view.append(crumbs('#/solo', 'Solo activities'), h('h1', {}, 'Makeup inspo 💄'),
      h('p', { class: 'muted' }, 'Pick a vibe, or let us surprise you.'), chips, out);

    api('/api/solo/makeup/vibes').then(({ vibes }) => {
      ['any', ...vibes].forEach((v) => chips.append(
        h('button', { class: `chip${v === vibe ? ' active' : ''}`, 'data-v': v, onclick: () => { vibe = v; load(); } }, v === 'any' ? '✨ Surprise me' : v)));
    }).catch(() => {});

    function face(palette) {
      // Tiny illustrated face that uses the look's colours
      const [c1, c2, c3, c4] = palette.map((p) => p.hex);
      const svg = `<svg viewBox="0 0 120 140" class="face-preview" role="img" aria-label="Look preview">
        <ellipse cx="60" cy="72" rx="44" ry="56" fill="#f2d3b8"/>
        <path d="M16 60 Q20 8 60 10 Q100 8 104 60 Q96 30 60 28 Q24 30 16 60Z" fill="#3b2a24"/>
        <ellipse cx="42" cy="66" rx="12" ry="6" fill="${c1}" opacity=".9"/><ellipse cx="78" cy="66" rx="12" ry="6" fill="${c1}" opacity=".9"/>
        <ellipse cx="42" cy="68" rx="5" ry="4" fill="#2b1d18"/><ellipse cx="78" cy="68" rx="5" ry="4" fill="#2b1d18"/>
        <path d="M30 63 Q42 54 54 63" stroke="${c4}" stroke-width="2.5" fill="none"/><path d="M66 63 Q78 54 90 63" stroke="${c4}" stroke-width="2.5" fill="none"/>
        <circle cx="34" cy="88" r="9" fill="${c2}" opacity=".45"/><circle cx="86" cy="88" r="9" fill="${c2}" opacity=".45"/>
        <path d="M46 104 Q60 96 74 104 Q60 116 46 104Z" fill="${c3}"/></svg>`;
      return h('div', { html: svg });
    }

    async function load() {
      chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.v === vibe));
      out.replaceChildren(loading());
      try {
        const { look } = await api(`/api/solo/makeup?vibe=${encodeURIComponent(vibe)}&exclude=${encodeURIComponent(current?.name || '')}`);
        current = look;
        const saveBtn = h('button', { class: 'btn soft', onclick: (e) => saveFavorite('makeup', { ...look, title: look.name }, e.currentTarget) }, '⭐ Save look');
        out.replaceChildren(h('article', { class: 'card' },
          h('div', { class: 'look-header' },
            h('div', {},
              h('span', { class: 'pill' }, look.vibe), ' ', h('span', { class: 'pill' }, `📍 ${look.occasion}`),
              h('h2', { style: 'margin-top:10px' }, look.name)),
            face(look.palette)),
          h('div', { class: 'palette' }, ...look.palette.map((p) =>
            h('div', { class: 'swatch' }, h('div', { class: 'color', style: `background:${p.hex}` }),
              h('div', { class: 'label' }, h('b', {}, p.name), h('br'), h('code', {}, p.hex))))),
          h('div', { class: 'look-cols' },
            h('div', {}, h('h3', {}, 'You’ll need'), h('ul', {}, ...look.products.map((p) => h('li', {}, p)))),
            h('div', {}, h('h3', {}, 'How to do it'), h('ol', {}, ...look.steps.map((s) => h('li', {}, s))))),
          h('div', { class: 'content-actions' },
            h('button', { class: 'btn', onclick: () => { vibe = 'any'; load(); } }, '🔀 Another look'),
            saveBtn,
            h('a', { class: 'btn ghost', target: '_blank', rel: 'noopener',
              href: `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(look.name + ' makeup look')}` }, 'More photos on Pinterest ↗'))));
      } catch (e) { out.replaceChildren(h('div', { class: 'alert error' }, e.message)); }
    }
    load();
  }

  /* ------------------------- Saved ------------------------- */
  function renderSaved() {
    const out = h('div', {}, loading());
    view.append(crumbs('#/home', 'Home'), h('h1', {}, 'Saved ⭐'), h('p', { class: 'muted' }, 'Recipes, reads and looks you kept.'), out);
    const icons = { recipe: '🍳', reading: '📖', makeup: '💄' };
    api('/api/solo/favorites').then(({ favorites }) => {
      if (!favorites.length) {
        out.replaceChildren(h('div', { class: 'empty-state' }, h('div', { class: 'big' }, '🗂'),
          h('p', {}, 'Nothing saved yet. Tap “Save” on any recipe, reading or look.'), h('a', { class: 'btn', href: '#/solo' }, 'Explore solo activities')));
        return;
      }
      out.replaceChildren(h('div', { class: 'tiles' }, ...favorites.map((f) => {
        const details = h('div', { class: 'small muted hidden', style: 'white-space:pre-wrap' });
        const p = f.payload;
        if (f.kind === 'recipe') details.textContent = `Ingredients:\n• ${p.ingredients.join('\n• ')}\n\nMethod:\n${p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
        if (f.kind === 'reading') details.textContent = p.body;
        if (f.kind === 'makeup') details.textContent = p.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');
        const tile = h('div', { class: 'tile' },
          h('div', { class: 'tile-emoji bg-sun' }, icons[f.kind]),
          h('h3', {}, f.title),
          h('span', { class: 'small muted' }, `${f.kind} · saved ${new Date(f.created_at.replace(' ', 'T') + 'Z').toLocaleDateString()}`),
          details,
          h('div', { class: 'meta' },
            h('button', { class: 'btn small soft', onclick: (e) => { details.classList.toggle('hidden'); e.currentTarget.textContent = details.classList.contains('hidden') ? 'Open' : 'Close'; } }, 'Open'),
            h('button', { class: 'btn small ghost', onclick: async () => {
              await api(`/api/solo/favorites/${f.id}`, { method: 'DELETE' });
              tile.remove();
              toast('Removed');
            } }, 'Remove')));
        return tile;
      })));
    }).catch((e) => out.replaceChildren(h('div', { class: 'alert error' }, e.message)));
  }

  /* ------------------------- Group lobby ------------------------- */
  function renderGroup() {
    const grid = h('div', { class: 'tiles' }, loading());
    const info = h('p', { class: 'muted', style: 'margin-bottom:24px' });
    view.append(crumbs('#/home', 'Home'), h('h1', {}, 'Group activities'), info, grid);
    const bgs = ['bg-coral', 'bg-teal', 'bg-sun', 'bg-violet'];

    async function load() {
      try {
        const data = await api('/api/group/activities');
        const hrs = Math.floor(data.resetsInMs / 3600000);
        const mins = Math.floor((data.resetsInMs % 3600000) / 60000);
        info.textContent = `Pick an activity to join today’s group chat with everyone else who picked it. Chats last for the day and a fresh group forms every midnight (next reset in ${hrs}h ${mins}m).`;
        grid.replaceChildren(...data.activities.map((a, i) =>
          h('a', { class: 'tile', href: `#/group/${a.key}` },
            h('div', { class: `tile-emoji ${bgs[i % 4]}` }, a.emoji),
            h('h3', {}, a.name),
            h('p', { class: 'muted small' }, a.blurb),
            h('div', { class: 'meta' },
              h('span', { class: `pill${a.online ? ' live' : ''}` }, `${a.online} online`),
              h('span', { class: 'pill' }, `💬 ${a.messagesToday} today`)))));
      } catch (e) { grid.replaceChildren(h('div', { class: 'alert error' }, e.message)); }
    }
    load();
    socket.emit('lobby:watch');
    let t;
    const onUpdate = () => { clearTimeout(t); t = setTimeout(load, 400); };
    socket.on('lobby:update', onUpdate);
    return () => socket.off('lobby:update', onUpdate);
  }

  boot();
})();

// Doodle of the day: drawing canvas with colours, brush size, eraser, undo, save & download.
const Doodle = (() => {
  const { api, toast, h } = Vibe;
  const COLORS = ['#1f1b2e', '#ff6b4a', '#ffc94a', '#1fa595', '#7a5cfa', '#e04f8c', '#2f80ed', '#16a34a', '#8b5e3c', '#ffffff'];

  function mount(view) {
    view.append(document.getElementById('tpl-doodle').content.cloneNode(true));
    const $ = (sel) => view.querySelector(sel);
    const canvas = $('#doodleCanvas');
    const ctx = canvas.getContext('2d');
    let prompt = '';
    let color = COLORS[0];
    let size = 6;
    let tool = 'pen';
    let drawing = false;
    let last = null;
    let dirty = false;
    const history = [];

    function fillWhite() {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    fillWhite();

    // Prompt of the day
    api('/api/solo/doodle/today').then((d) => {
      prompt = d.prompt;
      $('[data-day]').textContent = new Date(d.day + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
      $('[data-prompt]').textContent = d.prompt;
      $('[data-tip]').textContent = `💡 ${d.tip}`;
    }).catch((e) => toast(e.message));

    // Palette
    const colorsEl = $('[data-colors]');
    COLORS.forEach((c, i) => {
      const b = h('button', { class: `color-btn${i === 0 ? ' active' : ''}`, style: `background:${c}`, 'aria-label': `Colour ${c}` });
      b.addEventListener('click', () => setColor(c, b));
      colorsEl.append(b);
    });
    function setColor(c, btn) {
      color = c;
      colorsEl.querySelectorAll('.color-btn').forEach((x) => x.classList.toggle('active', x === btn));
      setTool('pen');
    }
    $('[data-custom]').addEventListener('input', (e) => setColor(e.target.value, null));

    const sizeInput = $('[data-size]');
    sizeInput.addEventListener('input', () => { size = Number(sizeInput.value); $('[data-size-label]').textContent = size; });

    function setTool(t) {
      tool = t;
      view.querySelectorAll('[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    }
    view.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

    // Drawing with pointer events (mouse, touch, pen)
    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * (canvas.width / r.width), y: (e.clientY - r.top) * (canvas.height / r.height) };
    }
    function snapshot() {
      history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (history.length > 30) history.shift();
    }
    function stroke(from, to, pressure = 0.5) {
      ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
      const scale = canvas.width / canvas.getBoundingClientRect().width;
      ctx.lineWidth = (tool === 'eraser' ? size * 2.5 : size) * scale * (0.6 + pressure * 0.8);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      snapshot();
      drawing = true;
      last = pos(e);
      stroke(last, { x: last.x + 0.1, y: last.y + 0.1 }, e.pressure || 0.5);
      dirty = true;
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      stroke(last, p, e.pointerType === 'pen' ? e.pressure : 0.5);
      last = p;
    });
    const stop = () => { drawing = false; last = null; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);

    $('[data-undo]').addEventListener('click', () => {
      const prev = history.pop();
      if (prev) ctx.putImageData(prev, 0, 0);
      else toast('Nothing to undo');
    });
    $('[data-clear]').addEventListener('click', () => {
      if (!dirty) return;
      if (!confirm('Clear your drawing?')) return;
      snapshot();
      fillWhite();
      dirty = false;
    });
    $('[data-download]').addEventListener('click', () => {
      const a = document.createElement('a');
      a.download = `doodle-${new Date().toISOString().slice(0, 10)}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    });

    // Save: downscale to keep the database light
    $('[data-save]').addEventListener('click', async (e) => {
      if (!dirty) return toast('Draw something first ✏️');
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const small = document.createElement('canvas');
        small.width = 800; small.height = 600;
        small.getContext('2d').drawImage(canvas, 0, 0, 800, 600);
        await api('/api/solo/doodle', { method: 'POST', body: { image: small.toDataURL('image/jpeg', 0.85) } });
        toast('Doodle saved! 🎨');
        loadGalleries();
      } catch (err) { toast(err.message); }
      btn.disabled = false;
    });

    // 5-minute challenge timer
    let timer = null;
    const timerBtn = $('[data-timer]');
    timerBtn.addEventListener('click', () => {
      if (timer) { clearInterval(timer); timer = null; timerBtn.textContent = '⏱ 5-min challenge'; return; }
      let left = 300;
      const tick = () => {
        timerBtn.textContent = `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} — stop`;
        if (left-- <= 0) { clearInterval(timer); timer = null; timerBtn.textContent = '⏱ 5-min challenge'; toast("Time's up! Save your doodle 🎉"); }
      };
      tick();
      timer = setInterval(tick, 1000);
    });

    // Galleries
    async function loadGalleries() {
      const community = $('[data-community]');
      const mine = $('[data-mine]');
      try {
        const [c, m] = await Promise.all([api('/api/solo/doodle/community'), api('/api/solo/doodle/mine')]);
        community.replaceChildren(...(c.doodles.length ? c.doodles.map((d) =>
          h('figure', {}, h('img', { src: d.image_data, alt: `Doodle by ${d.username}`, loading: 'lazy' }),
            h('figcaption', {}, `@${d.username}`)))
          : [h('p', { class: 'muted' }, 'No one has shared today’s doodle yet — be the first!')]));
        mine.replaceChildren(...(m.doodles.length ? m.doodles.map((d) => {
          const fig = h('figure', {},
            h('img', { src: d.image_data, alt: d.prompt, loading: 'lazy' }),
            h('figcaption', {}, `${d.day} · ${d.prompt}`),
            h('button', { class: 'del', title: 'Delete', onclick: async () => {
              if (!confirm('Delete this doodle?')) return;
              await api(`/api/solo/doodle/${d.id}`, { method: 'DELETE' });
              loadGalleries();
            } }, '✕'));
          return fig;
        }) : [h('p', { class: 'muted' }, 'Your saved doodles will show up here.')]));
      } catch (err) { toast(err.message); }
    }
    loadGalleries();

    const beforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      if (timer) clearInterval(timer);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }

  return { mount };
})();

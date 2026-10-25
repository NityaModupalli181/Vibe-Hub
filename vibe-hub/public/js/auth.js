(() => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const errorBox = document.getElementById('authError');
  const tabs = document.querySelectorAll('.tabs button');

  // Already logged in? Go straight to the app.
  Vibe.api('/api/auth/me').then(() => location.replace('/app')).catch(() => {});

  function showTab(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    loginForm.classList.toggle('hidden', name !== 'login');
    registerForm.classList.toggle('hidden', name !== 'register');
    errorBox.classList.add('hidden');
  }
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
  if (location.hash === '#register') showTab('register');

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  async function submit(form, url) {
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    errorBox.classList.add('hidden');
    try {
      await Vibe.api(url, { method: 'POST', body: Object.fromEntries(new FormData(form)) });
      location.replace('/app');
    } catch (e) {
      showError(e.message);
      btn.disabled = false;
    }
  }

  loginForm.addEventListener('submit', (e) => { e.preventDefault(); submit(loginForm, '/api/auth/login'); });
  registerForm.addEventListener('submit', (e) => { e.preventDefault(); submit(registerForm, '/api/auth/register'); });
})();

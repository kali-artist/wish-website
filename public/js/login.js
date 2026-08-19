/* ============================================
   THREE WISHES · 登录页逻辑
   ============================================ */
(function () {
  'use strict';

  const form = document.getElementById('loginForm');
  const input = document.getElementById('password');
  const errEl = document.getElementById('errorMsg');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = input.value.trim();
    if (!password) {
      showError('请输入密码');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || '密码错误');
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
        btn.disabled = false;
        return;
      }

      // 登录成功 → 粒子爆炸
      const rect = btn.getBoundingClientRect();
      const ox = rect.left + rect.width / 2;
      const oy = rect.top + rect.height / 2;
      if (typeof window.fireBurst === 'function') {
        window.fireBurst(ox, oy);
        setTimeout(() => window.fireBurst(ox, oy + 30), 100);
      }

      localStorage.setItem('wish_token', data.token);
      setTimeout(() => { window.location.href = '/wish.html'; }, 700);
    } catch (err) {
      showError('网络异常');
      btn.disabled = false;
    }
  });

  function showError(msg) {
    errEl.textContent = msg;
    errEl.classList.add('show');
    setTimeout(() => errEl.classList.remove('show'), 3000);
  }

  // 自动聚焦
  setTimeout(() => input.focus(), 600);
})();
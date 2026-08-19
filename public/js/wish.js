/* ============================================
   THREE WISHES · 许愿页逻辑
   ============================================ */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const form = $('#wishForm');
  const textarea = $('#wishContent');
  const charCount = $('#charCount');
  const counterValue = $('#counterValue');
  const slots = $$('.slot');
  const formWrap = $('#formWrap');
  const exhausted = $('#exhausted');
  const wishBtn = $('#wishBtn');
  const logoutBtn = $('#logoutBtn');
  const toast = $('#toast') || createToast();

  function getToken() { return localStorage.getItem('wish_token'); }

  // ---------- Toast ----------
  function createToast() {
    const t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
    return t;
  }
  let toastTimer;
  function showToast(msg, type) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.toggle('error', type === 'error');
    requestAnimationFrame(() => toast.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  // ---------- 标题字符逐字渐显 ----------
  function splitTitle() {
    const el = $('#heroTitle');
    if (!el) return;
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.textContent = ch === ' ' ? '\u00A0' : ch;
      span.style.animationDelay = (i * 0.05) + 's';
      el.appendChild(span);
    });
  }
  splitTitle();

  // ---------- 字符计数 ----------
  textarea.addEventListener('input', () => {
    const n = textarea.value.length;
    charCount.textContent = `${n} / 500`;
    charCount.classList.toggle('warn', n > 450);
  });

  // ---------- 槽位文字逐字入场 ----------
  function fillSlotWords(slotEl, text) {
    const contentEl = slotEl.querySelector('.slot-content');
    contentEl.innerHTML = '';
    // 按词拆分（中文按字）
    const tokens = text.match(/[\u4e00-\u9fa5]|[^\u4e00-\u9fa5\s]+|\s+/g) || [];
    tokens.forEach((tok, i) => {
      if (/^\s+$/.test(tok)) {
        contentEl.appendChild(document.createTextNode(' '));
        return;
      }
      const span = document.createElement('span');
      span.className = 'word';
      span.textContent = tok;
      span.style.animationDelay = (i * 0.04) + 's';
      contentEl.appendChild(span);
    });
  }

  // ---------- 计数器数字滚动动画 ----------
  function animateCounter(target) {
    const current = parseInt(counterValue.textContent);
    if (current === target) return;
    const steps = Math.abs(current - target);
    if (steps === 0) return;
    const dur = 700;
    const start = performance.now();
    const startVal = current;
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(startVal + (target - startVal) * eased);
      counterValue.textContent = v;
      if (t < 1) requestAnimationFrame(step);
      else {
        counterValue.textContent = target;
        counterValue.classList.add('tick');
        setTimeout(() => counterValue.classList.remove('tick'), 700);
        if (target === 0) counterValue.classList.add('zero');
      }
    }
    requestAnimationFrame(step);
  }

  // ---------- 渲染心愿数据 ----------
  function renderWishes(state) {
    const { wishes, remaining } = state;
    slots.forEach((slot, i) => {
      const w = wishes[i];
      const text = (w && typeof w === 'object') ? w.content : (w || '');
      if (text) {
        if (!slot.classList.contains('filled')) {
          slot.classList.add('filling');
          fillSlotWords(slot, text);
          setTimeout(() => slot.classList.add('filled'), 50);
          setTimeout(() => slot.classList.remove('filling'), 800);
        } else {
          fillSlotWords(slot, text);
        }
      } else {
        slot.querySelector('.slot-content').innerHTML = '';
        slot.classList.remove('filled');
      }
    });
    animateCounter(remaining);

    if (remaining <= 0) {
      formWrap.classList.add('hidden');
      exhausted.classList.remove('hidden');
    } else {
      formWrap.classList.remove('hidden');
      exhausted.classList.add('hidden');
    }
  }

  // ---------- 获取状态 ----------
  async function loadStatus() {
    const token = getToken();
    if (!token) { window.location.href = '/'; return; }
    try {
      const res = await fetch('/api/status', {
        headers: { 'x-auth-token': token }
      });
      if (res.status === 401) {
        localStorage.removeItem('wish_token');
        window.location.href = '/';
        return;
      }
      const data = await res.json();
      renderWishes(data);
    } catch (e) {
      showToast('网络异常', 'error');
    }
  }

  // ---------- 许愿 ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = textarea.value.trim();
    if (!content) {
      showToast('请写下你的心愿', 'error');
      textarea.focus();
      return;
    }
    if (content.length > 500) {
      showToast('心愿过长', 'error');
      return;
    }

    wishBtn.disabled = true;
    try {
      const res = await fetch('/api/wish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': getToken()
        },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || '许愿失败', 'error');
        wishBtn.disabled = false;
        return;
      }

      // 许愿成功 → 粒子爆炸
      const rect = wishBtn.getBoundingClientRect();
      const ox = rect.left + rect.width / 2;
      const oy = rect.top + rect.height / 2;
      if (typeof window.fireBurst === 'function') {
        window.fireBurst(ox, oy);
        // 二次爆炸：稍偏
        setTimeout(() => window.fireBurst(ox - 60, oy - 30), 120);
        setTimeout(() => window.fireBurst(ox + 60, oy - 30), 240);
      }

      textarea.value = '';
      charCount.textContent = '0 / 500';
      renderWishes(data);

      if (data.remaining > 0) {
        showToast(`愿望已刻入星河 · 剩余 ${data.remaining}`, 'success');
      } else {
        showToast('三愿已尽 · 命运已定', 'success');
      }
    } catch (err) {
      showToast('网络异常', 'error');
    } finally {
      wishBtn.disabled = false;
    }
  });

  // ---------- 登出 ----------
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'x-auth-token': getToken() }
      });
    } catch (e) {}
    localStorage.removeItem('wish_token');
    window.location.href = '/';
  });

  // ---------- 启动 ----------
  loadStatus();
})();
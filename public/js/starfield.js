/* ============================================
   THREE WISHES · 星尘 / 流星 / 粒子系统
   ============================================ */
(function () {
  'use strict';

  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 鼠标光标位置
  const mouse = { x: -9999, y: -9999 };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  // 响应式
  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------- 星尘 ----------
  const stars = [];
  function makeStars() {
    stars.length = 0;
    const count = Math.floor((W * H) / 4500);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 1 + 0.2,           // 大小权重
        base: Math.random() * 0.6 + 0.2,     // 基础亮度
        phase: Math.random() * Math.PI * 2,  // 闪烁相位
        twinkle: Math.random() * 0.015 + 0.005,
        hue: Math.random() < 0.85 ? '#fff8e8' : (Math.random() < 0.5 ? '#ffe9c0' : '#cfd9ff')
      });
    }
  }
  makeStars();
  window.addEventListener('resize', makeStars);

  // ---------- 流星 ----------
  const meteors = [];
  function spawnMeteor() {
    meteors.push({
      x: Math.random() * W * 1.2 - W * 0.1,
      y: -20 - Math.random() * 60,
      vx: 4 + Math.random() * 5,
      vy: 2.5 + Math.random() * 3,
      life: 0,
      maxLife: 80 + Math.random() * 50,
      len: 100 + Math.random() * 180,
      bright: 0.7 + Math.random() * 0.3
    });
  }
  setInterval(() => { if (meteors.length < 3 && Math.random() < 0.7) spawnMeteor(); }, 1400);

  // ---------- 飘动尘埃 ----------
  const dusts = [];
  function makeDust() {
    dusts.length = 0;
    const count = 35;
    for (let i = 0; i < count; i++) {
      dusts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.1 - 0.05,  // 略微上飘
        phase: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.4 + 0.1
      });
    }
  }
  makeDust();
  window.addEventListener('resize', makeDust);

  // ---------- 渲染循环 ----------
  let frame = 0;
  function draw() {
    frame++;
    // 渐隐拖尾
    ctx.fillStyle = 'rgba(5, 4, 9, 0.22)';
    ctx.fillRect(0, 0, W, H);

    // 鼠标位置附近的柔光
    if (mouse.x > 0) {
      const grd = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 240);
      grd.addColorStop(0, 'rgba(212, 165, 116, 0.06)');
      grd.addColorStop(1, 'rgba(212, 165, 116, 0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    // 流星
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life++;
      m.x += m.vx;
      m.y += m.vy;

      const tailX = m.x - (m.vx / Math.hypot(m.vx, m.vy)) * m.len;
      const tailY = m.y - (m.vy / Math.hypot(m.vx, m.vy)) * m.len;

      const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
      grad.addColorStop(0, `rgba(255, 240, 210, ${m.bright})`);
      grad.addColorStop(0.4, `rgba(232, 199, 154, ${m.bright * 0.4})`);
      grad.addColorStop(1, 'rgba(232, 199, 154, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      // 头部光点
      ctx.fillStyle = `rgba(255, 248, 230, ${m.bright})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.4, 0, Math.PI * 2);
      ctx.fill();

      if (m.life > m.maxLife || m.x > W + 200 || m.y > H + 200) {
        meteors.splice(i, 1);
      }
    }

    // 星尘
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const tw = Math.sin(frame * s.twinkle + s.phase) * 0.3 + 0.7;
      const alpha = s.base * tw;
      ctx.fillStyle = s.hue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.z, 0, Math.PI * 2);
      ctx.fill();

      // 大星加十字光芒
      if (s.z > 0.9) {
        ctx.globalAlpha = alpha * 0.4;
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = s.hue;
        ctx.beginPath();
        ctx.moveTo(s.x - s.z * 4, s.y);
        ctx.lineTo(s.x + s.z * 4, s.y);
        ctx.moveTo(s.x, s.y - s.z * 4);
        ctx.lineTo(s.x, s.y + s.z * 4);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // 尘埃
    for (let i = 0; i < dusts.length; i++) {
      const d = dusts[i];
      d.x += d.vx + Math.sin((frame + i) * 0.01) * 0.1;
      d.y += d.vy;
      if (d.x < -10) d.x = W + 10;
      if (d.x > W + 10) d.x = -10;
      if (d.y < -10) d.y = H + 10;
      if (d.y > H + 10) d.y = -10;

      const a = d.alpha * (0.6 + 0.4 * Math.sin(frame * 0.02 + d.phase));
      ctx.fillStyle = `rgba(232, 213, 175, ${a})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  draw();

  // 初始化后立刻渲染第一帧
  ctx.fillStyle = '#050409';
  ctx.fillRect(0, 0, W, H);

  // ---------- 粒子爆炸 ----------
  const burstCanvas = document.getElementById('burst');
  if (burstCanvas) {
    const burstCtx = burstCanvas.getContext('2d');
    const bursts = [];
    function resizeBurst() {
      burstCanvas.width = window.innerWidth * DPR;
      burstCanvas.height = window.innerHeight * DPR;
      burstCanvas.style.width = window.innerWidth + 'px';
      burstCanvas.style.height = window.innerHeight + 'px';
      burstCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resizeBurst();
    window.addEventListener('resize', resizeBurst);

    window.fireBurst = function (originX, originY, color) {
      const count = 60;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 1.5;
        bursts.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: Math.random() * 2.2 + 0.6,
          life: 0,
          maxLife: 60 + Math.random() * 30,
          color: color || (Math.random() < 0.5 ? '#f0d4a0' : '#d4a574')
        });
      }
    };

    function drawBurst() {
      burstCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = bursts.length - 1; i >= 0; i--) {
        const p = bursts[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.vy += 0.05;

        const t = 1 - p.life / p.maxLife;
        if (t <= 0) continue;
        burstCtx.globalAlpha = t;
        burstCtx.fillStyle = p.color;
        burstCtx.beginPath();
        burstCtx.arc(p.x, p.y, Math.max(0.1, p.r * t), 0, Math.PI * 2);
        burstCtx.fill();

        // 拖尾
        burstCtx.globalAlpha = t * 0.4;
        burstCtx.strokeStyle = p.color;
        burstCtx.lineWidth = p.r * 0.6;
        burstCtx.lineCap = 'round';
        burstCtx.beginPath();
        burstCtx.moveTo(p.x, p.y);
        burstCtx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
        burstCtx.stroke();

        if (p.life > p.maxLife) bursts.splice(i, 1);
      }
      burstCtx.globalAlpha = 1;
      requestAnimationFrame(drawBurst);
    }
    drawBurst();
  }

  // ---------- Timecode ----------
  const tcEl = document.getElementById('timecode');
  if (tcEl) {
    const start = Date.now();
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
      const s = String(elapsed % 60).padStart(2, '0');
      const f = String(Math.floor(((Date.now() - start) / 1000 % 1) * 24)).padStart(2, '0');
      tcEl.textContent = `REC ${h}:${m}:${s}:${f}`;
    }, 80);
  }

  // ---------- Chapter 标签切换 ----------
  const chapterEl = document.getElementById('chapterTag');
  if (chapterEl) {
    const onLogin = document.body.classList.contains('page-login');
    chapterEl.textContent = onLogin ? '第一章 · 序章' : '第一章 · 许愿';
  }
})();
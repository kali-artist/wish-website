/**
 * 心愿实现网站 - 后端服务
 * 三个愿望，用完即永恒
 */

const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== 配置 ====================
const CONFIG = {
  // 登录密码（明文存储仅作演示，生产请用 bcrypt）
  password: process.env.WISH_PASSWORD || 'wish2026',
  // 总共可许愿次数（永久、不可恢复）
  maxWishes: 3,
  // 心愿回调：HTTP Webhook（留空则不发送）
  webhookUrl: process.env.WISH_WEBHOOK_URL || '',
  // 心愿回调：邮件（留空则不发送，需自行接入 nodemailer）
  emailTo: process.env.WISH_EMAIL_TO || '',
  // Session 密钥
  sessionSecret: process.env.WISH_SESSION_SECRET || 'cinematic-wish-2026',
};

// ==================== 数据持久化 ====================
const DATA_FILE = path.join(__dirname, 'data', 'wishes.json');
const SESSION_FILE = path.join(__dirname, 'data', 'sessions.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ wishes: [], remaining: CONFIG.maxWishes }, null, 2));
  }
  if (!fs.existsSync(SESSION_FILE)) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify({}, null, 2));
  }
}

function readData() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    return { wishes: [], remaining: CONFIG.maxWishes };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function readSessions() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function writeSessions(sessions) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

// ==================== 会话管理 ====================
function generateToken() {
  return require('crypto').randomBytes(24).toString('hex');
}

function isAuthenticated(req) {
  const token = req.headers['x-auth-token'];
  if (!token) return false;
  const sessions = readSessions();
  return !!sessions[token];
}

function logActivity(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(path.join(__dirname, 'logs', 'activity.log'), line);
  console.log(line.trim());
}

// ==================== Webhook / Email 回调 ====================
function sendWebhook(wish) {
  if (!CONFIG.webhookUrl) return Promise.resolve({ skipped: true });
  return new Promise((resolve) => {
    try {
      const u = new URL(CONFIG.webhookUrl);
      const payload = JSON.stringify({
        text: `✨ 新的心愿：\n${wish.content}`,
        content: wish.content,
        author: wish.author || 'anonymous',
        time: wish.createdAt,
        remaining: wish.remainingAfter,
      });
      const opts = {
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        path: u.pathname + u.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: 5000,
      };
      const lib = u.protocol === 'https:' ? https : http;
      const req = lib.request(opts, (res) => {
        logActivity(`Webhook sent: ${res.statusCode}`);
        resolve({ status: res.statusCode });
      });
      req.on('error', (e) => {
        logActivity(`Webhook error: ${e.message}`);
        resolve({ error: e.message });
      });
      req.on('timeout', () => {
        req.destroy();
        resolve({ error: 'timeout' });
      });
      req.write(payload);
      req.end();
    } catch (e) {
      resolve({ error: e.message });
    }
  });
}

function sendEmail(wish) {
  // 占位实现：如需真实发送邮件，请安装 nodemailer 并配置 SMTP
  if (!CONFIG.emailTo) return Promise.resolve({ skipped: true });
  logActivity(`Email queued to ${CONFIG.emailTo}: ${wish.content}`);
  // TODO: 接入 nodemailer / SendGrid / Resend 等
  return Promise.resolve({ queued: true });
}

// ==================== 中间件 ====================
app.use(bodyParser.json({ limit: '64kb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== 路由 ====================

// 登录
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== CONFIG.password) {
    logActivity(`登录失败：密码错误`);
    return res.status(401).json({ ok: false, error: '密码错误' });
  }
  const token = generateToken();
  const sessions = readSessions();
  sessions[token] = { createdAt: Date.now() };
  writeSessions(sessions);
  logActivity(`登录成功`);
  res.json({ ok: true, token });
});

// 登出
app.post('/api/logout', (req, res) => {
  const token = req.headers['x-auth-token'];
  if (token) {
    const sessions = readSessions();
    delete sessions[token];
    writeSessions(sessions);
  }
  res.json({ ok: true });
});

// 查询状态（剩余次数 + 历史愿望）
app.get('/api/status', (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ ok: false, error: '未登录' });
  const data = readData();
  res.json({
    ok: true,
    remaining: data.remaining,
    max: CONFIG.maxWishes,
    wishes: data.wishes,
  });
});

// 许愿
app.post('/api/wish', async (req, res) => {
  if (!isAuthenticated(req)) return res.status(401).json({ ok: false, error: '未登录' });
  const { content } = req.body || {};
  if (!content || typeof content !== 'string' || !content.trim()) {
    return res.status(400).json({ ok: false, error: '心愿不能为空' });
  }
  if (content.length > 500) {
    return res.status(400).json({ ok: false, error: '心愿过长（≤500字）' });
  }
  const data = readData();
  if (data.remaining <= 0) {
    return res.status(403).json({ ok: false, error: '愿望已用尽，永恒不可恢复' });
  }
  // 永久递减
  data.remaining -= 1;
  const wish = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    content: content.trim(),
    createdAt: new Date().toISOString(),
    remainingAfter: data.remaining,
  };
  data.wishes.push(wish);
  writeData(data);

  logActivity(`许愿：${wish.content.slice(0, 30)}... 剩余 ${data.remaining}`);

  // 异步回调（不阻塞响应）
  Promise.allSettled([sendWebhook(wish), sendEmail(wish)]).then((results) => {
    logActivity(`回调结果：${JSON.stringify(results)}`);
  });

  res.json({ ok: true, wish, wishes: data.wishes, remaining: data.remaining });
});

// 健康检查
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// 启动
ensureDataFile();
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log('  ✨ 心愿实现网站已启动');
  console.log(`  🌐 访问地址: http://localhost:${PORT}`);
  console.log(`  🔑 默认密码: ${CONFIG.password}`);
  console.log(`  📊 总愿望数: ${CONFIG.maxWishes}（不可恢复）`);
  console.log(`  📡 Webhook: ${CONFIG.webhookUrl || '未配置'}`);
  console.log(`  📧 Email:   ${CONFIG.emailTo || '未配置'}`);
  console.log('═══════════════════════════════════════════════');
});
# ✦ Three Wishes · 心愿实现网站

电影感许愿网站，三个愿望，一旦许下，永恒不可恢复。

## 🎬 视觉风格
- 深色电影海报风格 · 香槟金高亮
- 衬线字体（Cormorant Garamond + Noto Serif SC）
- 实时星尘粒子背景 + 偶发流星划过
- 胶片颗粒动画 + 镜头渐晕效果
- 玻璃拟态卡片 + 优雅发光描边

## 🚀 启动方式

### 方式一：一键启动（推荐）
双击 `启动.bat` 即可。

### 方式二：命令行
```bash
cd D:\wish-website
node server.js
```
然后浏览器访问 http://localhost:3000

> 默认密码：**wish2026**

## 🔐 配置项（环境变量）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 监听端口 |
| `WISH_PASSWORD` | wish2026 | 登录密码 |
| `WISH_WEBHOOK_URL` | (空) | 心愿回调 HTTP Webhook |
| `WISH_EMAIL_TO` | (空) | 心愿回调邮件地址 |
| `WISH_SESSION_SECRET` | cinematic-wish-2026 | 会话密钥 |

示例：
```bash
set WISH_WEBHOOK_URL=https://hooks.example.com/wish
set WISH_EMAIL_TO=you@example.com
node server.js
```

## 📡 回调格式

### HTTP Webhook（POST JSON）
```json
{
  "text": "✨ 新的心愿：\n<心愿内容>",
  "content": "<心愿内容>",
  "author": "anonymous",
  "time": "2026-08-19T...",
  "remaining": 2
}
```

### 邮件
当前为占位实现，需要在 `server.js` 的 `sendEmail()` 函数中接入 nodemailer / SendGrid / Resend 等邮件服务。

## 📁 项目结构

```
wish-website/
├── server.js              # 后端 Express 服务
├── package.json
├── 启动.bat               # 一键启动脚本
├── data/
│   ├── wishes.json        # 心愿数据（永久存储）
│   └── sessions.json      # 会话 token
├── logs/
│   └── activity.log       # 操作日志
└── public/
    ├── index.html         # 登录页
    ├── wish.html          # 许愿主页
    ├── css/style.css      # 电影感样式
    └── js/
        ├── starfield.js   # 星尘背景
        ├── login.js       # 登录逻辑
        └── wish.js        # 许愿逻辑
```

## ⚠ 重要提醒

- **永久性递减**：每次许愿都会从 `data/wishes.json` 永久扣减，重新初始化数据前不可恢复
- **不可重置**：服务器没有提供"重置愿望数"接口，避免误操作导致心愿消失
- **如需重置**：手动编辑 `data/wishes.json`，把 `remaining` 改回 3 即可（同样会丢失所有心愿记录）

## 🎬 预览

打开浏览器访问 http://localhost:3000 即可。

---

_Made with cinematic care · 2026_
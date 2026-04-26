import type { ChatSession } from '../types'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Generate a self-contained HTML file that embeds one or more conversations.
 * The HTML is a minimal viewer: it parses the embedded JSON and renders
 * messages with markdown, code highlighting, and a Monday-like UI.
 * No server required — just open the file in any browser.
 */
export function generateShareHtml(sessions: ChatSession[], title: string): string {
  // Embed conversation data as JSON inside a <script> tag
  var jsonStr = JSON.stringify({ title: title, sessions: sessions })
  // Escape for safe embedding in <script> context
  var safeJson = jsonStr
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')

  // Build CSS
  var css = [
    ':root {',
    '  --bg: #0a0a1a; --surface: #12122a; --surface2: #1a1a3e;',
    '  --text: #e0e0f0; --text-dim: #8888aa; --accent: #a78bfa;',
    '  --accent-glow: rgba(167,139,250,0.15); --user-bg: #1e1e42;',
    '  --code-bg: #0d0d1f; --border: #2a2a4a;',
    '  --scrollbar: #2a2a4a; --scrollbar-thumb: #4a4a7a;',
    '}',
    '.light {',
    '  --bg: #f4f4f8; --surface: #ffffff; --surface2: #eaeaf0;',
    '  --text: #1a1a2e; --text-dim: #666688; --accent: #7c3aed;',
    '  --accent-glow: rgba(124,58,237,0.1); --user-bg: #ede9fe;',
    '  --code-bg: #f0f0f8; --border: #d0d0e0;',
    '  --scrollbar: #e0e0e8; --scrollbar-thumb: #b0b0c8;',
    '}',
    '* { margin: 0; padding: 0; box-sizing: border-box; }',
    'body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; transition: background .3s,color .3s; }',
    '.viewer-header { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: var(--surface); border-bottom: 1px solid var(--border); backdrop-filter: blur(12px); }',
    '.viewer-title { font-size: 18px; font-weight: 600; background: linear-gradient(135deg, var(--accent),#c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }',
    '.viewer-actions { display: flex; gap: 8px; align-items: center; }',
    '.viewer-btn { padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface2); color: var(--text); cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 4px; transition: all .2s; }',
    '.viewer-btn:hover { border-color: var(--accent); color: var(--accent); }',
    '.viewer-body { max-width: 800px; margin: 0 auto; padding: 24px 16px 64px; }',
    '.session-header { margin-bottom: 24px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }',
    '.session-title { font-size: 24px; font-weight: 700; margin-bottom: 4px; }',
    '.session-meta { font-size: 12px; color: var(--text-dim); }',
    '.message { display: flex; gap: 12px; padding: 12px 0; animation: fadeIn .3s ease; }',
    '@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
    '.message-avatar { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--surface2); margin-top: 2px; }',
    '.message-avatar svg { width: 18px; height: 18px; color: var(--text-dim); }',
    '.message-user .message-avatar { background: var(--accent-glow); }',
    '.message-user .message-avatar svg { color: var(--accent); }',
    '.message-content { flex: 1; min-width: 0; }',
    '.message-name { font-size: 13px; font-weight: 600; margin-bottom: 4px; color: var(--text-dim); }',
    '.message-text { font-size: 15px; line-height: 1.7; white-space: pre-wrap; word-break: break-word; }',
    '.message-user .message-text { background: var(--user-bg); padding: 12px 16px; border-radius: 12px; border: 1px solid var(--border); }',
    '.message-assistant .message-text { padding: 4px 0; }',
    '.message-assistant .message-text p { margin-bottom: 12px; }',
    '.message-assistant .message-text p:last-child { margin-bottom: 0; }',
    '.message-assistant .message-text strong { color: var(--accent); font-weight: 600; }',
    '.message-assistant .message-text em { font-style: italic; color: var(--text-dim); }',
    '.message-assistant .message-text a { color: var(--accent); text-decoration: underline; }',
    '.message-assistant .message-text ul, .message-assistant .message-text ol { margin: 8px 0; padding-left: 24px; }',
    '.message-assistant .message-text li { margin-bottom: 4px; }',
    '.message-assistant .message-text h1, .message-assistant .message-text h2, .message-assistant .message-text h3, .message-assistant .message-text h4 { margin: 16px 0 8px; font-weight: 600; color: var(--text); }',
    '.message-assistant .message-text h1 { font-size: 22px; }',
    '.message-assistant .message-text h2 { font-size: 18px; }',
    '.message-assistant .message-text h3 { font-size: 16px; }',
    '.message-assistant .message-text blockquote { border-left: 3px solid var(--accent); padding-left: 12px; margin: 8px 0; color: var(--text-dim); }',
    '.message-assistant .message-text table { border-collapse: collapse; margin: 8px 0; width: 100%; }',
    '.message-assistant .message-text th, .message-assistant .message-text td { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }',
    '.message-assistant .message-text th { background: var(--surface2); font-weight: 600; }',
    '.code-block { margin: 8px 0; border-radius: 8px; overflow: hidden; background: var(--code-bg); border: 1px solid var(--border); }',
    '.code-header { display: flex; justify-content: space-between; align-items: center; padding: 6px 12px; background: var(--surface2); border-bottom: 1px solid var(--border); }',
    '.code-lang { font-size: 12px; color: var(--text-dim); font-weight: 600; }',
    '.code-copy { padding: 2px 8px; border-radius: 4px; border: none; background: transparent; color: var(--text-dim); cursor: pointer; font-size: 11px; transition: color .2s; }',
    '.code-copy:hover { color: var(--accent); }',
    '.code-copy.copied { color: #4ade80; }',
    '.code-body { padding: 12px; overflow-x: auto; font-size: 13px; line-height: 1.6; }',
    '.code-body code { font-family: "SF Mono","Fira Code","Cascadia Code",monospace; color: var(--text); }',
    '.inline-code { background: var(--surface2); padding: 2px 6px; border-radius: 4px; font-family: "SF Mono","Fira Code","Cascadia Code",monospace; font-size: 13px; color: var(--accent); }',
    '.timestamp { font-size: 11px; color: var(--text-dim); margin-top: 4px; }',
    '.divider { height: 1px; background: var(--border); margin: 16px 0; }',
    '::-webkit-scrollbar { width: 6px; height: 6px; }',
    '::-webkit-scrollbar-track { background: var(--scrollbar); }',
    '::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 3px; }',
    '@media (max-width: 640px) { .viewer-body { padding: 16px 8px 48px; } .viewer-header { padding: 10px 16px; } .viewer-title { font-size: 16px; } .message-text { font-size: 14px; } }',
  ].join('\n')

  // Build inner JS (no template literals to avoid conflicts)
  var userSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"/></svg>'
  var assistantSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7.001 7 0 0 1 8 18H7a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 3-5.75V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/></svg>'

  var innerJs = [
    'var __data = ' + safeJson + ';',
    'var __theme = localStorage.getItem("monday-share-theme");',
    'if (__theme === "light") { document.body.classList.add("light"); document.getElementById("theme-btn").textContent = "Light"; }',
    'function toggleTheme() { document.body.classList.toggle("light"); var isLight = document.body.classList.contains("light"); localStorage.setItem("monday-share-theme", isLight ? "light" : "dark"); document.getElementById("theme-btn").textContent = isLight ? "Light" : "Dark"; }',
    'function downloadData() { var blob = new Blob([JSON.stringify(__data, null, 2)], { type: "application/json" }); var url = URL.createObjectURL(blob); var a = document.createElement("a"); a.href = url; a.download = "monday-share.json"; a.click(); URL.revokeObjectURL(url); }',
    'function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }',
    'function renderMarkdown(text) {',
    '  if (!text) return "";',
    '  var h = text;',
    '  h = h.replace(/```(\\w*)\\n([\\s\\S]*?)```/g, function(_, lang, code) {',
    '    var l = lang || "code";',
    '    var c = esc(code.replace(/\\n$/, ""));',
    '    var id = "cb" + Math.random().toString(36).slice(2, 8);',
    '    return \'<div class="code-block"><div class="code-header"><span class="code-lang">\'+l+\'</span><button class="code-copy" onclick="copyCode(\x27\'+id+\x27)">Copy</button></div><div class="code-body"><code id="\'+id+\x27>\'+c+\'</code></div></div>\';',
    '  });',
    '  h = h.replace(/`([^`\\n]+)`/g, \'<span class="inline-code">$1</span>\');',
    '  h = h.replace(/^#### (.+)$/gm, "<h4>$1</h4>");',
    '  h = h.replace(/^### (.+)$/gm, "<h3>$1</h3>");',
    '  h = h.replace(/^## (.+)$/gm, "<h2>$1</h2>");',
    '  h = h.replace(/^# (.+)$/gm, "<h1>$1</h1>");',
    '  h = h.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, "<strong><em>$1</em></strong>");',
    '  h = h.replace(/\\*\\*(.+?)\\*\\*/g, "<strong>$1</strong>");',
    '  h = h.replace(/\\*(.+?)\\*/g, "<em>$1</em>");',
    '  h = h.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, \'<a href="$2" target="_blank" rel="noopener">$1</a>\');',
    '  h = h.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");',
    '  h = h.replace(/^- (.+)$/gm, "<li>$1</li>");',
    '  h = h.replace(/((?:<li>.*<\\/li>\\n?)+)/g, "<ul>$1</ul>");',
    '  h = h.replace(/^\\d+\\. (.+)$/gm, "<li>$1</li>");',
    '  h = h.replace(/^\\|(.+)\\|$/gm, function(_, content) {',
    '    var cells = content.split("|").map(function(c) { return c.trim(); });',
    '    if (cells.every(function(c) { return /^[-:]+$/.test(c); })) return "";',
    '    var tag = "td";',
    '    var row = cells.map(function(c) { return "<" + tag + ">" + c + "</" + tag + ">"; }).join("");',
    '    return "<tr>" + row + "</tr>";',
    '  });',
    '  h = h.replace(/((?:<tr>.*<\\/tr>\\n?)+)/g, "<table>$1</table>");',
    '  h = h.replace(/\\n\\n/g, "</p><p>");',
    '  h = "<p>" + h + "</p>";',
    '  h = h.replace(/<p><(h[1-4]|ul|ol|table|blockquote|div class="code-block)>/g, "<$1>");',
    '  h = h.replace(/<\\/(h[1-4]|ul|ol|table|blockquote|div)><\\/p>/g, "</$1>");',
    '  h = h.replace(/<p><\\/p>/g, "");',
    '  return h;',
    '}',
    'function copyCode(id) {',
    '  var el = document.getElementById(id);',
    '  if (!el) return;',
    '  navigator.clipboard.writeText(el.textContent).then(function() {',
    '    var btn = el.parentElement.querySelector(".code-copy");',
    '    if (btn) { btn.textContent = "Copied!"; setTimeout(function() { btn.textContent = "Copy"; }, 1500); }',
    '  });',
    '}',
    'function formatTime(ts) {',
    '  return new Date(ts).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });',
    '}',
    'function renderMessages(messages) {',
    '  return messages.map(function(msg) {',
    '    var isUser = msg.role === "user";',
    '    var avatar = isUser ? "' + userSvg.replace(/"/g, '&quot;') + '" : "' + assistantSvg.replace(/"/g, '&quot;') + '";',
    '    var name = isUser ? "You" : "Assistant";',
    '    var contentHtml = isUser ? \'<div class="message-text">\'+esc(msg.content)+\'</div>\' : \'<div class="message-text">\'+renderMarkdown(msg.content)+\'</div>\';',
    '    return \'<div class="message message-\'+(isUser?"user":"assistant")+\'.">\'+',
    '      \'<div class="message-avatar">\'+avatar+\'</div>\'+',
    '      \'<div class="message-content">\'+',
    '        \'<div class="message-name">\'+name+\'</div>\'+',
    '        contentHtml+',
    '        \'<div class="timestamp">\'+formatTime(msg.timestamp)+\'</div>\'+',
    '      \'</div>\'+',
    '    \'</div>\';',
    '  }).join("");',
    '}',
    'function renderSession(session) {',
    '  var html = \'<div class="session-header">\'+',
    '    \'<div class="session-title">\'+esc(session.title)+\'</div>\'+',
    '    \'<div class="session-meta">Model: \'+esc(session.modelId)+\' · Created: \'+formatTime(session.createdAt)+\' · \'+session.messages.length+\' messages\'+',
    '    (session.systemPrompt ? \' · Custom system prompt\' : \'\')+\'</div></div>\';',
    '  html += renderMessages(session.messages);',
    '  return html;',
    '}',
    '(function() {',
    '  var body = document.getElementById("viewer-body");',
    '  var data = __data;',
    '  if (Array.isArray(data)) {',
    '    body.innerHTML = data.map(renderSession).join(\'<div class="divider"></div>\');',
    '  } else if (data && data.sessions) {',
    '    if (data.sessions.length > 1) {',
    '      body.innerHTML = data.sessions.map(renderSession).join(\'<div class="divider"></div>\');',
    '    } else {',
    '      body.innerHTML = renderSession(data.sessions[0]);',
    '    }',
    '  }',
    '})();',
  ].join('\n')

  // Assemble the full HTML
  var parts = [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + escapeHtml(title) + '</title>',
    '<style>' + css + '</style>',
    '</head>',
    '<body>',
    '<div class="viewer-header">',
    '  <div class="viewer-title">Monday — Shared Conversation</div>',
    '  <div class="viewer-actions">',
    '    <button class="viewer-btn" id="theme-btn" onclick="toggleTheme()">Dark</button>',
    '    <button class="viewer-btn" id="download-btn" onclick="downloadData()">Download JSON</button>',
    '  </div>',
    '</div>',
    '<div class="viewer-body" id="viewer-body"></div>',
    '<script>' + innerJs + '</script>',
    '</body>',
    '</html>',
  ]

  return parts.join('\n')
}

/**
 * Generate a shareable HTML file for a single session and trigger download.
 */
export function shareSession(session: ChatSession): void {
  const html = generateShareHtml([session], session.title)
  downloadHtml(html, 'monday-share-' + session.id + '.html')
}

/**
 * Generate a shareable HTML file for multiple sessions and trigger download.
 */
export function shareAllSessions(sessions: ChatSession[]): void {
  const title = 'Monday — ' + sessions.length + ' Conversation' + (sessions.length > 1 ? 's' : '')
  const html = generateShareHtml(sessions, title)
  downloadHtml(html, 'monday-share-all.html')
}

function downloadHtml(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

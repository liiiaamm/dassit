// DassIt glass box: frontend/src/lib/api.js ported to plain JS, a small version of the Next.js screens,
// and a network panel that shows every request the client makes to the in-browser API.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let server = new DassItServer();
  let clientVersion = "fixed"; // "fixed" keeps the rotated refresh token; "original" is api.js as submitted

  // ------------------------------------------------------------------ the wire
  const reqs = $("reqs");
  let pendingNote = null;
  async function transport(path, options = {}) {
    const method = options.method || "GET", headers = options.headers || {}, body = options.body ? JSON.parse(options.body) : undefined;
    const t0 = performance.now();
    const slow = /\/send\/$/.test(path) ? 700 + Math.random() * 600 : 60 + Math.random() * 90;
    const res = await server.handle(method, path, headers, body);
    await new Promise((r) => setTimeout(r, slow));
    log({ method, path, headers, body, res, ms: Math.round(performance.now() - t0) });
    return { ok: res.status >= 200 && res.status < 300, status: res.status, json: async () => res.body };
  }
  const short = (t) => (t && t.length > 40 ? t.slice(0, 24) + "…" + t.slice(-10) : t);
  function log({ method, path, headers, body, res, ms }) {
    const hint = $("hint"); if (hint) hint.remove();
    const d = document.createElement("details"); d.className = "req fresh";
    const cls = res.status >= 400 ? "c4" : res.status >= 300 ? "c3" : "c2";
    const shownHeaders = { ...headers }; if (shownHeaders.Authorization) shownHeaders.Authorization = "Bearer " + short(shownHeaders.Authorization.slice(7));
    const shownBody = body && { ...body };
    if (shownBody) for (const k of ["password", "password1", "password2"]) if (shownBody[k]) shownBody[k] = "•".repeat(Math.min(12, shownBody[k].length));
    if (shownBody && shownBody.refresh) shownBody.refresh = short(shownBody.refresh);
    const resShown = res.body && { ...res.body };
    if (resShown) for (const k of ["access", "refresh"]) if (resShown[k]) resShown[k] = short(resShown[k]);
    let note = pendingNote; pendingNote = null;
    if (res.status === 401) { const why = (res.body.messages && res.body.messages[0].message) || res.body.detail; note = note ? `${note} · refused: ${why}` : `rejected: ${why}`; }
    d.innerHTML = `<summary><span class="code ${cls}">${res.status}</span><span>${method}</span><span>${esc(path)}</span><span class="ms">${ms} ms</span>${note ? `<span class="note">${esc(note)}</span>` : ""}</summary>
      <div class="det"><div><div class="lab">request headers</div><pre>${esc(JSON.stringify(shownHeaders, null, 2))}</pre></div>
      ${shownBody ? `<div><div class="lab">request body</div><pre>${esc(JSON.stringify(shownBody, null, 2))}</pre></div>` : ""}
      <div><div class="lab">response ${res.status}</div><pre>${esc(res.body == null ? "(no content)" : JSON.stringify(resShown, null, 2))}</pre></div></div>`;
    reqs.prepend(d);
    while (reqs.children.length > 60) reqs.lastChild.remove();
    setTimeout(() => d.classList.remove("fresh"), 1300);
    tokens();
  }

  // ------------------------------------------------------------------ api.js, ported (localStorage → an in-memory store)
  const store = {};
  const getToken = () => store.token || null, getRefreshToken = () => store.refresh || null;
  const setTokens = (a, r) => { store.token = a; store.refresh = r; tokens(); };
  const clearTokens = () => { delete store.token; delete store.refresh; tokens(); };
  async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) return null;
    pendingNote = "access token rejected → the client asks for a new one";
    const res = await transport("/api/token/refresh/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh }) });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    store.token = data.access;
    if (clientVersion === "fixed" && data.refresh) store.refresh = data.refresh;   // the one-line fix
    tokens();
    return data.access;
  }
  async function apiFetch(path, options = {}) {
    const headers = (t) => ({ "Content-Type": "application/json", Accept: "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...options.headers });
    let res = await transport(path, { ...options, headers: headers(getToken()) });
    if (res.status === 401) {
      const t = await refreshAccessToken();
      if (!t) throw new Error("SESSION_EXPIRED");
      pendingNote = "retry with the new access token";
      res = await transport(path, { ...options, headers: headers(t) });
    }
    return res;
  }
  const api = {
    async login(email, password) {
      const res = await transport("/api/auth/login/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (data.access) { setTokens(data.access, data.refresh); return { ok: true }; }
      return { ok: false, error: data.detail || "Wrong email or password." };
    },
    async register(username, email, password1, password2) {
      const res = await transport("/api/auth/register/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, email, password1, password2 }) });
      const data = await res.json();
      if (res.ok) { setTokens(data.access, data.refresh); return { ok: true }; }
      const first = Object.values(data)[0];
      return { ok: false, error: Array.isArray(first) ? first[0] : first };
    },
    async logout() { try { await apiFetch("/api/auth/log-out/", { method: "POST", body: JSON.stringify({ refresh: getRefreshToken() }) }); } catch (_) {} clearTokens(); },
    async getProfile() { const r = await apiFetch("/api/auth/profile/"); if (!r.ok) throw new Error("Failed to load profile"); return r.json(); },
    async getUsage() { const r = await apiFetch("/api/chat/usage/"); if (!r.ok) throw new Error("Failed to load usage"); return r.json(); },
    async getChats() { const r = await apiFetch("/api/chat/"); if (!r.ok) throw new Error("Failed to load chats"); return r.json(); },
    async createChat(title) { const r = await apiFetch("/api/chat/", { method: "POST", body: JSON.stringify({ title }) }); if (!r.ok) throw new Error("Failed to create chat"); return r.json(); },
    async getChat(id) { const r = await apiFetch(`/api/chat/${id}/`); if (!r.ok) { const j = await r.json(); throw new Error(j.detail || "Failed to load chat"); } return r.json(); },
    async deleteChat(id) { const r = await apiFetch(`/api/chat/${id}/`, { method: "DELETE" }); if (!r.ok) throw new Error("Failed to delete chat"); },
    async sendMessage(id, content) { const r = await apiFetch(`/api/chat/${id}/send/`, { method: "POST", body: JSON.stringify({ content }) }); if (!r.ok) { const j = await r.json(); throw new Error(j.detail || "Failed to send message"); } return r.json(); },
  };

  // ------------------------------------------------------------------ token strip and clock
  function fmtLeft(sec) { if (sec <= 0) return "expired"; const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60); return d ? `${d} d ${h} h left` : h ? `${h} h ${m} min left` : `${m} min left`; }
  function tokens() {
    const now = server.now() / 1000;
    [["token", "acc"], ["refresh", "ref"]].forEach(([k, id]) => {
      const t = store[k], p = t && DassItServer.decode(t);
      if (!p) { $(id + "V").innerHTML = '<span class="bad">none</span>'; $(id + "S").textContent = ""; return; }
      const left = p.exp - now, black = k === "refresh" && server.blacklist.has(p.jti);
      $(id + "V").innerHTML = black ? '<span class="bad">blacklisted</span> (rotated, still held by the client)' : `<span class="${left <= 0 ? "bad" : left < 86400 ? "warn" : "ok"}">${fmtLeft(left)}</span> · user_id ${p.user_id}`;
      $(id + "S").textContent = `jti ${p.jti.slice(0, 12)}… · ${short(t)}`;
    });
    const days = Math.round(server.offset / 86400000);
    $("clock").textContent = days ? `now + ${days} day${days > 1 ? "s" : ""}` : "now";
  }
  setInterval(tokens, 30000);

  // ------------------------------------------------------------------ the app UI
  const app = $("app");
  const ui = { chats: [], current: null, user: null, usage: null, mode: "login", error: "", sending: false };
  const bot = "web/bot.jpg";

  function render() { if (!getToken()) renderLogin(); else renderChat(); }

  function renderLogin() {
    const reg = ui.mode === "register";
    app.innerHTML = `<div class="login"><div class="card">
      <h2>${reg ? "Create account" : "Welcome back"}</h2><p class="sub">${reg ? "Same rules as the API: unique username and email, 8+ characters, upper and lower case." : "Log in to DassIt!"}</p>
      <form id="authForm">
        ${reg ? '<label>Username</label><input id="fUser" autocomplete="off">' : ""}
        <label>Email</label><input id="fEmail" type="email" autocomplete="off" ${reg ? "" : 'value="demo@dassit.dev"'}>
        <label>Password</label><input id="fPass" type="password" ${reg ? "" : 'value="Password1"'}>
        ${reg ? '<label>Repeat password</label><input id="fPass2" type="password">' : ""}
        <button class="btn" type="submit">${reg ? "Register" : "Log in"}</button>
      </form>
      ${reg ? "" : '<p class="sub" style="margin:0.6rem 0 0;text-align:center">The demo account is filled in for you.</p>'}
      <div class="err" id="authErr">${esc(ui.error)}</div>
      <div class="swap">${reg ? 'Already have an account? <a id="swap">Log in</a>' : 'No account? <a id="swap">Register</a>'}</div>
    </div></div>`;
    $("swap").onclick = () => { ui.mode = reg ? "login" : "register"; ui.error = ""; render(); };
    $("authForm").onsubmit = async (e) => {
      e.preventDefault();
      const r = reg ? await api.register($("fUser").value.trim(), $("fEmail").value.trim(), $("fPass").value, $("fPass2").value) : await api.login($("fEmail").value.trim(), $("fPass").value);
      if (!r.ok) { $("authErr").textContent = r.error; return; }
      ui.error = ""; await boot();
    };
  }

  async function guard(fn) {
    try { return await fn(); }
    catch (e) {
      if (e.message === "SESSION_EXPIRED") { clearTokens(); ui.error = clientVersion === "original" ? "Session expired. The submitted client threw away the rotated refresh token, so it tried a blacklisted one. Switch the client to “fixed” and log in again." : "Your session expired. Log in again."; ui.mode = "login"; render(); return null; }
      throw e;
    }
  }

  async function boot() {
    await guard(async () => {
      ui.user = await api.getProfile();
      ui.usage = await api.getUsage();
      ui.chats = await api.getChats();
      ui.current = ui.chats.length ? await api.getChat(ui.chats[ui.chats.length - 1].id) : null;
      render();
    });
  }

  function renderChat() {
    const u = ui.usage || { messages_used: 0, messages_limit: 100 };
    app.innerHTML = `<aside class="side" id="side">
        <div class="brand"><img src="${bot}" alt="">DassIt!</div>
        <button class="newchat" id="newChat">+ New chat</button>
        <div class="chats">${ui.chats.map((c) => `<div class="chatItem ${ui.current && ui.current.id === c.id ? "on" : ""}" data-id="${c.id}"><span>${esc(c.title)}</span><button data-del="${c.id}" title="Delete">×</button></div>`).join("")}</div>
        <div class="usage">${u.messages_used} / ${u.messages_limit} messages this month<div class="bar"><i style="width:${(100 * u.messages_used) / u.messages_limit}%"></i></div></div>
        <div class="who"><span>${esc(ui.user ? ui.user.username : "")}</span><button id="logout">Log out</button></div>
      </aside>
      <div class="room">
        <div class="roomHead"><button class="menu" id="menu">☰</button>${esc(ui.current ? ui.current.title : "DassIt!")}</div>
        <div class="msgs" id="msgs">${ui.current && ui.current.messages.length ? ui.current.messages.filter((m) => m.role !== "system").map((m) => `<div class="bubble ${m.role}">${esc(m.content)}</div>`).join("") : `<div class="empty"><img src="${bot}" alt="DassIt! Bot"><p>${ui.current ? "Start a conversation!" : "Create a chat to begin."}</p></div>`}${ui.sending ? '<div class="bubble assistant">…</div>' : ""}</div>
        <form class="input" id="sendForm"><input id="msgIn" placeholder="${ui.current ? "Type a message..." : "Create a chat first"}" ${ui.current ? "" : "disabled"} autocomplete="off"><button ${ui.current ? "" : "disabled"}>&gt;</button></form>
      </div>`;
    const msgs = $("msgs"); msgs.scrollTop = msgs.scrollHeight;
    $("menu").onclick = () => $("side").classList.toggle("open");
    $("newChat").onclick = () => guard(async () => { const c = await api.createChat("New Chat"); ui.chats = await api.getChats(); ui.current = await api.getChat(c.id); render(); });
    $("logout").onclick = async () => { await api.logout(); ui.current = null; ui.mode = "login"; render(); };
    app.querySelectorAll(".chatItem").forEach((el) => (el.onclick = (e) => {
      const del = e.target.dataset.del;
      guard(async () => {
        if (del) { await api.deleteChat(del); ui.chats = await api.getChats(); if (ui.current && ui.current.id === +del) ui.current = null; }
        else ui.current = await api.getChat(el.dataset.id);
        render();
      });
    }));
    $("sendForm").onsubmit = async (e) => {
      e.preventDefault();
      const text = $("msgIn").value.trim(); if (!text || ui.sending || !ui.current) return;
      ui.current.messages.push({ role: "user", content: text }); ui.sending = true; render();
      await guard(async () => {
        try {
          const data = await api.sendMessage(ui.current.id, text);
          ui.current.messages.push({ role: "assistant", content: data.reply });
          ui.usage = { ...ui.usage, messages_used: data.messages_used, messages_limit: data.messages_limit };
          if (ui.current.title === "New Chat") ui.current.title = "New Chat";
        } catch (err) { ui.current.messages.push({ role: "sys", content: err.message }); }
      });
      ui.sending = false; if (getToken()) render();
    };
  }

  // ------------------------------------------------------------------ the demo controls
  document.querySelectorAll("[data-ff]").forEach((b) => (b.onclick = () => { server.offset += +b.dataset.ff * 86400000; tokens(); pendingNote = null; if (getToken()) guard(async () => { ui.usage = await api.getUsage(); render(); }); }));
  $("reset").onclick = () => { server = new DassItServer(); clearTokens(); reqs.innerHTML = '<div class="hint" id="hint">Fresh server. Log in again to start.</div>'; ui.mode = "login"; ui.error = ""; render(); };
  $("peek").onclick = () => guard(async () => {
    if (!getToken()) { ui.error = "Log in first, then try to read someone else’s chat."; render(); return; }
    pendingNote = "chat #1 belongs to another user → IsChatOwner";
    try { await api.getChat(1); } catch (e) { /* the 403 is the point */ }
  });
  $("burn").onclick = () => {
    if (!getToken()) { ui.error = "Log in first."; render(); return; }
    const p = DassItServer.decode(store.token), u = server.usage[+p.user_id]; u.messages_used = u.messages_limit - 1;
    guard(async () => { ui.usage = await api.getUsage(); render(); });
  };
  const setVersion = (v) => { clientVersion = v; $("vFixed").classList.toggle("sel", v === "fixed"); $("vOrig").classList.toggle("sel", v === "original"); };
  $("vFixed").onclick = () => setVersion("fixed");
  $("vOrig").onclick = () => setVersion("original");

  tokens(); render();
})();

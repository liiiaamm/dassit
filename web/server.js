// An in-browser stand-in for the DassIt Django API, so the client can run on GitHub Pages.
// It follows the real views rule for rule:
//   users/serializers.py  UserRegisterSerializer (unique username and email, email regex, 8+ chars, upper and lower case)
//   users/views.py        EmailLoginView, LogoutView (blacklist), UserProfileView
//   chat/views.py         ChatListCreateView, ChatDetailView, SendMessageView (IsChatOwner, 30-day quota of 100)
//   settings.SIMPLE_JWT   HS256, access 1 day, refresh 7 days, ROTATE_REFRESH_TOKENS, BLACKLIST_AFTER_ROTATION
// The tokens are real JWTs signed with a key that only lives in this tab. The model is a scripted stand-in.
(function (root) {
  "use strict";
  const DAY = 86400000;
  const enc = new TextEncoder();
  const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const b64uJson = (o) => b64u(enc.encode(JSON.stringify(o)));
  const unb64u = (s) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/")))));
  const hex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

  function Server() {
    this.offset = 0;                          // the "fast-forward" control moves the server clock
    this.now = () => Date.now() + this.offset;
    this.keyP = crypto.subtle.importKey("raw", crypto.getRandomValues(new Uint8Array(32)), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    this.users = []; this.usage = {}; this.chats = []; this.messages = []; this.blacklist = new Set();
    this.ids = { user: 0, chat: 0, msg: 0 };
    // someone else's account, to show IsChatOwner
    const other = this._createUser({ username: "sergio", email: "sergio@dassit.dev", password: "Not-for-you-1" });
    const c = this._createChat(other.id, "Deployment notes");
    this._msg(c.id, "user", "Remind me which port the API runs on."); this._msg(c.id, "assistant", "8000, behind the Next.js client on 3000.");
    // the demo account
    const demo = this._createUser({ username: "visitor", email: "demo@dassit.dev", password: "Password1" });
    const d = this._createChat(demo.id, "Welcome");
    this._msg(d.id, "user", "What is this?");
    this._msg(d.id, "assistant", "DassIt, a chatbot you host yourself: Django REST on one side, Next.js on the other, and Llama 3.2 running in Ollama. On this page the requests are real HTTP-shaped calls you can inspect on the right.");
  }

  Server.prototype._createUser = function ({ username, email, password, first_name = "", last_name = "" }) {
    const u = { id: ++this.ids.user, username, email, password, first_name, last_name };
    this.users.push(u);
    this.usage[u.id] = { messages_used: 0, messages_limit: 100, reset_date: this.now() + 30 * DAY };
    return u;
  };
  Server.prototype._createChat = function (user, title) { const c = { id: ++this.ids.chat, title, created_at: new Date(this.now()).toISOString(), user }; this.chats.push(c); return c; };
  Server.prototype._msg = function (chat, role, content) { const m = { id: ++this.ids.msg, role, content, created_at: new Date(this.now()).toISOString(), chat }; this.messages.push(m); return m; };

  // ------------------------------------------------------------------ JWT (SimpleJWT-shaped claims)
  Server.prototype._sign = async function (payload) {
    const head = b64uJson({ alg: "HS256", typ: "JWT" }), body = b64uJson(payload);
    const sig = await crypto.subtle.sign("HMAC", await this.keyP, enc.encode(head + "." + body));
    return head + "." + body + "." + b64u(sig);
  };
  Server.prototype._pair = async function (user) {
    const iat = Math.floor(this.now() / 1000);
    const refresh = await this._sign({ token_type: "refresh", exp: iat + 7 * 86400, iat, jti: hex(16), user_id: String(user.id) });
    const access = await this._sign({ token_type: "access", exp: iat + 86400, iat, jti: hex(16), user_id: String(user.id) });
    return { access, refresh };
  };
  // returns [payload] or [null, errorBody]
  Server.prototype._verify = async function (token, type) {
    const bad = (message) => [null, type === "access"
      ? { detail: "Given token not valid for any token type", code: "token_not_valid", messages: [{ token_class: "AccessToken", token_type: "access", message }] }
      : { detail: message, code: "token_not_valid" }];
    if (!token || token.split(".").length !== 3) return bad("Token is invalid");
    const [h, b, s] = token.split(".");
    const sig = Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    if (!(await crypto.subtle.verify("HMAC", await this.keyP, sig, enc.encode(h + "." + b)))) return bad("Token is invalid");
    const p = unb64u(b);
    if (p.token_type !== type) return bad("Token has wrong type");
    if (p.exp * 1000 <= this.now()) return bad("Token is expired");
    if (type === "refresh" && this.blacklist.has(p.jti)) return bad("Token is blacklisted");
    return [p];
  };
  Server.decode = (t) => { try { return unb64u(t.split(".")[1]); } catch (_) { return null; } };

  // ------------------------------------------------------------------ routing
  const R = (status, body) => ({ status, body });
  Server.prototype.handle = async function (method, path, headers, body) {
    const auth = async () => {
      const h = headers.Authorization || "";
      if (!h.startsWith("Bearer ")) return [null, R(401, { detail: "Authentication credentials were not provided." })];
      const [p, err] = await this._verify(h.slice(7), "access");
      if (!p) return [null, R(401, err)];
      const user = this.users.find((u) => String(u.id) === p.user_id);
      return user ? [user] : [null, R(401, { detail: "User not found", code: "user_not_found" })];
    };
    let m;
    if (method === "POST" && path === "/api/auth/register/") return this.register(body);
    if (method === "POST" && path === "/api/auth/login/") return this.login(body);
    if (method === "POST" && path === "/api/token/refresh/") return this.refresh(body);
    const [user, fail] = await auth();
    if (!user) return fail;
    if (method === "POST" && path === "/api/auth/log-out/") {
      const [p, err] = await this._verify(body && body.refresh, "refresh");
      if (!p) return R(400, { detail: err.detail });
      this.blacklist.add(p.jti); return R(205, { detail: "Logout successful" });
    }
    if (path === "/api/auth/profile/" && method === "GET") { const { password, ...pub } = user; return R(200, pub); }
    if (path === "/api/chat/usage/" && method === "GET") { const u = this.usage[user.id]; return R(200, { ...u, reset_date: new Date(u.reset_date).toISOString() }); }
    if (path === "/api/chat/" && method === "GET") return R(200, this.chats.filter((c) => c.user === user.id).map(({ user, ...c }) => c));
    if (path === "/api/chat/" && method === "POST") { const c = this._createChat(user.id, (body && body.title) || "New Chat"); const { user: _, ...pub } = c; return R(201, pub); }
    if ((m = path.match(/^\/api\/chat\/(\d+)\/(send\/)?$/))) {
      const chat = this.chats.find((c) => c.id === +m[1]);
      if (!chat) return R(404, { detail: "No Chat matches the given query." });
      if (chat.user !== user.id) return R(403, { detail: "You do not have permission to perform this action." });   // IsChatOwner
      if (!m[2] && method === "GET") { const { user: _, ...pub } = chat; return R(200, { ...pub, messages: this.messages.filter((x) => x.chat === chat.id).map(({ chat, ...x }) => x) }); }
      if (!m[2] && method === "DELETE") { this.chats = this.chats.filter((c) => c !== chat); this.messages = this.messages.filter((x) => x.chat !== chat.id); return R(204, null); }
      if (m[2] && method === "POST") return this.send(user, chat, body);
    }
    return R(405, { detail: `Method "${method}" not allowed.` });
  };

  Server.prototype.register = async function (b = {}) {
    const errs = {};
    if (!b.username) errs.username = ["This field is required."];
    else if (this.users.some((u) => u.username === b.username)) errs.username = ["This username is already in use."];
    if (!b.email) errs.email = ["This field is required."];
    else if (this.users.some((u) => u.email === b.email)) errs.email = ["Email already in use."];
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(b.email)) errs.email = ["Invalid email format."];
    if (Object.keys(errs).length) return R(400, errs);
    const p = b.password1 || "";
    let e = null;
    if (p !== b.password2) e = "The passwords don't match.";
    else if (p.length < 8) e = "The password must be at least 8 characters.";
    else if (!/[A-Z]/.test(p)) e = "The password must have at least one uppercase letter.";
    else if (!/[a-z]/.test(p)) e = "The password must have at least one lowercase letter.";
    if (e) return R(400, { non_field_errors: [e] });
    const u = this._createUser({ username: b.username, email: b.email, password: p });
    const { password, ...pub } = u;
    return R(201, { user: { username: pub.username, email: pub.email, first_name: "", last_name: "" }, ...(await this._pair(u)) });
  };
  Server.prototype.login = async function (b = {}) {
    if (!b.email || !b.password) return R(400, { detail: "Email and password are required." });
    const u = this.users.find((x) => x.email === b.email);
    if (!u || u.password !== b.password) return R(401, { detail: "Wrong email or password." });
    return R(200, await this._pair(u));
  };
  Server.prototype.refresh = async function (b = {}) {
    const [p, err] = await this._verify(b.refresh, "refresh");
    if (!p) return R(401, err);
    this.blacklist.add(p.jti);                                   // BLACKLIST_AFTER_ROTATION
    const u = this.users.find((x) => String(x.id) === p.user_id);
    return R(200, await this._pair(u));                          // ROTATE_REFRESH_TOKENS: a new pair
  };

  Server.prototype.send = async function (user, chat, b = {}) {
    if (!b.content || !String(b.content).trim()) return R(400, { content: ["This field may not be blank."] });
    const usage = this.usage[user.id], now = this.now();
    if (usage.reset_date && now > usage.reset_date) { usage.messages_used = 0; usage.reset_date = now + 30 * DAY; }
    if (usage.messages_used >= usage.messages_limit) return R(403, { detail: "Monthly message limit reached." });
    this._msg(chat.id, "user", b.content);
    const history = this.messages.filter((x) => x.chat === chat.id).map((x) => ({ role: x.role, content: x.content }));
    const reply = Bot.reply(history, usage);
    this._msg(chat.id, "assistant", reply);
    usage.messages_used += 1;
    return R(200, { reply, messages_used: usage.messages_used, messages_limit: usage.messages_limit });
  };

  // ------------------------------------------------------------------ the stand-in for llama3.2:3b
  const Bot = {
    reply(history, usage) {
      const q = history[history.length - 1].content.toLowerCase(), n = history.length;
      const tail = `\n\n(Scripted stand-in. In the real app this conversation, ${n} message${n > 1 ? "s" : ""} plus the system prompt, goes to llama3.2:3b in Ollama.)`;
      const has = (...w) => w.some((x) => q.includes(x));
      let a;
      if (has("hello", "hi ", "hey", "hola", "buenas") || q === "hi") a = "Hi! I’m the DassIt bot. Ask me how logins, tokens or quotas work here, or anything else, and watch the requests on the right.";
      else if (has("token", "jwt", "login", "auth", "refresh")) a = "When you log in you get two JWTs. The access token lasts a day and goes in every request as a Bearer header. The refresh token lasts a week and is only used to get a new access token. Each refresh hands back a new pair and blacklists the old refresh token. Try “+1 day” above to watch it happen.";
      else if (has("limit", "quota", "usage", "how many")) a = `You have used ${usage.messages_used + 1} of ${usage.messages_limit} messages this month. The send endpoint checks the counter before calling the model and answers 403 once it is full. “Use up the quota” above takes you to the edge.`;
      else if (has("who", "made", "built", "team", "author")) a = "Sergio Fernández Cordero and Liam Esgueva built me at Comillas ICAI: the Django REST API, the Next.js client and the Docker Compose setup around Ollama.";
      else if (has("ollama", "llama", "model", "gpu", "llm")) a = "In the real deployment, a container runs Ollama with llama3.2:3b, about 2 GB, and the backend calls it with the whole chat history. GitHub Pages can’t run a model, which is why you get these scripted answers here.";
      else if (has("docker", "deploy", "run", "install")) a = "Copy .env.example to .env, set POSTGRES_PASSWORD and DJANGO_SECRET_KEY, then docker compose up. Five services start: Next.js, Django, PostgreSQL, Ollama, and a one-off container that pulls the model.";
      else if (has("secure", "security", "owner", "permission", "other")) a = "Every chat endpoint checks IsChatOwner, so asking for someone else’s chat gives you 403, not their messages. “Peek at chat #1” above tries exactly that.";
      else a = `Message ${n} of this chat is stored. Llama would answer “${history[history.length - 1].content.slice(0, 60)}” properly; I can only explain the plumbing. Ask me about tokens, quotas or how it’s deployed.`;
      return a + tail;
    },
  };

  root.DassItServer = Server;
})(window);

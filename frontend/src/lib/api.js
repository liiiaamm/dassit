const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh');
}

function setTokens(access, refresh) {
  localStorage.setItem('token', access);
  localStorage.setItem('refresh', refresh);
}

function clearTokens() {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh');
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${API_BASE}/api/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data = await res.json();
  localStorage.setItem('token', data.access);
  // ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION: the old refresh token is now blacklisted,
  // so keep the new one or the next refresh fails and the user is logged out.
  if (data.refresh) localStorage.setItem('refresh', data.refresh);
  return data.access;
}

async function apiFetch(path, options = {}) {
  let token = getToken();

  const headers = (t) => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...options.headers,
  });

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers: headers(token) });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) throw new Error('SESSION_EXPIRED');
    res = await fetch(`${API_BASE}${path}`, { ...options, headers: headers(newToken) });
  }

  return res;
}

// Auth
export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.access) {
    setTokens(data.access, data.refresh);
    return { ok: true };
  }
  return { ok: false, error: data.detail || 'Wrong email or password.' };
}

export async function register(username, email, password1, password2) {
  const res = await fetch(`${API_BASE}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password1, password2 }),
  });
  const data = await res.json();
  if (res.ok) {
    setTokens(data.access, data.refresh);
    return { ok: true };
  }
  const firstError = Object.values(data)[0];
  return { ok: false, error: Array.isArray(firstError) ? firstError[0] : firstError };
}

export async function logout() {
  const refresh = getRefreshToken();
  try {
    await apiFetch('/api/auth/log-out/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    });
  } catch (_) {}
  clearTokens();
}

export function isLoggedIn() {
  return !!getToken();
}

// Profile
export async function getProfile() {
  const res = await apiFetch('/api/auth/profile/');
  if (!res.ok) throw new Error('Failed to load profile');
  return res.json();
}

export async function updateProfile(data) {
  const res = await apiFetch('/api/auth/profile/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const firstError = Object.values(json)[0];
    throw new Error(Array.isArray(firstError) ? firstError[0] : firstError);
  }
  return json;
}

export async function changePassword(current_password, new_password) {
  const res = await apiFetch('/api/auth/change-password/', {
    method: 'POST',
    body: JSON.stringify({ old_password: current_password, new_password }),
  });
  const json = await res.json();
  if (!res.ok) {
    const firstError = Object.values(json)[0];
    throw new Error(Array.isArray(firstError) ? firstError[0] : firstError);
  }
  return json;
}

export async function getUsage() {
  const res = await apiFetch('/api/chat/usage/');
  if (!res.ok) throw new Error('Failed to load usage');
  return res.json();
}

// Chats
export async function getChats() {
  const res = await apiFetch('/api/chat/');
  if (!res.ok) throw new Error('Failed to load chats');
  return res.json();
}

export async function createChat(title) {
  const res = await apiFetch('/api/chat/', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to create chat');
  return res.json();
}

export async function getChat(id) {
  const res = await apiFetch(`/api/chat/${id}/`);
  if (!res.ok) throw new Error('Failed to load chat');
  return res.json();
}

export async function deleteChat(id) {
  const res = await apiFetch(`/api/chat/${id}/`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete chat');
}

export async function sendMessage(chatId, message) {
  const res = await apiFetch(`/api/chat/${chatId}/send/`, {
    method: 'POST',
    body: JSON.stringify({ content: message }),
  });
  if (!res.ok) {
    let json;
    try {
      json = await res.json();
    } catch {
      json = {};
    }
    throw new Error(json.detail || 'Failed to send message');
  }
  return res.json();
}


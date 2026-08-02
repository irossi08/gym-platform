window.App = window.App || {};

/**
 * Client-side-only auth. Accounts, salts, and password hashes all live in this
 * browser's localStorage -- there is no server to validate against.
 *
 * SECURITY NOTE: this is NOT secure enough for a real production app handling
 * real user data. Anyone with access to this browser profile (devtools, the
 * localStorage file on disk, a XSS bug elsewhere on the page) can read the
 * user list directly, and nothing stops a user from editing their own stored
 * hash/session to impersonate another account id. It exists only to give a
 * personal/demo project a working signup -> login -> protected-route flow.
 * A real app needs server-side auth (proper password hashing server-side,
 * HttpOnly session cookies or signed tokens, rate limiting, etc).
 */
App.Auth = (function () {
  const USERS_KEY = 'orm_users_v1';
  const SESSION_KEY = 'orm_session_v1';

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'u_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  function randomSaltHex() {
    const bytes = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Deterministic 53-bit fingerprint (cyrb53-style) -- NOT cryptographic.
  // Only used as a fallback when SubtleCrypto isn't available.
  function fallbackFingerprint(str) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  async function hashPassword(password, salt) {
    const combined = salt + ':' + password;
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      try {
        const bytes = new TextEncoder().encode(combined);
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        // fall through to the fallback below (e.g. SubtleCrypto blocked in this context)
      }
    }
    let h = combined;
    for (let i = 0; i < 5000; i++) h = fallbackFingerprint(h + i);
    return h;
  }

  function getUsers() {
    try {
      const raw = JSON.parse(localStorage.getItem(USERS_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveUsers(list) {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
  }

  function findUser(username) {
    const uname = (username || '').trim().toLowerCase();
    return getUsers().find((u) => u.username.toLowerCase() === uname);
  }

  function createSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, username: user.username }));
  }

  async function signup(username, password) {
    const uname = (username || '').trim();
    if (uname.length < 3) return { ok: false, error: 'Username must be at least 3 characters.' };
    if ((password || '').length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
    if (findUser(uname)) return { ok: false, error: 'That username is already taken.' };

    const salt = randomSaltHex();
    const passwordHash = await hashPassword(password, salt);
    const user = { id: makeId(), username: uname, salt, passwordHash };
    const users = getUsers();
    users.push(user);
    saveUsers(users);
    createSession(user);
    return { ok: true, user: { id: user.id, username: user.username } };
  }

  async function login(username, password) {
    const user = findUser(username);
    if (!user) return { ok: false, error: 'Incorrect username or password.' };
    const attemptHash = await hashPassword(password, user.salt);
    if (attemptHash !== user.passwordHash) return { ok: false, error: 'Incorrect username or password.' };
    createSession(user);
    return { ok: true, user: { id: user.id, username: user.username } };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    try {
      const session = JSON.parse(localStorage.getItem(SESSION_KEY));
      if (!session || !session.userId) return null;
      return { id: session.userId, username: session.username };
    } catch (e) {
      return null;
    }
  }

  return { signup, login, logout, getCurrentUser };
})();

/* =========================================================
   FIT LOCKER — auth.js
   A SIMPLE DEMO authentication system for a school project.

   IMPORTANT — NOT REAL SECURITY:
   Passwords are stored in plain text in the browser's Local
   Storage. Local Storage is readable by anyone with access to
   the browser (or its DevTools), and this file has no hashing,
   encryption, or server-side verification of any kind. This is
   ONLY suitable for demonstrating how a login flow works in a
   classroom/portfolio project — never use this pattern for a
   real account system.

   Local Storage keys:
   - fitLockerUsers        → array of { name, email, password }
   - fitLockerCurrentUser  → { name, email } of the logged-in user, or absent

   Exposes window.FitLockerAuth with: signUp, logIn, logOut,
   getCurrentUser, isLoggedIn.

   Also self-renders a small "Login / Sign Up" or "Hi, Name /
   Logout" block into any element with id="authNavSlot" present
   on the page — so shop.html, product.html, and cart.html don't
   each need their own copy of this logic.
   ========================================================= */

window.FitLockerAuth = (function () {

  const USERS_KEY = "fitLockerUsers";
  const CURRENT_USER_KEY = "fitLockerCurrentUser";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // ---------- Local Storage helpers ----------
  function getUsers() {
    try {
      const raw = localStorage.getItem(USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function isLoggedIn() {
    return getCurrentUser() !== null;
  }

  // ---------- Sign up ----------
  // Returns { success: true } or { success: false, error: "..." }
  function signUp(name, email, password, confirmPassword) {
    const trimmedName = (name || "").trim();
    const trimmedEmail = (email || "").trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      return { success: false, error: "Please fill in every field." };
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      return { success: false, error: "Please enter a valid email address." };
    }

    if (password !== confirmPassword) {
      return { success: false, error: "Passwords do not match." };
    }

    const users = getUsers();
    const alreadyExists = users.some(function (user) {
      return user.email === trimmedEmail;
    });

    if (alreadyExists) {
      return { success: false, error: "An account with that email already exists." };
    }

    // Minimum info needed for this demo — name, email, and the demo
    // password itself (plain text; see the NOT REAL SECURITY note above).
    users.push({ name: trimmedName, email: trimmedEmail, password: password });
    saveUsers(users);

    // Sign the new user in immediately.
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ name: trimmedName, email: trimmedEmail }));

    return { success: true };
  }

  // ---------- Log in ----------
  // Returns { success: true } or { success: false, error: "..." }
  function logIn(email, password) {
    const trimmedEmail = (email || "").trim().toLowerCase();

    if (!trimmedEmail || !password) {
      return { success: false, error: "Please enter your email and password." };
    }

    const users = getUsers();
    const match = users.find(function (user) {
      return user.email === trimmedEmail && user.password === password;
    });

    if (!match) {
      return { success: false, error: "Invalid email or password." };
    }

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ name: match.name, email: match.email }));
    return { success: true };
  }

  // ---------- Log out ----------
  function logOut() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  // ---------- Profile lookup / update (used by profile.html) ----------
  // fitLockerUsers records only ever had {name, email, password} until
  // now — phone/address are added the first time a user saves them via
  // the profile page. Older accounts simply won't have those fields set
  // yet, which callers should treat as empty.
  function getUserByEmail(email) {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const users = getUsers();
    return users.find(function (user) {
      return user.email === trimmedEmail;
    }) || null;
  }

  // Updates name/phone/address on an existing user record. Email is
  // intentionally not accepted here — it's the account's identifier
  // and is never changed after signup.
  function updateProfile(email, updates) {
    const trimmedEmail = (email || "").trim().toLowerCase();
    const users = getUsers();
    const index = users.findIndex(function (user) {
      return user.email === trimmedEmail;
    });

    if (index === -1) {
      return { success: false, error: "Account not found." };
    }

    if (updates.name !== undefined) users[index].name = updates.name;
    if (updates.phone !== undefined) users[index].phone = updates.phone;
    if (updates.address !== undefined) users[index].address = updates.address;

    saveUsers(users);

    // Keep the active session's display name in sync, since the nav
    // greeting reads it from fitLockerCurrentUser, not fitLockerUsers.
    const current = getCurrentUser();
    if (current && current.email === trimmedEmail && updates.name !== undefined) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ name: updates.name, email: trimmedEmail }));
    }

    return { success: true, user: users[index] };
  }

  return {
    signUp: signUp,
    logIn: logIn,
    logOut: logOut,
    getCurrentUser: getCurrentUser,
    isLoggedIn: isLoggedIn,
    getUserByEmail: getUserByEmail,
    updateProfile: updateProfile
  };

})();

// ---------- Shared nav auth block ----------
// Renders into <span id="authNavSlot"></span> if present on the page.
$(function () {
  const $slot = $("#authNavSlot");
  if ($slot.length === 0) return;

  const user = window.FitLockerAuth.getCurrentUser();

  if (user) {
    $slot.html(
      `<a href="profile.html" class="auth-nav__greeting">Hi, ${escapeHtmlLocal(user.name)}</a>` +
      `<button type="button" class="auth-nav__logout-btn" id="authLogoutBtn">Logout</button>`
    );

    $("#authLogoutBtn").on("click", function () {
      window.FitLockerAuth.logOut();
      window.location.reload();
    });
  } else {
    $slot.html(
      `<a href="login.html" class="site-nav__link">Login</a>` +
      `<a href="signup.html" class="site-nav__link">Sign Up</a>`
    );
  }

  function escapeHtmlLocal(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
});
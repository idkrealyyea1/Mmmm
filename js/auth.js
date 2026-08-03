/* ===== Authentication & Session Management ===== */

const Auth = {
  SESSION_KEY: "marshmallow_session",

  getSession() {
    try {
      const raw = sessionStorage.getItem(this.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setSession(data) {
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(data));
  },

  clearSession() {
    sessionStorage.removeItem(this.SESSION_KEY);
  },

  isLoggedIn() {
    const s = this.getSession();
    return s && s.username && s.role;
  },

  getRole() {
    const s = this.getSession();
    return s ? s.role : null;
  },

  getUsername() {
    const s = this.getSession();
    return s ? s.username : null;
  },

  getToken() {
    const s = this.getSession();
    return s ? s.token : null;
  },

  isAdmin() {
    return this.getRole() === "admin";
  },

  isPhotographer() {
    return this.getRole() === "photographer";
  },

  requireAuth(role) {
    if (!this.isLoggedIn()) {
      window.location.href = "login.html";
      return false;
    }
    if (role && this.getRole() !== role) {
      if (this.isAdmin()) {
        window.location.href = "admin.html";
      } else {
        window.location.href = "photography.html";
      }
      return false;
    }
    return true;
  },

  async login(username, password) {
    const result = await API.login(username, password);
    if (result.success) {
      this.setSession({
        username: result.username,
        role: result.role,
        fullName: result.fullName || "",
        token: result.token
      });
    }
    return result;
  },

  logout() {
    this.clearSession();
    window.location.href = "login.html";
  }
};

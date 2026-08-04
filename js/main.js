/* ===== Shared Utilities, Navigation & Language ===== */

const WHATSAPP_NUMBER = "972566004044";

/* --- SVG Logo --- */
let _logoIdCounter = 0;

function getMLogoSVG(color) {
  color = color || '#B8907E';
  const uid = 'ml' + (++_logoIdCounter);
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#B8907E"/>
        <stop offset="100%" stop-color="#C9A25D"/>
      </linearGradient>
    </defs>
    <rect x="10" y="10" width="100" height="100" rx="24" fill="url(#${uid})" opacity="0.12"/>
    <text x="60" y="82" text-anchor="middle" font-family="'Playfair Display',serif" font-size="68" font-weight="700" fill="url(#${uid})">M</text>
  </svg>`;
}

function getSplashLogoSVG() {
  return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="spGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#B8907E"/>
        <stop offset="100%" stop-color="#C9A25D"/>
      </linearGradient>
      <filter id="spGlow1">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect x="8" y="8" width="104" height="104" rx="28" fill="none" stroke="url(#spGrad1)" stroke-width="3" opacity="0.3"/>
    <rect x="16" y="16" width="88" height="88" rx="20" fill="url(#spGrad1)" opacity="0.08"/>
    <text x="60" y="84" text-anchor="middle" font-family="'Playfair Display',serif" font-size="66" font-weight="700" fill="url(#spGrad1)" filter="url(#spGlow1)">M</text>
  </svg>`;
}

/* --- Language System --- */
const Lang = {
  current: "ar",

  init() {
    this.current = localStorage.getItem(LANG_KEY) || "ar";
    this.applyDirection();
    this.applyTranslations();
  },

  get(key) {
    if (!T[key]) return key;
    return T[key][this.current] || T[key]["ar"] || key;
  },

  set(lang) {
    this.current = lang;
    localStorage.setItem(LANG_KEY, lang);
    this.applyDirection();
    this.applyTranslations();
  },

  toggle() {
    this.set(this.current === "ar" ? "en" : "ar");
  },

  isAr() {
    return this.current === "ar";
  },

  applyDirection() {
    const html = document.documentElement;
    html.setAttribute("lang", this.current);
    html.setAttribute("dir", this.isAr() ? "rtl" : "ltr");
    document.body.style.fontFamily = this.isAr()
      ? "var(--font-arabic-body)"
      : "var(--font-english-body)";
  },

  applyTranslations() {
    document.querySelectorAll("[data-t]").forEach(el => {
      const key = el.getAttribute("data-t");
      const text = this.get(key);
      if (text) el.textContent = text;
    });
    document.querySelectorAll("[data-t-ph]").forEach(el => {
      const key = el.getAttribute("data-t-ph");
      const text = this.get(key);
      if (text) el.placeholder = text;
    });
    document.querySelectorAll("[data-t-html]").forEach(el => {
      const key = el.getAttribute("data-t-html");
      const text = this.get(key);
      if (text) el.innerHTML = text;
    });
    document.querySelectorAll("[data-t-aria]").forEach(el => {
      const key = el.getAttribute("data-t-aria");
      const text = this.get(key);
      if (text) el.setAttribute("aria-label", text);
    });
  }
};

/* --- Helpers --- */
function t(key) {
  return Lang.get(key);
}

function getWhatsAppLink(text) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function saveLastBookingPhone(phone) {
  try { localStorage.setItem("marshmallow_last_phone", phone || ""); } catch (e) {}
}

function getLastBookingPhone() {
  try { return localStorage.getItem("marshmallow_last_phone") || ""; } catch (e) { return ""; }
}

async function registerMarshmallowServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("sw.js", { scope: "./" });
}

function base64UrlToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

async function enableBookingNotifications(phone) {
  if (!phone) return { success: false, message: t("track_error_empty") };
  if (!("Notification" in window) || !("PushManager" in window)) {
    return { success: false, message: t("track_notifications_unsupported") };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { success: false, message: t("track_notifications_denied") };
  }

  const config = await API.getPushConfig();
  if (!config.success || !config.enabled || !config.publicKey) {
    return { success: false, message: t("track_notifications_unavailable") };
  }

  const registration = await registerMarshmallowServiceWorker();
  if (!registration) {
    return { success: false, message: t("track_notifications_unsupported") };
  }

  const applicationServerKey = base64UrlToUint8Array(config.publicKey);

  let subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    try { await subscription.unsubscribe(); } catch (err) { /* already inactive */ }
    subscription = null;
  }

  try {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (err) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  const result = await API.subscribePush(phone, subscription.toJSON());
  if (result.success) {
    saveLastBookingPhone(phone);
    return { success: true };
  }
  return result;
}

async function restoreBookingNotificationRegistration() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const registration = await registerMarshmallowServiceWorker();
    const subscription = await registration.pushManager.getSubscription();
    if (subscription && getLastBookingPhone()) {
      await API.subscribePush(getLastBookingPhone(), subscription.toJSON());
    }
  } catch (error) {
    // Notification support should never prevent the website from loading.
  }
}

function formatDateAr(dateStr) {
  const d = new Date(dateStr);
  if (Lang.isAr()) {
    const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    return d.toLocaleDateString("ar-SA", options);
  }
  const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return d.toLocaleDateString("en-US", options);
}

function formatDateShort(dateStr) {
  return dateStr;
}

function showModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("active");
}

function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("active");
}

function showAlert(containerId, type, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => { container.innerHTML = ""; }, 5000);
}

function showLoading(containerId, text) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <div class="loading-overlay">
      <div class="spinner"></div>
      <div class="loading-text">${text || t("cal_loading")}</div>
    </div>`;
}

/* --- Header --- */
function renderHeader(activePage) {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const session = Auth.getSession();
  const navLinks = [];

  if (session) {
    if (session.role === "admin") {
      navLinks.push({ href: "billing.html", label: t("nav_billing"), key: "billing" });
      navLinks.push({ href: "admin.html", label: t("nav_admin"), key: "admin" });
    }
    navLinks.push({ href: "#", label: t("nav_logout"), key: "logout", onclick: "Auth.logout(); return false;" });
  }

  const langLabel = Lang.isAr() ? "EN" : "عربي";
  const langOnclick = "Lang.toggle(); renderHeader('" + activePage + "'); renderFooter(); return false;";

  header.innerHTML = `
    <div class="header-inner">
      <a href="index.html" class="header-logo">
        <div class="m-logo"><img src="images/logo.webp" alt="Marshmallow" class="m-logo-img" fetchpriority="high"></div>
        <div class="header-logo-text">
          <span class="brand-name english-heading">${t("brand_name")}</span>
          <span class="brand-sub">${t("brand_sub")}</span>
        </div>
      </a>
      <nav class="header-nav">
        <a href="index.html" class="${activePage === 'home' ? 'nav-active' : ''}">${t("nav_home")}</a>
        <a href="chalet.html" class="${activePage === 'chalet' ? 'nav-active' : ''}">${t("nav_chalet")}</a>
        <a href="mabath.html" class="${activePage === 'mabath' ? 'nav-active' : ''}">${t("nav_sleep")}</a>
        <a href="hall.html" class="${activePage === 'hall' ? 'nav-active' : ''}">${t("nav_hall")}</a>
        <a href="salon.html" class="${activePage === 'salon' ? 'nav-active' : ''}">${t("nav_salon")}</a>
        <a href="about.html" class="${activePage === 'about' ? 'nav-active' : ''}">${t("nav_about")}</a>
        <a href="photography.html" class="${activePage === 'photography' ? 'nav-active' : ''}">${t("nav_photography")}</a>
        <a href="track.html" class="${activePage === 'track' ? 'nav-active' : ''}">${t("nav_track")}</a>
        ${navLinks.map(l => `<a href="${l.href}" class="${activePage === l.key ? 'nav-active' : ''}" ${l.onclick ? `onclick="${l.onclick}"` : ''}>${l.label}</a>`).join("")}
        <a href="#" class="lang-toggle" onclick="${langOnclick}">${langLabel}</a>
      </nav>
      <button class="hamburger" id="hamburgerBtn" onclick="toggleMobileNav()">
        <span></span><span></span><span></span>
      </button>
    </div>

    <div class="mobile-nav-overlay" id="mobileNavOverlay" onclick="toggleMobileNav()"></div>
    <div class="mobile-nav" id="mobileNav">
      <div class="mobile-nav-header">
        <div class="m-logo"><img src="images/logo.webp" alt="Marshmallow" class="m-logo-img" loading="lazy"></div>
        <div class="mobile-nav-brand">MARSHMALLOW</div>
      </div>
      <div class="mobile-nav-links">
        <a href="index.html" class="${activePage === 'home' ? 'nav-active' : ''}">${t("nav_home")}</a>
        <a href="chalet.html" class="${activePage === 'chalet' ? 'nav-active' : ''}">${t("nav_chalet")}</a>
        <a href="mabath.html" class="${activePage === 'mabath' ? 'nav-active' : ''}">${t("nav_sleep")}</a>
        <a href="hall.html" class="${activePage === 'hall' ? 'nav-active' : ''}">${t("nav_hall")}</a>
        <a href="photography.html" class="${activePage === 'photography' ? 'nav-active' : ''}">${t("nav_photography")}</a>
        <a href="salon.html" class="${activePage === 'salon' ? 'nav-active' : ''}">${t("nav_salon")}</a>
        <a href="about.html" class="${activePage === 'about' ? 'nav-active' : ''}">${t("nav_about")}</a>
        <a href="track.html" class="${activePage === 'track' ? 'nav-active' : ''}">${t("nav_track")}</a>
        ${navLinks.map(l => `<a href="${l.href}" class="${activePage === l.key ? 'nav-active' : ''} ${l.key === 'logout' ? 'logout-link' : ''}" ${l.onclick ? `onclick="${l.onclick}"` : ''}>${l.label}</a>`).join("")}
        <a href="#" class="lang-toggle-link" onclick="${langOnclick}">${langLabel}</a>
      </div>
    </div>`;
}

/* --- Footer --- */
const STUDORA_WHATSAPP = "972567439846";

function renderFooter() {
  const footer = document.querySelector(".site-footer");
  if (!footer) return;

  const year = new Date().getFullYear();

  footer.innerHTML = `
    <div class="footer-inner">
      <div class="footer-grid">
        <div class="footer-col footer-col-brand">
          <div class="footer-logo-wrap"><img src="images/logo.webp" alt="Marshmallow" class="m-logo-img" loading="lazy"></div>
          <div class="footer-brand english-heading">${t("brand_name")}</div>
          <div class="footer-tagline">${t("brand_sub")}</div>
        </div>
        <div class="footer-col">
          <div class="footer-col-title">${t("nav_links") || "روابط"}</div>
          <div class="footer-nav-links">
            <a href="index.html">${t("nav_home")}</a>
            <a href="chalet.html">${t("nav_chalet")}</a>
            <a href="mabath.html">${t("nav_sleep")}</a>
            <a href="hall.html">${t("nav_hall")}</a>
            <a href="salon.html">${t("nav_salon")}</a>
            <a href="about.html">${t("nav_about")}</a>
            <a href="photography.html">${t("nav_photography")}</a>
            <a href="track.html">${t("nav_track")}</a>
          </div>
        </div>
        <div class="footer-col">
          <div class="footer-col-title">${t("footer_contact")}</div>
          <div class="footer-contact-item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
            <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank">+${WHATSAPP_NUMBER}</a>
          </div>
          <div class="footer-contact-item">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 0v14h14V5H5zm3 2h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z"/></svg>
            <span>${t("footer_phone")}</span>
          </div>
        </div>
        <div class="footer-col footer-col-team">
          <div class="footer-col-title">${t("footer_team")}</div>
          <p class="footer-team-desc">${t("footer_team_desc")}</p>
          <a class="footer-team-studora" href="https://wa.me/${STUDORA_WHATSAPP}" target="_blank" aria-label="Studora — WhatsApp">
            <span class="footer-team-studora-name">Studora</span>
            <span class="footer-team-studora-cta">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
              ${t("footer_click_contact")}
            </span>
          </a>
        </div>
      </div>
      <div class="footer-credit-section">
        <div class="footer-credit-goldline"></div>
        <div class="footer-credit-label">${t("footer_studora")}</div>
        <a href="https://wa.me/${STUDORA_WHATSAPP}" target="_blank" class="footer-credit-brand">
          <svg class="footer-credit-star" viewBox="0 0 20 20" width="16" height="16"><polygon points="10,1 13,7 19,8 14.5,12.5 15.5,19 10,15.5 4.5,19 5.5,12.5 1,8 7,7" fill="currentColor"/></svg>
          Studora
          <svg class="footer-credit-star" viewBox="0 0 20 20" width="16" height="16"><polygon points="10,1 13,7 19,8 14.5,12.5 15.5,19 10,15.5 4.5,19 5.5,12.5 1,8 7,7" fill="currentColor"/></svg>
        </a>
        <a href="https://wa.me/${STUDORA_WHATSAPP}" target="_blank" class="footer-credit-wa">WhatsApp · ${t("footer_click_contact")}</a>
      </div>
      <div class="footer-divider"></div>
      <div class="footer-bottom">
        <div class="footer-copyright">&copy; ${year} Marshmallow — Photo Chalet & Events. ${t("footer_rights")}.</div>
      </div>
    </div>`;
}

/* --- Mobile Nav Toggle --- */
function toggleMobileNav() {
  const btn = document.getElementById("hamburgerBtn");
  const overlay = document.getElementById("mobileNavOverlay");
  const nav = document.getElementById("mobileNav");
  if (!btn || !overlay || !nav) return;
  const isOpen = nav.classList.contains("active");
  if (isOpen) {
    btn.classList.remove("active");
    overlay.classList.remove("active");
    nav.classList.remove("active");
    document.body.style.overflow = "auto";
  } else {
    btn.classList.add("active");
    overlay.classList.add("active");
    nav.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

/* --- Init Page --- */
function isIOSBrowser() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    && !window.navigator.standalone
    && ("onapplepaybuttonclick" in window || /Safari/i.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(navigator.userAgent));
}

function showIOSInstallBanner() {
  try {
    if (localStorage.getItem("marshmallow_ios_banner_dismissed")) return;
  } catch (e) { /* ignore */ }
  if (!isIOSBrowser()) return;

  const banner = document.createElement("div");
  banner.className = "ios-install-banner";
  banner.setAttribute("dir", "auto");
  banner.innerHTML = `
    <div class="ios-install-banner-inner">
      <div class="ios-install-banner-icon" aria-hidden="true">📲</div>
      <div class="ios-install-banner-body">
        <div class="ios-install-banner-title">${t("track_ios_banner_title")}</div>
        <div class="ios-install-banner-copy">${t("track_ios_banner_copy")}</div>
      </div>
      <button type="button" class="ios-install-banner-btn" aria-label="${t("track_ios_banner_btn")}">${t("track_ios_banner_btn")}</button>
    </div>`;
  banner.querySelector(".ios-install-banner-btn").addEventListener("click", () => {
    try { localStorage.setItem("marshmallow_ios_banner_dismissed", "1"); } catch (e) { /* ignore */ }
    banner.remove();
  });
  document.body.appendChild(banner);
}

function initPage(activePage) {
  Lang.init();
  renderHeader(activePage);
  renderFooter();
  if (activePage === "track") showIOSInstallBanner();

  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  });

  // Splash screen
  const splashLogo = document.getElementById("splashLogo");
  if (splashLogo && !splashLogo.querySelector("img")) {
    const img = document.createElement("img");
    img.src = "images/logo.webp";
    img.alt = "Marshmallow";
    img.className = "m-logo-img";
    splashLogo.appendChild(img);
  }

  const splash = document.getElementById("splash");
  if (splash) {
    setTimeout(() => {
      splash.classList.add("hide");
      setTimeout(() => splash.remove(), 700);
    }, 2400);
  }
}

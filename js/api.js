/* ===== Marshmallow API — Real Backend (Supabase + Render) ===== */

/*
 * IMPORTANT: Replace the URL below with your actual Render service URL
 * after you deploy the backend.
 * Example: const API_URL = "https://marshmallow-api.onrender.com/api/action";
 */
const API_URL = "https://marshmello-api.onrender.com/api/action";

const API = {
  async _call(action, data = {}) {
    try {
      // Attach auth token if available (required for admin actions)
      const session = typeof Auth !== "undefined" ? Auth.getSession() : null;
      const token = session ? session.token : null;

      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;

      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ action, ...data }),
        headers,
      });

      if (!res.ok) {
        const text = await res.text();
        try { return JSON.parse(text); } catch { return { success: false, message: "Server error: " + res.status }; }
      }

      return await res.json();
    } catch (err) {
      console.error("API call failed:", err);
      return { success: false, message: "Server connection failed" };
    }
  },

  login(username, password) {
    return this._call("login", { username, password });
  },

  getAvailability(type, year, month) {
    return this._call("getAvailability", { type, year, month });
  },

  getDayDetails(type, date) {
    return this._call("getDayDetails", { type, date });
  },

  getClosedDays() {
    return this._call("getClosedDays");
  },

  setClosedDay(date, message) {
    return this._call("setClosedDay", { date, message });
  },

  deleteClosedDay(date) {
    return this._call("deleteClosedDay", { date });
  },

  getTodayBookings() {
    return this._call("getTodayBookings");
  },

  getCustomerBookings(phone) {
    return this._call("getCustomerBookings", { phone });
  },

  getPushConfig() {
    return this._call("getPushConfig");
  },

  subscribePush(phone, subscription) {
    return this._call("subscribePush", {
      phone,
      subscription,
      userAgent: navigator.userAgent,
    });
  },

  unsubscribePush(endpoint) {
    return this._call("unsubscribePush", { endpoint });
  },

  getPrice(service, type, dayOfWeek) {
    return this._call("getPrice", { service, type, dayOfWeek });
  },

  submitChaletBooking(data) {
    return this._call("submitChaletBooking", data);
  },

  submitHallBooking(data) {
    return this._call("submitHallBooking", data);
  },

  submitMabathBooking(data) {
    return this._call("submitMabathBooking", data);
  },

  submitPhotographyBooking(data) {
    return this._call("submitPhotographyBooking", data);
  },

  submitSalonBooking(data) {
    return this._call("submitSalonBooking", data);
  },

  getAdminStats(offset, limit) {
    return this._call("getAdminStats", { offset, limit });
  },

  getAllBookings(type, status, offset, limit) {
    return this._call("getAllBookings", { type, status, offset, limit });
  },

  updateBookingStatus(id, type, newStatus) {
    return this._call("updateBookingStatus", { id, type, newStatus });
  },

  deleteBooking(id, type) {
    return this._call("deleteBooking", { id, type });
  },

  getPhotographers() {
    return this._call("getPhotographers");
  },

  createPhotographer(data) {
    return this._call("createPhotographer", data);
  },

  getTestimonials() {
    return this._call("getTestimonials");
  },

  updateTestimonialStatus(id, approved) {
    return this._call("updateTestimonialStatus", { id, approved });
  },

  deleteTestimonial(id) {
    return this._call("deleteTestimonial", { id });
  },

  exportBookings(type) {
    return this._call("exportBookings", { type });
  },

  exportAllData() {
    return this._call("exportAllData");
  },

  createBackup() {
    return this._call("createBackup");
  },

  getBackupHistory() {
    return this._call("getBackupHistory");
  },

  getPricing() {
    return this._call("getPricing");
  },

  addPricing(data) {
    return this._call("addPricing", data);
  },

  updatePricing(data) {
    return this._call("updatePricing", data);
  },

  deletePricing(data) {
    return this._call("deletePricing", data);
  },

  adminCreateBooking(data) {
    return this._call("adminCreateBooking", data);
  },

  getBillingData(section) {
    return this._call("getBillingData", { section });
  },

  updateBillingPayment(id, section, data) {
    return this._call("updateBillingPayment", { id, section, ...data });
  },

  getBillingStats() {
    return this._call("getBillingStats");
  },
};

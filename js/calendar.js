/* ===== Reusable Calendar Component (Bilingual) ===== */

function createCalendar(config) {
  const {
    containerId,
    onDayClick,
    availabilityData = {},
    type = "chalet"
  } = config;

  const container = document.getElementById(containerId);
  if (!container) return;

  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();

  const monthNames = {
    ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  };

  const weekDays = {
    ar: ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  };

  const lang = Lang ? Lang.current : "ar";

  /* Show loading overlay immediately */
  container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p class="loading-text">' + t("cal_loading") + '</p></div>';

  function render() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const mName = monthNames[lang] || monthNames.ar;
    const wDays = weekDays[lang] || weekDays.ar;

    let html = `
      <div class="calendar-header">
        <button class="calendar-nav-btn" id="${containerId}-prev">&#8594;</button>
        <div class="calendar-title">${mName[currentMonth]} ${currentYear}</div>
        <button class="calendar-nav-btn" id="${containerId}-next">&#8592;</button>
      </div>
      <div class="calendar-weekdays">
        ${wDays.map(d => `<div class="calendar-weekday">${d}</div>`).join("")}
      </div>
      <div class="calendar-grid">`;

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="calendar-day empty"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = (
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear()
      );
      const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

      let statusClass = "";
      if (isPast) {
        statusClass = "past";
      } else if (availabilityData[dateStr] === "closed") {
        statusClass = "closed";
      } else if (availabilityData[dateStr] === "confirmed") {
        statusClass = "confirmed";
      } else {
        statusClass = "available";
      }

      const todayClass = isToday ? " today" : "";
      const clickable = !isPast && (statusClass === "available" || statusClass === "closed");

      html += `<div class="calendar-day ${statusClass}${todayClass}" 
                    data-date="${dateStr}" 
                    ${clickable ? 'style="cursor:pointer"' : ''}>${day}</div>`;
    }

      html += `</div>
      <div class="calendar-footer">
        <button class="calendar-refresh-btn" id="${containerId}-refresh" title="${t('cal_refresh') || 'تحديث'}">&#8635;</button>
      </div>`;

    container.innerHTML = html;

    document.getElementById(`${containerId}-prev`).addEventListener("click", () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p class="loading-text">' + t("cal_loading") + '</p></div>';
      loadMonth();
    });

    document.getElementById(`${containerId}-next`).addEventListener("click", () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      container.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p class="loading-text">' + t("cal_loading") + '</p></div>';
      loadMonth();
    });

    container.querySelectorAll(".calendar-day:not(.empty):not(.past):not(.confirmed):not(.booked)").forEach(cell => {
      cell.addEventListener("click", () => {
        const date = cell.getAttribute("data-date");
        if (onDayClick) onDayClick(date);
      });
    });

    container.querySelectorAll(".calendar-day.closed").forEach(cell => {
      cell.addEventListener("click", () => {
        const date = cell.getAttribute("data-date");
        if (onDayClick) onDayClick(date);
      });
    });

    const refreshBtn = document.getElementById(`${containerId}-refresh`);
    if (refreshBtn) {
      refreshBtn.addEventListener("click", (e) => {
        e.preventDefault();
        refreshBtn.classList.add("spinning");
        loadMonth().then(() => refreshBtn.classList.remove("spinning"));
      });
    }
  }

  async function loadMonth() {
    try {
      const result = await API.getAvailability(type, currentYear, currentMonth + 1);
      if (result.success && result.data) {
        for (const key in availabilityData) delete availabilityData[key];
        Object.assign(availabilityData, result.data);
      }
    } catch (err) {
      console.warn("Failed to load availability:", err);
    }
    render();
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) loadMonth();
  });

  let refreshTimer = null;
  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(() => {
      if (!document.hidden) loadMonth();
    }, 30000);
  }
  function stopAutoRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  loadMonth();
  startAutoRefresh();

  return {
    refresh() { loadMonth(); },
    getMonth() { return { year: currentYear, month: currentMonth + 1 }; }
  };
}

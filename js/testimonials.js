/* ===== Testimonials Slider Component ===== */

function createTestimonialsSlider(config) {
  const {
    containerId,
    testimonials = [],
    autoplay = true,
    interval = 5000
  } = config;

  const container = document.getElementById(containerId);
  if (!container) return;

  if (testimonials.length === 0) {
    container.innerHTML = `<p class="testimonials-empty">${t("testimonials_empty")}</p>`;
    return;
  }

  let currentIndex = 0;
  let autoplayTimer = null;
  const lang = (typeof Lang !== "undefined") ? Lang.current : "ar";

  function render() {
    const item = testimonials[currentIndex];
    const stars = "★".repeat(item.rating) + "☆".repeat(5 - item.rating);
    const dateStr = item.date ? new Date(item.date).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US") : "";

    let html = `
      <div class="testimonial-card">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" class="testimonial-avatar" onerror="this.style.display='none'">` : 
          `<div class="testimonial-avatar-placeholder">${(item.name || "?")[0]}</div>`}
        <div class="testimonial-stars">${stars}</div>
        <p class="testimonial-comment">"${item.comment}"</p>
        <div class="testimonial-author">
          <strong>${item.name}</strong>
          ${dateStr ? `<span class="testimonial-date">${dateStr}</span>` : ""}
        </div>
      </div>`;

    if (testimonials.length > 1) {
      html += `
        <div class="testimonial-nav">
          <button class="testimonial-nav-btn" data-dir="-1">&#8594;</button>
          <div class="testimonial-dots">
            ${testimonials.map((_, i) => `<span class="testimonial-dot ${i === currentIndex ? 'active' : ''}" data-index="${i}"></span>`).join("")}
          </div>
          <button class="testimonial-nav-btn" data-dir="1">&#8592;</button>
        </div>`;
    }

    container.innerHTML = html;

    container.querySelectorAll(".testimonial-nav-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const dir = parseInt(btn.getAttribute("data-dir"));
        goTo(currentIndex + dir);
      });
    });

    container.querySelectorAll(".testimonial-dot").forEach(dot => {
      dot.addEventListener("click", () => {
        goTo(parseInt(dot.getAttribute("data-index")));
      });
    });
  }

  function goTo(index) {
    currentIndex = index;
    if (currentIndex < 0) currentIndex = testimonials.length - 1;
    if (currentIndex >= testimonials.length) currentIndex = 0;
    render();
    resetAutoplay();
  }

  function startAutoplay() {
    if (!autoplay || testimonials.length <= 1) return;
    autoplayTimer = setInterval(() => {
      goTo(currentIndex + 1);
    }, interval);
  }

  function resetAutoplay() {
    clearInterval(autoplayTimer);
    startAutoplay();
  }

  render();
  startAutoplay();

  return { refresh: render, goTo };
}

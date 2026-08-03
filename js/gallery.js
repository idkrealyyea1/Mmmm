/* ===== Professional Gallery Component ===== */

function createGallery(config) {
  const {
    containerId,
    category,
    columns = 3,
    gap = 12
  } = config;

  const container = document.getElementById(containerId);
  if (!container) return;

  const lang = (typeof Lang !== "undefined") ? Lang.current : "ar";
  const images = GALLERY[category] || [];

  /* --- Build Masonry Grid --- */
  function renderGrid() {
    if (images.length === 0) {
      container.innerHTML = `<p class="gallery-empty">${t("gallery_title")}</p>`;
      return;
    }

    let html = `<div class="gallery-grid" style="columns:${columns};column-gap:${gap}px;">`;
    images.forEach((img, i) => {
      const alt = (typeof img === "object") ? (img.alt[lang] || img.alt.ar || "") : "";
      const src = (typeof img === "object") ? img.src : img;
      const featured = (typeof img === "object") && img.featured ? " gallery-item-featured" : "";
      html += `
        <div class="gallery-item${featured}" data-index="${i}" style="break-inside:avoid;margin-bottom:${gap}px;">
          <img src="${src}" alt="${alt}" loading="lazy" onerror="this.parentElement.style.display='none'">
          <div class="gallery-item-overlay">
            <span class="gallery-item-icon">🔍</span>
          </div>
        </div>`;
    });
    html += "</div>";
    container.innerHTML = html;

    container.querySelectorAll(".gallery-item").forEach(item => {
      item.addEventListener("click", () => {
        openLightbox(parseInt(item.getAttribute("data-index")));
      });
    });
  }

  /* --- Lightbox --- */
  let lightboxEl = null;
  let currentIndex = 0;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;

  function createLightbox() {
    if (lightboxEl) return;
    lightboxEl = document.createElement("div");
    lightboxEl.className = "gallery-lightbox";
    lightboxEl.innerHTML = `
      <div class="lb-close" data-action="close">&times;</div>
      <div class="lb-prev" data-action="prev">&#8594;</div>
      <div class="lb-next" data-action="next">&#8592;</div>
      <div class="lb-counter"></div>
      <div class="lb-zoom-in" data-action="zoom-in">+</div>
      <div class="lb-zoom-out" data-action="zoom-out">−</div>
      <div class="lb-reset" data-action="reset">⟲</div>
      <div class="lb-image-wrapper">
        <img class="lb-image" src="" alt="">
      </div>
    `;
    document.body.appendChild(lightboxEl);

    lightboxEl.addEventListener("click", (e) => {
      const action = e.target.getAttribute("data-action") || e.target.closest("[data-action]")?.getAttribute("data-action");
      if (action === "close") closeLightbox();
      else if (action === "prev") navigate(-1);
      else if (action === "next") navigate(1);
      else if (action === "zoom-in") zoomIn();
      else if (action === "zoom-out") zoomOut();
      else if (action === "reset") resetZoom();
    });

    /* Keyboard */
    document.addEventListener("keydown", (e) => {
      if (!lightboxEl || !lightboxEl.classList.contains("active")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") navigate(Lang.isAr() ? -1 : 1);
      else if (e.key === "ArrowRight") navigate(Lang.isAr() ? 1 : -1);
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "0") resetZoom();
    });

    /* Swipe support */
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    lightboxEl.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    lightboxEl.addEventListener("touchend", (e) => {
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const dt = Date.now() - touchStartTime;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && dt < 300) {
          navigate(dx > 0 ? (Lang.isAr() ? -1 : 1) : (Lang.isAr() ? 1 : -1));
        }
      }
    }, { passive: true });

    /* Mouse wheel zoom */
    const wrapper = lightboxEl.querySelector(".lb-image-wrapper");
    wrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }, { passive: false });

    /* Pan */
    wrapper.addEventListener("mousedown", (e) => {
      if (scale > 1) {
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
        wrapper.style.cursor = "grabbing";
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (isPanning) {
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        applyTransform();
      }
    });

    document.addEventListener("mouseup", () => {
      isPanning = false;
      if (lightboxEl) lightboxEl.querySelector(".lb-image-wrapper").style.cursor = scale > 1 ? "grab" : "";
    });

    /* Double click to zoom */
    wrapper.addEventListener("dblclick", (e) => {
      e.preventDefault();
      if (scale > 1) resetZoom();
      else { scale = 2.5; applyTransform(); }
    });
  }

  function openLightbox(index) {
    createLightbox();
    currentIndex = index;
    scale = 1;
    panX = 0;
    panY = 0;
    updateLightboxImage();
    lightboxEl.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove("active");
    document.body.style.overflow = "auto";
  }

  function navigate(dir) {
    currentIndex += dir;
    if (currentIndex < 0) currentIndex = images.length - 1;
    if (currentIndex >= images.length) currentIndex = 0;
    scale = 1;
    panX = 0;
    panY = 0;
    updateLightboxImage();
  }

  function updateLightboxImage() {
    if (!lightboxEl) return;
    const img = images[currentIndex];
    const src = (typeof img === "object") ? img.src : img;
    const alt = (typeof img === "object") ? (img.alt[lang] || img.alt.ar || "") : "";
    lightboxEl.querySelector(".lb-image").src = src;
    lightboxEl.querySelector(".lb-image").alt = alt;
    lightboxEl.querySelector(".lb-counter").textContent = `${currentIndex + 1} ${t("gallery_of")} ${images.length}`;
    applyTransform();
  }

  function zoomIn() {
    scale = Math.min(scale + 0.5, 5);
    applyTransform();
  }

  function zoomOut() {
    scale = Math.max(scale - 0.5, 1);
    if (scale === 1) { panX = 0; panY = 0; }
    applyTransform();
  }

  function resetZoom() {
    scale = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  function applyTransform() {
    if (!lightboxEl) return;
    const img = lightboxEl.querySelector(".lb-image");
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    const wrapper = lightboxEl.querySelector(".lb-image-wrapper");
    wrapper.style.cursor = scale > 1 ? "grab" : "";
  }

  renderGrid();

  return { refresh: renderGrid };
}

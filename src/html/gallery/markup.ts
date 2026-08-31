export function buildGalleryBody(
  heroTitleHTML: string = 'Stills from my<br>film camera',
  subtitle: string = 'A project by Aanjney',
  contactEmail: string = 'aanjneygupta43@gmail.com',
): string {
  return `<a href="#gallery" class="skip-link">Skip to gallery</a>

<nav class="site-nav" role="navigation" aria-label="Main navigation">
  <a href="/" class="brand" aria-label="Home"></a>
  <div class="nav-actions">
    <button class="theme-toggle" type="button" id="themeToggle" aria-label="Toggle light/dark mode">
      <span class="material-symbols-outlined icon-light">light_mode</span>
      <span class="material-symbols-outlined icon-dark">dark_mode</span>
    </button>
  </div>
</nav>

<header class="hero">
  <h1 class="hero-title">${heroTitleHTML}</h1>
  <p class="hero-sub">${subtitle}</p>
</header>

<main id="gallery">
  <div id="grid" class="masonry"></div>
  <div id="sentinel"></div>
</main>

<div class="carousel" id="carousel" role="dialog" aria-modal="true" aria-label="Image viewer">
  <button class="carousel-close" type="button" aria-label="Close viewer">
    <span class="material-symbols-outlined">close</span>
  </button>
  <button class="carousel-nav-btn carousel-prev" type="button" aria-label="Previous image">
    <span class="material-symbols-outlined">chevron_left</span>
  </button>
  <button class="carousel-nav-btn carousel-next" type="button" aria-label="Next image">
    <span class="material-symbols-outlined">chevron_right</span>
  </button>
  <div class="carousel-content">
    <div class="carousel-img-wrap">
      <img id="carouselImg" alt="" decoding="async" />
    </div>
    <div class="carousel-meta">
      <div class="carousel-details" id="carouselDetails"></div>
      <div class="carousel-counter" id="carouselCounter"></div>
      <div class="carousel-divider"></div>
    </div>
  </div>
</div>

<footer class="site-footer">
  <div class="footer-brand">${subtitle}</div>
  <div class="footer-links">
    <a href="/">Archives</a>
    <button type="button" id="contactBtn">Contact</button>
  </div>
  <div class="email-toast" id="emailToast">
    <span class="email-toast-addr">${contactEmail}</span>
    <button class="email-toast-copy" type="button" id="copyEmail" aria-label="Copy email">
      <span class="material-symbols-outlined">content_copy</span>
    </button>
    <span class="email-toast-label" id="copyLabel">Copy</span>
  </div>
  <div class="footer-copyright">&copy; ${new Date().getFullYear()} ${subtitle.replace(/^A project by\s*/, '') || 'Aanjney'}. All rights reserved.</div>
</footer>`;
}

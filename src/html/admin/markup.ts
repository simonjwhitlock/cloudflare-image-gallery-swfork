import { UPLOAD_ACCEPT_ATTRIBUTE } from '../../domain/uploadPolicy';

export function buildAdminBody(): string {
  return `<button class="mobile-toggle" type="button" aria-label="Toggle sidebar" id="mobileToggle">
  <span class="material-symbols-outlined">menu</span>
</button>

<aside class="sidebar" id="sidebar">
  <div class="sidebar-brand"></div>
  <nav class="sidebar-nav" aria-label="Admin navigation">
    <button class="nav-item active" data-tab="upload" type="button">
      <span class="material-symbols-outlined">add_a_photo</span><span>Upload</span>
    </button>
    <button class="nav-item" data-tab="manage" type="button">
      <span class="material-symbols-outlined">grid_view</span><span>Manage</span>
    </button>
    <button class="nav-item" data-tab="settings" type="button">
      <span class="material-symbols-outlined">settings</span><span>Site</span>
    </button>
  </nav>
  <div class="sidebar-footer">
    <a href="/" class="nav-item"><span class="material-symbols-outlined">home</span><span>View Gallery</span></a>
  </div>
</aside>

<header class="top-bar">
  <div></div>
  <button class="theme-toggle" id="themeToggle" type="button" aria-label="Toggle light/dark mode">
    <span class="material-symbols-outlined icon-dark">dark_mode</span>
    <span class="material-symbols-outlined icon-light">light_mode</span>
  </button>
</header>

<main class="main-content">
  <section id="tab-upload" class="tab-panel">
    <header class="section-header">
      <div class="breadcrumbs">Dashboard / Upload</div>
      <h2>Upload</h2><div class="header-line"></div>
    </header>
    <div id="dropArea" class="drop-zone">
      <div class="drop-zone-hl"></div>
      <span class="material-symbols-outlined drop-icon">cloud_upload</span>
      <h3>Drag negatives here</h3><p>JPG, PNG, WebP</p>
      <div class="corner corner-tl"></div><div class="corner corner-tr"></div>
      <div class="corner corner-bl"></div><div class="corner corner-br"></div>
      <input id="filePicker" type="file" accept="${UPLOAD_ACCEPT_ATTRIBUTE}" multiple style="display:none" />
    </div>
    <div class="queue-header">
      <h3>Pending Queue (<span id="queueCount">0</span>)</h3>
      <div class="queue-actions-bar">
        <button id="clearQueue" type="button" class="btn-ghost">Clear All</button>
      </div>
    </div>
    <div id="uploadProgress" class="upload-progress" style="display:none">
      <div class="upload-progress-header">
        <span class="upload-progress-label" id="uploadLabel">Uploading</span>
        <span class="upload-progress-count" id="uploadCount"></span>
      </div>
      <div class="upload-progress-track"><div class="upload-progress-fill" id="uploadFill"></div></div>
      <span class="upload-progress-status" id="uploadStatus" role="status" aria-live="polite"></span>
    </div>
    <div id="queueList" class="queue-list"></div>
    <div class="upload-footer">
      <button id="startUpload" type="button" class="btn-primary-lg">Upload to Archive</button>
    </div>
  </section>

  <section id="tab-manage" class="tab-panel" style="display:none">
    <header class="section-header">
      <div class="breadcrumbs">Dashboard / Manage</div><h2>Manage</h2>
      <div class="header-line"></div>
    </header>
    <div class="stats-grid" id="statsGrid">
      <div class="stat-card stat-card-alt"><p class="stat-label">Total Shots</p><p class="stat-value" id="statTotal">&mdash;</p></div>
      <div class="stat-card"><p class="stat-label">Storage Used</p><p class="stat-value" id="statStorage">&mdash;</p></div>
      <div class="stat-card stat-card-alt"><p class="stat-label">Latest Upload</p><p class="stat-value" id="statLatest">&mdash;</p></div>
      <div class="stat-card"><p class="stat-label">Avg Size</p><p class="stat-value" id="statAvgSize">&mdash;</p></div>
    </div>
    <div class="manage-toolbar">
      <div class="search-box"><span class="material-symbols-outlined">search</span><input id="searchInput" type="text" placeholder="Search archive... (name, place, tag, description)" /></div>
      <div class="toolbar-actions">
        <span id="manageError" class="error-text" aria-live="assertive" role="status"></span>
        <button id="backfillPlaceholders" class="btn-ghost" type="button">Backfill Colors</button>
      </div>
    </div>
    <div id="tagFilterBar" class="tag-filter-bar" style="display:none" role="group" aria-label="Filter by tag"></div>
    <div class="manage-table-wrap">
      <table class="manage-table">
        <thead><tr>
          <th>Preview</th><th>Location / Year</th><th>Size</th><th>Uploaded</th><th class="text-right">Actions</th>
        </tr></thead>
        <tbody id="manageBody"></tbody>
      </table>
    </div>
    <div id="manageEmpty" class="empty-state" style="display:none">No items found in archive.</div>
    <footer class="manage-footer">
      <span id="pageInfo" class="page-info"></span>
      <div class="manage-footer-nav">
        <button id="prevPage" class="btn-ghost" type="button">Previous</button>
        <button id="nextPage" class="btn-ghost" type="button">Next</button>
      </div>
    </footer>
  </section>

  <section id="tab-settings" class="tab-panel" style="display:none">
    <header class="section-header">
      <div class="breadcrumbs">Dashboard / Site Settings</div><h2>Site Settings</h2>
      <div class="header-line"></div>
    </header>
    <div class="settings-form" id="settingsForm">
      <div class="form-group">
        <label for="siteTitle">Hero Title</label>
        <textarea id="siteTitle" rows="2" placeholder="Stills from my\nfilm camera"></textarea>
        <span class="form-hint">Use a newline to create a line break</span>
      </div>
      <div class="form-group">
        <label for="siteSubtitle">Hero Subtitle</label>
        <input id="siteSubtitle" type="text" placeholder="A project by Aanjney" />
      </div>
      <div class="form-group">
        <label for="siteContact">Contact Email</label>
        <input id="siteContact" type="email" placeholder="your@email.com" />
      </div>

      <h3 class="settings-section-title">Title Style &amp; Layout</h3>
      <div class="settings-grid">
        <div class="form-group">
          <label for="siteTitleFont">Title Font</label>
          <select id="siteTitleFont">
            <option value="">Default (Epilogue)</option>
            <option value="'Inter', sans-serif">Inter — clean sans</option>
            <option value="Georgia, serif">Georgia — serif</option>
            <option value="'Times New Roman', serif">Times — classic serif</option>
            <option value="'Courier New', monospace">Courier — typewriter</option>
            <option value="Impact, sans-serif">Impact — bold display</option>
            <option value="system-ui, sans-serif">System UI</option>
          </select>
        </div>
        <div class="form-group">
          <label for="siteTitleSize">Title Size (rem)</label>
          <input id="siteTitleSize" type="number" min="2" max="16" step="0.5" placeholder="8" />
          <span class="form-hint">Max size; scales down on small screens</span>
        </div>
        <div class="form-group">
          <label for="siteTitleWeight">Title Weight</label>
          <select id="siteTitleWeight">
            <option value="0">Default (900)</option>
            <option value="400">400 — Regular</option>
            <option value="500">500 — Medium</option>
            <option value="600">600 — SemiBold</option>
            <option value="700">700 — Bold</option>
            <option value="800">800 — ExtraBold</option>
            <option value="900">900 — Black</option>
          </select>
        </div>
        <div class="form-group">
          <label for="siteTitleSpacing">Letter Spacing (em)</label>
          <input id="siteTitleSpacing" type="number" min="-0.2" max="0.5" step="0.01" placeholder="-0.04" />
        </div>
        <div class="form-group">
          <label for="siteTitleTransform">Text Transform</label>
          <select id="siteTitleTransform">
            <option value="">Default (Uppercase)</option>
            <option value="none">None — as typed</option>
            <option value="uppercase">Uppercase</option>
            <option value="lowercase">Lowercase</option>
            <option value="capitalize">Capitalize</option>
          </select>
        </div>
        <div class="form-group">
          <label for="siteTitleAlign">Alignment</label>
          <select id="siteTitleAlign">
            <option value="">Center (default)</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
        <div class="form-group">
          <label for="siteHeroSize">Hero Spacing</label>
          <select id="siteHeroSize">
            <option value="">Default (large)</option>
            <option value="sm">Compact</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Extra Large</option>
          </select>
        </div>
      </div>

      <h3 class="settings-section-title">Colors</h3>
      <p class="form-hint" style="margin-bottom:1rem">Leave empty to use the built-in theme colors.</p>
      <div class="settings-grid colors-grid">
        <div class="form-group">
          <label for="siteDarkText"><span class="swatch swatch-dark"></span>Dark Mode — Text</label>
          <input id="siteDarkText" type="text" placeholder="#ffffff" />
        </div>
        <div class="form-group">
          <label for="siteDarkBg"><span class="swatch swatch-dark"></span>Dark Mode — Background</label>
          <input id="siteDarkBg" type="text" placeholder="#000000" />
        </div>
        <div class="form-group">
          <label for="siteLightText"><span class="swatch swatch-light"></span>Light Mode — Text</label>
          <input id="siteLightText" type="text" placeholder="#1a1a1a" />
        </div>
        <div class="form-group">
          <label for="siteLightBg"><span class="swatch swatch-light"></span>Light Mode — Background</label>
          <input id="siteLightBg" type="text" placeholder="#f5f3f0" />
        </div>
      </div>

      <div class="form-actions">
        <span id="settingsError" class="error-text" aria-live="assertive" role="status"></span>
        <button id="saveSettings" type="button" class="btn-primary-lg">Save Settings</button>
      </div>
    </div>
  </section>
</main>`;
}

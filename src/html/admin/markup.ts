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
    <button class="nav-item" data-tab="archive" type="button">
      <span class="material-symbols-outlined">inventory_2</span><span>Archive</span>
    </button>
    <button class="nav-item" data-tab="removed" type="button">
      <span class="material-symbols-outlined">delete_sweep</span><span>Removed</span>
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
    <div class="filter-bar" role="group" aria-label="Filters">
      <div class="filter-item">
        <label for="pageSizeSelect">Per page</label>
        <select id="pageSizeSelect">
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
      </div>
      <div class="filter-item">
        <label for="filterCamera">Camera</label>
        <select id="filterCamera"><option value="">All cameras</option></select>
      </div>
      <div class="filter-item">
        <label for="filterFilm">Film</label>
        <select id="filterFilm"><option value="">All film</option></select>
      </div>
      <div class="filter-item">
        <label for="filterTag">Tag</label>
        <select id="filterTag"><option value="">All tags</option></select>
      </div>
      <div class="filter-item">
        <label for="filterMeta">Metadata</label>
        <select id="filterMeta">
          <option value="">Any state</option>
          <option value="has-tags">Has tags</option>
          <option value="no-tags">No tags</option>
          <option value="has-date">Has capture date</option>
          <option value="no-date">Missing capture date</option>
          <option value="has-desc">Has description</option>
          <option value="no-desc">Missing description</option>
        </select>
      </div>
      <button id="clearFilters" class="btn-ghost" type="button">Clear filters</button>
    </div>
    <div id="tagFilterBar" class="tag-filter-bar" style="display:none" role="group" aria-label="Filter by tag"></div>
    <div class="bulk-bar" id="bulkBar" style="display:none" role="group" aria-label="Bulk actions">
      <span class="bulk-count"><strong id="bulkCount">0</strong> selected</span>
      <label class="bulk-select-all"><input type="checkbox" id="bulkSelectAll" /> Select all</label>
      <button id="bulkToActive" class="btn-ghost" type="button" style="display:none">
        <span class="material-symbols-outlined">photo_library</span> Restore to gallery
      </button>
      <button id="bulkToArchive" class="btn-ghost" type="button">
        <span class="material-symbols-outlined">inventory_2</span> Move to archive
      </button>
      <button id="bulkToRemove" class="btn-ghost danger" type="button">
        <span class="material-symbols-outlined">delete_sweep</span> Remove
      </button>
    </div>
    <div class="manage-table-wrap compact">
      <table class="manage-table">
        <thead><tr>
          <th class="col-check"><input type="checkbox" id="checkAllHead" aria-label="Select all on page" /></th>
          <th>Preview</th><th>Details</th><th class="text-right">Size</th><th>Uploaded</th><th class="text-right">Actions</th>
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

  <section id="tab-archive" class="tab-panel" style="display:none">
    <header class="section-header">
      <div class="breadcrumbs">Dashboard / Archive</div><h2>Archive</h2>
      <div class="header-line"></div>
    </header>
    <p class="tab-hint">Images here are hidden from the main gallery but available on the public <a href="/archive" target="_blank" rel="noopener">/archive</a> page.</p>
    <div class="filter-bar" role="group" aria-label="Archive filters">
      <div class="filter-item">
        <label for="archivePageSize">Per page</label>
        <select id="archivePageSize">
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
      </div>
      <div class="filter-item">
        <label for="archiveSearch">Search</label>
        <input id="archiveSearch" type="text" placeholder="Search..." />
      </div>
      <button id="archiveClearFilters" class="btn-ghost" type="button">Clear filters</button>
    </div>
    <div class="bulk-bar" id="archiveBulkBar" style="display:none" role="group" aria-label="Bulk actions">
      <span class="bulk-count"><strong id="archiveBulkCount">0</strong> selected</span>
      <button id="archiveBulkToActive" class="btn-ghost" type="button">
        <span class="material-symbols-outlined">photo_library</span> Move to gallery
      </button>
      <button id="archiveBulkToRemove" class="btn-ghost danger" type="button">
        <span class="material-symbols-outlined">delete_sweep</span> Remove
      </button>
    </div>
    <div class="manage-table-wrap compact">
      <table class="manage-table">
        <thead><tr>
          <th class="col-check"><input type="checkbox" id="archiveCheckAll" aria-label="Select all on page" /></th>
          <th>Preview</th><th>Details</th><th class="text-right">Size</th><th>Uploaded</th><th class="text-right">Actions</th>
        </tr></thead>
        <tbody id="archiveBody"></tbody>
      </table>
    </div>
    <div id="archiveEmpty" class="empty-state" style="display:none">Nothing in the archive.</div>
    <footer class="manage-footer">
      <span id="archivePageInfo" class="page-info"></span>
      <div class="manage-footer-nav">
        <button id="archivePrevPage" class="btn-ghost" type="button">Previous</button>
        <button id="archiveNextPage" class="btn-ghost" type="button">Next</button>
      </div>
    </footer>
  </section>

  <section id="tab-removed" class="tab-panel" style="display:none">
    <header class="section-header">
      <div class="breadcrumbs">Dashboard / Removed</div><h2>Removed</h2>
      <div class="header-line"></div>
    </header>
    <p class="tab-hint">Removed images are hidden everywhere (gallery and public archive). Deleting permanently is still available per-row.</p>
    <div class="filter-bar" role="group" aria-label="Removed filters">
      <div class="filter-item">
        <label for="removedPageSize">Per page</label>
        <select id="removedPageSize">
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
      </div>
      <div class="filter-item">
        <label for="removedSearch">Search</label>
        <input id="removedSearch" type="text" placeholder="Search..." />
      </div>
      <button id="removedClearFilters" class="btn-ghost" type="button">Clear filters</button>
    </div>
    <div class="bulk-bar" id="removedBulkBar" style="display:none" role="group" aria-label="Bulk actions">
      <span class="bulk-count"><strong id="removedBulkCount">0</strong> selected</span>
      <button id="removedBulkToActive" class="btn-ghost" type="button">
        <span class="material-symbols-outlined">photo_library</span> Move to gallery
      </button>
      <button id="removedBulkToArchive" class="btn-ghost" type="button">
        <span class="material-symbols-outlined">inventory_2</span> Move to archive
      </button>
    </div>
    <div class="manage-table-wrap compact">
      <table class="manage-table">
        <thead><tr>
          <th class="col-check"><input type="checkbox" id="removedCheckAll" aria-label="Select all on page" /></th>
          <th>Preview</th><th>Details</th><th class="text-right">Size</th><th>Uploaded</th><th class="text-right">Actions</th>
        </tr></thead>
        <tbody id="removedBody"></tbody>
      </table>
    </div>
    <div id="removedEmpty" class="empty-state" style="display:none">Nothing removed.</div>
    <footer class="manage-footer">
      <span id="removedPageInfo" class="page-info"></span>
      <div class="manage-footer-nav">
        <button id="removedPrevPage" class="btn-ghost" type="button">Previous</button>
        <button id="removedNextPage" class="btn-ghost" type="button">Next</button>
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

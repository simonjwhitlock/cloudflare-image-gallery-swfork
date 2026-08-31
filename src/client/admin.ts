import { ADMIN_BACKFILL_VARIANT, ADMIN_THUMB_VARIANT } from '../domain/imageVariants';
import { UPLOAD_FORMAT_LABEL } from '../domain/uploadPolicy';
import { buildAdminManageScript } from './adminManage';
import { buildAdminUploadScript } from './adminUpload';
import {
  emitBrowserImageUrlHelpers,
  emitBrowserPlaceholderHelper,
  wrapClientIife,
} from './buildClientScript';

export function buildAdminScript(adminPrefix: string): string {
  const adminThumbVariant = JSON.stringify(ADMIN_THUMB_VARIANT);
  const adminBackfillVariant = JSON.stringify(ADMIN_BACKFILL_VARIANT);
  const uploadFormatLabel = JSON.stringify(UPLOAD_FORMAT_LABEL);

  return wrapClientIife(`  var ADMIN = '${adminPrefix}';
  var qs = function(id){ return document.getElementById(id); };
  var ADMIN_THUMB_VARIANT = ${adminThumbVariant};
  var ADMIN_BACKFILL_VARIANT = ${adminBackfillVariant};
  var UPLOAD_FORMAT_LABEL = ${uploadFormatLabel};
${emitBrowserImageUrlHelpers()}
${emitBrowserPlaceholderHelper()}

  /* ── Sidebar ── */
  var sidebar = qs('sidebar');
  qs('mobileToggle').addEventListener('click', function(){ sidebar.classList.toggle('open'); });

  /* ── Theme toggle ── */
  var html = document.documentElement;
  var stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') html.setAttribute('data-theme', stored);
  qs('themeToggle').addEventListener('click', function(){
    var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });

  /* ── Tabs ── */
  var tabs = document.querySelectorAll('.sidebar-nav .nav-item');
  var tabUpload = qs('tab-upload');
  var tabManage = qs('tab-manage');
  var tabSettings = qs('tab-settings');
  tabs.forEach(function(btn){
    btn.addEventListener('click', function(){
      tabs.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var tab = btn.getAttribute('data-tab');
      tabUpload.style.display = tab === 'upload' ? 'block' : 'none';
      tabManage.style.display = tab === 'manage' ? 'block' : 'none';
      tabSettings.style.display = tab === 'settings' ? 'block' : 'none';
      if (window.innerWidth <= 960) sidebar.classList.remove('open');
    });
  });

  /* ── Site Settings ── */
  (function(){
    var F = ['siteTitle','siteSubtitle','siteContact','siteTitleFont','siteTitleSize',
      'siteTitleWeight','siteTitleSpacing','siteTitleTransform','siteTitleAlign',
      'siteHeroSize','siteDarkText','siteDarkBg','siteLightText','siteLightBg'];
    var el = {};
    F.forEach(function(id){ el[id] = qs(id); });
    var settingsError = qs('settingsError');
    var saveSettingsBtn = qs('saveSettings');

    async function loadSettings() {
      try {
        var r = await fetch(ADMIN + '/api/site-meta');
        if (!r.ok) {
          var errData = await r.json().catch(function(){ return {}; });
          settingsError.textContent = 'Failed to load settings: ' + (errData.detail || r.status);
          return;
        }
        var d = await r.json();
        var col = d.colors || {};
        el.siteTitle.value = d.title || '';
        el.siteSubtitle.value = d.subtitle || '';
        el.siteContact.value = d.contactEmail || '';
        el.siteTitleFont.value = d.titleFont || '';
        el.siteTitleSize.value = d.titleSize || '';
        el.siteTitleWeight.value = String(d.titleWeight || 0);
        el.siteTitleSpacing.value = d.titleSpacing || '';
        el.siteTitleTransform.value = d.titleTransform || '';
        el.siteTitleAlign.value = d.titleAlign || '';
        el.siteHeroSize.value = d.heroSize || '';
        el.siteDarkText.value = col.darkText || '';
        el.siteDarkBg.value = col.darkBg || '';
        el.siteLightText.value = col.lightText || '';
        el.siteLightBg.value = col.lightBg || '';
      } catch (e) {
        settingsError.textContent = 'Failed to load settings: ' + e;
      }
    }

    saveSettingsBtn.addEventListener('click', async function(){
      settingsError.textContent = '';
      var payload = {
        title: el.siteTitle.value,
        subtitle: el.siteSubtitle.value,
        contactEmail: el.siteContact.value,
        titleFont: el.siteTitleFont.value,
        titleSize: el.siteTitleSize.value,
        titleWeight: Number(el.siteTitleWeight.value) || 0,
        titleSpacing: el.siteTitleSpacing.value,
        titleTransform: el.siteTitleTransform.value,
        titleAlign: el.siteTitleAlign.value,
        heroSize: el.siteHeroSize.value,
        colors: {
          darkText: el.siteDarkText.value.trim(),
          darkBg: el.siteDarkBg.value.trim(),
          lightText: el.siteLightText.value.trim(),
          lightBg: el.siteLightBg.value.trim()
        }
      };
      try {
        var r = await fetch(ADMIN + '/api/site-meta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!r.ok) {
          var errData = await r.json().catch(function(){ return {}; });
          settingsError.textContent = 'Failed to save settings: ' + (errData.detail || errData.error || r.status);
          return;
        }
        settingsError.textContent = 'Saved!';
        setTimeout(function(){ settingsError.textContent = ''; }, 2000);
      } catch (e) {
        settingsError.textContent = 'Failed to save settings: ' + e;
      }
    });

    loadSettings();
  })();

${buildAdminUploadScript()}
${buildAdminManageScript()}
  renderQueue();
  loadManagePage(null);`);
}

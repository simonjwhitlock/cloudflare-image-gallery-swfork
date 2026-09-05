/**
 * Shared controller for the Archive and Removed admin tabs. Both tabs render
 * the same compact table (no upload stats/backfill) with bulk move actions.
 */
export function buildStatusTabScript(config: {
  status: 'archive' | 'removed';
  prefix: string; // 'archive' | 'removed'
}): string {
  const { status, prefix } = config;
  const cap = prefix.charAt(0).toUpperCase() + prefix.slice(1);

  return `  /* ── ${cap} tab ── */
  window.load${cap}Page = window.load${cap}Page || function(cursorParam){
    var body = qs('${prefix}Body');
    var empty = qs('${prefix}Empty');
    var pageInfo = qs('${prefix}PageInfo');
    var prevBtn = qs('${prefix}PrevPage');
    var nextBtn = qs('${prefix}NextPage');
    var errEl = qs('manageError');
    prevBtn.disabled = true; nextBtn.disabled = true;
    body.innerHTML = '<tr><td colspan="6" class="manage-meta" style="padding:2rem;text-align:center">Loading...</td></tr>';
    var p = new URLSearchParams();
    p.set('limit', String(qs('${prefix}PageSize').value || '25'));
    p.set('status', '${status}');
    if (cursorParam) p.set('cursor', cursorParam);
    var term = String(qs('${prefix}Search').value || '').trim().toLowerCase();
    if (term) p.set('q', term);
    fetch('/api/images?' + p.toString(), { cache: 'no-store' }).then(function(r){
      if (r.status === 401) { errEl.textContent = 'Unauthorized. Please sign in via Cloudflare Access.'; return; }
      return r.json().then(function(data){
        body.innerHTML = '';
        var items = data.items || [];
        empty.style.display = items.length ? 'none' : 'block';
        pageInfo.textContent = 'Page ' + ((${prefix}PrevStack.length||0) + 1) + (data.cursor ? ' \\u2192' : '');
        prevBtn.disabled = (${prefix}PrevStack.length === 0);
        nextBtn.disabled = !data.cursor;
        ${prefix}Cursor = data.cursor || null;

        items.forEach(function(item){
          var tr = document.createElement('tr');

          var checkTd = document.createElement('td');
          checkTd.className = 'col-check';
          var check = document.createElement('input');
          check.type = 'checkbox'; check.className = 'bulk-check';
          check.setAttribute('data-id', item.id);
          check.addEventListener('change', update${cap}BulkBar);
          checkTd.appendChild(check);
          tr.appendChild(checkTd);

          var thumbTd = document.createElement('td');
          var thumbDiv = document.createElement('div');
          thumbDiv.className = 'manage-thumb';
          var img = document.createElement('img');
          img.src = thumbUrl(item.id);
          img.loading = 'lazy'; img.decoding = 'async';
          img.onerror = function(){ img.src = originalUrl(item.id); };
          img.alt = item.name || 'Image';
          thumbDiv.appendChild(img);
          thumbTd.appendChild(thumbDiv);
          tr.appendChild(thumbTd);

          var locTd = document.createElement('td');
          var titleDiv = document.createElement('div');
          titleDiv.className = 'manage-title';
          var parts = [];
          if (item.location) parts.push(item.location);
          if (item.captureDate) parts.push(fmtCapture(item.captureDate));
          else if (item.year) parts.push(item.year);
          titleDiv.textContent = parts.join(' \\u2022 ') || (item.name || '\\u2014');
          locTd.appendChild(titleDiv);
          if (item.cameraBody || item.lens) {
            var subDiv = document.createElement('div');
            subDiv.className = 'manage-subtitle';
            var sub = [];
            if (item.cameraBody) sub.push(item.cameraBody);
            if (item.lens) sub.push(item.lens);
            subDiv.textContent = sub.join(' \\u2022 ');
            locTd.appendChild(subDiv);
          }
          if (item.tags && item.tags.length) {
            var tagsDiv = document.createElement('div');
            tagsDiv.className = 'manage-tags';
            item.tags.forEach(function(t){
              var chip = document.createElement('span');
              chip.className = 'tag-chip'; chip.textContent = t;
              tagsDiv.appendChild(chip);
            });
            locTd.appendChild(tagsDiv);
          }
          tr.appendChild(locTd);

          var sizeTd = document.createElement('td');
          sizeTd.className = 'manage-meta text-right';
          sizeTd.textContent = fmtSize(item.size);
          tr.appendChild(sizeTd);

          var dateTd = document.createElement('td');
          dateTd.className = 'manage-meta';
          dateTd.textContent = fmtDate(item.createdAt);
          tr.appendChild(dateTd);

          var actionsTd = document.createElement('td');
          actionsTd.className = 'manage-actions';
          var editBtn = document.createElement('button');
          editBtn.className = 'btn-icon'; editBtn.type = 'button'; editBtn.title = 'Edit metadata';
          editBtn.innerHTML = '<span class="material-symbols-outlined">edit</span>';
          (function(itm, rowEl){ editBtn.addEventListener('click', function(){ showEditRow(itm, rowEl); }); })(item, tr);
          actionsTd.appendChild(editBtn);
          var delBtn = document.createElement('button');
          delBtn.className = 'btn-icon danger'; delBtn.type = 'button'; delBtn.title = 'Delete permanently';
          delBtn.innerHTML = '<span class="material-symbols-outlined">delete</span>';
          (function(iid){
            delBtn.addEventListener('click', function(){
              if (!confirm('Delete this image permanently?')) return;
              delBtn.disabled = true;
              fetch(ADMIN+'/api/images/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:iid})})
                .then(function(r){ return r.json().catch(function(){return {};}).then(function(d){
                  if(!r.ok||!d.ok){alert('Delete failed: '+(d.error||r.status));delBtn.disabled=false;return;}
                  window.load${cap}Page(${prefix}PrevStack[${prefix}PrevStack.length-1] || null);
                }); }).catch(function(){alert('Delete failed');delBtn.disabled=false;});
            });
          })(item.id);
          actionsTd.appendChild(delBtn);
          tr.appendChild(actionsTd);

          body.appendChild(tr);
        });
        update${cap}BulkBar();
      });
    }).catch(function(){ errEl.textContent = 'Failed to load images'; });
  };

  var ${prefix}Cursor = null;
  var ${prefix}PrevStack = [];

  var update${cap}BulkBar = function(){
    var boxes = document.querySelectorAll('#${prefix}Body input.bulk-check');
    var checked = document.querySelectorAll('#${prefix}Body input.bulk-check:checked');
    qs('${prefix}BulkCount').textContent = String(checked.length);
    qs('${prefix}BulkBar').style.display = checked.length > 0 ? 'flex' : 'none';
    qs('${prefix}CheckAll').checked = boxes.length > 0 && checked.length === boxes.length;
  };

  qs('${prefix}CheckAll').addEventListener('change', function(){
    var on = qs('${prefix}CheckAll').checked;
    document.querySelectorAll('#${prefix}Body input.bulk-check').forEach(function(c){ c.checked = on; });
    update${cap}BulkBar();
  });

  var ${prefix}Selected = function(){
    return Array.prototype.map.call(
      document.querySelectorAll('#${prefix}Body input.bulk-check:checked'),
      function(c){ return c.getAttribute('data-id'); }
    );
  };

  var ${prefix}Move = function(status){
    var ids = ${prefix}Selected();
    if (!ids.length) return;
    if (status === 'removed' && !confirm('Remove ' + ids.length + ' image(s) from everywhere?')) return;
    fetch(ADMIN + '/api/images/bulk-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids, status: status })
    }).then(function(r){ return r.json(); }).then(function(d){
      if (!d.ok && d.failed && d.failed.length) alert('Some moves failed: ' + d.failed.length);
      window.load${cap}Page(null);
      if (window.loadManagePage) window.loadManagePage(null);
    }).catch(function(){ alert('Bulk move failed'); });
  };

  qs('${prefix}BulkToActive').addEventListener('click', function(){ ${prefix}Move('active'); });
${
  status === 'archive'
    ? `  qs('${prefix}BulkToRemove').addEventListener('click', function(){ ${prefix}Move('removed'); });`
    : `  qs('${prefix}BulkToArchive').addEventListener('click', function(){ ${prefix}Move('archive'); });`
}

  /* ── Bulk field assignment (camera / lens / capture date / tags) ── */
  var ${prefix}ToggleFields = function(on){
    qs('${prefix}BulkFieldsPanel').style.display = on ? 'block' : 'none';
  };
  qs('${prefix}BulkFieldsToggle').addEventListener('click', function(){
    var panel = qs('${prefix}BulkFieldsPanel');
    var show = panel.style.display === 'none';
    ${prefix}ToggleFields(show);
  });
  qs('${prefix}BulkFieldsCancel').addEventListener('click', function(){ ${prefix}ToggleFields(false); });
  qs('${prefix}BulkFieldsApply').addEventListener('click', function(){
    var ids = ${prefix}Selected();
    if (!ids.length) return;
    var fields = {};
    var cam = qs('${prefix}BulkCamera').value.trim();
    var lens = qs('${prefix}BulkLens').value.trim();
    var cdate = qs('${prefix}BulkCaptureDate').value;
    var tagsRaw = qs('${prefix}BulkTags').value;
    if (cam) fields.cameraBody = cam;
    if (lens) fields.lens = lens;
    if (cdate) fields.captureDate = cdate;
    if (tagsRaw.trim()) fields.tags = tagsRaw.split(',').map(function(t){ return t.trim().toLowerCase(); }).filter(Boolean);
    if (!Object.keys(fields).length) { alert('Nothing to set — fill at least one field.'); return; }
    var btn = qs('${prefix}BulkFieldsApply');
    btn.disabled = true; btn.textContent = 'Applying…';
    fetch(ADMIN + '/api/images/bulk-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: ids, fields: fields })
    }).then(function(r){ return r.json(); }).then(function(d){
      btn.disabled = false; btn.textContent = 'Apply to Selected';
      if (!d.ok && d.failed && d.failed.length) alert('Some updates failed: ' + d.failed.length);
      ${prefix}ToggleFields(false);
      qs('${prefix}BulkCamera').value = ''; qs('${prefix}BulkLens').value = ''; qs('${prefix}BulkCaptureDate').value = ''; qs('${prefix}BulkTags').value = '';
      window.load${cap}Page(null);
      if (window.loadManagePage) window.loadManagePage(null);
    }).catch(function(){ btn.disabled = false; btn.textContent = 'Apply to Selected'; alert('Bulk update failed'); });
  });

  qs('${prefix}PrevPage').addEventListener('click', function(){
    if (!${prefix}PrevStack.length) return;
    window.load${cap}Page(${prefix}PrevStack.pop() || null);
  });
  qs('${prefix}NextPage').addEventListener('click', function(){
    if (!${prefix}Cursor) return;
    ${prefix}PrevStack.push(${prefix}Cursor);
    window.load${cap}Page(${prefix}Cursor);
  });
  qs('${prefix}PageSize').addEventListener('change', function(){
    ${prefix}PrevStack.length = 0;
    window.load${cap}Page(null);
  });
  var ${prefix}SearchTimer = null;
  qs('${prefix}Search').addEventListener('input', function(){
    if (${prefix}SearchTimer) clearTimeout(${prefix}SearchTimer);
    ${prefix}SearchTimer = setTimeout(function(){
      ${prefix}PrevStack.length = 0;
      window.load${cap}Page(null);
    }, 250);
  });
  qs('${prefix}ClearFilters').addEventListener('click', function(){
    qs('${prefix}Search').value = '';
    ${prefix}PrevStack.length = 0;
    window.load${cap}Page(null);
  });
`;
}
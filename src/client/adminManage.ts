export function buildAdminManageScript(): string {
  return `  /* ── Manage ── */
  var manageBody = qs('manageBody');
  var manageEmpty = qs('manageEmpty');
  var prevPageBtn = qs('prevPage');
  var nextPageBtn = qs('nextPage');
  var pageInfo = qs('pageInfo');
  var manageError = qs('manageError');
  var searchInput = qs('searchInput');
  var backfillBtn = qs('backfillPlaceholders');
  var manageItems = [];
  var currentCursor = null;
  var nextCursor = null;
  var prevStack = [];
  var pageSize = 10;
  var editingId = null;
  var activeTag = '';

  var fmtDate = function(iso){
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  };

  var fmtCapture = function(v){
    if (!v) return '';
    // ISO yyyy-mm-dd → locale date; free-form text shown as typed.
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      var d = new Date(v + 'T00:00:00Z');
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    }
    return v;
  };

  var fmtCapture = function(v){
    if (!v) return '';
    // ISO yyyy-mm-dd → locale date; free-form text shown as typed.
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      var d = new Date(v + 'T00:00:00Z');
      if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    }
    return v;
  };

  var valToTags = function(val){
    var seen = {}, out = [];
    String(val||'').split(',').forEach(function(t){
      var tag = String(t||'').trim().toLowerCase().replace(/[^a-z0-9 _\\-]/g,'').slice(0,32);
      if (tag && out.indexOf(tag) === -1) out.push(tag);
    });
    return out;
  };

  /** All distinct tags across currently-known items (for quick-add/filter UI). */
  var collectTags = function(items){
    var counts = {};
    (items||[]).forEach(function(it){
      (it.tags||[]).forEach(function(t){ counts[t] = (counts[t]||0)+1; });
    });
    return Object.keys(counts).sort();
  };

  /** Clickable chips for quick tag filtering above the manage table. */
  var renderTagBar = function(){
    var bar = qs('tagFilterBar');
    if (!bar) return;
    bar.innerHTML = '';
    var tags = collectTags(manageItems);
    if (!tags.length && !activeTag) { bar.style.display = 'none'; return; }
    bar.style.display = 'flex';
    if (activeTag) {
      var clear = document.createElement('button');
      clear.type='button'; clear.className='tag-chip active';
      clear.textContent='\\u2715 ' + activeTag;
      clear.title = 'Clear tag filter';
      clear.addEventListener('click', function(){ activeTag=''; prevStack.length=0; loadManagePage(null); });
      bar.appendChild(clear);
    }
    tags.filter(function(t){ return t !== activeTag; }).forEach(function(t){
      var b = document.createElement('button');
      b.type='button'; b.className='tag-chip'; b.textContent=t;
      b.title = 'Filter by tag: ' + t;
      b.addEventListener('click', function(){ activeTag=t; prevStack.length=0; loadManagePage(null); });
      bar.appendChild(b);
    });
  };

  var renderManage = function(){
    manageBody.innerHTML = '';
    if (pageInfo){ pageInfo.textContent = 'Page ' + (prevStack.length+1) + (nextCursor ? ' \\u2192' : ''); }
    manageEmpty.style.display = manageItems.length ? 'none' : 'block';

    manageItems.forEach(function(item){
      var tr = document.createElement('tr');

      /* Thumb */
      var thumbTd = document.createElement('td');
      var thumbDiv = document.createElement('div');
      thumbDiv.className = 'manage-thumb';
      var img = document.createElement('img');
      img.src = thumbUrl(item.id);
      img.loading = 'lazy';
      img.decoding = 'async';
      img.onerror = function(){ img.src = originalUrl(item.id); };
      img.alt = item.name || 'Image';
      thumbDiv.appendChild(img);
      thumbTd.appendChild(thumbDiv);
      tr.appendChild(thumbTd);

      /* Location / Date */
      var locTd = document.createElement('td');
      var locParts = [];
      if (item.location) locParts.push(item.location);
      if (item.captureDate) locParts.push(fmtCapture(item.captureDate));
      else if (item.year) locParts.push(item.year);
      var titleDiv = document.createElement('div');
      titleDiv.className = 'manage-title';
      titleDiv.textContent = locParts.join(', ') || '\\u2014';
      locTd.appendChild(titleDiv);
      if (item.filmStock || item.cameraBody) {
        var subDiv = document.createElement('div');
        subDiv.className = 'manage-subtitle';
        var sub = [];
        if (item.cameraBody) sub.push(item.cameraBody);
        if (item.filmStock) sub.push(item.filmStock);
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

      /* Size */
      var sizeTd = document.createElement('td');
      sizeTd.className = 'manage-meta';
      sizeTd.textContent = item.size ? Math.round(item.size/1024)+' KB' : '';
      tr.appendChild(sizeTd);

      /* Date */
      var dateTd = document.createElement('td');
      dateTd.className = 'manage-meta';
      dateTd.textContent = fmtDate(item.createdAt);
      tr.appendChild(dateTd);

      /* Actions */
      var actionsTd = document.createElement('td');
      actionsTd.className = 'manage-actions';

      var copyBtn = document.createElement('button');
      copyBtn.className = 'btn-icon'; copyBtn.type = 'button'; copyBtn.title = 'Copy link';
      copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
      (function(iid){ copyBtn.addEventListener('click', function(){
        navigator.clipboard.writeText(window.location.origin+'/media/'+iid).then(function(){
          manageError.textContent='Link copied';
          setTimeout(function(){if(manageError.textContent==='Link copied')manageError.textContent='';},1200);
        }).catch(function(){prompt('Copy link:',window.location.origin+'/media/'+iid);});
      }); })(item.id);
      actionsTd.appendChild(copyBtn);

      var editBtn = document.createElement('button');
      editBtn.className = 'btn-icon'; editBtn.type = 'button'; editBtn.title = 'Edit metadata';
      editBtn.innerHTML = '<span class="material-symbols-outlined">edit</span>';
      (function(itm, rowEl){
        editBtn.addEventListener('click', function(){ showEditRow(itm, rowEl); });
      })(item, tr);
      actionsTd.appendChild(editBtn);

      var delBtn = document.createElement('button');
      delBtn.className = 'btn-icon danger'; delBtn.type = 'button'; delBtn.title = 'Delete';
      delBtn.innerHTML = '<span class="material-symbols-outlined">delete</span>';
      (function(iid){
        delBtn.addEventListener('click', function(){
          if (!confirm('Delete this image permanently?')) return;
          delBtn.disabled = true;
          fetch(ADMIN+'/api/images/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:iid})})
            .then(function(r){ return r.json().catch(function(){return {};}).then(function(d){
              if(!r.ok||!d.ok){alert('Delete failed: '+(d.error||r.status));delBtn.disabled=false;return;}
              manageItems=manageItems.filter(function(x){return x.id!==iid;});renderManage();
            }); }).catch(function(){alert('Delete failed');delBtn.disabled=false;});
        });
      })(item.id);
      actionsTd.appendChild(delBtn);
      tr.appendChild(actionsTd);
      manageBody.appendChild(tr);
    });
  };

  /* ── Inline edit row ── */
  var showEditRow = function(item, afterRow){
    var existing = document.querySelector('.edit-row');
    if (existing) existing.remove();
    if (editingId === item.id) { editingId = null; return; }
    editingId = item.id;

    var editTr = document.createElement('tr');
    editTr.className = 'edit-row';
    var td = document.createElement('td');
    td.colSpan = 5;

    var form = document.createElement('div');
    form.className = 'edit-form';
    var fields = [
      {label:'Camera Body',field:'cameraBody',val:item.cameraBody||'',ph:'e.g. Leica M6'},
      {label:'Film Stock',field:'filmStock',val:item.filmStock||'',ph:'e.g. Kodak Portra 400'},
      {label:'Location',field:'location',val:item.location||'',ph:'e.g. Faroe Islands'},
      {label:'Date of capture',field:'captureDate',val:item.captureDate||'',ph:'e.g. 2024-08-15'},
      {label:'Description',field:'description',val:item.description||'',ph:'Optional description'},
      {label:'Tags (comma-separated)',field:'tagsRaw',val:(item.tags||[]).join(', '),ph:'e.g. landscape, sea'}
    ];
    var inputs = {};
    fields.forEach(function(f){
      var g = document.createElement('div');
      g.className = 'field-group';
      var l = document.createElement('label');
      l.textContent = f.label;
      g.appendChild(l);
      // Native date picker for captureDate; text for everything else.
      var isDate = f.field === 'captureDate';
      var inp = document.createElement('input');
      inp.type = isDate ? 'date' : 'text';
      // Non-ISO legacy values (free-form text) won't fit type=date; keep a
      // text fallback in that case so the old value stays editable.
      if (isDate && f.val && !/^\d{4}-\d{2}-\d{2}$/.test(f.val)) {
        inp.type = 'text';
        inp.placeholder = f.ph;
      }
      inp.value = f.val; inp.placeholder = f.ph;
      inputs[f.field] = inp;
      g.appendChild(inp);
      form.appendChild(g);
    });
    attachTagAutocomplete(inputs.tagsRaw, function(){
      // live-sync normalized tags back into the queue item so Save uses them
      var raw = inputs.tagsRaw.value;
      item.tags = valToTags(raw);
    });
    td.appendChild(form);

    var acts = document.createElement('div');
    acts.className = 'edit-actions';
    var saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save'; saveBtn.type = 'button'; saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', function(){
      saveBtn.disabled = true; saveBtn.textContent = 'Saving...';
      var body = {id:item.id};
      fields.forEach(function(f){
        if (f.field === 'tagsRaw') {
          // Read the LIVE input value — f.val is the stale initial value from
          // when the edit row opened, which caused tags to be silently lost.
          body.tags = valToTags(inputs.tagsRaw.value);
          return;
        }
        var val = inputs[f.field].value.trim();
        body[f.field] = f.field === 'captureDate' || f.field === 'description'
          ? val
          : val.toUpperCase();
      });
      var altParts = [];
      if (body.filmStock) altParts.push(body.filmStock);
      if (body.cameraBody) altParts.push(body.cameraBody);
      if (body.location) altParts.push(body.location);
      if (body.captureDate) altParts.push(body.captureDate);
      body.alt = altParts.length ? 'Film photograph \\u2014 ' + altParts.join(', ') : (item.name || 'Film photograph');
      fetch(ADMIN+'/api/images/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        .then(function(r){ return r.json().then(function(d){
          if (!r.ok||!d.ok){ alert('Update failed'); saveBtn.disabled=false; saveBtn.textContent='Save'; return; }
          var updated = d.image;
          for (var i=0;i<manageItems.length;i++){
            if (manageItems[i].id===item.id){ manageItems[i]=updated; break; }
          }
          editingId = null; renderManage();
          refreshTagSuggestions();
          manageError.textContent = 'Updated'; setTimeout(function(){if(manageError.textContent==='Updated')manageError.textContent='';},1200);
        }); }).catch(function(){ alert('Update failed'); saveBtn.disabled=false; saveBtn.textContent='Save'; });
    });
    acts.appendChild(saveBtn);
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-cancel'; cancelBtn.type = 'button'; cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', function(){ editingId=null; editTr.remove(); });
    acts.appendChild(cancelBtn);
    td.appendChild(acts);
    editTr.appendChild(td);
    afterRow.after(editTr);
  };

  var loadAllManage = function(){
    return new Promise(function(resolve){
      var seen=[],pg=null;
      var doP=function(){
        var p=new URLSearchParams();p.set('limit','50');if(pg)p.set('cursor',pg);
        // _t busts the browser/edge cache: /api/images is edge-cached ~30s,
        // which would otherwise serve pre-tag data to the suggestion engine.
        p.set('_t', String(Date.now()));
        fetch('/api/images?'+p.toString(), { cache: 'no-store' }).then(function(r){return r.json();}).then(function(d){
          seen=seen.concat(d.items||[]);pg=d.cursor||null;if(pg)doP();else resolve(seen);
        }).catch(function(){resolve(seen);});
      };doP();
    });
  };

  /* ── Tag autocomplete ──
   * Suggests tags already used across the archive while typing. Suggestions
   * come from the full archive (fetched once, refreshed on save) so they
   * include images outside the current page. Click a suggestion (or press
   * Enter/Tab when highlighted) to complete the current tag.
   */
  var allTagsCache = [];
  var refreshTagSuggestions = function(){
    // Merge freshly-saved page data immediately so a just-typed tag suggests
    // right away even while the full-archive refetch is in flight.
    allTagsCache = collectTags(manageItems);
    loadAllManage().then(function(items){
      allTagsCache = collectTags(items);
    }).catch(function(){});
  };
  refreshTagSuggestions();

  var attachTagAutocomplete = function(input, onChange){
    var box = null, items = [], activeIdx = -1;

    var closeBox = function(){ if (box) { box.remove(); box = null; items = []; activeIdx = -1; } };

    var setActive = function(i){
      activeIdx = i;
      if (!box) return;
      Array.prototype.forEach.call(box.children, function(el, ix){
        el.classList.toggle('active', ix === i);
      });
    };

    var pick = function(tag){
      var parts = input.value.split(',');
      var typed = (parts[parts.length-1] || '');
      var head = input.value.slice(0, input.value.length - typed.length);
      // Preserve other tags + separators; replace the current fragment.
      input.value = head + tag;
      closeBox();
      input.focus();
      if (onChange) onChange();
    };

    var renderBox = function(){
      closeBox();
      if (!items.length) return;
      box = document.createElement('div');
      box.className = 'tag-suggest';
      items.forEach(function(tag, i){
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tag-suggest-item';
        b.textContent = tag;
        b.addEventListener('mousedown', function(e){ e.preventDefault(); pick(tag); });
        box.appendChild(b);
      });
      input.parentElement.style.position = 'relative';
      input.parentElement.appendChild(box);
      setActive(-1);
    };

    var currentFragment = function(){
      var parts = input.value.split(',');
      return String(parts[parts.length-1] || '').trim().toLowerCase();
    };

    var update = function(){
      var frag = currentFragment();
      var typed = input.value.split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
      if (!frag) { closeBox(); return; }
      items = allTagsCache.filter(function(t){
        return typed.indexOf(t) === -1 && t.indexOf(frag) === 0 && t !== frag;
      }).slice(0, 6);
      renderBox();
    };

    input.addEventListener('input', function(){ update(); if (onChange) onChange(); });
    input.addEventListener('blur', function(){ setTimeout(closeBox, 120); });
    input.addEventListener('keydown', function(e){
      if (!box || !items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx+1, items.length-1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx-1, 0)); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        if (activeIdx >= 0 && items[activeIdx]) { e.preventDefault(); pick(items[activeIdx]); }
        else if (items.length === 1) { e.preventDefault(); pick(items[0]); }
        else closeBox();
      }
      else if (e.key === 'Escape') closeBox();
    });
  };

  var statsLoaded = false;
  var loadBucketStats = function(){
    if (statsLoaded) return;
    statsLoaded = true;
    fetch(ADMIN + '/api/stats').then(function(r){ return r.json(); }).then(function(s){
      if (!s || typeof s.total !== 'number') return;
      qs('statTotal').textContent = String(s.total);
      qs('statStorage').textContent = (s.totalBytes / (1024 * 1024)).toFixed(1) + ' MB';
      if (s.latestCreatedAt) qs('statLatest').textContent = fmtDate(s.latestCreatedAt);
      qs('statAvgSize').textContent = s.total ? Math.round(s.avgSize / 1024) + ' KB' : '\\u2014';
    }).catch(function(){});
  };

  var loadManagePage = function(cursorParam){
    prevPageBtn.disabled=true; nextPageBtn.disabled=true;
    manageBody.innerHTML='<tr><td colspan="5" class="manage-meta" style="padding:2rem;text-align:center">Loading...</td></tr>';
    var qsP = new URLSearchParams();
    qsP.set('limit',String(pageSize));
    if (cursorParam) qsP.set('cursor',cursorParam);
    if (searchInput.value) qsP.set('q',searchInput.value);
    if (activeTag) qsP.set('tag',activeTag);
    fetch('/api/images?'+qsP.toString()).then(function(resp){
      if (resp.status===401){manageError.textContent='Unauthorized. Please sign in via Cloudflare Access.';return;}
      return resp.json().then(function(data){
        manageItems=data.items||[]; currentCursor=cursorParam||null; nextCursor=data.cursor||null;
        prevPageBtn.disabled=prevStack.length===0; nextPageBtn.disabled=!nextCursor;
        manageError.textContent=''; renderManage(); renderTagBar();
        loadBucketStats();
      });
    }).catch(function(){manageError.textContent='Failed to load images';});
  };

  var searchTimer=null;
  searchInput.addEventListener('input',function(){
    if(searchTimer)clearTimeout(searchTimer);
    searchTimer=setTimeout(function(){ prevStack.length=0; loadManagePage(null); },200);
  });
  prevPageBtn.addEventListener('click',function(){ if(!prevStack.length)return; loadManagePage(prevStack.pop()||null); });
  nextPageBtn.addEventListener('click',function(){ if(!nextCursor)return; prevStack.push(currentCursor); loadManagePage(nextCursor); });

  /* ── Backfill ── */
  backfillBtn.addEventListener('click',function(){
    backfillBtn.disabled=true;backfillBtn.textContent='Working...';
    var cancelled=false,origClick=null;
    loadAllManage().then(function(all){
      var updated=0,processed=0;
      backfillBtn.textContent='Cancel';backfillBtn.disabled=false;
      origClick=backfillBtn.onclick;backfillBtn.onclick=function(){cancelled=true;};
      var next=function(i){
        if(cancelled||i>=all.length){
          renderManage();alert('Backfilled '+updated+' items.');
          backfillBtn.onclick=origClick;backfillBtn.disabled=false;backfillBtn.textContent='Backfill Colors';manageError.textContent='';return;
        }
        if(all[i].placeholder){next(i+1);return;}
        fetch(imageUrl(all[i].id, ADMIN_BACKFILL_VARIANT)).then(function(r){return r.blob();}).then(function(blob){
          var url=URL.createObjectURL(blob),img=new Image();
          img.onload=function(){
            var color=placeholderFromImage(img);
            URL.revokeObjectURL(url);
            fetch(ADMIN+'/api/images/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:all[i].id,placeholder:color})})
              .then(function(r){if(r.ok)updated++;processed++;manageError.textContent='Processed '+processed+'/'+all.length;next(i+1);})
              .catch(function(){processed++;next(i+1);});
          };
          img.onerror=function(){URL.revokeObjectURL(url);processed++;next(i+1);};img.src=url;
        }).catch(function(){processed++;next(i+1);});
      };next(0);
    }).catch(function(e){alert('Backfill failed: '+e);backfillBtn.disabled=false;backfillBtn.textContent='Backfill Colors';});
  });`;
}

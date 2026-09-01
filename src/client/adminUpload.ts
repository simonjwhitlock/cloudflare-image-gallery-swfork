import { ALLOWED_UPLOAD_MIME_TYPES } from '../domain/uploadPolicy';

export function buildAdminUploadScript(): string {
  const allowedUploadTypes = JSON.stringify(ALLOWED_UPLOAD_MIME_TYPES);

  return `  /* ── Upload ── */
  var queueList = qs('queueList');
  var dropArea = qs('dropArea');
  var filePicker = qs('filePicker');
  var clearQueueBtn = qs('clearQueue');
  var startUploadBtn = qs('startUpload');
  var queueCountEl = qs('queueCount');
  var uploadStatus = qs('uploadStatus');
  var queue = [];
  var thumbUrl = function(id){ return imageUrl(id, ADMIN_THUMB_VARIANT); };
  var originalUrl = function(id){ return '/media/' + id; };

  var renderQueue = function(){
    queueList.innerHTML = '';
    queueCountEl.textContent = String(queue.length);
    if (!queue.length) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No files queued yet. Drag images above or click to select.';
      queueList.appendChild(empty);
      return;
    }
    queue.forEach(function(item, idx){
      var row = document.createElement('div');
      row.className = 'queue-item';
      var previewWrap = document.createElement('div');
      previewWrap.className = 'queue-item-preview';
      var img = document.createElement('img');
      img.src = item.preview || '';
      img.alt = item.file.name;
      previewWrap.appendChild(img);
      var fileLabel = document.createElement('div');
      fileLabel.className = 'queue-item-file-label';
      fileLabel.textContent = item.file.name;
      previewWrap.appendChild(fileLabel);
      row.appendChild(previewWrap);

      var fieldsWrap = document.createElement('div');
      fieldsWrap.className = 'queue-item-fields';
      var grid = document.createElement('div');
      grid.className = 'fields-grid';
      var mkField = function(label, field, placeholder, val, type) {
        var g = document.createElement('div');
        g.className = 'field-group';
        var l = document.createElement('label');
        l.textContent = label;
        g.appendChild(l);
        var inp = document.createElement('input');
        inp.type = type || 'text';
        inp.placeholder = placeholder || '';
        inp.value = val || '';
        inp.setAttribute('data-field', field);
        inp.setAttribute('data-idx', String(idx));
        g.appendChild(inp);
        return g;
      };
      grid.appendChild(mkField('Camera Body', 'cameraBody', 'e.g. Leica M6', item.cameraBody));
      grid.appendChild(mkField('Film Stock', 'filmStock', 'e.g. Kodak Portra 400', item.filmStock));
      grid.appendChild(mkField('Location', 'location', 'e.g. Faroe Islands', item.location));
      grid.appendChild(mkField('Date of capture', 'captureDate', '', item.captureDate, 'date'));
      var descField = mkField('Description', 'description', 'Optional description', item.description);
      descField.querySelector('input').setAttribute('style', 'grid-column:1 / -1');
      grid.appendChild(descField);
      var tagsField = mkField('Tags', 'tagsRaw', 'e.g. landscape, sea', item.tags.join(', '));
      grid.appendChild(tagsField);
      fieldsWrap.appendChild(grid);
      // The row is not in the DOM until the end of this loop iteration, so
      // querySelector on queueList would find nothing — attach directly.
      attachTagAutocomplete(
        tagsField.querySelector('input'),
        function(){ /* values sync via the data-field input listener below */ }
      );

      var actions = document.createElement('div');
      actions.className = 'queue-item-actions';
      if (item.status && item.status !== 'Queued') {
        var badge = document.createElement('span');
        badge.className = 'status-badge';
        if (item.status === 'Done') badge.classList.add('done');
        if (item.status.startsWith('Error')) badge.classList.add('error');
        badge.textContent = item.status;
        if (item.message) badge.title = item.message;
        actions.appendChild(badge);
      }
      var removeBtn = document.createElement('button');
      removeBtn.className = 'btn-danger-text';
      removeBtn.type = 'button';
      removeBtn.innerHTML = '<span class="material-symbols-outlined">delete</span> Remove';
      (function(i){ removeBtn.addEventListener('click', function(){ queue = queue.filter(function(_,ix){ return ix !== i; }); renderQueue(); }); })(idx);
      actions.appendChild(removeBtn);
      fieldsWrap.appendChild(actions);
      row.appendChild(fieldsWrap);
      queueList.appendChild(row);
    });
    queueList.querySelectorAll('input[data-field]').forEach(function(input){
      input.addEventListener('input', function(){
        var field = input.getAttribute('data-field');
        var i = Number(input.getAttribute('data-idx'));
        if (queue[i]) queue[i][field] = input.value;
      });
    });
    // Sync the raw tags text into item.tags for upload; autocomplete is
    // attached per-row inside the field loop above.
    queueList.querySelectorAll('input[data-field="tagsRaw"]').forEach(function(input){
      var i = Number(input.getAttribute('data-idx'));
      if (queue[i]) {
        queue[i].tags = String(input.value||'')
          .split(',').map(function(t){ return t.trim().toLowerCase(); })
          .filter(Boolean);
      }
      input.addEventListener('input', function(){
        var i2 = Number(input.getAttribute('data-idx'));
        if (queue[i2]) {
          queue[i2].tags = String(input.value||'').split(',').map(function(t){ return t.trim().toLowerCase(); }).filter(Boolean);
        }
      });
    });
  };

  /* ── Tag autocomplete (shared with Manage tab) ── */
  var allTagSuggestions = [];
  var refreshTagSuggestions = function(){
    fetch('/api/images?limit=200').then(function(r){ return r.json(); }).then(function(d){
      var counts = {};
      (d.items||[]).forEach(function(it){ (it.tags||[]).forEach(function(t){ counts[t]=1; }); });
      allTagSuggestions = Object.keys(counts).sort();
    }).catch(function(){});
  };
  refreshTagSuggestions();

  var attachTagAutocomplete = function(input, onChange){
    if (!input) return;
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
      var typed = parts[parts.length-1] || '';
      var head = input.value.slice(0, input.value.length - typed.length);
      input.value = head + tag;
      closeBox(); input.focus();
      if (onChange) onChange();
      input.dispatchEvent(new Event('input', {bubbles:true}));
    };
    var renderBox = function(){
      closeBox();
      if (!items.length) return;
      box = document.createElement('div');
      box.className = 'tag-suggest';
      items.forEach(function(tag){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'tag-suggest-item'; b.textContent = tag;
        b.addEventListener('mousedown', function(e){ e.preventDefault(); pick(tag); });
        box.appendChild(b);
      });
      var wrap = input.parentElement;
      if (wrap) { wrap.style.position = 'relative'; wrap.appendChild(box); }
    };
    var update = function(){
      var parts = input.value.split(',');
      var frag = String(parts[parts.length-1] || '').trim().toLowerCase();
      if (!frag) { closeBox(); return; }
      var already = input.value.split(',').map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean);
      items = allTagSuggestions.filter(function(t){
        return t.indexOf(frag) === 0 && t !== frag && already.indexOf(t) === -1;
      }).slice(0, 6);
      renderBox();
    };
    input.addEventListener('input', update);
    input.addEventListener('blur', function(){ setTimeout(closeBox, 150); });
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
    update();
  };

  /** Generates a small in-browser JPEG data URL used for the queue preview. */
  var makeQueuePreview = function(file, img){
    var maxDim = THUMB_MAX_DIM;
    var w = img.naturalWidth, h = img.naturalHeight;
    var scale = Math.min(1, maxDim / Math.max(w, h));
    var tw = Math.max(1, Math.round(w * scale));
    var th = Math.max(1, Math.round(h * scale));
    try {
      var canvas = document.createElement('canvas');
      canvas.width = tw; canvas.height = th;
      var ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, tw, th);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (e) {
      return null;
    }
  };

  /* ── Upload-time resize ──
   * Downscales oversized originals in the browser before they ever reach R2:
   * the stored master is capped at UPLOAD_MAX_DIM px on the long edge
   * (aspect ratio preserved), and the queue preview/grid uses a small JPEG
   * thumbnail. Originals above the cap were ~15MB; resized masters are ~1-3MB.
   */
  var UPLOAD_MAX_DIM = 2560;
  var UPLOAD_JPEG_QUALITY = 0.9;
  var THUMB_MAX_DIM = 640;

  /**
   * Converts a file's last-modified timestamp to yyyy-mm-dd for the date
   * input's pre-filled capture date. Returns '' when unavailable.
   */
  var fileToDateInput = function(file){
    var ms = file && file.lastModified;
    if (typeof ms !== 'number' || !isFinite(ms)) return '';
    var d = new Date(ms);
    if (isNaN(d.getTime())) return '';
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  };

  var resizeImage = function(file, maxDim, quality){
    return new Promise(function(resolve, reject){
      var img = new Image();
      var objUrl = URL.createObjectURL(file);
      img.onload = function(){
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) {
          URL.revokeObjectURL(objUrl);
          resolve(file); // can't decode — upload as-is
          return;
        }
        var scale = Math.min(1, maxDim / Math.max(w, h));
        if (scale >= 1) {
          URL.revokeObjectURL(objUrl);
          resolve(file); // already small enough — keep original bytes
          return;
        }
        var tw = Math.round(w * scale), th = Math.round(h * scale);
        try {
          var canvas = document.createElement('canvas');
          canvas.width = tw; canvas.height = th;
          var ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('canvas unavailable');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, tw, th);
          canvas.toBlob(function(blob){
            URL.revokeObjectURL(objUrl);
            if (blob && blob.size > 0 && blob.size < file.size) {
              var name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
              resolve(new File([blob], name, { type: 'image/jpeg' }));
            } else {
              resolve(file);
            }
          }, 'image/jpeg', quality);
        } catch (e) {
          URL.revokeObjectURL(objUrl);
          resolve(file); // resize failed — upload original
        }
      };
      img.onerror = function(){
        URL.revokeObjectURL(objUrl);
        resolve(file);
      };
      img.src = objUrl;
    });
  };

  var ALLOWED_UPLOAD_TYPES = ${allowedUploadTypes};

  var addFiles = function(files){
    var arr = Array.from(files), valid = [], rejected = [];
    for (var i=0;i<arr.length;i++){
      if (ALLOWED_UPLOAD_TYPES.indexOf(arr[i].type) === -1){ rejected.push(arr[i].name); continue; }
      valid.push(arr[i]);
    }
    if (rejected.length){
      uploadProgress.style.display = 'block';
      uploadLabel.textContent = 'Skipped';
      uploadStatus.className = 'upload-progress-status error';
      uploadStatus.textContent = 'Unsupported format (only ' + UPLOAD_FORMAT_LABEL + '): ' + rejected.join(', ');
    }
    Promise.all(valid.map(function(f){ return resizeImage(f, UPLOAD_MAX_DIM, UPLOAD_JPEG_QUALITY); }))
      .then(function(files){
        return Promise.all(files.map(decodeImageFile)).then(function(metas){
          metas.forEach(function(meta,i){
            queue.push({
              file:files[i], cameraBody:'', filmStock:'', location:'', year:'',
              // Pre-fill capture date from the ORIGINAL file's last-modified
              // timestamp (files[i] may be a freshly resized File whose
              // lastModified is "now"). The date picker still lets you correct
              // it per image before upload.
              captureDate: fileToDateInput(valid[i] || files[i]),
              description:'', tags:[],
              width:meta.width, height:meta.height, preview:meta.preview,
              placeholder:meta.placeholder, status:'Queued'
            });
          });
          renderQueue();
        });
      });
  };

  /**
   * Loads a file, measures it, generates a small preview data-URL, and
   * derives the placeholder color. Single decode; object URL is always
   * revoked after preview generation.
   */
  var decodeImageFile = function(file){
    return new Promise(function(resolve){
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function(){
        var preview = makeQueuePreview(file, img) || url;
        if (preview !== url) URL.revokeObjectURL(url);
        resolve({
          width: img.naturalWidth || '',
          height: img.naturalHeight || '',
          preview: preview,
          placeholder: placeholderFromImage(img),
        });
      };
      img.onerror = function(){
        URL.revokeObjectURL(url);
        resolve({ width: '', height: '', preview: '', placeholder: PLACEHOLDER_DEFAULT });
      };
      img.src = url;
    });
  };

  dropArea.addEventListener('click', function(){ filePicker.click(); });
  dropArea.addEventListener('dragover', function(e){ e.preventDefault(); dropArea.classList.add('dragover'); });
  dropArea.addEventListener('dragleave', function(){ dropArea.classList.remove('dragover'); });
  dropArea.addEventListener('drop', function(e){ e.preventDefault(); dropArea.classList.remove('dragover'); if (e.dataTransfer&&e.dataTransfer.files.length) addFiles(e.dataTransfer.files); });
  filePicker.addEventListener('change', function(){ if (filePicker.files&&filePicker.files.length) addFiles(filePicker.files); });
  clearQueueBtn.addEventListener('click', function(){
    queue=[]; uploadStatus.textContent=''; uploadProgress.style.display='none';
    uploadTotal=0; uploadDone=0; uploadErrors=0; uploadFill.style.width='0%';
    renderQueue();
  });

  var uploadProgress = qs('uploadProgress');
  var uploadLabel = qs('uploadLabel');
  var uploadCount = qs('uploadCount');
  var uploadFill = qs('uploadFill');
  var uploadTotal = 0;
  var uploadDone = 0;
  var uploadErrors = 0;

  var updateProgress = function(currentName) {
    uploadProgress.style.display = 'block';
    var pct = uploadTotal > 0 ? Math.round((uploadDone / uploadTotal) * 100) : 0;
    uploadFill.style.width = pct + '%';
    uploadCount.textContent = uploadDone + ' / ' + uploadTotal;
    if (uploadDone < uploadTotal) {
      uploadLabel.textContent = 'Uploading';
      uploadStatus.className = 'upload-progress-status';
      uploadStatus.textContent = currentName || '';
    }
  };

  var uploadNext = function(){
    var idx = -1;
    for (var i=0;i<queue.length;i++){ if (queue[i].status==='Queued'){idx=i;break;} }
    if (idx === -1){
      uploadLabel.textContent = uploadErrors ? 'Completed with errors' : 'Complete';
      uploadStatus.className = 'upload-progress-status ' + (uploadErrors ? 'error' : 'done');
      uploadStatus.textContent = uploadErrors
        ? uploadErrors + ' failed, ' + (uploadDone - uploadErrors) + ' uploaded'
        : uploadDone + ' image' + (uploadDone !== 1 ? 's' : '') + ' uploaded successfully';
      uploadFill.style.width = '100%';
      queue=[]; renderQueue();
      return;
    }
    var item = queue[idx];
    queue[idx].status='Uploading'; renderQueue();
    updateProgress(item.file.name);
    var fd = new FormData();
    fd.append('file', item.file);
    fd.append('name', item.file.name);
    var altParts = [];
    if (item.filmStock) altParts.push(item.filmStock);
    if (item.cameraBody) altParts.push(item.cameraBody);
    if (item.location) altParts.push(item.location);
    if (item.captureDate) altParts.push(item.captureDate);
    fd.append('alt', altParts.length ? 'Film photograph' + (altParts.length ? ' \\u2014 ' + altParts.join(', ') : '') : item.file.name);
    if (item.width) fd.append('width', String(item.width));
    if (item.height) fd.append('height', String(item.height));
    if (item.placeholder) fd.append('placeholder', item.placeholder);
    if (item.cameraBody) fd.append('cameraBody', item.cameraBody.toUpperCase());
    if (item.filmStock) fd.append('filmStock', item.filmStock.toUpperCase());
    if (item.location) fd.append('location', item.location.toUpperCase());
    if (item.captureDate) fd.append('captureDate', item.captureDate.trim());
    if (item.description) fd.append('description', item.description.trim());
    if (item.tags && item.tags.length) fd.append('tags', item.tags.join(','));
    fetch(ADMIN+'/api/upload',{method:'POST',body:fd})
    fetch(ADMIN+'/api/upload',{method:'POST',body:fd})
      .then(function(resp){ return resp.json().catch(function(){return {};}).then(function(data){
        uploadDone++;
        if (!resp.ok||!data.ok){ queue[idx].status='Error'; queue[idx].message=data.error||'Upload failed'; uploadErrors++; }
        else { queue[idx].status='Done'; queue[idx].message=(data.image&&data.image.id)||''; }
        updateProgress('');
        renderQueue(); uploadNext();
      }); })
      .catch(function(err){ uploadDone++; uploadErrors++; queue[idx].status='Error'; queue[idx].message=err&&err.message?err.message:String(err); updateProgress(''); renderQueue(); uploadNext(); });
  };

  startUploadBtn.addEventListener('click', function(){
    var pending = queue.filter(function(q){ return q.status === 'Queued' || q.status === 'Error'; });
    if (!pending.length) return;
    uploadTotal = pending.length;
    uploadDone = 0;
    uploadErrors = 0;
    updateProgress(pending[0].file.name);
    uploadNext();
  });`;
}

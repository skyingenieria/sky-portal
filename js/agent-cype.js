function renderAuthStep(b) {
  b.innerHTML = `
    <p style="font-size:12px;color:var(--text2);margin-bottom:8px;margin-top:2px;line-height:1.6">
      Aprobá acceso a Drive + Sheets.<br>Se abre una ventana de Google.
    </p>
    <button class="btn btn-primary" style="width:100%;justify-content:center;padding:7px" onclick="doAuth()">
      🔑 Autorizar con Google
    </button>
    <div class="setup-guide">
      <span class="guide-title">Configuración única (5 min)</span>
      1. <code>console.cloud.google.com</code><br>
      2. Habilitar <code>Drive API</code> + <code>Sheets API</code><br>
      3. Credenciales → OAuth 2.0 → App web<br>
      4. Origen: tu dominio GitHub Pages<br>
      5. Reemplazá <code>YOUR_GOOGLE_CLIENT_ID</code> en el código
    </div>
  `;
}

function renderFolderStep(b) {
  b.innerHTML = `
    <div class="input-wrap" style="margin-top:2px">
      <input class="input-field" id="folder-input" placeholder="Ej: Fontana, F25100..."
             onkeydown="if(event.key==='Enter') searchFolders()" />
      <button class="btn" onclick="searchFolders()" style="padding:6px 10px">🔍</button>
    </div>
    <div class="folder-list" id="folder-list"></div>
  `;
}

function renderSheetStep(b) {
  b.innerHTML = `<div class="folder-list" id="sheet-list" style="margin-top:2px">${
    state.sheets.map(s => `
      <div class="folder-item${state.selectedSheet?.id===s.id?' selected':''}"
           onclick="selectSheet('${s.id}','${s.name.replace(/'/g,"\\'")}')">
        📊 ${s.name}${s.subfolder?` <span style="color:var(--text3);font-size:11px">/ ${s.subfolder}</span>`:''}
      </div>`).join('')
  }</div>`;
}

function renderPdfStep(b) {
  b.innerHTML = `
    <div class="drop-zone ${state.pdfFile?'has-file':''}" style="margin-top:2px"
         onclick="document.getElementById('pdf-input').click()">
      <input type="file" id="pdf-input" accept=".pdf" style="display:none" onchange="loadPdf(this)" />
      ${state.pdfFile
        ? `<div style="font-size:20px">✅</div>
           <div style="font-size:12.5px;color:var(--green);margin-top:3px">${state.pdfFile.name}</div>
           <div style="font-size:11px;color:var(--text3)">${(state.pdfFile.size/1024).toFixed(1)} KB · click para cambiar</div>`
        : `<div style="font-size:22px">📄</div>
           <div style="font-size:12.5px;color:var(--text2);margin-top:4px">Click para subir PDF de CYPECAD</div>`
      }
    </div>`;
}

function updateRunBtn() {
  const btn = document.getElementById('run-btn');
  if (!btn) return;
  const { token, selectedSheet, pdfBase64, running, done } = state;
  btn.disabled = !token || !selectedSheet || !pdfBase64 || running;
  if (running) {
    btn.className = 'btn run-btn';
    btn.innerHTML = '<span class="spin">⚙️</span> Procesando...';
  } else if (done) {
    btn.className = 'btn btn-success run-btn';
    btn.innerHTML = '✓ Volver a procesar';
    btn.disabled = false;
  } else if (!token) {
    btn.className = 'btn btn-primary run-btn';
    btn.innerHTML = '🔒 Autenticá con Google primero';
  } else if (!selectedSheet) {
    btn.className = 'btn btn-primary run-btn';
    btn.innerHTML = '📁 Seleccioná carpeta de proyecto';
  } else if (!pdfBase64) {
    btn.className = 'btn btn-primary run-btn';
    btn.innerHTML = '📄 Subí el PDF de CYPECAD';
  } else {
    btn.className = 'btn btn-primary run-btn';
    btn.innerHTML = '▶ Procesar PDF → Google Sheets';
  }
}

function doAuth() {
  log('Abriendo ventana de autorización Google...', 'info');
  // Reusar el cliente global si existe
  if (typeof _gsiClient !== 'undefined' && _gsiClient) {
    _gsiClient.callback = (r) => {
      if (r.error) { log('Error: '+r.error, 'error'); return; }
      if (typeof setToken === 'function') setToken(r.access_token);
      else state.token = r.access_token;
      log('✓ Autenticado con Google', 'success');
      state.step = 1; renderSteps();
    };
    _gsiClient.requestAccessToken({ prompt: 'consent' });
    return;
  }
  // Fallback si el cliente global no está listo
  if (!window.google?.accounts?.oauth2) { log('Google aún no cargó', 'error'); return; }
  const c = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID, scope: SCOPES,
    callback: (r) => {
      if (r.error) { log('Error: '+r.error, 'error'); return; }
      if (typeof setToken === 'function') setToken(r.access_token);
      else state.token = r.access_token;
      log('✓ Autenticado con Google', 'success');
      state.step = 1; renderSteps();
    }
  });
  c.requestAccessToken({ prompt: 'consent' });
}

async function searchFolders() {
  const q = document.getElementById('folder-input')?.value?.trim();
  if (!q) return;
  log(`Buscando carpetas con "${q}"...`, 'info');
  const qu = encodeURIComponent(`name contains '${q}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${qu}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=20`,
    { headers: { Authorization: `Bearer ${state.token}` } });
  const d = await r.json();
  if (d.error) { log('Error: '+d.error.message, 'error'); return; }
  state.folders = d.files || [];
  log(`${state.folders.length} carpeta(s) encontrada(s)`, state.folders.length?'success':'warn');
  const list = document.getElementById('folder-list');
  if (!list) return;
  list.innerHTML = state.folders.map(f =>
    `<div class="folder-item" onclick="selectFolder('${f.id}','${f.name.replace(/'/g,"\\'")}')">📁 ${f.name}</div>`
  ).join('') || `<div style="padding:8px 10px;font-size:12px;color:var(--text3)">Sin resultados</div>`;
}

async function selectFolder(id, name) {
  state.selectedFolder = { id, name };
  log(`Carpeta: ${name}`, 'data');
  log('Buscando Sheets de metraje...', 'info');
  document.querySelectorAll('.folder-item').forEach(el => {
    el.classList.toggle('selected', el.textContent.trim().includes(name));
  });
  let all = [];
  const search = async (pId, sf=null) => {
    const q = encodeURIComponent(`'${pId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
    const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${state.token}` } });
    const d = await r.json();
    if (d.files) d.files.forEach(f => all.push({...f, subfolder: sf}));
  };
  await search(id);
  const sq = encodeURIComponent(`'${id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const sr = await fetch(`https://www.googleapis.com/drive/v3/files?q=${sq}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${state.token}` } });
  const sd = await sr.json();
  for (const sub of (sd.files||[])) await search(sub.id, sub.name);
  const kw = ['metraje','cómputo','computo','mc-'];
  state.sheets = all.filter(f => kw.some(k => f.name.toLowerCase().includes(k)));
  if (!state.sheets.length) state.sheets = all;
  if (state.sheets.length === 1) {
    selectSheet(state.sheets[0].id, state.sheets[0].name);
    log(`✓ Sheet: ${state.sheets[0].name}`, 'success');
  } else if (state.sheets.length > 1) {
    log(`${state.sheets.length} Sheets encontrados, seleccioná uno`, 'warn');
    state.step = 2; renderSteps();
  } else {
    log('No se encontraron Sheets en esta carpeta', 'warn');
  }
}

function selectSheet(id, name) {
  state.selectedSheet = { id, name };
  log(`Sheet: ${name}`, 'data');
  state.step = 3; renderSteps();
}

function loadPdf(input) {
  const file = input.files[0];
  if (!file) return;
  state.pdfFile = file;
  log(`PDF: ${file.name} (${(file.size/1024).toFixed(1)} KB)`, 'success');
  const r = new FileReader();
  r.onload = () => { state.pdfBase64 = r.result.split(',')[1]; state.step = 4; renderSteps(); };
  r.readAsDataURL(file);
}

async function runAgent() {
  if (state.running) return;
  state.running = true; state.done = false; updateRunBtn();
  log('─── Iniciando agente CYPE → GSheets ───', 'heading');
  log('Enviando PDF a Claude para extracción...', 'info');
  let extracted;
  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `Sos un extractor de datos de cómputos estructurales CYPECAD para Argentina.
Analizá el PDF y devolvé SOLO un JSON válido sin markdown con esta estructura exacta:
{
  "obra": "nombre",
  "hormigon": [{ "nivel": 0, "elem": "PLATEA|LOSA MACIZA|VIGA|COLUMNA|TABIQUE|ESCALERA|VIGA FUNDACION|LOSA DE VIGUETA", "cod": "P0|L100|V100|etc", "cant": 1, "area_h": 0, "area_sup_vigas": 0, "area_m": 0, "vol": 0 }],
  "acero_barras": [{ "nivel": 0, "elem": "VIGA|COLUMNA|TABIQUE|LOSA MACIZA|ESCALERA|PLATEA|VIGA FUNDACION", "kg_6": 0, "kg_8": 0, "kg_10": 0, "kg_12": 0, "kg_16": 0, "kg_20": 0, "kg_25": 0, "kg_32": 0, "kg_40": 0 }],
  "acero_aux": [{ "nivel": 0, "elem": "nombre", "cod": "código", "cant": 0, "pos": 0, "cant2": 0, "diam_mm": 0, "long_m": 0 }],
  "mallas": [{ "nivel": 0, "elem": "nombre", "cod": "P0_Inf|P0_Sup|LV100|LV200", "area_h": 0, "area_sup_vigas": 0, "area_m": 0, "diam_mm": 0, "sep": 0 }]
}
SOLO JSON, sin texto extra ni markdown.`,
        messages: [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: state.pdfBase64 } },
            { type: 'text', text: 'Extraé todos los datos del cómputo estructural de este PDF de CYPECAD.' }
          ]
        }]
      })
    });
    const raw = await resp.json();
    let text = raw.content?.find(b => b.type==='text')?.text || '';
    text = text.trim().replace(/^```[a-z]*\n?/,'').replace(/\n?```$/,'');
    extracted = JSON.parse(text);
    log(`✓ Obra: ${extracted.obra}`, 'data');
    log(`✓ Hormigón: ${extracted.hormigon?.length||0} elementos`, 'success');
    log(`✓ Acero barras: ${extracted.acero_barras?.length||0} elementos`, 'success');
    log(`✓ Acero aux: ${extracted.acero_aux?.length||0} elementos`, 'success');
    log(`✓ Mallas: ${extracted.mallas?.length||0} elementos`, 'success');
  } catch(err) {
    log('Error extrayendo: '+err.message, 'error');
    state.running=false; updateRunBtn(); return;
  }
  log('Escribiendo en Google Sheets...', 'info');
  const id = state.selectedSheet.id;
  const bH = r => [r.nivel,r.elem,r.cod,r.cant||0,r.area_h||0,0,0,0,r.area_sup_vigas||0,0,r.area_m||0,0,0,r.vol||0];
  const bA = r => [r.nivel,r.elem,0,r.kg_6||0,0,r.kg_8||0,0,r.kg_10||0,0,r.kg_12||0,0,r.kg_16||0,0,r.kg_20||0,0,r.kg_25||0,0,r.kg_32||0,0,r.kg_40||0];
  const bX = r => [r.nivel,'',r.elem,r.cod,r.cant||0,r.pos||0,r.cant2||0,0,r.diam_mm||0,0,r.long_m||0];
  const bM = r => [r.nivel,r.elem,r.cod,0,r.area_h||0,0,r.area_sup_vigas||0,0,r.area_m||0,r.diam_mm||0,0,r.sep||0];
  const updates = [];
  if (extracted.hormigon?.length)    updates.push({ range:`0Hormigón!A4:N${3+extracted.hormigon.length}`,     values: extracted.hormigon.map(bH) });
  if (extracted.acero_barras?.length) updates.push({ range:`0Acero [brrs]!A4:T${3+extracted.acero_barras.length}`, values: extracted.acero_barras.map(bA) });
  if (extracted.acero_aux?.length)   updates.push({ range:`0Acero [brra] Aux!A4:K${3+extracted.acero_aux.length}`, values: extracted.acero_aux.map(bX) });
  if (extracted.mallas?.length)      updates.push({ range:`0Acero [mallas]!A4:L${3+extracted.mallas.length}`,  values: extracted.mallas.map(bM) });
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: updates })
    });
    const result = await res.json();
    if (result.error) { log('Error Sheets API: '+result.error.message, 'error'); state.running=false; updateRunBtn(); return; }
    const cells = result.responses?.reduce((a,r) => a+(r.updatedCells||0), 0) || 0;
    log(`✓ ${cells} celdas actualizadas`, 'success');
    log(`✓ Sheet: ${state.selectedSheet.name}`, 'success');
    log('─── ¡Completado exitosamente! ───', 'heading');
    state.done = true;
    const doneBar = document.getElementById('done-bar');
    if (doneBar) {
      doneBar.style.display = 'flex';
      doneBar.innerHTML = `
        <span>✓ Sheet actualizado correctamente</span>
        <a href="https://docs.google.com/spreadsheets/d/${id}" target="_blank">Abrir Sheet ↗</a>
      `;
    }
  } catch(err) {
    log('Error: '+err.message, 'error');
  }
  state.running = false; updateRunBtn();
}

function log(msg, type='info') {
  const term = document.getElementById('terminal');
  if (!term) return;
  const time = new Date().toLocaleTimeString('es-AR', { hour12: false });
  const div = document.createElement('div');
  div.innerHTML = `<span class="log-time">${time}</span><span class="log-${type}">${msg}</span>`;
  if (term.querySelector('.log-info')?.textContent === '// esperando instrucciones...') term.innerHTML = '';
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
}

// ═══════════════════════════════════════════════

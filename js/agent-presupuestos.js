// PRESUPUESTOS AGENT
// ════════════════════════════════════════════

const PRESUPUESTOS_SHEET_ID = () => document.getElementById('pre-sheet-id')?.value || localStorage.getItem('sky_pre_sheet') || '1cnIJPZeLDvv0Fr9sjVnslfGcHNlXUL-iwEhcPzERKT8';
const PRESUPUESTOS_TEMPLATE_ID = () => document.getElementById('pre-template-id')?.value || localStorage.getItem('sky_pre_template') || '1TLUn9ZBcsW8AQg9DE6DHGhJTBXOtJF5WxlICZHm1SGQ';

// ── Token compartido: cualquier auth sirve para presupuestos ──
function getPreToken() {
  return (typeof getToken === 'function' ? getToken() : null) || state?.token || obState?.token || null;
}

function preUpdateAuthBtn() {
  const token = getPreToken();
  const btn = document.getElementById('pre-run-btn');
  const authBtn = document.getElementById('pre-auth-btn');
  if (!btn) return;
  if (token) {
    btn.disabled = false;
    btn.textContent = '🚀 Generar Presupuesto';
    if (authBtn) authBtn.style.display = 'none';
  } else {
    btn.disabled = true;
    btn.textContent = '🔒 Autenticá con Google primero';
    if (authBtn) authBtn.style.display = 'inline-flex';
  }
}

function doPreAuth() {
  // Reusa el mismo flujo de auth de onboarding
  doObAuth();
  // Poll hasta que el token esté disponible
  const poll = setInterval(() => {
    if (getPreToken()) {
      clearInterval(poll);
      preUpdateAuthBtn();
    }
  }, 500);
}

function openAgent_presupuestos() {
  document.getElementById('agent-panel').style.display = 'none';
  document.getElementById('onboarding-panel').style.display = 'none';
  const p = document.getElementById('presupuestos-panel');
  p.style.display = 'block';
  p.classList.add('fade-in');
  p.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  const fechaEl = document.getElementById('pre-fecha');
  if (fechaEl && !fechaEl.value) fechaEl.value = today;

  // Init values from localStorage
  ['hon-basico','hon-full','hon-express','hon-dolar'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = localStorage.getItem('sky_' + id.replace('-','_')) || '';
  });

  // Fix template/sheet ID fields
  const tplEl = document.getElementById('pre-template-id');
  const sheetEl = document.getElementById('pre-sheet-id');
  const clientesEl = document.getElementById('pre-sheet-clientes');
  if (tplEl && (!tplEl.value || tplEl.value.includes('localStorage')))
    tplEl.value = localStorage.getItem('sky_pre_template') || '1TLUn9ZBcsW8AQg9DE6DHGhJTBXOtJF5WxlICZHm1SGQ';
  if (sheetEl && (!sheetEl.value || sheetEl.value.includes('localStorage')))
    sheetEl.value = localStorage.getItem('sky_pre_sheet') || '1cnIJPZeLDvv0Fr9sjVnslfGcHNlXUL-iwEhcPzERKT8';
  if (clientesEl && !clientesEl.value)
    clientesEl.value = localStorage.getItem('sky_pre_sheet_clientes') || '1YbxA1K_EnLMGC44o9159LiyLrii5Gi8F2a-H3mRf8us';

  // Reset client cache when opening
  _clientesCache = null;

  preUpdateAuthBtn();
}

function closePresupuestos() {
  document.getElementById('presupuestos-panel').style.display = 'none';
}

function switchPreTab(tab) {
  document.getElementById('pre-panel-honorarios').style.display = tab === 'honorarios' ? 'block' : 'none';
  document.getElementById('pre-panel-presupuesto').style.display = tab === 'presupuesto' ? 'block' : 'none';
  document.getElementById('tab-honorarios').classList.toggle('active', tab === 'honorarios');
  document.getElementById('tab-presupuesto').classList.toggle('active', tab === 'presupuesto');
}

// ── HONORARIOS CALCULATOR ──
function fmt(n, moneda) {
  if (!n && n !== 0) return '-';
  if (moneda === 'USD') return 'U$D ' + Number(n).toLocaleString('es-AR', {minimumFractionDigits:0, maximumFractionDigits:0});
  return '$ ' + Number(n).toLocaleString('es-AR', {minimumFractionDigits:0, maximumFractionDigits:0});
}

function calcHonorarios() {
  const sup     = parseFloat(document.getElementById('hon-sup')?.value) || 0;
  const basico  = parseFloat(document.getElementById('hon-basico')?.value) || 0;
  const full    = parseFloat(document.getElementById('hon-full')?.value) || 0;
  const express = parseFloat(document.getElementById('hon-express')?.value) || 0;
  const dolar   = parseFloat(document.getElementById('hon-dolar')?.value) || 0;

  const res = document.getElementById('hon-results');
  if (!res) return;
  if (!sup || (!basico && !full && !express)) {
    res.innerHTML = '<div style="font-size:12px;color:var(--text3)">Ingresá superficie y al menos una tarifa →</div>';
    return;
  }

  const packs = [
    { label: 'Básico',  tarifa: basico,  color: '' },
    { label: 'Full',    tarifa: full,    color: 'best' },
    { label: 'Express', tarifa: express, color: '' },
  ].filter(p => p.tarifa > 0);

  let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
  html += `<div style="font-size:11px;color:var(--text3);margin-bottom:2px;">Superficie: <strong style="color:var(--text)">${sup.toLocaleString('es-AR')} m²</strong></div>`;

  packs.forEach((p, i) => {
    const total = sup * p.tarifa;
    const usd   = dolar > 0 ? (total / dolar) : null;
    const isBest = packs.length > 1 && i === 1; // full is "best" if exists
    html += `
      <div class="hon-card ${isBest ? 'best' : ''}">
        <div class="hon-card-label">${p.label}</div>
        <div class="hon-card-price">${fmt(total, 'ARS')}</div>
        ${usd ? `<div class="hon-card-usd">≈ ${fmt(usd, 'USD')}</div>` : ''}
        <div class="hon-card-detail">${fmt(p.tarifa, 'ARS')}/m² × ${sup.toLocaleString('es-AR')} m²</div>
      </div>`;
  });
  // Add "Usar en presupuesto" button
  html += `<button onclick="syncHonorariosToPresupuesto();switchPreTab('presupuesto')"
    style="margin-top:8px;padding:6px 12px;background:var(--accent);color:#fff;border:none;
    border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:var(--font);">
    → Usar en presupuesto
  </button>`;
  html += '</div>';
  res.innerHTML = html;
}

// ── NUMBER TO WORDS (simplified for ARS) ──
function numberToWords(n, moneda) {
  if (!n || isNaN(n)) return '';
  // Use Claude to generate this — just return a placeholder for now
  // Simple implementation for common ranges
  const units = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve',
    'diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
  const tens = ['','diez','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  const hundreds = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos',
    'seiscientos','setecientos','ochocientos','novecientos'];
  function toWords(num) {
    if (num === 0) return 'cero';
    if (num < 0) return 'menos ' + toWords(-num);
    if (num < 20) return units[num];
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? ' y ' + units[num%10] : '');
    if (num === 100) return 'cien';
    if (num < 1000) return hundreds[Math.floor(num/100)] + (num%100 ? ' ' + toWords(num%100) : '');
    if (num < 2000) return 'mil' + (num%1000 ? ' ' + toWords(num%1000) : '');
    if (num < 1000000) return toWords(Math.floor(num/1000)) + ' mil' + (num%1000 ? ' ' + toWords(num%1000) : '');
    if (num < 2000000) return 'un millón' + (num%1000000 ? ' ' + toWords(num%1000000) : '');
    return toWords(Math.floor(num/1000000)) + ' millones' + (num%1000000 ? ' ' + toWords(num%1000000) : '');
  }
  const words = toWords(Math.round(n));
  const cap = words.charAt(0).toUpperCase() + words.slice(1);
  if (moneda === 'USD') return cap + ' dólares estadounidenses';
  return cap + ' pesos argentinos';
}

// Formatea input de honorarios como $ 1.000.000 mientras se escribe
function formatHonInput(el) {
  const raw = el.value.replace(/[^0-9]/g, '');
  if (!raw) { el.value = ''; return; }
  const num = parseInt(raw, 10);
  el.value = '$ ' + num.toLocaleString('es-AR');
  // Guardar valor numérico en dataset para recuperarlo fácilmente
  el.dataset.raw = raw;
}

// Extrae el valor numérico de un input formateado
function getRawHon(id) {
  const el = document.getElementById(id);
  if (!el) return '';
  return el.dataset.raw || el.value.replace(/[^0-9]/g, '') || '';
}

function updateHonLetras() {
  const val = parseFloat(getRawHon('pre-hon1')) || 0;
  const moneda = document.getElementById('pre-moneda')?.value || 'ARS';
  const el = document.getElementById('pre-hon-letras');
  if (el && val) el.value = numberToWords(val, moneda);
}

function toggleMoneda() {
  updateHonLetras();
}

// ── Pre LOG ──
function preLog(msg, type='info') {
  const t = document.getElementById('pre-terminal');
  if (!t) return;
  const cls = {info:'log-info', ok:'log-ok', warn:'log-warn', err:'log-err'}[type] || 'log-info';
  const span = document.createElement('span');
  span.className = cls;
  span.textContent = msg;
  t.appendChild(document.createElement('br'));
  t.appendChild(span);
  t.scrollTop = t.scrollHeight;
}

// ── RUN PRESUPUESTO ──
async function runPresupuesto() {
  const token = getPreToken();
  if (!token) { preLog('❌ Autenticá con Google primero', 'err'); return; }

  const btn = document.getElementById('pre-run-btn');
  btn.disabled = true; btn.textContent = '⏳ Generando...';
  document.getElementById('pre-done-bar').style.display = 'none';

  // Read form values
  const data = {
    fecha:     document.getElementById('pre-fecha')?.value || new Date().toLocaleDateString('es-AR'),
    numero:    document.getElementById('pre-num')?.value?.trim() || '',
    nombre:    document.getElementById('pre-nombre')?.value?.trim() || '',
    cliente:   document.getElementById('pre-cliente')?.value?.trim() || '',
    servicio:  document.getElementById('pre-servicio')?.value || '',
    proyecto:  document.getElementById('pre-proyecto')?.value?.trim() || '',
    estructura:document.getElementById('pre-estructura')?.value?.trim() || '',
    ubicacion: document.getElementById('pre-ubicacion')?.value?.trim() || '',
    superficie:document.getElementById('pre-sup')?.value?.trim() || '',
    plano:     document.getElementById('pre-plano')?.value?.trim() || '',
    moneda:    document.getElementById('pre-moneda')?.value || 'ARS',
    hon1:      getRawHon('pre-hon1'),
    hon2:      getRawHon('pre-hon2'),
    hon3:      getRawHon('pre-hon3'),
    honLetras: document.getElementById('pre-hon-letras')?.value?.trim() || '',
    anticipo:  document.getElementById('pre-anticipo')?.value?.trim() || '50',
    saldo:     document.getElementById('pre-saldo')?.value?.trim() || '50',
    plazo1:    document.getElementById('pre-plazo1')?.value?.trim() || '',
    plazo2:    document.getElementById('pre-plazo2')?.value?.trim() || '',
    plazo3:    document.getElementById('pre-plazo3')?.value?.trim() || '',
    validez:   document.getElementById('pre-validez')?.value?.trim() || '15 días',
    email:     document.getElementById('pre-email')?.value?.trim() || '',
  };

  if (!data.nombre || !data.hon1) {
    preLog('❌ Completá al menos Nombre y Honorarios 1', 'err');
    btn.disabled = false; btn.textContent = '🚀 Generar Presupuesto';
    return;
  }

  const templateId = PRESUPUESTOS_TEMPLATE_ID();
  const sheetId    = PRESUPUESTOS_SHEET_ID();

  try {
    // STEP 1: Duplicate template Doc
    preLog('📄 Duplicando template Google Doc...', 'info');
    const docName = `${data.numero || 'PRE'} - ${data.cliente} - ${data.proyecto}`;
    const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy?supportsAllDrives=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: docName })
    });
    const copyData = await copyRes.json();
    if (!copyData.id) throw new Error('No se pudo duplicar el template: ' + JSON.stringify(copyData));
    const newDocId = copyData.id;
    const newDocUrl = `https://docs.google.com/document/d/${newDocId}/edit`;
    preLog(`✓ Doc creado: ${docName}`, 'ok');

    // STEP 2: Replace placeholders in the Doc
    preLog('✏️  Reemplazando campos en el documento...', 'info');
    const fmtMoney = (v) => {
      if (!v) return '';
      const n = parseFloat(v.toString().replace(/[^0-9.]/g,''));
      if (isNaN(n)) return v;
      return (data.moneda === 'USD' ? 'U$D ' : '$ ') + n.toLocaleString('es-AR');
    };

    // Format fecha nicely
    const fechaFmt = data.fecha ? new Date(data.fecha + 'T12:00:00').toLocaleDateString('es-AR', {day:'2-digit',month:'2-digit',year:'numeric'}) : '';

    const replacements = [
      ['{{FECHA}}',       fechaFmt],
      ['{{NUMERO}}',      data.numero],
      ['{{NOMBRE}}',      data.nombre],
      ['{{CLIENTE}}',     data.cliente],
      ['{{SERVICIO}}',    data.servicio],
      ['{{PROYECTO}}',    data.proyecto],
      ['{{ESTRUCTURA}}',  data.estructura],
      ['{{UBICACION}}',   data.ubicacion],
      ['{{SUPERFICIE}}',  data.superficie],
      ['{{PLANO}}',       data.plano],
      ['{{MONEDA}}',      data.moneda],
      ['{{HONORARIOS1}}', fmtMoney(data.hon1)],
      ['{{HONORARIOS2}}', fmtMoney(data.hon2)],
      ['{{HONORARIOS3}}', fmtMoney(data.hon3)],
      ['{{HON_LETRAS}}',  data.honLetras],
      ['{{ANTICIPO}}',    data.anticipo + '%'],
      ['{{SALDO}}',       data.saldo + '%'],
      ['{{PLAZO1}}',      data.plazo1],
      ['{{PLAZO2}}',      data.plazo2],
      ['{{PLAZO3}}',      data.plazo3],
      ['{{VALIDEZ}}',     data.validez],
      ['{{EMAIL}}',       data.email],
    ];

    const requests = replacements.map(([find, replace]) => ({
      replaceAllText: {
        containsText: { text: find, matchCase: true },
        replaceText: replace || ''
      }
    }));

    const docsRes = await fetch(`https://docs.googleapis.com/v1/documents/${newDocId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    });
    const docsData = await docsRes.json();
    if (docsData.error) {
      preLog(`⚠️  Docs API: ${docsData.error.message} — el doc fue creado igualmente`, 'warn');
    } else {
      preLog(`✓ Campos reemplazados (${requests.length} placeholders)`, 'ok');
    }

    // STEP 3: Append row to Google Sheet
    preLog('📊 Registrando en Google Sheets...', 'info');
    // Format date for sheet (MM/DD/YYYY as used in the sheet)
    const sheetDate = data.fecha ? new Date(data.fecha + 'T12:00:00').toLocaleDateString('en-US', {month:'2-digit',day:'2-digit',year:'numeric'}) : '';
    const row = [
      sheetDate, data.numero, data.nombre, data.cliente, data.servicio,
      data.proyecto, data.estructura, data.ubicacion, data.superficie, data.plano,
      data.moneda, data.hon1 ? fmtMoney(data.hon1) : '', data.honLetras, data.hon2 ? fmtMoney(data.hon2) : '',
      data.anticipo, data.saldo, data.plazo1, data.plazo2, data.plazo3,
      data.validez, '', templateId, data.email, newDocUrl, '', 'No'
    ];

    const sheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Data!A:Z:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [row] })
      }
    );
    const sheetData = await sheetRes.json();
    if (sheetData.error) {
      preLog(`⚠️  Sheets: ${sheetData.error.message}`, 'warn');
    } else {
      preLog('✓ Fila registrada en el Sheet', 'ok');
    }

    // DONE
    preLog('✅ ¡Presupuesto generado con éxito!', 'ok');

    // Gmail draft
    let gmailDraftId = null;
    if (data.email) {
      preLog('📧 Creando borrador en Gmail...', 'info');
      try {
        const draft = await createGmailDraft(data, newDocUrl);
        if (draft) {
          gmailDraftId = draft.id;
          preLog('✓ Borrador creado en Gmail', 'ok');
        }
      } catch(ge) { preLog('⚠️ Gmail: ' + ge.message, 'warn'); }
    }

    const whatsappText = encodeURIComponent(`Hola ${data.nombre || data.cliente}, te comparto el presupuesto Nº ${data.numero}: ${newDocUrl}`);
    const gmailUrl = gmailDraftId
      ? `https://mail.google.com/mail/#drafts`
      : `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(data.email)}&su=${encodeURIComponent('Presupuesto N° '+data.numero+' — '+data.proyecto)}`;

    const bar = document.getElementById('pre-done-bar');
    bar.style.display = 'block';
    bar.innerHTML = `
      <div class="done-bar" style="margin-top:10px;padding:14px 16px;border-radius:8px;border:1px solid var(--border);display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="color:var(--green);font-size:16px">✅</span>
          <span style="font-size:13px;color:var(--text)">Presupuesto <strong>${docName}</strong> creado</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="${newDocUrl}" target="_blank"
            style="font-size:12px;color:var(--accent);text-decoration:none;border:1px solid var(--accent);padding:5px 12px;border-radius:5px;display:flex;align-items:center;gap:4px;">
            📄 Abrir Doc
          </a>
          ${data.email ? `<a href="${gmailUrl}" target="_blank"
            style="font-size:12px;color:#4ade80;text-decoration:none;border:1px solid #4ade80;padding:5px 12px;border-radius:5px;display:flex;align-items:center;gap:4px;">
            ✉️ ${gmailDraftId ? 'Ver borrador Gmail' : 'Redactar email'}
          </a>` : ''}
          <a href="https://wa.me/?text=${whatsappText}" target="_blank"
            style="font-size:12px;color:#25d366;text-decoration:none;border:1px solid #25d366;padding:5px 12px;border-radius:5px;display:flex;align-items:center;gap:4px;">
            💬 Compartir WhatsApp
          </a>
          <a href="${newDocUrl.replace('/edit','/export?format=pdf')}" target="_blank"
            style="font-size:12px;color:var(--text2);text-decoration:none;border:1px solid var(--border2);padding:5px 12px;border-radius:5px;display:flex;align-items:center;gap:4px;">
            ⬇️ Descargar PDF
          </a>
        </div>
      </div>`;

  } catch(e) {
    preLog('❌ Error: ' + e.message, 'err');
  }

  btn.disabled = false; btn.textContent = '🚀 Generar Presupuesto';
}

// ════════════════════════════════════════════
// CLIENTES AUTOCOMPLETE
// ════════════════════════════════════════════
const CLIENTES_SHEET_ID = () => document.getElementById('pre-sheet-clientes')?.value
  || localStorage.getItem('sky_pre_sheet_clientes')
  || '1YbxA1K_EnLMGC44o9159LiyLrii5Gi8F2a-H3mRf8us';
const CLIENTES_GID = '1854755777';

let _clientesCache = null;

async function loadClientes() {
  if (_clientesCache) return _clientesCache;
  const token = getPreToken();
  if (!token) return [];
  const sheetId = CLIENTES_SHEET_ID();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/001%20Clientes!A:E?majorDimension=ROWS`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json();
  const rows = d.values || [];
  // Skip header row (row 1), cols: A=ID, B=Estudio/Cliente, C=Representante, D=Contacto(email)
  _clientesCache = rows.slice(1).filter(r => r[1]).map(r => ({
    id:           r[0] || '',
    nombre:       r[1] || '',
    representante:r[2] || '',
    email:        r[3] || '',
  }));
  return _clientesCache;
}

async function preClienteSearch(query) {
  const box = document.getElementById('pre-cliente-suggestions');
  if (!query || query.length < 2) { box.style.display = 'none'; return; }
  const clientes = await loadClientes();
  const q = query.toLowerCase();
  const matches = clientes.filter(c =>
    c.nombre.toLowerCase().includes(q) || c.representante.toLowerCase().includes(q)
  ).slice(0, 8);

  if (matches.length === 0) {
    box.innerHTML = `<div style="padding:8px 12px;font-size:12px;color:var(--text3)">
      Sin resultados — <span style="color:var(--accent);cursor:pointer" onclick="preCrearCliente('${query.replace(/'/g,"\'")}')">
      + Crear "${query}" como nuevo cliente
      </span></div>`;
    box.style.display = 'block';
    return;
  }

  box.innerHTML = matches.map(c => `
    <div onclick="preSelectCliente(${JSON.stringify(c).replace(/"/g,'&quot;')})"
      style="padding:7px 12px;font-size:12px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:center;"
      onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
      <div style="flex:1">
        <div style="color:var(--text);font-weight:500">${c.nombre}</div>
        ${c.representante ? `<div style="color:var(--text3);font-size:11px">${c.representante}</div>` : ''}
      </div>
      ${c.email ? `<div style="font-size:10px;color:var(--accent)">${c.email}</div>` : ''}
    </div>`).join('') +
    `<div onclick="preCrearCliente('${query.replace(/'/g,"\'")}'')"
      style="padding:7px 12px;font-size:12px;cursor:pointer;color:var(--accent);"
      onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
      + Crear "${query}" como nuevo cliente
    </div>`;
  box.style.display = 'block';
}

function preSelectCliente(c) {
  document.getElementById('pre-cliente').value = c.nombre;
  if (c.representante) document.getElementById('pre-nombre').value = c.representante;
  if (c.email) document.getElementById('pre-email').value = c.email;
  document.getElementById('pre-cliente-suggestions').style.display = 'none';
  // Store selected client data
  window._preSelectedCliente = c;
}

async function preCrearCliente(nombre) {
  document.getElementById('pre-cliente-suggestions').style.display = 'none';
  document.getElementById('pre-cliente').value = nombre;
  const token = getPreToken();
  if (!token) return;
  preLog(`📋 Creando nuevo cliente: ${nombre}...`, 'info');
  const sheetId = CLIENTES_SHEET_ID();
  // Get current client count to generate next ID
  const clientes = await loadClientes();
  const nextNum = clientes.length + 1;
  const newId = 'CLI' + String(nextNum).padStart(3, '0');
  const row = [newId, nombre, '', '', 'https://wa.me/', 'Prospecto'];
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/001%20Clientes!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [row] })
    }
  );
  const d = await r.json();
  if (!d.error) {
    _clientesCache = null; // Reset cache
    preLog(`✓ Cliente ${newId} - ${nombre} creado en la planilla`, 'ok');
    window._preSelectedCliente = { id: newId, nombre, representante: '', email: '' };
  } else {
    preLog(`⚠️ Error creando cliente: ${d.error.message}`, 'warn');
  }
}

// Close suggestions on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('#pre-cliente') && !e.target.closest('#pre-cliente-suggestions')) {
    const box = document.getElementById('pre-cliente-suggestions');
    if (box) box.style.display = 'none';
  }
});

// ════════════════════════════════════════════
// SYNC HONORARIOS → GENERAR PRESUPUESTO
// ════════════════════════════════════════════
function syncHonorariosToPresupuesto() {
  const sup     = document.getElementById('hon-sup')?.value;
  const basico  = document.getElementById('hon-basico')?.value;
  const full    = document.getElementById('hon-full')?.value;
  const express = document.getElementById('hon-express')?.value;

  const supEl = document.getElementById('pre-sup');
  const h1El  = document.getElementById('pre-hon1');
  const h2El  = document.getElementById('pre-hon2');
  const h3El  = document.getElementById('pre-hon3');

  if (sup && supEl && !supEl.value) supEl.value = sup;

  // Calculate totals and format
  if (basico && sup && h1El) {
    const total = Math.round(parseFloat(basico) * parseFloat(sup));
    h1El.dataset.raw = String(total);
    h1El.value = '$ ' + total.toLocaleString('es-AR');
    updateHonLetras();
  }
  if (full && sup && h2El) {
    const total = Math.round(parseFloat(full) * parseFloat(sup));
    h2El.dataset.raw = String(total);
    h2El.value = '$ ' + total.toLocaleString('es-AR');
  }
  if (express && sup && h3El) {
    const total = Math.round(parseFloat(express) * parseFloat(sup));
    h3El.dataset.raw = String(total);
    h3El.value = '$ ' + total.toLocaleString('es-AR');
  }
}

// ════════════════════════════════════════════
// GMAIL DRAFT
// ════════════════════════════════════════════
async function createGmailDraft(data, docUrl) {
  const token = getPreToken();
  if (!token) return null;

  const monedaSym = data.moneda === 'USD' ? 'U$D' : '$';
  const hon1fmt = data.hon1 ? monedaSym + ' ' + Number(data.hon1).toLocaleString('es-AR') : '';

  const subject = `Presupuesto Nº ${data.numero} — ${data.cliente} — ${data.proyecto}`;
  const body = `Estimado/a ${data.nombre || data.cliente},

Adjunto encontrará el presupuesto Nº ${data.numero} correspondiente al proyecto "${data.proyecto}" en ${data.ubicacion || 'Buenos Aires'}.

📋 Resumen:
• Servicio: ${data.servicio}
• Superficie: ${data.superficie} m²
• Honorarios: ${data.honLetras || hon1fmt}
• Anticipo: ${data.anticipo}% — Saldo: ${data.saldo}%
• Plazo de entrega: ${data.plazo1} días (anticipo) / ${data.plazo2} días (saldo)
• Validez: ${data.validez}

🔗 Ver presupuesto completo: ${docUrl}

Quedamos a disposición ante cualquier consulta.

Saludos,
SKY Ingeniería Estructural`;

  // Create MIME message
  const email = [
    `To: ${data.email}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
    '',
    body
  ].join('\r\n');

  const encoded = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: { raw: encoded } })
  });
  const d = await r.json();
  return d.id ? d : null;
}

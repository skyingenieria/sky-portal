// PRESUPUESTOS AGENT
// ════════════════════════════════════════════

const PRESUPUESTOS_SHEET_ID = () => document.getElementById('pre-sheet-id')?.value || localStorage.getItem('sky_pre_sheet') || '1cnIJPZeLDvv0Fr9sjVnslfGcHNlXUL-iwEhcPzERKT8';
const PRESUPUESTOS_TEMPLATE_ID = () => document.getElementById('pre-template-id')?.value || localStorage.getItem('sky_pre_template') || '1TLUn9ZBcsW8AQg9DE6DHGhJTBXOtJF5WxlICZHm1SGQ';

function openAgent_presupuestos() {
  document.getElementById('agent-panel').style.display = 'none';
  document.getElementById('onboarding-panel').style.display = 'none';
  const p = document.getElementById('presupuestos-panel');
  p.style.display = 'block';
  p.classList.add('fade-in');
  p.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Set today's date
  const today = new Date().toISOString().split('T')[0];
  if (document.getElementById('pre-fecha')) document.getElementById('pre-fecha').value = today;
  // Init honorarios values from localStorage
  ['hon-basico','hon-full','hon-express','hon-dolar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const key = 'sky_' + id.replace('-','_');
      if (!el.value) el.value = localStorage.getItem(key) || '';
    }
  });
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

function updateHonLetras() {
  const val = parseFloat(document.getElementById('pre-hon1')?.value) || 0;
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
  const token = state.token || obState.token;
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
    hon1:      document.getElementById('pre-hon1')?.value?.trim() || '',
    hon2:      document.getElementById('pre-hon2')?.value?.trim() || '',
    hon3:      document.getElementById('pre-hon3')?.value?.trim() || '',
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
    const copyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${templateId}/copy`, {
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
    const bar = document.getElementById('pre-done-bar');
    bar.style.display = 'block';
    bar.innerHTML = `
      <div class="done-bar" style="margin-top:10px;padding:12px 16px;border-radius:8px;display:flex;align-items:center;gap:10px;border:1px solid var(--border);">
        <span style="color:var(--green);font-size:16px">✅</span>
        <span style="font-size:13px;color:var(--text)">Presupuesto <strong>${docName}</strong> creado</span>
        <a href="${newDocUrl}" target="_blank"
           style="margin-left:auto;font-size:12px;color:var(--accent);text-decoration:none;border:1px solid var(--accent);padding:4px 10px;border-radius:5px;">
          Abrir Doc →
        </a>
      </div>`;

  } catch(e) {
    preLog('❌ Error: ' + e.message, 'err');
  }

  btn.disabled = false; btn.textContent = '🚀 Generar Presupuesto';
}
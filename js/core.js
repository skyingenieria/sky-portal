const GOOGLE_CLIENT_ID = '277799503106-ak7jbpsu92ut583mo6u84dvr1kru9sli.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents';

// Template folder ID
const TEMPLATE_FOLDER_ID = '1rhT_ajJF2WmxZcNzK5DewIFk7ktfcZ9q';

let state = {
  token: null, step: 0,
  folders: [], selectedFolder: null,
  sheets: [], selectedSheet: null,
  pdfFile: null, pdfBase64: null,
  running: false, done: false,
};

// ── Onboarding state ──
let obState = {
  token: null,
  expediente: '', cliente: '', proyecto: '',
  running: false, done: false, newFolderId: null,
  // API keys — se cargan desde localStorage (o se ingresan en el panel)
  clockifyKey:       localStorage.getItem('sky_clockify_key') || '',
  clockifyWorkspace: localStorage.getItem('sky_clockify_ws')  || '',
  clockifyUserId:    localStorage.getItem('sky_clockify_uid') || '',
  asanaToken:        localStorage.getItem('sky_asana_token')  || '',
  asanaWorkspace:    localStorage.getItem('sky_asana_ws')     || '',
  asanaTemplate:     localStorage.getItem('sky_asana_tpl')    || '',
  slackToken:        localStorage.getItem('sky_slack_token')  || '',
  slackChannel: '',
  // Results
  clockifyProjectId: null,
  asanaProjectId: null,
  slackChannelId: null,
};

function openAgent(id) {
  // hide all panels first
  document.getElementById('agent-panel').style.display = 'none';
  document.getElementById('onboarding-panel').style.display = 'none';
  const prePanel = document.getElementById('presupuestos-panel');
  if (prePanel) prePanel.style.display = 'none';

  if (id === 'onboarding') {
    const p = document.getElementById('onboarding-panel');
    p.style.display = 'block';
    p.classList.add('fade-in');
    p.scrollIntoView({ behavior: 'smooth', block: 'start' });
    renderObTasks();
    return;
  }
  if (id === 'presupuestos') {
    openAgent_presupuestos();
    return;
  }
  const p = document.getElementById('agent-panel');
  p.classList.add('open','fade-in');
  p.scrollIntoView({ behavior: 'smooth', block: 'start' });
  renderSteps();
}
function closeAgent() {
  document.getElementById('agent-panel').classList.remove('open');
}
function closeOnboarding() {
  document.getElementById('onboarding-panel').style.display = 'none';
}

function renderSteps() {
  const col = document.getElementById('steps-col');
  col.innerHTML = '';
  const steps = [
    { n:1, label:'Autenticación Google', id:'step-auth' },
    { n:2, label:'Carpeta del proyecto', id:'step-folder' },
    { n:3, label:'Sheet de metraje', id:'step-sheet' },
    { n:4, label:'PDF de CYPECAD', id:'step-pdf' },
  ];
  steps.forEach(({ n, label, id }, i) => {
    const done = state.step > i;
    const active = state.step === i;
    const el = document.createElement('div');
    el.className = `step-item ${done?'step-done':active?'step-active':''}`;
    el.id = id;
    const numCls = done?'done':active?'active':'idle';
    el.innerHTML = `
      <div class="step-row">
        <div class="step-num ${numCls}">${done?'✓':n}</div>
        <div class="step-label">${label}</div>
      </div>
      <div class="step-body" id="${id}-body"></div>
    `;
    col.appendChild(el);
    if (active) {
      const b = el.querySelector(`#${id}-body`);
      if (i===0) renderAuthStep(b);
      if (i===1) renderFolderStep(b);
      if (i===2) renderSheetStep(b);
      if (i===3) renderPdfStep(b);
    } else if (done) {
      const b = el.querySelector(`#${id}-body`);
      const sums = [
        `<span style="font-size:12px;color:var(--green)">Conectado con Google</span>`,
        `<span style="font-size:12px;color:var(--green)">${state.selectedFolder?.name||''}</span>`,
        `<span style="font-size:12px;color:var(--green)">${state.selectedSheet?.name||''}</span>`,
        `<span style="font-size:12px;color:var(--green)">${state.pdfFile?.name||''}</span>`,
      ];
      b.innerHTML = sums[i]||'';
    }
  });
  updateRunBtn();
}

// ════════════════════════════════════════════
// AUTENTICACIÓN GLOBAL — sirve a todos los agentes
// ════════════════════════════════════════════

// Token compartido — todos los agentes leen de acá
let globalToken = null;

function getToken() {
  return globalToken || state?.token || obState?.token || null;
}

function setToken(token) {
  globalToken = token;
  // Propagar a todos los estados
  state.token = token;
  if (typeof obState !== 'undefined') obState.token = token;
  // Actualizar UI global
  const btn    = document.getElementById('global-auth-btn');
  const status = document.getElementById('global-auth-status');
  if (btn)    { btn.textContent = '✓ Google conectado'; btn.style.background = 'var(--green-bg)'; btn.style.color = 'var(--green)'; btn.style.border = '1px solid var(--green)'; btn.disabled = true; }
  if (status) status.style.display = 'flex';
  // Habilitar botones de run en todos los agentes
  ['run-btn','ob-run-btn','pre-run-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.disabled = false; }
  });
  document.getElementById('run-btn') && (document.getElementById('run-btn').innerHTML = '▶ Procesar PDF con IA');
  document.getElementById('ob-run-btn') && (document.getElementById('ob-run-btn').textContent = '🚀 Ejecutar Onboarding completo');
  document.getElementById('pre-run-btn') && (document.getElementById('pre-run-btn').textContent = '🚀 Generar Presupuesto');
  // Mostrar botones individuales del onboarding
  const indBtns = document.getElementById('ob-individual-btns');
  if (indBtns) indBtns.style.display = 'flex';
}

// El client se inicializa al cargar la página (no en el click)
// para que requestAccessToken() se llame directamente desde el user gesture
let _gsiClient = null;

function initGsiClient() {
  if (!window.google?.accounts?.oauth2) return;
  if (_gsiClient) return;
  _gsiClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: SCOPES,
    callback: (r) => {
      const btn = document.getElementById('global-auth-btn');
      if (r.error) {
        if (btn) btn.textContent = '🔑 Conectar Google';
        console.error('Auth error:', r.error);
        return;
      }
      setToken(r.access_token);
      if (typeof renderSteps === 'function' && state.step === 0) { state.step = 1; renderSteps(); }
      if (typeof renderObTasks === 'function') renderObTasks();
    },
    error_callback: (e) => {
      const btn = document.getElementById('global-auth-btn');
      if (btn) btn.textContent = '🔑 Conectar Google';
      console.error('GSI error:', e);
    }
  });
}

// Llamar initGsiClient apenas carga la librería
function waitForGsi() {
  if (window.google?.accounts?.oauth2) { initGsiClient(); return; }
  setTimeout(waitForGsi, 200);
}
waitForGsi();

function doGlobalAuth() {
  const btn = document.getElementById('global-auth-btn');
  if (btn) btn.textContent = '⏳ Conectando...';
  // Si el cliente no está listo todavía, inicializarlo
  if (!_gsiClient) initGsiClient();
  if (!_gsiClient) {
    if (btn) btn.textContent = '🔑 Conectar Google';
    alert('Google aún no cargó. Intentá en un momento.');
    return;
  }
  // requestAccessToken directo desde el user gesture — el popup NO se bloquea
  _gsiClient.requestAccessToken({ prompt: 'consent' });
}

//  ONBOARDING DE PROYECTO — LÓGICA COMPLETA
// ═══════════════════════════════════════════════

function obLog(msg, type='info') {
  const term = document.getElementById('ob-terminal');
  if (!term) return;
  const time = new Date().toLocaleTimeString('es-AR', { hour12: false });
  const div = document.createElement('div');
  div.innerHTML = `<span class="log-time">${time}</span><span class="log-${type}">${msg}</span>`;
  if (term.querySelector('.log-info')?.textContent?.includes('Completá los datos')) term.innerHTML = '';
  term.appendChild(div);
  term.scrollTop = term.scrollHeight;
}

// ── Tareas y su estado ──
function getObTaskStatus() {
  const s = obState;
  return [
    { id:'ob-auth',   icon:'🔑', label:'Autenticación Google',      done: !!s.token,         active: !s.token },
    { id:'ob-datos',  icon:'📋', label:'Datos del proyecto',        done: !!(s.expediente && s.cliente && s.proyecto), active: !!s.token && !(s.expediente && s.cliente && s.proyecto) },
    { id:'ob-drive',  icon:'📁', label:'Duplicar carpeta en Drive', done: !!s.newFolderId,   active: !!(s.expediente && s.cliente && s.proyecto) && !s.newFolderId },
    { id:'ob-rename', icon:'✏️', label:'Renombrar archivos',        done: s.renamed === true, active: !!s.newFolderId && !s.renamed },
    { id:'ob-clock',  icon:'⏱️', label:'Proyecto en Clockify',     done: !!s.clockifyProjectId, active: !!s.newFolderId && !s.clockifyProjectId, optional: !s.clockifyKey },
    { id:'ob-asana',  icon:'✅', label:'Proyecto en Asana',        done: !!s.asanaProjectId, active: !!s.newFolderId && !s.asanaProjectId, optional: !s.asanaToken },
    { id:'ob-slack',  icon:'💬', label:'Canal en Slack',           done: !!s.slackChannelId, active: !!s.newFolderId && !s.slackChannelId, optional: !s.slackToken },
  ];
}

function renderObTasks() {
  const col = document.getElementById('ob-tasks-col');
  if (!col) return;
  col.innerHTML = '';
  const tasks = getObTaskStatus();

  tasks.forEach(({ id, icon, label, done, active, optional }, i) => {
    const el = document.createElement('div');
    el.className = `step-item ${done ? 'step-done' : active ? 'step-active' : ''}`;
    el.id = id;
    if (optional && !active && !done) el.style.opacity = '0.5';

    const numCls = done ? 'done' : active ? 'active' : 'idle';
    el.innerHTML = `
      <div class="step-row">
        <div class="step-num ${numCls}">${done ? '✓' : icon}</div>
        <div class="step-label">${label}</div>
        ${optional && !done ? `<span class="badge badge-soon" style="margin-left:auto;font-size:10px">Config</span>` : ''}
      </div>
      <div class="step-body" id="${id}-body"></div>
    `;
    col.appendChild(el);

    const body = document.getElementById(`${id}-body`);
    if (active) {
      if (id === 'ob-auth')   renderObAuthStep(body);
      if (id === 'ob-datos')  renderObDatosStep(body);
      if (id === 'ob-drive')  renderObDriveStep(body);
      if (id === 'ob-rename') renderObRenameStep(body);
      if (id === 'ob-clock')  renderObClockStep(body);
      if (id === 'ob-asana')  renderObAsanaStep(body);
      if (id === 'ob-slack')  renderObSlackStep(body);
    } else if (done) {
      const summaries = {
        'ob-auth':   `<span style="font-size:12px;color:var(--green)">Conectado con Google</span>`,
        'ob-datos':  `<span style="font-size:12px;color:var(--green);font-family:var(--mono)">${obState.expediente} - ${obState.cliente} - ${obState.proyecto}</span>`,
        'ob-drive':  `<a href="https://drive.google.com/drive/folders/${obState.newFolderId}" target="_blank" style="font-size:12px;color:var(--accent)">Abrir carpeta en Drive ↗</a>`,
        'ob-rename': `<span style="font-size:12px;color:var(--green)">${obState.renamedCount || 0} archivo(s) renombrado(s)</span>`,
        'ob-clock':  `<span style="font-size:12px;color:var(--green)">ID: ${obState.clockifyProjectId}</span>`,
        'ob-asana':  `<a href="https://app.asana.com/0/${obState.asanaProjectId}" target="_blank" style="font-size:12px;color:var(--accent)">Ver en Asana ↗</a>`,
        'ob-slack':  `<span style="font-size:12px;color:var(--green)">#${obState.slackChannel}</span>`,
      };
      if (summaries[id]) body.innerHTML = summaries[id];
    }
  });

  updateObRunBtn();
}

// ── Step renderers ──
function renderObAuthStep(b) {
  b.innerHTML = `
    <p style="font-size:12px;color:var(--text2);margin:4px 0 8px;line-height:1.6">
      Necesita acceso a Google Drive para copiar y renombrar archivos.
    </p>
    <button class="btn btn-primary" style="width:100%;justify-content:center;padding:7px" onclick="doObAuth()">
      🔑 Autorizar con Google
    </button>`;
}

function renderObDatosStep(b) {
  b.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px">
      <input class="input-field" id="ob-exp-in" placeholder="Expediente (ej: F26018)" value="${obState.expediente}"
        oninput="obState.expediente=this.value.trim();updateObRunBtn();updateObPreview()" />
      <input class="input-field" id="ob-cli-in" placeholder="Cliente (ej: Fontana)" value="${obState.cliente}"
        oninput="obState.cliente=this.value.trim();updateObRunBtn();updateObPreview()" />
      <input class="input-field" id="ob-pro-in" placeholder="Proyecto (ej: Edificio Centro)" value="${obState.proyecto}"
        oninput="obState.proyecto=this.value.trim();updateObRunBtn();updateObPreview()" />
      <div style="font-size:11px;color:var(--text3);padding:6px 8px;background:var(--bg-hover);border-radius:4px;font-family:var(--mono)">
        📁 <span id="ob-preview">${obState.expediente||'XXXX'} - ${obState.cliente||'Cliente'} - ${obState.proyecto||'Proyecto'}</span>
      </div>
    </div>`;
}

function updateObPreview() {
  const el = document.getElementById('ob-preview');
  if (el) el.textContent = `${obState.expediente||'XXXX'} - ${obState.cliente||'Cliente'} - ${obState.proyecto||'Proyecto'}`;
}

function renderObDriveStep(b) {
  const name = `${obState.expediente} - ${obState.cliente} - ${obState.proyecto}`;
  b.innerHTML = `<div style="font-size:12px;color:var(--text2);margin-top:4px;line-height:1.7">
    Se duplicará el template como:<br>
    <span style="font-family:var(--mono);color:var(--accent);font-size:11.5px">${name}</span>
  </div>`;
}

function renderObRenameStep(b) {
  b.innerHTML = `<div style="font-size:12px;color:var(--text2);margin-top:4px;line-height:1.7">
    Se renombrarán todos los archivos que empiecen con <code style="font-size:11px;background:var(--bg-active);padding:1px 5px;border-radius:3px">AAXXX</code> o <code style="font-size:11px;background:var(--bg-active);padding:1px 5px;border-radius:3px">FYYXXX</code><br>
    reemplazando el prefijo por <span style="font-family:var(--mono);color:var(--accent)">${obState.expediente}</span>
  </div>`;
}

function renderObClockStep(b) {
  const hasKey = !!obState.clockifyKey && !!obState.clockifyWorkspace;
  b.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px">
      ${hasKey ? `<div style="font-size:11px;color:var(--green)">✓ API key cargada desde memoria</div>` : ''}
      <input class="input-field" id="ob-clock-key" placeholder="Clockify API Key" type="password"
        value="${obState.clockifyKey}"
        oninput="obState.clockifyKey=this.value.trim();localStorage.setItem('sky_clockify_key',this.value.trim())" />
      <input class="input-field" id="ob-clock-ws" placeholder="Workspace ID"
        value="${obState.clockifyWorkspace}"
        oninput="obState.clockifyWorkspace=this.value.trim();localStorage.setItem('sky_clockify_ws',this.value.trim())" />
      <input class="input-field" id="ob-clock-uid" placeholder="User ID (opcional)"
        value="${obState.clockifyUserId}"
        oninput="obState.clockifyUserId=this.value.trim();localStorage.setItem('sky_clockify_uid',this.value.trim())" />
    </div>`;
}

function renderObAsanaStep(b) {
  const hasToken = !!obState.asanaToken;
  b.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px">
      ${hasToken ? `<div style="font-size:11px;color:var(--green)">✓ Token cargado desde memoria</div>` : ''}
      <input class="input-field" id="ob-asana-tok" placeholder="Asana Personal Access Token" type="password"
        value="${obState.asanaToken}"
        oninput="obState.asanaToken=this.value.trim();localStorage.setItem('sky_asana_token',this.value.trim())" />
      <input class="input-field" id="ob-asana-ws" placeholder="Workspace GID"
        value="${obState.asanaWorkspace}"
        oninput="obState.asanaWorkspace=this.value.trim();localStorage.setItem('sky_asana_ws',this.value.trim())" />
      <input class="input-field" id="ob-asana-tpl" placeholder="Template Project GID (opcional)"
        value="${obState.asanaTemplate}"
        oninput="obState.asanaTemplate=this.value.trim();localStorage.setItem('sky_asana_tpl',this.value.trim())" />
    </div>`;
}

function renderObSlackStep(b) {
  const channelName = slugify(`${obState.expediente}-${obState.cliente}`);
  const hasToken = !!obState.slackToken;
  b.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px">
      ${hasToken ? `<div style="font-size:11px;color:var(--green)">✓ Token cargado desde memoria</div>` : ''}
      <input class="input-field" id="ob-slack-tok" placeholder="Slack Bot Token (xoxb-...)" type="password"
        value="${obState.slackToken}"
        oninput="obState.slackToken=this.value.trim();localStorage.setItem('sky_slack_token',this.value.trim())" />
      <div style="font-size:11px;color:var(--text3)">
        Canal: <span style="font-family:var(--mono);color:var(--text2)">#${channelName}</span>
      </div>
    </div>`;
}

function slugify(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function updateObRunBtn() {
  const btn = document.getElementById('ob-run-btn');
  if (!btn) return;
  const { token, expediente, cliente, proyecto, running, done } = obState;
  if (running) {
    btn.className = 'btn run-btn'; btn.innerHTML = '<span class="spin">⚙️</span> Procesando...'; btn.disabled = true;
  } else if (!token) {
    btn.className = 'btn btn-primary run-btn'; btn.innerHTML = '🔒 Autenticá con Google primero'; btn.disabled = true;
  } else if (!expediente || !cliente || !proyecto) {
    btn.className = 'btn btn-primary run-btn'; btn.innerHTML = '📋 Completá los datos del proyecto'; btn.disabled = true;
  } else {
    btn.className = 'btn btn-primary run-btn';
    btn.innerHTML = `🚀 Ejecutar onboarding: ${expediente} - ${cliente}`;
    btn.disabled = false;
  }
}

function doObAuth() {
  obLog('Abriendo autorización Google...', 'info');
  if (typeof _gsiClient !== 'undefined' && _gsiClient) {
    _gsiClient.callback = (r) => {
      if (r.error) { obLog('Error: '+r.error, 'error'); return; }
      if (typeof setToken === 'function') setToken(r.access_token);
      else { obState.token = r.access_token; state.token = r.access_token; }
      obLog('✓ Autenticado con Google', 'success');
      renderObTasks();
    };
    _gsiClient.requestAccessToken({ prompt: 'consent' });
    return;
  }
  if (!window.google?.accounts?.oauth2) { obLog('Google aún no cargó', 'error'); return; }
  const c = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID, scope: SCOPES,
    callback: (r) => {
      if (r.error) { obLog('Error: '+r.error, 'error'); return; }
      if (typeof setToken === 'function') setToken(r.access_token);
      else { obState.token = r.access_token; state.token = r.access_token; }
      obLog('✓ Autenticado con Google', 'success');
      renderObTasks();
    }
  });
  c.requestAccessToken({ prompt: 'consent' });
}

// ── RUNNER PRINCIPAL ──
async function runOnboarding() {
  if (obState.running) return;
  // Sync input values
  obState.expediente = document.getElementById('ob-exp-in')?.value.trim() || obState.expediente;
  obState.cliente    = document.getElementById('ob-cli-in')?.value.trim() || obState.cliente;
  obState.proyecto   = document.getElementById('ob-pro-in')?.value.trim() || obState.proyecto;
  obState.clockifyKey       = document.getElementById('ob-clock-key')?.value.trim()  || obState.clockifyKey;
  obState.clockifyWorkspace = document.getElementById('ob-clock-ws')?.value.trim()   || obState.clockifyWorkspace;
  obState.clockifyUserId    = document.getElementById('ob-clock-uid')?.value.trim()  || obState.clockifyUserId;
  obState.asanaToken        = document.getElementById('ob-asana-tok')?.value.trim()  || obState.asanaToken;
  obState.asanaWorkspace    = document.getElementById('ob-asana-ws')?.value.trim()   || obState.asanaWorkspace;
  obState.asanaTemplate     = document.getElementById('ob-asana-tpl')?.value.trim()  || obState.asanaTemplate;
  obState.slackToken        = document.getElementById('ob-slack-tok')?.value.trim()  || obState.slackToken;

  if (!obState.token || !obState.expediente || !obState.cliente || !obState.proyecto) return;
  obState.running = true; updateObRunBtn();

  const folderName = `${obState.expediente} - ${obState.cliente} - ${obState.proyecto}`;
  obLog('━━━ Iniciando onboarding ━━━', 'heading');
  obLog(`📋 Proyecto: ${folderName}`, 'data');

  try {
    // ── PASO 1: Duplicar carpeta ──
    if (!obState.newFolderId) {
      obLog('', 'info');
      obLog('📁 Duplicando carpeta template...', 'heading');
      const metaR = await fetch(
        `https://www.googleapis.com/drive/v3/files/${TEMPLATE_FOLDER_ID}?fields=id,name,parents&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${obState.token}` } }
      );
      const meta = await metaR.json();
      if (meta.error) throw new Error('Template no encontrado: ' + meta.error.message);
      const parentId = meta.parents?.[0];
      obLog(`  Template: "${meta.name}"`, 'data');

      const createR = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${obState.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] })
      });
      const newFolder = await createR.json();
      if (newFolder.error) throw new Error(newFolder.error.message);
      obState.newFolderId = newFolder.id;

      const copied = await copyFolderContents(TEMPLATE_FOLDER_ID, newFolder.id);
      obLog(`✓ Carpeta creada con ${copied} elemento(s)`, 'success');
    }

    // ── PASO 2: Renombrar archivos ──
    if (!obState.renamed) {
      obLog('', 'info');
      obLog('✏️  Renombrando archivos...', 'heading');
      const count = await renameFilesInFolder(obState.newFolderId, obState.expediente);
      obState.renamed = true;
      obState.renamedCount = count;
      obLog(`✓ ${count} archivo(s) renombrado(s)`, 'success');
    }

    // ── PASO 3: Clockify ──
    if (!obState.clockifyProjectId && obState.clockifyKey && obState.clockifyWorkspace) {
      obLog('', 'info');
      obLog('⏱️  Creando proyecto en Clockify...', 'heading');
      try {
        const r = await fetch(`https://api.clockify.me/api/v1/workspaces/${obState.clockifyWorkspace}/projects`, {
          method: 'POST',
          headers: { 'X-Api-Key': obState.clockifyKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: folderName, color: '#03A9F4', billable: true, public: false })
        });
        const d = await r.json();
        if (d.id) {
          obState.clockifyProjectId = d.id;
          obLog(`✓ Proyecto Clockify creado: ${d.name}`, 'success');

          // ── Crear tasks en el proyecto ──
          const tasks = [
            'ING - ANTEPROYECTO',
            'ING - PROYECTO',
            'DEL - ANTEPROYECTO',
            'DEL - PROYECTO',
          ];
          obLog('  Creando tasks...', 'info');
          for (const taskName of tasks) {
            try {
              const tr = await fetch(`https://api.clockify.me/api/v1/workspaces/${obState.clockifyWorkspace}/projects/${d.id}/tasks`, {
                method: 'POST',
                headers: { 'X-Api-Key': obState.clockifyKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: taskName, status: 'ACTIVE' })
              });
              const td = await tr.json();
              if (td.id) {
                obLog(`  ✓ Task: ${taskName}`, 'success');
              } else {
                obLog(`  ⚠️ Task ${taskName}: ${td.message || JSON.stringify(td)}`, 'warn');
              }
            } catch(te) { obLog(`  ⚠️ Task ${taskName}: ${te.message}`, 'warn'); }
          }

        } else {
          obLog(`⚠️ Clockify: ${d.message || JSON.stringify(d)}`, 'warn');
        }
      } catch(e) { obLog('⚠️ Error Clockify: ' + e.message, 'warn'); }
    } else if (!obState.clockifyKey) {
      obLog('⏭️  Clockify: sin API key configurada, omitido', 'warn');
    }

    // ── PASO 4: Asana ──
    if (!obState.asanaProjectId && obState.asanaToken && obState.asanaWorkspace) {
      obLog('', 'info');
      obLog('✅  Creando proyecto en Asana...', 'heading');
      try {
        // Fechas requeridas por la API de Asana
        const todayD = new Date();
        const startDate = todayD.toISOString().split('T')[0];
        const dueD = new Date(todayD); dueD.setDate(dueD.getDate() + 90);
        const dueDate = dueD.toISOString().split('T')[0];

        let body, endpoint;
        // Team GID requerido por Asana — guardado en localStorage
        const asanaTeam = obState.asanaTeam || localStorage.getItem('sky_asana_team') || '1200032286600828';

        if (obState.asanaTemplate) {
          endpoint = `https://app.asana.com/api/1.0/project_templates/${obState.asanaTemplate}/instantiateProject`;
          body = {
            data: {
              name: folderName,
              public: false,
              team: asanaTeam,
              workspace: obState.asanaWorkspace,
            }
          };
        } else {
          endpoint = 'https://app.asana.com/api/1.0/projects';
          body = {
            data: {
              name: folderName,
              workspace: obState.asanaWorkspace,
              team: asanaTeam,
              color: 'light-blue',
              default_view: 'list',
              start_on: startDate,
              due_on: dueDate,
              notes: `Proyecto: ${obState.proyecto}\nCliente: ${obState.cliente}\nExpediente: ${obState.expediente}`,
            }
          };
        }

        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${obState.asanaToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(body)
        });
        const d = await r.json();
        const gid = d.data?.gid || d.data?.new_project?.gid;
        if (gid) {
          obState.asanaProjectId = gid;
          obLog(`✓ Proyecto Asana creado (GID: ${gid})`, 'success');
        } else {
          obLog(`⚠️ Asana: ${d.errors?.[0]?.message || JSON.stringify(d)}`, 'warn');
        }
      } catch(e) { obLog('⚠️ Error Asana: ' + e.message, 'warn'); }
    } else if (!obState.asanaToken) {
      obLog('⏭️  Asana: sin token configurado, omitido', 'warn');
    }

    // ── PASO 5: Slack ──
    if (!obState.slackChannelId && obState.slackToken) {
      obLog('', 'info');
      obLog('💬  Creando canal en Slack...', 'heading');
      try {
        const channelName = slugify(`${obState.expediente}-${obState.cliente}`);
        obState.slackChannel = channelName;

        // Slack requiere xoxb- (bot token) para llamadas desde browser
        // Los tokens xoxe- (user tokens) bloquean CORS
        if (!obState.slackToken.startsWith('xoxb-')) {
          obLog('⚠️ Slack: el token debe ser un Bot Token (xoxb-...). Los User Tokens (xoxe-/xoxp-) bloquean CORS desde browser.', 'warn');
          obLog('  → Creá un Bot Token en api.slack.com/apps → OAuth & Permissions', 'warn');
          throw new Error('Token inválido para uso desde browser');
        }
        const params = new URLSearchParams({ name: channelName, is_private: 'false' });
        const r = await fetch('https://slack.com/api/conversations.create', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${obState.slackToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        });
        const d = await r.json();
        if (d.ok) {
          obState.slackChannelId = d.channel.id;
          obLog(`✓ Canal creado: #${channelName} (${d.channel.id})`, 'success');
          // Post welcome message
          const msgParams = new URLSearchParams({
            channel: d.channel.id,
            text: `🚀 *Nuevo proyecto*\n*Expediente:* ${obState.expediente}\n*Cliente:* ${obState.cliente}\n*Proyecto:* ${obState.proyecto}\n*Drive:* https://drive.google.com/drive/folders/${obState.newFolderId}`
          });
          await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${obState.slackToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: msgParams.toString()
          });
          obLog('  ✓ Mensaje de bienvenida enviado', 'success');
        } else {
          if (d.error === 'name_taken') {
            obLog(`⚠️ El canal #${channelName} ya existe`, 'warn');
          } else {
            obLog(`⚠️ Slack: ${d.error || JSON.stringify(d)}`, 'warn');
          }
        }
      } catch(e) { obLog('⚠️ Error Slack: ' + e.message, 'warn'); }
    } else if (!obState.slackToken) {
      obLog('⏭️  Slack: sin bot token configurado, omitido', 'warn');
    }

    // ── DONE ──
    obLog('', 'info');
    obLog('━━━ ¡Onboarding completado! ━━━', 'heading');
    obState.done = true;
    renderObTasks();

    const doneBar = document.getElementById('ob-done-bar');
    if (doneBar) {
      doneBar.style.display = 'flex';
      doneBar.innerHTML = `
        <span>✓ <strong>${folderName}</strong> creado en todos los sistemas</span>
        <a href="https://drive.google.com/drive/folders/${obState.newFolderId}" target="_blank">Abrir Drive ↗</a>
      `;
    }

  } catch(err) {
    obLog('❌ Error: ' + err.message, 'error');
  }

  obState.running = false; updateObRunBtn();
}

// ── Copiar carpeta recursivamente ──
async function copyFolderContents(srcId, dstId) {
  let count = 0;
  const q = encodeURIComponent(`'${srcId}' in parents and trashed=false`);
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100`,
    { headers: { Authorization: `Bearer ${obState.token}` } }
  );
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);
  for (const file of (data.files || [])) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      const cr = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${obState.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: 'application/vnd.google-apps.folder', parents: [dstId] })
      });
      const newSub = await cr.json();
      if (newSub.error) { obLog(`  ⚠️ No se pudo crear carpeta ${file.name}`, 'warn'); continue; }
      obLog(`  📁 ${file.name}/`, 'data');
      count += await copyFolderContents(file.id, newSub.id);
    } else {
      const cp = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/copy?supportsAllDrives=true`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${obState.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, parents: [dstId] })
      });
      const copied = await cp.json();
      if (copied.error) { obLog(`  ⚠️ No se pudo copiar ${file.name}`, 'warn'); continue; }
      obLog(`  📄 ${file.name}`, 'data');
      count++;
    }
  }
  return count;
}

// ── Renombrar archivos recursivamente ──
// Patrón: cualquier archivo que empiece con letras+dígitos (ej: AAPPP, FYYXXX, F26018)
// reemplaza ese prefijo por el expediente ingresado
async function renameFilesInFolder(folderId, expediente) {
  let count = 0;
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&supportsAllDrives=true&includeItemsFromAllDrives=true&pageSize=100`,
    { headers: { Authorization: `Bearer ${obState.token}` } }
  );
  const data = await r.json();
  if (data.error) throw new Error(data.error.message);

  // Pattern: starts with 2+ uppercase letters followed by 3+ uppercase letters/digits (AAXXX, FYYXXX, etc.)
  const prefixPattern = /^([A-Z]{1,3}[A-Z0-9]{2,6})(-|_|\s)/;

  for (const file of (data.files || [])) {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      // Recurse into subfolders
      count += await renameFilesInFolder(file.id, expediente);
    } else {
      const match = file.name.match(prefixPattern);
      if (match) {
        const oldPrefix = match[1];
        const separator = match[2];
        const newName = file.name.replace(oldPrefix, expediente);
        if (newName !== file.name) {
          const patchR = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?supportsAllDrives=true`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${obState.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
          });
          const patched = await patchR.json();
          if (patched.error) {
            obLog(`  ⚠️ No se pudo renombrar ${file.name}`, 'warn');
          } else {
            obLog(`  ✏️  ${file.name} → ${newName}`, 'data');
            count++;
          }
        }
      }
    }
  }
  return count;
}

// ════════════════════════════════════════════

/* Craques de Aldeia na Vercel: substitui os recursos do Claude (db, fotos, usuário, downloads)
   por chamadas às funções /api deste projeto. Leitura aberta a todos; escrita só para organizadores. */
(function () {
  const TK = 'craques-token', NM = 'craques-nome';
  const ler = (k) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
  const TOKEN = ler(TK), NOME = ler(NM), RL = 'craques-role';
  const ROLE = TOKEN ? (ler(RL) || 'admin') : '';
  const H = () => (TOKEN ? { 'x-token': TOKEN } : {});
  const erro = (msg, code) => Object.assign(new Error(msg), { code });

  async function api(url, opt = {}) {
    const r = await fetch(url, { ...opt, headers: { ...(opt.body ? { 'Content-Type': 'application/json' } : {}), ...H(), ...(opt.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw erro(j.erro || 'Falha no servidor.', j.code || (r.status === 403 ? 'invalid_argument' : 'internal'));
    return j;
  }

  // ---------- "Tempo real" por consulta periódica ----------
  const ouvintes = new Map(); // chave -> {fn, ok, err}
  const docSnap = (id, data) => ({ id, exists: data != null, data: () => (data == null ? undefined : JSON.parse(JSON.stringify(data))) });
  async function busca(chave) {
    const o = ouvintes.get(chave); if (!o) return;
    const [c, id] = chave.split('/');
    try {
      if (id) { const j = await api(`/api/db?c=${encodeURIComponent(c)}&id=${encodeURIComponent(id)}`); o.forEach((l) => l.ok(docSnap(id, j.data))); }
      else {
        const j = await api(`/api/db?c=${encodeURIComponent(c)}`);
        const docs = j.docs.map((d) => docSnap(d.id, d.data));
        const snap = { docs, size: docs.length, empty: !docs.length, forEach: (f) => docs.forEach(f) };
        o.forEach((l) => l.ok(snap));
      }
    } catch (e) { o.forEach((l) => l.err && l.err(e)); }
  }
  function ouvir(chave, ok, err) {
    if (!ouvintes.has(chave)) ouvintes.set(chave, new Set());
    const l = { ok, err }; ouvintes.get(chave).add(l); busca(chave);
    return () => { const s = ouvintes.get(chave); s && s.delete(l); };
  }
  const atualiza = (c) => { for (const k of ouvintes.keys()) if (k === c || k.startsWith(c + '/')) busca(k); };
  setInterval(() => { if (document.visibilityState === 'visible') for (const k of ouvintes.keys()) busca(k); }, 20000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') for (const k of ouvintes.keys()) busca(k); });

  const novoId = () => { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; let s = ''; const r = crypto.getRandomValues(new Uint8Array(20)); r.forEach((x) => (s += a[x % 36])); return s; };
  function docRef(c, id) {
    const w = async (op, data) => { await api('/api/db', { method: 'POST', body: JSON.stringify({ op, c, id, data }) }); atualiza(c); };
    return {
      id,
      set: (d) => w('set', d), update: (d) => w('update', d), delete: () => w('delete'),
      get: async () => { const j = await api(`/api/db?c=${encodeURIComponent(c)}&id=${encodeURIComponent(id)}`); return docSnap(id, j.data); },
      onSnapshot: (ok, err) => ouvir(c + '/' + id, ok, err),
    };
  }
  const db = {
    doc: (p) => { const [c, id] = String(p).split('/'); return docRef(c, id); },
    collection: (c) => ({ doc: (id) => docRef(c, id || novoId()), onSnapshot: (ok, err) => ouvir(c, ok, err) }),
  };

  const b64 = (blob) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(blob); });
  const assets = {
    async upload(blob, o = {}) { const j = await api('/api/foto', { method: 'POST', body: JSON.stringify({ t: o.type || blob.type || 'image/jpeg', b: await b64(blob) }) }); return j; },
    async delete(id) { await api('/api/foto?id=' + encodeURIComponent(id), { method: 'DELETE' }); },
  };

  let VID = ler('craques-vid'); if (!VID) { VID = 'v-' + novoId(); try { localStorage.setItem('craques-vid', VID); } catch {} }
  const ED = !!TOKEN;
  const limpa = () => { try { [TK, NM, RL].forEach((k) => localStorage.removeItem(k)); } catch {} };
  // Confere no servidor se o login ainda vale (senhas trocadas derrubam a sessão)
  const SESSAO = ED ? fetch('/api/eu', { headers: H() }).then(async (r) => {
    if (r.status === 401) { limpa(); location.reload(); return null; }
    const j = await r.json().catch(() => null); if (j && j.role) { try { localStorage.setItem(RL, j.role); } catch {} return j.role; } return ROLE;
  }).catch(() => ROLE) : Promise.resolve('');
  const user = {
    id: async () => (ED ? 'ed-' + NOME.toLowerCase().replace(/[^a-z0-9]+/g, '') : VID),
    can: async () => !!(await SESSAO),
    isOwner: async () => (await SESSAO) === 'admin', canEdit: async () => (await SESSAO) === 'admin',
  };
  const downloads = {
    async save({ filename, data }) { const u = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); const a = document.createElement('a'); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); return { status: 'saved' }; },
  };
  const caps = { db, assets, user, downloads };
  window.claude = { use: async (n) => caps[n] || null };

  // ---------- Entrar / sair (organizadores) ----------
  window.CRAQUES_LOGIN = { nome: NOME, logado: ED, role: ROLE };
  const NIVEL = { admin: 'Administrador', operador: 'Times e Scout' };
  function painel() {
    const ov = document.createElement('div');
    ov.className = 'lg-ov';
    ov.innerHTML = ED
      ? `<div class="lg"><h3>Organizador</h3><p>Você entrou como <b>${NOME.replace(/[<>&]/g, '')}</b>.</p><p>Acesso: <b>${NIVEL[ROLE] || ROLE}</b></p><div class="lg-b"><button type="button" class="lg-x">Fechar</button><button type="button" class="lg-ok" id="lg-sair">Sair</button></div></div>`
      : `<form class="lg"><h3>Entrar como organizador</h3><label>Nome<input name="n" autocomplete="username" required></label><label>Senha<input name="s" type="password" autocomplete="current-password" required></label><p class="lg-e" hidden></p><div class="lg-b"><button type="button" class="lg-x">Cancelar</button><button class="lg-ok">Entrar</button></div></form>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.classList.contains('lg-x')) ov.remove(); });
    const sair = ov.querySelector('#lg-sair');
    if (sair) sair.onclick = () => { limpa(); location.reload(); };
    const f = ov.querySelector('form');
    if (f) {
      f.n.focus();
      f.onsubmit = async (e) => {
        e.preventDefault(); const p = f.querySelector('.lg-e'); p.hidden = true;
        try { const j = await api('/api/login', { method: 'POST', body: JSON.stringify({ nome: f.n.value, senha: f.s.value }) }); localStorage.setItem(TK, j.token); localStorage.setItem(NM, j.nome); localStorage.setItem(RL, j.role); location.reload(); }
        catch (err) { p.textContent = err.message; p.hidden = false; }
      };
    }
  }
  window.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = `.lg-btn{position:absolute;top:calc(10px + env(safe-area-inset-top,0px));right:12px;z-index:5;border:1px solid rgba(255,255,255,.5);background:rgba(0,0,0,.25);color:#fff;border-radius:999px;padding:6px 12px;font:600 .82rem system-ui,sans-serif;cursor:pointer}
.pitch{position:relative}.lg-ov{position:fixed;inset:0;background:rgba(0,0,0,.45);display:grid;place-items:center;z-index:100;padding:16px}
.lg{background:#fff;color:#16211a;border-radius:14px;padding:18px;width:100%;max-width:340px;font-family:system-ui,sans-serif}.lg h3{margin:0 0 10px}
.lg label{display:block;font-weight:600;font-size:.85rem;margin:8px 0}.lg input{display:block;width:100%;margin-top:4px;padding:10px;border:1px solid #c9d3c7;border-radius:10px;font-size:1rem}
.lg-b{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}.lg-b button{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}.lg-x{background:#e8ede6}.lg-ok{background:#1d6a3a;color:#fff}.lg-e{color:#b3261e;font-size:.88rem;margin:6px 0 0}`;
    document.head.appendChild(st);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'lg-btn'; b.textContent = ED ? '👤 ' + NOME : 'Entrar';
    b.onclick = painel;
    (document.querySelector('.pitch') || document.body).appendChild(b);
  });
})();

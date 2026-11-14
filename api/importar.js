import { pipeline, COLECOES, chave } from '../lib/db.js';
import { isAdmin } from '../lib/auth.js';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

// Recebe partes do backup: { colecoes: { nome: { id: dados } }, fotos: { id: { t, b } } }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' });
  if (!(await isAdmin(req))) return res.status(403).json({ erro: 'Só administradores.' });
  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const cmds = [];
    for (const [c, docs] of Object.entries(b.colecoes || {})) {
      if (!COLECOES.includes(c)) continue;
      for (const [id, d] of Object.entries(docs)) cmds.push(['HSET', chave(c), id, JSON.stringify(d)]);
    }
    for (const [id, f] of Object.entries(b.fotos || {})) {
      if (/^[a-f0-9]{8,64}$/.test(id) && f && f.b) cmds.push(['SET', 'foto:' + id, JSON.stringify({ t: f.t || 'image/jpeg', b: f.b })]);
    }
    for (let i = 0; i < cmds.length; i += 50) await pipeline(cmds.slice(i, i + 50));
    res.status(200).json({ ok: true, gravados: cmds.length });
  } catch (e) {
    res.status(500).json({ erro: e.message || 'Erro ao importar.' });
  }
}

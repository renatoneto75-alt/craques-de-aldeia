import { redis, COLECOES, PRIVADAS, chave } from '../lib/db.js';
import { editor } from '../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const ed = editor(req);
  try {
    if (req.method === 'GET') {
      const { c, id } = req.query;
      if (!COLECOES.includes(c)) return res.status(400).json({ erro: 'Coleção inválida.' });
      if (PRIVADAS.includes(c) && !ed) {
        if (id) return res.status(200).json({ id, data: null });
        return res.status(403).json({ erro: 'Sem permissão.' });
      }
      if (id) {
        const v = await redis('HGET', chave(c), id);
        return res.status(200).json({ id, data: v ? JSON.parse(v) : null });
      }
      const flat = (await redis('HGETALL', chave(c))) || [];
      const docs = [];
      for (let i = 0; i < flat.length; i += 2) docs.push({ id: flat[i], data: JSON.parse(flat[i + 1]) });
      return res.status(200).json({ docs });
    }
    if (req.method === 'POST') {
      if (!ed) return res.status(403).json({ erro: 'Entre como organizador para salvar.', code: 'invalid_argument' });
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      const { op, c, id, data } = b;
      if (!COLECOES.includes(c) || !id || !/^[\w\-.:@+~]{1,200}$/.test(id)) return res.status(400).json({ erro: 'Documento inválido.' });
      if (op === 'delete') { await redis('HDEL', chave(c), id); return res.status(200).json({ ok: true }); }
      if (!data || typeof data !== 'object') return res.status(400).json({ erro: 'Sem dados.' });
      let novo = data;
      if (op === 'update') {
        const v = await redis('HGET', chave(c), id);
        if (!v) return res.status(404).json({ erro: 'Documento não existe.', code: 'not_found' });
        novo = { ...JSON.parse(v), ...data };
      } else if (op !== 'set') return res.status(400).json({ erro: 'Operação inválida.' });
      await redis('HSET', chave(c), id, JSON.stringify(novo));
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ erro: 'Método não suportado.' });
  } catch (e) {
    res.status(500).json({ erro: e.message || 'Erro no banco.' });
  }
}

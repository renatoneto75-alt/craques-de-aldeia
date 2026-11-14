import crypto from 'node:crypto';
import { redis } from '../lib/db.js';
import { isAdmin } from '../lib/auth.js';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const id = String(req.query.id || '');
      if (!/^[a-f0-9]{8,64}$/.test(id)) return res.status(400).end();
      const v = await redis('GET', 'foto:' + id);
      if (!v) return res.status(404).end();
      const { t, b } = JSON.parse(v);
      res.setHeader('Content-Type', t || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(Buffer.from(b, 'base64'));
    }
    if (!isAdmin(req)) return res.status(403).json({ erro: 'Só administradores.', code: 'invalid_argument' });
    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
      if (!b.b || !/^image\/(jpeg|png|webp|gif)$/.test(b.t || '')) return res.status(400).json({ erro: 'Imagem inválida.' });
      if (b.b.length > 3_000_000) return res.status(413).json({ erro: 'Foto grande demais.', code: 'too_large' });
      const id = crypto.randomBytes(16).toString('hex');
      await redis('SET', 'foto:' + id, JSON.stringify({ t: b.t, b: b.b }));
      return res.status(200).json({ id, url: '/api/foto?id=' + id });
    }
    if (req.method === 'DELETE') {
      await redis('DEL', 'foto:' + String(req.query.id || ''));
      return res.status(200).json({ ok: true });
    }
    res.status(405).end();
  } catch (e) {
    res.status(500).json({ erro: e.message || 'Erro.' });
  }
}

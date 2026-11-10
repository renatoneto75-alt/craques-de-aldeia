import { login } from '../lib/auth.js';
export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Use POST.' });
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const r = login(b.nome, b.senha);
  if (!r) return res.status(401).json({ erro: 'Nome ou senha errados.' });
  res.status(200).json(r);
}

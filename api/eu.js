import { quem } from '../lib/auth.js';
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const q = quem(req);
  if (!q) return res.status(401).json({ erro: 'Sessão expirada.' });
  res.status(200).json(q);
}

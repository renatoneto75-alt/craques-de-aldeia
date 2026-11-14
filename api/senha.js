import { quem, usuarios, registro, trocaSenha, resetaSenha } from '../lib/auth.js';

// GET  → (administrador) lista quem tem acesso e se já trocou a senha
// POST { atual, nova }  → troca a própria senha
// POST { resetar: nome } → (administrador) volta a pessoa para a senha inicial
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const q = await quem(req);
    if (!q) return res.status(401).json({ erro: 'Entre de novo.' });
    if (req.method === 'GET') {
      if (q.role !== 'admin') return res.status(403).json({ erro: 'Só administradores.' });
      const l = [];
      for (const u of usuarios()) l.push({ nome: u.nome, role: u.role, propria: !!(await registro(u.nome)).hash });
      return res.status(200).json({ usuarios: l });
    }
    if (req.method !== 'POST') return res.status(405).end();
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    if (b.resetar) {
      if (q.role !== 'admin') return res.status(403).json({ erro: 'Só administradores.' });
      if (b.resetar === q.nome) return res.status(400).json({ erro: 'Para a sua senha, use "Trocar minha senha".' });
      const r = await resetaSenha(b.resetar);
      return res.status(r.ok ? 200 : 400).json(r);
    }
    const r = await trocaSenha(q, b.atual, b.nova);
    res.status(r.ok ? 200 : 400).json(r);
  } catch (e) {
    res.status(500).json({ erro: e.message || 'Erro.' });
  }
}

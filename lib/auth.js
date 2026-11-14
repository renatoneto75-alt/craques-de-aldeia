import crypto from 'node:crypto';
import { redis } from './db.js';
// Dois níveis de acesso, cadastrados nas variáveis da Vercel (formato "Nome:senha;Nome2:senha2"):
//   EDITORES    → administradores: cadastram jogadores, notas, fotos, regras, avaliações e tudo mais
//   OPERADORES  → tiram os times (sorteio e torneio) e lançam o Scout
// A senha da variável é a senha inicial. Cada um pode trocar a sua no app; a nova fica no banco
// embaralhada (scrypt) na chave "senha:<nome>", com um número de versão que derruba sessões antigas.
const EDIT = process.env.EDITORES || '';
const OPER = process.env.OPERADORES || '';
const lista = (raw, role) => raw.split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
  const i = s.indexOf(':');
  return { nome: s.slice(0, i).trim(), senha: s.slice(i + 1), role };
}).filter((e) => e.nome && e.senha);
export const usuarios = () => [...lista(EDIT, 'admin'), ...lista(OPER, 'operador')];

export const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const assina = (p) => crypto.createHmac('sha256', 'craques|' + EDIT + '|' + OPER).update(p).digest('base64url');
const igual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const chave = (nome) => 'senha:' + norm(nome);
const hash = (senha, salt) => crypto.scryptSync(String(senha), salt, 32).toString('base64');

export async function registro(nome) {
  try { const v = await redis('GET', chave(nome)); return v ? JSON.parse(v) : { v: 0 }; } catch { return { v: 0 }; }
}
async function confere(u, senha) {
  const r = await registro(u.nome);
  const ok = r.hash ? igual(hash(senha, r.salt), r.hash) : igual(String(senha || ''), u.senha);
  return ok ? r : null;
}
const emite = (u, v) => { const p = `${u.nome}|${u.role}|${v}`; return Buffer.from(p).toString('base64url') + '.' + assina(p); };

export async function login(nome, senha) {
  for (const u of usuarios().filter((x) => norm(x.nome) === norm(nome))) {
    const r = await confere(u, senha);
    if (r) return { nome: u.nome, role: u.role, token: emite(u, r.v || 0) };
  }
  return null;
}

// Retorna { nome, role } de quem está logado, ou null.
export async function quem(req) {
  const [b, s] = String(req.headers['x-token'] || '').split('.');
  if (!b || !s) return null;
  let p;
  try { p = Buffer.from(b, 'base64url').toString(); } catch { return null; }
  if (!igual(s, assina(p))) return null;
  const [nome, role, v] = p.split('|');
  if (!usuarios().some((x) => x.nome === nome && x.role === role)) return null;
  const r = await registro(nome);
  return String(r.v || 0) === String(v || 0) ? { nome, role } : null;
}
export const isAdmin = async (req) => (await quem(req))?.role === 'admin';

export async function trocaSenha(q, atual, nova) {
  const u = usuarios().find((x) => x.nome === q.nome && x.role === q.role);
  if (!u) return { erro: 'Usuário não encontrado.' };
  const r = await confere(u, atual);
  if (!r) return { erro: 'Senha atual errada.' };
  if (String(nova || '').length < 6) return { erro: 'A nova senha precisa ter pelo menos 6 caracteres.' };
  const salt = crypto.randomBytes(16).toString('base64'), v = (r.v || 0) + 1;
  await redis('SET', chave(u.nome), JSON.stringify({ v, salt, hash: hash(nova, salt), em: new Date().toISOString() }));
  return { ok: true, token: emite(u, v) };
}
export async function resetaSenha(nome) {
  const u = usuarios().find((x) => x.nome === nome);
  if (!u) return { erro: 'Usuário não encontrado.' };
  const r = await registro(u.nome);
  await redis('SET', chave(u.nome), JSON.stringify({ v: (r.v || 0) + 1, reset: new Date().toISOString() }));
  return { ok: true };
}

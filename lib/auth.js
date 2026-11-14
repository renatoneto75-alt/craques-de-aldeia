import crypto from 'node:crypto';
// Dois níveis de acesso, cadastrados nas variáveis da Vercel (formato "Nome:senha;Nome2:senha2"):
//   EDITORES    → administradores: cadastram jogadores, notas, fotos, regras, avaliações e tudo mais
//   OPERADORES  → tiram os times (sorteio e torneio) e lançam o Scout
const EDIT = process.env.EDITORES || '';
const OPER = process.env.OPERADORES || '';
const lista = (raw, role) => raw.split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
  const i = s.indexOf(':');
  return { nome: s.slice(0, i).trim(), senha: s.slice(i + 1), role };
}).filter((e) => e.nome && e.senha);
export const usuarios = () => [...lista(EDIT, 'admin'), ...lista(OPER, 'operador')];

const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const assina = (p) => crypto.createHmac('sha256', 'craques|' + EDIT + '|' + OPER).update(p).digest('base64url');
const igual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function login(nome, senha) {
  const e = usuarios().find((x) => norm(x.nome) === norm(nome) && igual(String(senha || ''), x.senha));
  if (!e) return null;
  const p = e.nome + '|' + e.role;
  return { nome: e.nome, role: e.role, token: Buffer.from(p).toString('base64url') + '.' + assina(p) };
}

// Retorna { nome, role } de quem está logado, ou null.
export function quem(req) {
  const [b, s] = String(req.headers['x-token'] || '').split('.');
  if (!b || !s) return null;
  let p;
  try { p = Buffer.from(b, 'base64url').toString(); } catch { return null; }
  const [nome, role] = p.split('|');
  if (!usuarios().some((x) => x.nome === nome && x.role === role)) return null;
  return igual(s, assina(p)) ? { nome, role } : null;
}
export const isAdmin = (req) => quem(req)?.role === 'admin';

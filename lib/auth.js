import crypto from 'node:crypto';
// EDITORES na Vercel: "Renato:senha1;Fulano:senha2;Ciclano:senha3"
const RAW = process.env.EDITORES || '';
export const editores = () =>
  RAW.split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
    const i = s.indexOf(':');
    return { nome: s.slice(0, i).trim(), senha: s.slice(i + 1) };
  }).filter((e) => e.nome && e.senha);

const norm = (s) => String(s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const assina = (nome) => crypto.createHmac('sha256', 'craques|' + RAW).update(nome).digest('base64url');
const igual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function login(nome, senha) {
  const e = editores().find((x) => norm(x.nome) === norm(nome));
  if (!e || !igual(String(senha || ''), e.senha)) return null;
  return { nome: e.nome, token: Buffer.from(e.nome).toString('base64url') + '.' + assina(e.nome) };
}

export function editor(req) {
  const t = String(req.headers['x-token'] || '');
  const [b, s] = t.split('.');
  if (!b || !s) return null;
  let nome;
  try { nome = Buffer.from(b, 'base64url').toString(); } catch { return null; }
  if (!editores().some((x) => x.nome === nome)) return null;
  return igual(s, assina(nome)) ? nome : null;
}

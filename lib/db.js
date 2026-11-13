// Upstash Redis via API REST (integração da Vercel). Sem dependências.
const URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function call(path, body) {
  if (!URL || !TOKEN) throw new Error('Banco de dados não configurado na Vercel.');
  const r = await fetch(URL + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (Array.isArray(j)) {
    const e = j.find((x) => x.error);
    if (e) throw new Error(e.error);
    return j.map((x) => x.result);
  }
  if (j.error) throw new Error(j.error);
  return j.result;
}
export const redis = (...cmd) => call('', cmd);
export const pipeline = (cmds) => (cmds.length ? call('/pipeline', cmds) : []);

export const COLECOES = ['jogadores', 'peladas', 'rodada', 'torneio', 'sumulas', 'avaliacoes', 'avalsnap'];
export const PRIVADAS = ['avaliacoes', 'avalsnap'];
export const chave = (c) => 'col:' + c;

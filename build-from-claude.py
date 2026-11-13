"""Gera public/index.html (Vercel) a partir do index.html do app no Claude."""
import sys
src, dst = sys.argv[1], sys.argv[2]
s = open(src).read()
def rep(a, b):
    global s
    assert a in s, a[:60]
    s = s.replace(a, b)
rep('<title>Craques de Aldeia</title>', '<title>Craques de Aldeia</title>\n<link rel="manifest" href="/manifest.json"><link rel="icon" href="/icone-192.png"><link rel="apple-touch-icon" href="/icone-192.png"><meta name="theme-color" content="#1d6a3a">\n<script src="/shim.js"></script>')
rep('src="/_blob/${esc(p.foto)}"', 'src="/api/foto?id=${esc(p.foto)}"')
rep('Você está vendo em modo leitura. Para cadastrar e sortear, peça acesso de edição a quem compartilhou a página.', 'Você está vendo em modo leitura. Organizadores: toquem em <b>Entrar</b>, no alto da página, para cadastrar e sortear.')
rep("'Abra esta página no Claude para usar o elenco compartilhado.'", "'Não consegui carregar o elenco.'")
s = s.replace("toast('Abra a página no Claude para salvar.')", "toast('Entre como organizador para salvar.')").replace("toast('Abra a página no Claude para importar.')", "toast('Entre como organizador para importar.')")
s = s.replace("Se o botão não abrir a galeria no app do Claude, abra o link pelo Chrome ou Safari.", "")
s = '\n'.join(l for l in s.split('\n') if 'claude:viewport-fit-sides' not in l)
assert 'Claude' not in s, 'sobrou referência ao Claude'
open(dst, 'w').write(s)
print('ok', len(s))

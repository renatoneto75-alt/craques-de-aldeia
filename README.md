# Craques de Aldeia

App da pelada: elenco, sorteio de times, torneio, estatuto e avaliações.

- Todo mundo com o link vê tudo (menos as avaliações).
- Só organizadores editam: botão **Entrar** no topo.

## Configuração na Vercel
1. Storage → Upstash Redis (grátis) ligado a este projeto.
2. Variável `EDITORES` com os organizadores no formato `Nome:senha;Nome2:senha2;Nome3:senha3`.
3. Para carregar os dados: entre como organizador e abra `/importar.html`.

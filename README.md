# Craques de Aldeia

App da pelada: elenco, sorteio de times, torneio, estatuto e avaliações.

- Todo mundo com o link vê tudo (menos as avaliações).
- Dois níveis de acesso, pelo botão **Entrar** no topo:
  - **Administradores** (`EDITORES`): cadastram jogadores, notas, fotos, regras e veem as avaliações.
  - **Operadores** (`OPERADORES`): tiram os times, mexem no torneio e lançam o Scout.

## Configuração na Vercel
1. Storage → Upstash Redis (grátis) ligado a este projeto.
2. Variáveis `EDITORES` (administradores) e `OPERADORES` (times e Scout), no formato `Nome:senha;Nome2:senha2`.
3. Para carregar os dados: entre como organizador e abra `/importar.html`.

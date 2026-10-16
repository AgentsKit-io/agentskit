# Atualize o brain

- Leia `CONVENTIONS.md` e a nota antes de editar. Trabalhe em PT-BR; não copie segredos nem dados de clientes.
- Execute `node scripts/refresh-brain.mjs` na raiz; use `--root <pasta>` para outros clones. Use `--fetch` se autorizado a buscar `origin` e comparar com `origin/main`.
- Para cada nota desatualizada, leia o histórico das `fontes` e os fontes atuais. Compare conteúdo e comportamento, não apenas nomes de arquivos.
- Atualize o conteúdo, `commits` de todos os repos usados e `verificado-em`. Registre incertezas em `Dúvidas abertas.md`; não invente operação de produção.
- Preserve nomes únicos e backlinks. Use os modelos de `_templates/`.
- Execute `node scripts/check-links.mjs`, `node --test scripts/vault.test.mjs` e `node scripts/refresh-brain.mjs --strict`. Resolva links, colisões, falhas e revisões pendentes no escopo autorizado.
- Revise o diff e faça commit `docs(<repo>): atualiza notas`. Não faça push ou PR sem autorização.

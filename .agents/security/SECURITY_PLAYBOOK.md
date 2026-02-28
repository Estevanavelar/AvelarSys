## Security Playbook para suas aplicações

Este playbook organiza as skills da pasta `security` em uma ordem prática para **endurecer suas aplicações** (API, banco de dados e frontend).

Skills usadas:

- `postgres-best-practices`
- `security-scanning-security-dependencies`
- `security-scanning-security-sast`
- `sast-configuration`
- `security-scanning-security-hardening`
- `secrets-management`
- `sql-injection-testing`
- `xss-html-injection`
- `html-injection-testing`
- `file-path-traversal`
- `file-uploads`
- `top-web-vulnerabilities`

---

## 1. Fundamentos e visão geral

- **`top-web-vulnerabilities`**  
  Leia primeiro para ter uma visão OWASP-style das principais falhas (injeção, XSS, auth quebrada, etc.).  
  Use essa skill como “mapa mental” do que você quer evitar em TODO o seu stack.

---

## 2. Banco de dados (Postgres)

- **`postgres-best-practices`**  
  - Revise:
    - Modelagem de tabelas e índices.
    - Uso de RLS (Row Level Security) e privilégios mínimos (`SELECT/INSERT/UPDATE` só onde fizer sentido).
  - Aplique as recomendações de:
    - Arquivos `rules/security-*.md` (RLS, privilégios, etc.).
  - Use quando:
    - Criar/alterar tabelas.
    - Revisar queries pesadas ou sensíveis (ex: relatórios financeiros, dados pessoais).

---

## 3. Gestão de segredos e configuração

- **`secrets-management`**  
  - Defina onde ficam:
    - Credenciais de banco.
    - Tokens de API (GitHub, Neon, etc.).
    - Chaves de serviços externos.
  - Objetivos:
    - Nada de segredos em `git` (código, histórico ou logs).
    - Centralizar segredos (ex.: `.env` + vault/secret manager adequado).

- **`security-scanning-security-dependencies`**  
  - Rode para:
    - Identificar libs vulneráveis nas suas aplicações (`npm`, `pip`, etc.).
    - Priorizar atualizações de segurança.

---

## 4. Análise estática e hardening

- **`sast-configuration`** + **`security-scanning-security-sast`**  
  - Use para:
    - Configurar e rodar SAST (Static Application Security Testing) nas suas bases.
    - Achar padrões perigosos no código (SQL montado na mão, uso inseguro de entrada do usuário, etc.).

- **`security-scanning-security-hardening`**  
  - Aplique para:
    - Ajustar configurações de servidor, containers, headers HTTP, TLS, etc.
    - Criar um checklist de hardening mínimo para seus serviços (web/API).

---

## 5. Segurança de API e backend (entrada de dados)

Mesmo que você não use uma skill específica de “API security” aqui, você combina:

- **`sql-injection-testing`**
- **`file-path-traversal`**
- **`file-uploads`**

Passos:

1. **`sql-injection-testing`**  
   - Revise endpoints que montam queries:
     - Garanta uso de ORM ou parâmetros preparados (bind parameters).
     - Evite concatenar strings de SQL com entrada de usuário.
   - Use a skill para gerar casos de teste de injeção contra suas rotas mais críticas.

2. **`file-path-traversal`**  
   - Aplique em:
     - Rotas que leem arquivos do disco.
     - Qualquer funcionalidade que receba paths de usuário (mesmo indiretamente).
   - Objetivos:
     - Travar acesso fora das pastas esperadas.
     - Normalizar paths e validar input.

3. **`file-uploads`**  
   - Use para:
     - Definir regras de upload (tamanho máximo, tipos permitidos, pasta isolada).
     - Criar validações de mimetype/assinatura.
     - Desabilitar execução de arquivos enviados (ex.: nunca servir uploads como código).

---

## 6. Segurança de frontend / UI

- **`xss-html-injection`**
- **`html-injection-testing`**

Passos:

1. **`xss-html-injection`**  
   - Revise:
     - Pontos onde você injeta HTML vindo do backend ou do usuário (ex.: `dangerouslySetInnerHTML`, templates, campos ricos).
   - Use a skill para:
     - Gerar payloads de XSS e testar telas críticas (login, PDV, dashboards).

2. **`html-injection-testing`**  
   - Foca em:
     - Casos onde HTML passa “cru” do backend para o front.
   - Objetivo:
     - Garantir encoding adequado (`escape` de caracteres especiais).
     - Separar dados de apresentação (não misturar dado do usuário com markup diretamente).

---

## 7. Ciclo contínuo de segurança

Sugestão de rotina usando essas skills:

1. **A cada grande feature**:
   - Rodar `security-scanning-security-dependencies`.
   - Revisar endpoints novos com `sql-injection-testing`, `xss-html-injection` e `file-uploads`.

2. **A cada release importante**:
   - Rodar SAST (`sast-configuration` + `security-scanning-security-sast`).
   - Revisar banco com `postgres-best-practices` (especialmente permissões).
   - Atualizar checklist de hardening com `security-scanning-security-hardening`.

3. **Periodicamente (mensal/trimestral)**:
   - Repassar `top-web-vulnerabilities` como revisão de mentalidade.
   - Rodar um mini “mutirão” de `secrets-management` para garantir que nada novo vazou para o código.

---

## Como usar este playbook no dia a dia

- Quando estiver **codando uma feature**: pense em qual seção se aplica (banco, API, front) e abra a skill correspondente.
- Quando estiver **fazendo revisão de código**: use a combinação `top-web-vulnerabilities` + SAST + `sql-injection-testing`/`xss-html-injection` como checklist mental.
- Quando estiver **planejando arquitetura/infra**: combine este playbook com as skills de arquitetura e observabilidade para desenhar uma solução segura de ponta a ponta.


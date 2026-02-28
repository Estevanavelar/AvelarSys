# Especificação de Autenticação Híbrida: Google como Chave de Acesso (CPF)

Este documento define a arquitetura técnica e de UX para a implementação do login via Google no ecossistema Avelar Company. 

**Conceito Central:** O Google não substitui o CPF como identificador do usuário. Ele atua apenas como uma **"Chave Digital Segura"** para autenticar um CPF existente. O e-mail do usuário não é exposto na interface e não é usado como chave primária.

---

## 1. Arquitetura Lógica (Account Linking)

O sistema opera com base no vínculo entre um `Google ID` (sub) e um `CPF` no banco de dados da Avelar.

### Fluxo A: Usuário Já Vinculado (Login Rápido)
1.  Usuário clica em **"Acessar com Google"**.
2.  Google retorna o token de identidade.
3.  Backend verifica: `SELECT cpf FROM users WHERE google_id = 'GOOGLE_SUB_123'`.
4.  **Resultado:** Encontrado CPF `123.456.789-00`.
5.  **Ação:** Sistema gera o token de sessão (JWT) do AvelarSys para este CPF.
6.  **UX:** O usuário entra direto no Dashboard.

### Fluxo B: Primeiro Acesso / Vinculação
1.  Usuário clica em **"Acessar com Google"**.
2.  Backend verifica: `SELECT cpf FROM users WHERE google_id = 'GOOGLE_SUB_123'`.
3.  **Resultado:** Nenhum registro encontrado.
4.  **Ação:** Redireciona para tela intermediária: **"Vincular CPF"**.
5.  **Tela de Vínculo (UX):**
    *   Exibe: "Olá, [Nome do Google]. Para sua segurança, confirme seu CPF para vincular a esta conta."
    *   Input: `CPF` (com máscara).
    *   Input: `Senha Atual` (para provar que ele é dono do CPF) OU `Validação via WhatsApp` (código OTP).
6.  **Finalização:**
    *   Sistema valida as credenciais do CPF.
    *   Sistema grava: `UPDATE users SET google_id = 'GOOGLE_SUB_123' WHERE cpf = '...'`.
    *   Login realizado.

---

## 2. Estrutura de Dados

Não há necessidade de migrar a base para e-mail. Apenas adicionamos campos de suporte.

### Alteração na Tabela `Users` (ou equivalente):

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `cpf` | VARCHAR(14) | **Chave Primária (PK)**. Identificador imutável. |
| `google_id` | VARCHAR(255) | ID único do usuário no Google (campo `sub` do token). Indexado e Único. |
| `google_email` | VARCHAR(255) | (Opcional) Apenas para fins de recuperação de conta ou notificação, não usado para login. |
| `auth_provider`| ENUM | 'local', 'google', 'apple'. Indica o método principal de acesso. |

---

## 3. Especificação de UX/UI (Front-end)

Seguindo o `AVELAR_IDENTITY_STYLE_GUIDE.md`:

### O Botão de Login
Não utilizar o botão padrão do Google. Utilizar um componente customizado que siga o padrão "Monochrome Luxury".

**Estilo (Tailwind):**
```tsx
<button className="w-full relative flex items-center justify-center gap-3 bg-white dark:bg-zinc-100 text-gray-900 font-bold py-4 rounded-[1.5rem] border border-gray-200 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
  {/* Ícone G do Google Colorido */}
  <svg className="w-6 h-6" viewBox="0 0 24 24">...</svg>
  <span>Acessar com Google</span>
  
  {/* Badge de Segurança */}
  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full uppercase tracking-wider font-semibold">
    Seguro
  </span>
</button>
```

### Mensagens de Feedback
*   **Sucesso:** "Autenticado com Google. Acessando conta CPF ***.456.***-**..."
*   **Erro de Vínculo:** "Este Google ID ainda não está vinculado a um CPF. Por favor, identifique-se."

---

## 4. Segurança

1.  **Validação de Token no Backend:** O backend **NUNCA** deve confiar apenas no e-mail enviado pelo front. Ele deve receber o `id_token` do Google e validá-lo com a chave pública do Google para garantir que não foi forjado.
2.  **Imutabilidade do CPF:** O vínculo com o Google não permite alterar o CPF da conta. O CPF é a âncora da identidade.
3.  **Desvinculação:** O usuário deve ter a opção "Desconectar Google" no painel de perfil, setando `google_id = NULL`.

---

## 6. Guia Prático de Integração API (Google Console)

Para que essa autenticação funcione, você precisa configurar o "lado do Google" e conectar via código.

### Passo 1: Obter Credenciais no Google Cloud Console
1.  Acesse [Google Cloud Console](https://console.cloud.google.com/).
2.  Crie um Novo Projeto (ex: "Avelar Auth").
3.  Vá em **APIs & Services > Credentials**.
4.  Clique em **Create Credentials > OAuth client ID**.
5.  Tipo de Aplicação: **Web application**.
6.  **Authorized JavaScript origins:** Adicione seu domínio de frontend (ex: `https://app.avelarcompany.com.br` e `http://localhost:3000`).
7.  **Authorized redirect URIs:** Adicione a URL de callback (ex: `https://app.avelarcompany.com.br/api/auth/callback/google`).
8.  **Copie os códigos:** `Client ID` e `Client Secret`. Salve-os.

### Passo 2: Integração no Frontend (Next.js)
Não usaremos bibliotecas pesadas. Usaremos a biblioteca oficial leve `react-oauth/google` ou a API direta.

**Instalação:**
```bash
npm install @react-oauth/google
```

**Código do Provider (Layout):**
Envolva sua aplicação com o Provider no `src/app/layout.tsx`:
```tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

<GoogleOAuthProvider clientId="SEU_CLIENT_ID_DO_PASSO_1">
  {children}
</GoogleOAuthProvider>
```

**Código do Botão (Componente):**
```tsx
import { useGoogleLogin } from '@react-oauth/google';

const login = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    // Aqui você recebe o accessToken do Google
    // E envia para o SEU backend validar
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ token: tokenResponse.access_token })
    });
    // Tratar Fluxo A (Login) ou Fluxo B (Vínculo)
  },
});

<button onClick={() => login()}>Acessar com Google</button>
```

### Passo 3: Validação no Backend (API)
Seu backend precisa confirmar se o token é real.

**Endpoint:** `https://www.googleapis.com/oauth2/v3/userinfo`
**Método:** `GET`
**Header:** `Authorization: Bearer [TOKEN_RECEBIDO_DO_FRONT]`

**Exemplo de Chamada (Node.js/Python):**
```javascript
// O Backend chama o Google para ver quem é o dono do token
const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
  headers: { Authorization: `Bearer ${tokenDoFront}` }
});
const googleUser = await googleResponse.json();

// O Google devolve:
// {
//   "sub": "105782...", // ESTE É O GOOGLE_ID (Chave de Segurança)
//   "email": "cliente@gmail.com",
//   "name": "João Avelar",
//   "picture": "..."
// }

// AGORA O SEU BACKEND FAZ A MÁGICA:
// 1. Procura no banco: SELECT * FROM users WHERE google_id = googleUser.sub
// 2. Se achar -> Retorna Token Avelar (Login)
// 3. Se não achar -> Retorna { status: 'vincular_cpf', google_id: googleUser.sub }
```

## 8. Mapeamento de Implementação no AvAdmin (Backend)

Baseado na análise da estrutura atual do `AvAdmin`, a implementação deve seguir este roteiro específico:

### 8.1. Banco de Dados (SQLAlchemy & Alembic)
*   **Arquivo Alvo:** `backend/app/models/user.py`
*   **Alteração:** Adicionar a coluna `google_id` ao modelo `User`.
    ```python
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    ```
*   **Migração:** Criar nova revisão no Alembic (`backend/alembic/versions/`) para refletir essa mudança no PostgreSQL (Neon).

### 8.2. Schemas (Pydantic)
*   **Arquivo Alvo:** `backend/app/schemas/auth.py`
*   **Novos Modelos:**
    ```python
    class GoogleLoginRequest(BaseModel):
        token: str  # Token recebido do frontend
    
    class GoogleLinkRequest(BaseModel):
        token: str
        cpf: str
        password: str # Para confirmar identidade antes de vincular
    ```

### 8.3. Rotas de Autenticação
*   **Arquivo Alvo:** `backend/app/routes/auth.py`
*   **Novos Endpoints:**
    1.  `POST /api/auth/google`: Recebe o token, valida com o Google, verifica se o `google_id` existe no banco.
        *   Retorna `200 OK` (com JWT) se achar.
        *   Retorna `404 Not Found` (com payload `{ "action": "link_cpf" }`) se não achar.
    2.  `POST /api/auth/google/link`: Recebe Token + CPF + Senha. Valida a senha do CPF e salva o `google_id` no usuário.

### 8.4. Configuração de CORS
*   **Arquivo Alvo:** `backend/app/main.py`
*   **Verificação:** Garantir que o domínio do AppPortal (`https://app.avelarcompany.com.br`) esteja listado na variável de ambiente `CORS_ORIGINS` ou `backend/app/core/config.py`, para permitir que o frontend chame estes novos endpoints.

---

## 9. Conclusão da Especificação
*   **Nunca use o e-mail retornado pelo frontend:** Um usuário malicioso pode forjar o e-mail no JSON enviado. Sempre use o token e peça para o backend validar direto com o Google (Passo 3).
*   **Google ID (sub) é a Chave:** O e-mail do usuário pode mudar. O `sub` (Subject ID) do Google é eterno. Use o `sub` para vincular ao CPF.

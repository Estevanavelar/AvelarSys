# 🔐 Google Auth + WhatsApp Login Integration

**Documento de Integração:** Autenticação Google vinculada ao sistema de Login WhatsApp-First  
**Data:** 2026-01-25  
**Versão:** 1.0  
**Status:** Pronto para Implementação

---

## 📋 Sumário Executivo

Este documento descreve como integrar a autenticação via Google no fluxo existente de login WhatsApp-First do AvelarSys, mantendo o **CPF como identificador principal** e o **Google como método de acesso seguro alternativo**.

### Conceito Central
O Google não substitui o login CPF+Senha/WhatsApp, mas oferece um **atalho seguro** para usuários que já possuem conta. O CPF permanece como a âncora da identidade.

---

## 🏗️ Arquitetura da Integração

### Fluxos de Autenticação

```
┌─────────────────────────────────────────────────────────────┐
│                    🔐 Métodos de Login                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1️⃣  CPF + Senha (Local)                                    │
│      ↓                                                        │
│      └─→ Verifica credenciais → Gera JWT                    │
│                                                               │
│  2️⃣  CPF + WhatsApp OTP (Novo)                              │
│      ↓                                                        │
│      └─→ Envia código → Valida → Gera JWT                   │
│                                                               │
│  3️⃣  Google ID → CPF (Novo)                                 │
│      ↓                                                        │
│      ├─→ Usuário já vinculado → Login rápido                │
│      └─→ Usuário novo → Solicita CPF para vincular          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Fluxos Detalhados de Google Auth

### **Fluxo A: Usuário Já Vinculado (Login Rápido via Google)**

```
1. 👤 Usuário clica "Acessar com Google"
2. 🔵 Google abre diálogo de autenticação
3. ✅ Usuário autoriza (ou já está logado)
4. 📤 Frontend recebe Google Token (access_token)
5. 🔒 Frontend envia para: POST /api/auth/google
6. 🔍 Backend valida token com Google
7. 🗄️ Backend procura: SELECT cpf FROM users WHERE google_id = 'GOOGLE_SUB_123'
8. ✅ Resultado: Encontrado CPF 123.456.789-00
9. 🎫 Backend gera JWT do AvelarSys
10. 🚀 Usuário entra direto no Dashboard
```

**Tempo total:** ~2-3 segundos (sem necessidade de inserir CPF/Senha)

### **Fluxo B: Primeiro Acesso / Vinculação do Google**

```
1. 👤 Usuário clica "Acessar com Google"
2. 🔵 Google abre diálogo de autenticação
3. ✅ Usuário autoriza
4. 📤 Frontend recebe Google Token
5. 🔒 Frontend envia para: POST /api/auth/google
6. 🔍 Backend valida token com Google
7. 🗄️ Backend procura: SELECT cpf FROM users WHERE google_id = 'GOOGLE_SUB_123'
8. ❌ Resultado: Nenhum registro encontrado
9. 📱 Frontend redireciona para tela "Vincular CPF"
10. 👤 Exibe: "Olá, [Nome do Google]. Para acessar via Google, confirme seu CPF."
11. 📝 Usuário preenche:
    - CPF (mascarado)
    - Escolher validação:
      a) Senha (se já tem conta com CPF)
      b) Código WhatsApp (via WhatsApp OTP)
12. ✅ Backend valida credenciais
13. 🔗 Backend grava: UPDATE users SET google_id = 'GOOGLE_SUB_123' WHERE cpf = '...'
14. 🎫 Backend gera JWT
15. 🚀 Usuário entra no Dashboard
```

**Tempo total:** ~30-60 segundos (primeiro acesso apenas)

---

## 📱 Interface de Usuário (UX/UI)

### **Tela de Login (Atualizada)**

```
┌──────────────────────────────────────────┐
│           🚀 AvelarSys                   │
├──────────────────────────────────────────┤
│                                          │
│  📄 CPF ou CNPJ                          │
│  [________________]                      │
│                                          │
│  🔒 Senha                                │
│  [________________]                      │
│                                          │
│  [    🔑 ENTRAR    ]                     │
│                                          │
│  ────── OU ──────                        │
│                                          │
│  [  🔵 Acessar com Google  ] ✓ SEGURO   │
│  [  📱 Acessar com WhatsApp ]           │
│                                          │
│  Esqueceu a senha? | Primeiro acesso?   │
│                                          │
└──────────────────────────────────────────┘
```

### **Botão "Acessar com Google"**

```tsx
<button className="w-full relative flex items-center justify-center gap-3 
  bg-white dark:bg-zinc-100 text-gray-900 font-bold py-4 
  rounded-[1.5rem] border border-gray-200 transition-all duration-300 
  hover:scale-[1.02] hover:shadow-lg">
  
  {/* Ícone G do Google Colorido */}
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    {/* Google G icon */}
  </svg>
  
  <span>Acessar com Google</span>
  
  {/* Badge de Segurança */}
  <span className="absolute right-4 top-1/2 -translate-y-1/2 
    text-[10px] bg-green-100 text-green-600 px-2 py-1 
    rounded-full uppercase tracking-wider font-semibold">
    ✓ Seguro
  </span>
</button>
```

### **Tela de Vinculação de CPF (Novo acesso via Google)**

```
┌──────────────────────────────────────────┐
│      🔐 Vincular CPF ao Google           │
├──────────────────────────────────────────┤
│                                          │
│  👤 Olá, João Silva!                     │
│  (Nome vindo do Google)                  │
│                                          │
│  Para acessar via Google, confirme seu   │
│  CPF vinculado ao AvelarSys.             │
│                                          │
│  📄 CPF                                  │
│  [___.___.___-__]                        │
│                                          │
│  Validar com:                            │
│                                          │
│  [✓] Senha (tenho conta)                 │
│  🔒 Senha: [________________]            │
│                                          │
│       OU                                 │
│                                          │
│  [ ] Código WhatsApp (sem conta)         │
│  📱 Você receberá um código no WhatsApp  │
│                                          │
│  [    🔗 VINCULAR CPF    ]               │
│  [    ✕ Cancelar        ]               │
│                                          │
└──────────────────────────────────────────┘
```

---

## 💻 Implementação Técnica

### **Backend - Arquitetura de Dados**

#### 1. Modelo de Usuário (SQLAlchemy)

```python
# backend/app/models/user.py
from sqlalchemy import Column, String, DateTime, Boolean

class User(Base):
    __tablename__ = "users"
    
    # Campos existentes
    cpf = Column(String(14), primary_key=True, nullable=False, unique=True)
    password_hash = Column(String(255), nullable=True)
    whatsapp = Column(String(20), nullable=True)
    full_name = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    
    # Novos campos para Google Auth
    google_id = Column(String(255), nullable=True, unique=True, index=True)
    google_email = Column(String(255), nullable=True)
    google_picture = Column(String(500), nullable=True)
    auth_provider = Column(
        String(20), 
        nullable=False, 
        default='local',
        comment='local, google, apple'
    )
    google_linked_at = Column(DateTime, nullable=True)
```

#### 2. Schemas Pydantic (Validação)

```python
# backend/app/schemas/auth.py
from pydantic import BaseModel, Field

class GoogleLoginRequest(BaseModel):
    """Solicitação de login via Google"""
    token: str = Field(..., description="Access token do Google")

class GoogleLinkRequest(BaseModel):
    """Solicitação para vincular Google a um CPF existente"""
    token: str = Field(..., description="Access token do Google")
    cpf: str = Field(..., description="CPF do usuário")
    password: str | None = Field(None, description="Senha (se já tem conta)")
    whatsapp_code: str | None = Field(None, description="Código OTP (se novo)")

class GoogleAuthResponse(BaseModel):
    """Resposta de autenticação Google"""
    status: str  # 'logged_in' ou 'require_linking'
    jwt_token: str | None = None
    google_id: str | None = None
    cpf: str | None = None
    action: str | None = None  # 'link_cpf' ou 'login'
```

#### 3. Rotas de Autenticação (FastAPI)

```python
# backend/app/routes/auth.py
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
import httpx

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Configuração
GOOGLE_API_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")

@router.post("/google")
async def google_login(req: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Login via Google - 2 fluxos:
    1. Usuário já tem google_id vinculado → Login rápido
    2. Google ID novo → Solicita CPF para vincular
    """
    try:
        # 1. Validar token com Google
        async with httpx.AsyncClient() as client:
            google_response = await client.get(
                GOOGLE_API_URL,
                headers={"Authorization": f"Bearer {req.token}"}
            )
        
        if google_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token do Google inválido"
            )
        
        google_user = google_response.json()
        google_id = google_user.get("sub")  # ID único do Google
        google_email = google_user.get("email")
        google_name = google_user.get("name")
        
        # 2. Procurar no banco por este Google ID
        user = db.query(User).filter(User.google_id == google_id).first()
        
        if user:
            # FLUXO A: Usuário já vinculado → Login rápido
            jwt_token = create_jwt(user.cpf)
            return JSONResponse({
                "status": "logged_in",
                "jwt_token": jwt_token,
                "cpf": user.cpf,
                "action": "login"
            }, status_code=200)
        else:
            # FLUXO B: Google ID novo → Pedir CPF para vincular
            return JSONResponse({
                "status": "require_linking",
                "google_id": google_id,
                "google_email": google_email,
                "google_name": google_name,
                "action": "link_cpf"
            }, status_code=200)
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar Google login: {str(e)}"
        )

@router.post("/google/link")
async def google_link(req: GoogleLinkRequest, db: Session = Depends(get_db)):
    """
    Vincular Google ID a um CPF existente ou novo
    """
    try:
        # 1. Validar token Google novamente (segurança)
        async with httpx.AsyncClient() as client:
            google_response = await client.get(
                GOOGLE_API_URL,
                headers={"Authorization": f"Bearer {req.token}"}
            )
        
        if google_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token do Google inválido"
            )
        
        google_user = google_response.json()
        google_id = google_user.get("sub")
        
        # 2. Procurar usuário pelo CPF
        user = db.query(User).filter(User.cpf == req.cpf).first()
        
        if not user:
            # Se não existe, considerar como novo usuário
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CPF não encontrado"
            )
        
        # 3. Validar credenciais (senha OU código WhatsApp)
        if req.password:
            # Validar com senha
            if not verify_password(req.password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Senha incorreta"
                )
        elif req.whatsapp_code:
            # Validar com código WhatsApp OTP
            if not verify_whatsapp_code(user.whatsapp, req.whatsapp_code):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Código WhatsApp inválido"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Forneça senha ou código WhatsApp"
            )
        
        # 4. Vincular Google ID ao usuário
        user.google_id = google_id
        user.google_email = google_user.get("email")
        user.google_picture = google_user.get("picture")
        user.auth_provider = "google"
        user.google_linked_at = datetime.now(timezone.utc)
        
        db.commit()
        
        # 5. Gerar JWT e retornar
        jwt_token = create_jwt(user.cpf)
        return JSONResponse({
            "status": "logged_in",
            "jwt_token": jwt_token,
            "cpf": user.cpf,
            "action": "link"
        }, status_code=200)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao vincular Google: {str(e)}"
        )
```

### **Frontend - Implementação (Next.js/React)**

```tsx
// AppPortal/src/components/LoginForm.tsx
import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [requiresLinking, setRequiresLinking] = useState(false);
  const [googleData, setGoogleData] = useState(null);

  const handleGoogleLoginSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenResponse.access_token })
      });

      const data = await res.json();

      if (data.status === 'logged_in') {
        // FLUXO A: Login bem-sucedido
        localStorage.setItem('jwt_token', data.jwt_token);
        window.location.href = '/dashboard';
      } else if (data.status === 'require_linking') {
        // FLUXO B: Precisa vincular CPF
        setGoogleData(data);
        setRequiresLinking(true);
      }
    } catch (error) {
      console.error('Erro no Google login:', error);
      alert('Erro ao fazer login com Google');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleLoginSuccess,
    onError: () => alert('Erro ao fazer login com Google')
  });

  if (requiresLinking) {
    return <GoogleLinkingForm googleData={googleData} />;
  }

  return (
    <div className="space-y-4">
      {/* Métodos de Login */}
      <button
        onClick={() => googleLogin()}
        disabled={loading}
        className="w-full relative flex items-center justify-center gap-3 
          bg-white dark:bg-zinc-100 text-gray-900 font-bold py-4 
          rounded-[1.5rem] border border-gray-200 transition-all duration-300 
          hover:scale-[1.02] hover:shadow-lg disabled:opacity-50"
      >
        {/* Google Icon */}
        <svg className="w-6 h-6" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span>Acessar com Google</span>
        <span className="absolute right-4 text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded-full font-semibold">
          ✓ Seguro
        </span>
      </button>

      {/* Outros métodos */}
      <div className="text-center text-gray-500 text-sm">OU</div>
      {/* CPF/Senha, WhatsApp ... */}
    </div>
  );
}

// Componente para vincular CPF
function GoogleLinkingForm({ googleData }) {
  const [cpf, setCpf] = useState('');
  const [validationMethod, setValidationMethod] = useState('password');
  const [password, setPassword] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLink = async () => {
    setLoading(true);
    try {
      const body = {
        token: googleData.google_id,
        cpf: cpf,
        ...(validationMethod === 'password' && { password }),
        ...(validationMethod === 'whatsapp' && { whatsapp_code: whatsappCode })
      };

      const res = await fetch('/api/auth/google/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (data.status === 'logged_in') {
        localStorage.setItem('jwt_token', data.jwt_token);
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Erro ao vincular:', error);
      alert('Erro ao vincular CPF');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
      <h2 className="text-2xl font-bold">🔐 Vincular CPF ao Google</h2>
      
      <p className="text-gray-600">
        Olá, <strong>{googleData.google_name}</strong>!
      </p>

      <p className="text-gray-700">
        Para acessar via Google, confirme seu CPF vinculado ao AvelarSys.
      </p>

      {/* CPF Input */}
      <input
        type="text"
        placeholder="CPF (___.___.___-__)"
        value={cpf}
        onChange={(e) => setCpf(e.target.value)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg"
      />

      {/* Validation Method Selection */}
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={validationMethod === 'password'}
            onChange={() => setValidationMethod('password')}
          />
          <span>Validar com Senha</span>
        </label>
        
        {validationMethod === 'password' && (
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg"
          />
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={validationMethod === 'whatsapp'}
            onChange={() => setValidationMethod('whatsapp')}
          />
          <span>Validar com Código WhatsApp</span>
        </label>
        
        {validationMethod === 'whatsapp' && (
          <>
            <p className="text-sm text-gray-600">
              📱 Você receberá um código no seu WhatsApp
            </p>
            <input
              type="text"
              placeholder="Código (6 dígitos)"
              value={whatsappCode}
              onChange={(e) => setWhatsappCode(e.target.value.slice(0, 6))}
              maxLength="6"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg"
            />
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleLink}
          disabled={loading || !cpf}
          className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          🔗 Vincular CPF
        </button>
        <button
          onClick={() => window.location.href = '/login'}
          className="w-full py-3 bg-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-300"
        >
          ✕ Cancelar
        </button>
      </div>
    </div>
  );
}
```

---

## 🔒 Segurança

### **Princípios Fundamentais**

1. **Nunca confiar no e-mail do frontend:**
   - O e-mail enviado pelo frontend pode ser forjado
   - **Sempre** validar o token diretamente com o Google no backend
   - Usar o `sub` (Subject ID) como identificador único

2. **CPF é a âncora da identidade:**
   - O CPF nunca pode ser alterado via Google Auth
   - Um Google ID pode estar vinculado a apenas **um** CPF
   - Usar `UNIQUE INDEX` na coluna `google_id`

3. **Imutabilidade do vínculo:**
   - Uma vez vinculado, o Google ID não pode ser transferido para outro CPF
   - Implementar validação de duplicação

4. **Desvinculação segura:**
   - Usuário pode desconectar Google em Configurações
   - Desabilitar não deleta, apenas seta `google_id = NULL`
   - Requer confirmação de senha/OTP

---

## 📊 Comparação: Login Methods

| Método | Velocidade | Segurança | UX | Casos de Uso |
|--------|-----------|-----------|----|----|
| **CPF + Senha** | Médio | ⭐⭐⭐ | ✓ Bom | Método padrão, requisito legal |
| **CPF + WhatsApp OTP** | Rápido | ⭐⭐⭐⭐ | ✓ Excelente | Nova conta, redefinir senha |
| **Google ID** | ⚡ Muito rápido | ⭐⭐⭐⭐⭐ | ✓ Excelente | Login rápido (vinculado) |
| **Google ID (vinculação)** | Rápido | ⭐⭐⭐⭐ | ✓ Bom | Primeiro acesso via Google |

---

## 🚀 Roadmap de Implementação

### **Fase 1: Preparação** (1-2 dias)
- [ ] Criar Google Cloud Project
- [ ] Obter Client ID e Client Secret
- [ ] Configurar redirects e origins
- [ ] Adicionar variáveis de ambiente

### **Fase 2: Backend** (2-3 dias)
- [ ] Adicionar coluna `google_id` ao banco
- [ ] Criar migração Alembic
- [ ] Implementar `/api/auth/google`
- [ ] Implementar `/api/auth/google/link`
- [ ] Testes de segurança

### **Fase 3: Frontend** (2-3 dias)
- [ ] Instalar `@react-oauth/google`
- [ ] Implementar `GoogleLoginForm`
- [ ] Implementar `GoogleLinkingForm`
- [ ] Testes de UX

### **Fase 4: Testes & Deploy** (1 dia)
- [ ] Testes end-to-end
- [ ] Testes de segurança
- [ ] Deploy em staging
- [ ] Monitoramento em produção

---

## ✅ Checklist de Segurança

- [ ] Token validado diretamente com Google (não confiar no frontend)
- [ ] `google_id` único no banco (evitar duplicação)
- [ ] CPF nunca alterado via Google Auth
- [ ] Vínculo só funciona com senha/OTP válido
- [ ] Rate limiting ativado para `/api/auth/google`
- [ ] Logs de auditoria para vinculações
- [ ] Mensagens de erro genéricas (não expor informações)
- [ ] HTTPS obrigatório em produção
- [ ] CORS configurado apenas para domínios confiáveis

---

## 🎯 Exemplo Completo: User Journey

```
┌─────────────────────────────────────┐
│     👤 João acessa login            │
└─────────────────────────────────────┘
                  ↓
      ┌────────────────────────┐
      │ Clica "Google Auth"    │
      └────────────────────────┘
                  ↓
     ┌──────────────────────────┐
     │ Google Dialog (OAuth)    │
     │ João autoriza            │
     └──────────────────────────┘
                  ↓
     Backend valida token Google
                  ↓
        ┌─────────────────────┐
        │ google_id já existe?│
        └─────────────────────┘
         /                    \
        /                      \
    NÃO                        SIM
     |                         |
     ↓                         ↓
Tela "Vincular CPF"    ✅ Login automático
     |                         |
     ├─ CPF: 123.456.789-00    → JWT gerado
     ├─ Senha: ***             → Dashboard
     └─ VINCULAR               ↓
         |              🚀 Pronto!
         ↓
    Valida senha
    Vincula google_id
    Gera JWT
         |
         ↓
      Dashboard
         |
         ↓
      🚀 Pronto!
```

---

## 📞 Suporte & Troubleshooting

### **Problema: "Token do Google inválido"**
- Verificar se Client ID está correto
- Verificar se redirect URI está cadastrada no Google Console
- Verificar se token não expirou (validade ~3600s)

### **Problema: "Google ID já vinculado"**
- Usuário já tem uma conta com este Google ID
- Usar login normal ou desconectar Google da outra conta

### **Problema: "CPF não encontrado"**
- Usuário tentando vincular com CPF que não existe
- Sugerir criar nova conta com CPF + Senha primeiro

---

## 📝 Conclusão

A integração do Google Auth oferece uma **segunda camada de segurança** mantendo o CPF como identificador principal. É um método rápido, seguro e alinhado com melhores práticas globais, especialmente útil para usuários que já possuem conta e desejam login rápido.

**Status:** Pronto para implementação! 🚀

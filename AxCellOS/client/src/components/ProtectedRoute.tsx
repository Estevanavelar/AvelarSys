import React, { useEffect, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';

interface ProtectedRouteProps {
  component: React.ComponentType;
  requireAuth?: boolean;
}

// Modal de login simples para AxCellOS
function LoginModal({ open, onLogin }: { open: boolean; onLogin: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-6 max-w-sm mx-4">
        <div className="space-y-2">
          <div className="text-4xl">📱</div>
          <h1 className="text-xl font-semibold">AxCellOS</h1>
          <p className="text-sm text-muted-foreground">
            Sistema de Ordem de Serviço para Lojas de Telefone
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Faça login para acessar o sistema.
        </p>
        
        <button
          type="button"
          onClick={onLogin}
          className="w-full rounded-lg bg-primary px-4 py-3 text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Entrar com Manus
        </button>
        
        <p className="text-xs text-muted-foreground">
          Você será redirecionado para o portal de autenticação.
        </p>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  component: Component,
  requireAuth = true
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, user, hasToken, login } = useAuth({
    redirectOnUnauthenticated: false
  });
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Verificar se realmente está autenticado (não apenas loading)
  const isLoggedIn = isAuthenticated && !loading && user !== null;

  useEffect(() => {
    if (!loading && !isLoggedIn && requireAuth && !hasToken) {
      setShowLoginModal(true);
    }
  }, [loading, isLoggedIn, requireAuth, hasToken]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Mostrar modal de login se não autenticado
  if (!isLoggedIn && requireAuth) {
    return (
      <LoginModal
        open={showLoginModal}
        onLogin={login}
      />
    );
  }

  return <Component />;
}

export default ProtectedRoute;

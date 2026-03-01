import { useRef } from 'react';
import { Home, FileText, Settings, LogOut, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'ordens' | 'configuracoes' | 'pdv';
}

function useCompanyName(): string | null {
  const { data: companySetting } = trpc.settings.getSetting.useQuery({ key: 'company' });
  return (companySetting?.value as { name?: string })?.name ?? null;
}

export default function ResponsiveLayout({ children, activeTab = 'dashboard' }: ResponsiveLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth();
  const companyName = useCompanyName();
  const displayName = companyName || user?.name?.split(' ')[0] || 'Usuário';
  const [, setLocation] = useLocation();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());

  const routePreloaders: Record<string, () => Promise<unknown>> = {
    '/dashboard': () => import('@/pages/Dashboard'),
    '/ordens': () => import('@/pages/Orders'),
    '/pdv': () => import('@/pages/PDV'),
    '/configuracoes': () => import('@/pages/Settings'),
    '/relatorio-vendas': () => import('@/pages/SalesReport'),
    '/relatorio-ordens': () => import('@/pages/OrdersReport'),
  };

  const prefetchRoute = (href: string) => {
    if (prefetchedRoutesRef.current.has(href)) return;
    const loader = routePreloaders[href];
    if (!loader) return;
    prefetchedRoutesRef.current.add(href);
    void loader().catch(() => {
      prefetchedRoutesRef.current.delete(href);
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-4xl font-bold mb-2 text-primary">AxCellOS</h1>
          <p className="text-foreground mb-8 text-base">Sistema de Ordem de Serviço para Lojas de Telefone</p>
          <Button 
            onClick={() => window.location.href = getLoginUrl()}
            className="w-full bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground rounded-full py-6 text-lg font-semibold"
          >
            Entrar com Manus
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'ordens', label: 'Ordens', icon: FileText, href: '/ordens' },
    { id: 'pdv', label: 'PDV', icon: ShoppingCart, href: '/pdv' },
    { id: 'configuracoes', label: 'Config', icon: Settings, href: '/configuracoes' },
  ];

  const NavContent = () => (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setLocation(item.href)}
            onMouseEnter={() => prefetchRoute(item.href)}
            onFocus={() => prefetchRoute(item.href)}
            onTouchStart={() => prefetchRoute(item.href)}
            onPointerDown={() => prefetchRoute(item.href)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
              isActive
                ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="flex flex-col h-screen bg-background lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-primary">📱 AxCellOS</h1>
          <p className="text-xs text-muted-foreground mt-1">Gestão de OS</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <NavContent />
        </div>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <div className="p-3 bg-sidebar-accent/10 rounded-lg">
            <p className="text-xs text-muted-foreground">{companyName ? 'Loja / Empresa' : 'Usuário'}</p>
            <p className="text-sm font-semibold text-sidebar-foreground truncate" title={companyName || user?.name || undefined}>{displayName}</p>
          </div>
          <Button
            onClick={logout}
            variant="outline"
            className="w-full justify-center gap-2"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Top Bar */}
        <header className="hidden lg:flex bg-card border-b border-border px-6 py-4 items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Bem-vindo, {displayName}</span>
          </div>
        </header>

        {/* Mobile Top Bar - Nome da loja/empresa */}
        <header className="lg:hidden bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-primary">📱 AxCellOS</h1>
          <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={displayName}>{displayName}</span>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto pb-24 lg:pb-6">
          <div className="px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 pt-2 pb-2 flex justify-around safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setLocation(item.href)}
              onTouchStart={() => prefetchRoute(item.href)}
              onPointerDown={() => prefetchRoute(item.href)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

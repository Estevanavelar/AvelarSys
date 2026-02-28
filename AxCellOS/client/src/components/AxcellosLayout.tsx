import { useState } from 'react';
import { Menu, X, LogOut, Home, FileText, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/_core/hooks/useAuth';
import { getLoginUrl } from '@/const';

interface AxcellosLayoutProps {
  children: React.ReactNode;
  activeTab?: 'dashboard' | 'ordens' | 'configuracoes';
}

export default function AxcellosLayout({ children, activeTab = 'dashboard' }: AxcellosLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-primary">📱 AxCellOS</h1>
          <p className="text-foreground mb-8 text-lg">Sistema de Ordem de Serviço para Lojas de Telefone</p>
          <Button 
            onClick={() => window.location.href = getLoginUrl()}
            className="bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground"
            size="lg"
          >
            Entrar com Manus
          </Button>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '#/dashboard' },
    { id: 'ordens', label: 'Ordens de Serviço', icon: FileText, href: '#/ordens' },
    { id: 'configuracoes', label: 'Configurações', icon: Settings, href: '#/configuracoes' },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <h1 className="text-2xl font-bold text-primary">📱 AxCellOS</h1>
            <p className="text-xs text-muted-foreground mt-1">Gestão de OS</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <a
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/10'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="mb-4 p-3 bg-sidebar-accent/10 rounded-lg">
              <p className="text-xs text-muted-foreground">Usuário</p>
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name || 'Usuário'}</p>
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
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-4 py-4 flex items-center justify-between lg:justify-end">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Bem-vindo, {user?.name?.split(' ')[0]}</span>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay para fechar sidebar no mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

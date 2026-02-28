import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  Truck,
  BarChart3,
  Users2,
  Box,
  MessageCircle,
  MapPin,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
    path: "/",
  },
  {
    label: "PDV (Venda Rápida)",
    icon: <ShoppingCart size={20} />,
    path: "/pdv",
  },
  {
    label: "Caixa",
    icon: <DollarSign size={20} />,
    path: "/caixa",
  },
  {
    label: "Pedidos",
    icon: <Package size={20} />,
    path: "/pedidos",
  },

  {
    label: "Estoque",
    icon: <Package size={20} />,
    path: "/estoque",
  },
  {
    label: "Vasilhames (Clientes)",
    icon: <Box size={20} />,
    path: "/vasilhames-clientes",
  },
  {
    label: "Clientes",
    icon: <Users size={20} />,
    path: "/customers",
  },
  {
    label: "Financeiro",
    icon: <DollarSign size={20} />,
    path: "/financial",
  },
  {
    label: "Entregas",
    icon: <Truck size={20} />,
    path: "/deliveries",
  },
  {
    label: "Relatórios",
    icon: <BarChart3 size={20} />,
    path: "/reports",
  },
  {
    label: "Funcionários",
    icon: <Users2 size={20} />,
    path: "/employees",
  },
  {
    label: "WhatsApp",
    icon: <MessageCircle size={20} />,
    path: "/whatsapp",
  },
  {
    label: "Notificações",
    icon: <Bell size={20} />,
    path: "/notifications",
  },
  {
    label: "Rastreamento",
    icon: <MapPin size={20} />,
    path: "/tracking",
  },
  {
    label: "Catálogo Público",
    icon: <ShoppingCart size={20} />,
    path: "/catalog-management",
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  // Exibir todos os itens do menu
  const filteredMenuItems = menuItems;

  const handleNavigate = (path: string) => {
    navigate(path);
    // Fechar sidebar em dispositivos móveis
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <>
      {/* Botão de Toggle para Mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 bg-white border border-gray-200 rounded-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay para Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 z-40 transition-all duration-300 ${
          isOpen ? "w-64" : "w-0 md:w-64"
        } overflow-hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-blue-600">NaldoGás</h1>
            <p className="text-xs text-gray-500 mt-1">Sistema de Gestão</p>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredMenuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* User Info and Logout */}
          <div className="p-4 border-t border-gray-200 space-y-3">
            {user && (
              <div className="px-4 py-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">Conectado como</p>
                <p className="font-semibold text-gray-800 truncate">{user.name || user.email}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            )}

            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <LogOut size={18} />
              Sair
            </Button>
          </div>
        </div>
      </aside>

    </>
  );
}

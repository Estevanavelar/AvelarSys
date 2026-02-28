import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MessageCircle, MapPin } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col p-4">
      <main className="flex-1">
        <h1 className="text-3xl font-bold mb-6">Bem-vindo ao NaldoGás!</h1>
        <p className="text-gray-600 mb-8">Explore os novos módulos de integração:</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/whatsapp")}
          >
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle size={32} className="text-green-600" />
              <h2 className="text-xl font-bold">WhatsApp Integration</h2>
            </div>
            <p className="text-gray-600">Envie notificações automáticas via WhatsApp para seus clientes</p>
          </div>

          <div
            className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-all cursor-pointer"
            onClick={() => navigate("/tracking")}
          >
            <div className="flex items-center gap-3 mb-3">
              <MapPin size={32} className="text-red-600" />
              <h2 className="text-xl font-bold">Rastreamento de Entregas</h2>
            </div>
            <p className="text-gray-600">Acompanhe suas entregas em tempo real no mapa offline</p>
          </div>
        </div>
      </main>
    </div>
  );
}

import httpx
from typing import Dict, Optional, List
from app.config import settings


class WPPConnectManager:
    """Gerenciador de conexão com instâncias WPPConnect"""
    
    def __init__(self):
        self.hosts = settings.wpp_hosts
        self.timeout = 30
    
    async def _request(self, method: str, endpoint: str, host: Optional[str] = None, **kwargs) -> Dict:
        """Faz requisição para uma instância WPPConnect"""
        host = host or self.hosts[0]
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(
                    method,
                    f"{host}{endpoint}",
                    **kwargs
                )
                if response.status_code == 200:
                    return response.json()
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_status(self, host: Optional[str] = None) -> Dict:
        """Obtém status de uma instância"""
        return await self._request("GET", "/api/health", host)
    
    async def get_qrcode(self, host: Optional[str] = None) -> Dict:
        """Obtém QR Code de uma instância"""
        return await self._request("GET", "/api/qrcode", host)
    
    async def restart(self, host: Optional[str] = None) -> Dict:
        """Reinicia sessão de uma instância"""
        return await self._request("POST", "/api/restart", host)
    
    async def disconnect(self, host: Optional[str] = None) -> Dict:
        """Desconecta uma instância"""
        return await self._request("POST", "/api/disconnect", host)
    
    async def get_profile(self, host: Optional[str] = None) -> Dict:
        """Obtém informações do perfil conectado"""
        return await self._request("GET", "/api/profile", host)
    
    async def get_all_instances_status(self) -> List[Dict]:
        """Obtém status de todas as instâncias"""
        statuses = []
        for i, host in enumerate(self.hosts):
            status = await self.get_status(host)
            status["instance"] = f"Instância {i + 1}"
            status["host"] = host
            statuses.append(status)
        return statuses

    async def get_contacts(self, host: Optional[str] = None) -> Dict:
        """Obtém contatos salvos"""
        return await self._request("GET", "/api/contacts", host)

    async def get_chats(self, host: Optional[str] = None) -> Dict:
        """Obtém chats recentes"""
        return await self._request("GET", "/api/chats", host)

    async def get_all_contacts(self, host: Optional[str] = None) -> Dict:
        """Obtém contatos combinados (salvos + chats)"""
        return await self._request("GET", "/api/contacts/all", host)


# Instância global
wpp_manager = WPPConnectManager()
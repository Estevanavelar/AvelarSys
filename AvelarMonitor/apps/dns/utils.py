"""Utilitários para gerenciamento DNS"""
import requests
import socket
import re
import os
from .models import Domain, DNSRecord


def check_dns_propagation(domain, record_type='A', name='@'):
    """Verifica propagação DNS"""
    try:
        if name == '@':
            query_name = domain
        else:
            query_name = f"{name}.{domain}"
        
        if record_type == 'A':
            result = socket.gethostbyname(query_name)
            return {'status': 'resolved', 'value': result}
        elif record_type == 'AAAA':
            result = socket.getaddrinfo(query_name, None, socket.AF_INET6)
            return {'status': 'resolved', 'value': result[0][4][0]}
        elif record_type == 'CNAME':
            result = socket.gethostbyname(query_name)
            return {'status': 'resolved', 'value': result}
        else:
            return {'status': 'unknown', 'value': None}
    except socket.gaierror:
        return {'status': 'not_resolved', 'value': None}
    except Exception as e:
        return {'status': 'error', 'value': str(e)}


def create_cloudflare_record(domain, record_type, name, content, ttl=3600, proxied=False):
    """Cria registro DNS no Cloudflare"""
    try:
        domain_obj = Domain.objects.get(name=domain)
        
        if not domain_obj.api_token or not domain_obj.zone_id:
            raise ValueError("API Token ou Zone ID não configurados")
        
        url = f"https://api.cloudflare.com/client/v4/zones/{domain_obj.zone_id}/dns_records"
        headers = {
            'Authorization': f'Bearer {domain_obj.api_token}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'type': record_type,
            'name': name,
            'content': content,
            'ttl': ttl,
            'proxied': proxied
        }
        
        response = requests.post(url, json=data, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        if result.get('success'):
            return result['result']
        else:
            raise ValueError(result.get('errors', [{}])[0].get('message', 'Erro desconhecido'))
    except Exception as e:
        raise Exception(f"Erro ao criar registro no Cloudflare: {str(e)}")


def update_cloudflare_record(record_id, domain, content, ttl=None, proxied=None):
    """Atualiza registro DNS no Cloudflare"""
    try:
        domain_obj = Domain.objects.get(name=domain)
        
        if not domain_obj.api_token or not domain_obj.zone_id:
            raise ValueError("API Token ou Zone ID não configurados")
        
        url = f"https://api.cloudflare.com/client/v4/zones/{domain_obj.zone_id}/dns_records/{record_id}"
        headers = {
            'Authorization': f'Bearer {domain_obj.api_token}',
            'Content-Type': 'application/json'
        }
        
        data = {}
        if content:
            data['content'] = content
        if ttl is not None:
            data['ttl'] = ttl
        if proxied is not None:
            data['proxied'] = proxied
        
        response = requests.patch(url, json=data, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        if result.get('success'):
            return result['result']
        else:
            raise ValueError(result.get('errors', [{}])[0].get('message', 'Erro desconhecido'))
    except Exception as e:
        raise Exception(f"Erro ao atualizar registro no Cloudflare: {str(e)}")


def delete_cloudflare_record(record_id, domain):
    """Deleta registro DNS no Cloudflare"""
    try:
        domain_obj = Domain.objects.get(name=domain)
        
        if not domain_obj.api_token or not domain_obj.zone_id:
            raise ValueError("API Token ou Zone ID não configurados")
        
        url = f"https://api.cloudflare.com/client/v4/zones/{domain_obj.zone_id}/dns_records/{record_id}"
        headers = {
            'Authorization': f'Bearer {domain_obj.api_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.delete(url, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        if result.get('success'):
            return True
        else:
            raise ValueError(result.get('errors', [{}])[0].get('message', 'Erro desconhecido'))
    except Exception as e:
        raise Exception(f"Erro ao deletar registro no Cloudflare: {str(e)}")


def sync_cloudflare_records(domain):
    """Sincroniza registros DNS do Cloudflare com o banco de dados"""
    try:
        domain_obj = Domain.objects.get(name=domain)
        
        if not domain_obj.api_token or not domain_obj.zone_id:
            raise ValueError("API Token ou Zone ID não configurados")
        
        url = f"https://api.cloudflare.com/client/v4/zones/{domain_obj.zone_id}/dns_records"
        headers = {
            'Authorization': f'Bearer {domain_obj.api_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        result = response.json()
        if result.get('success'):
            records = result['result']
            
            # Criar ou atualizar registros
            for record_data in records:
                DNSRecord.objects.update_or_create(
                    domain=domain_obj,
                    cloudflare_id=record_data['id'],
                    defaults={
                        'type': record_data['type'],
                        'name': record_data['name'],
                        'content': record_data['content'],
                        'ttl': record_data['ttl'],
                        'proxied': record_data.get('proxied', False),
                    }
                )
            
            return len(records)
        else:
            raise ValueError(result.get('errors', [{}])[0].get('message', 'Erro desconhecido'))
    except Exception as e:
        raise Exception(f"Erro ao sincronizar registros: {str(e)}")


def scan_nginx_configs():
    """Escaneia arquivos de configuração do Nginx para encontrar domínios"""
    domains_found = set()
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    nginx_path = os.path.join(base_path, 'infrastructure', 'nginx')
    
    if not os.path.exists(nginx_path):
        return list(domains_found)
    
    # Procurar por arquivos .conf
    for root, dirs, files in os.walk(nginx_path):
        for file in files:
            if file.endswith('.conf'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Procurar por server_name
                        # Padrão: server_name dominio.com www.dominio.com;
                        pattern = r'server_name\s+([^;]+);'
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        for match in matches:
                            # Separar múltiplos domínios
                            domain_list = match.strip().split()
                            for domain in domain_list:
                                domain = domain.strip()
                                if domain and not domain.startswith('_') and '.' in domain:
                                    domains_found.add(domain)
                except Exception:
                    pass
    
    return sorted(list(domains_found))


def scan_docker_compose():
    """Escaneia docker-compose.yml para encontrar variáveis de domínio"""
    domains_found = set()
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    compose_file = os.path.join(base_path, 'docker-compose.production.yml')
    
    if os.path.exists(compose_file):
        try:
            with open(compose_file, 'r', encoding='utf-8') as f:
                content = f.read()
                # Procurar por URLs que contenham domínios
                # Padrão: https://dominio.com ou http://dominio.com
                pattern = r'https?://([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
                matches = re.findall(pattern, content)
                for domain in matches:
                    if '.' in domain:
                        domains_found.add(domain)
        except Exception:
            pass
    
    return sorted(list(domains_found))


def scan_env_files():
    """Escaneia arquivos .env para encontrar variáveis de domínio"""
    domains_found = set()
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    env_files = [
        os.path.join(base_path, '.env.production'),
        os.path.join(base_path, '.env'),
    ]
    
    for env_file in env_files:
        if os.path.exists(env_file):
            try:
                with open(env_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        # Procurar por variáveis que contenham URLs ou domínios
                        if '=' in line:
                            value = line.split('=', 1)[1].strip().strip('"').strip("'")
                            # Procurar por padrões de URL
                            url_pattern = r'https?://([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
                            matches = re.findall(url_pattern, value)
                            for domain in matches:
                                if '.' in domain:
                                    domains_found.add(domain)
                            # Procurar por domínios diretos
                            if '.' in value and not value.startswith('http'):
                                # Verificar se parece um domínio
                                domain_pattern = r'([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
                                domain_matches = re.findall(domain_pattern, value)
                                for domain in domain_matches:
                                    if len(domain.split('.')) >= 2:
                                        domains_found.add(domain)
            except Exception:
                pass
    
    return sorted(list(domains_found))


def query_dns_records(domain, record_types=['A', 'AAAA', 'CNAME', 'MX', 'TXT']):
    """Faz queries DNS para obter registros de um domínio"""
    records = []
    
    try:
        # Query A (IPv4)
        if 'A' in record_types:
            try:
                ipv4 = socket.gethostbyname(domain)
                records.append({
                    'type': 'A',
                    'name': '@',
                    'content': ipv4,
                    'ttl': 3600,
                    'source': 'dns_query'
                })
            except socket.gaierror:
                pass
        
        # Query AAAA (IPv6)
        if 'AAAA' in record_types:
            try:
                ipv6_info = socket.getaddrinfo(domain, None, socket.AF_INET6)
                if ipv6_info:
                    ipv6 = ipv6_info[0][4][0]
                    records.append({
                        'type': 'AAAA',
                        'name': '@',
                        'content': ipv6,
                        'ttl': 3600,
                        'source': 'dns_query'
                    })
            except (socket.gaierror, OSError):
                pass
        
        # Para outros tipos (CNAME, MX, TXT), precisaríamos de uma biblioteca DNS
        # Por enquanto, retornamos apenas A e AAAA que conseguimos com socket
        
    except Exception:
        pass
    
    return records


def discover_system_domains():
    """Descobre todos os domínios configurados no sistema"""
    all_domains = set()
    
    # Escanear Nginx
    nginx_domains = scan_nginx_configs()
    all_domains.update(nginx_domains)
    
    # Escanear Docker Compose
    docker_domains = scan_docker_compose()
    all_domains.update(docker_domains)
    
    # Escanear arquivos .env
    env_domains = scan_env_files()
    all_domains.update(env_domains)
    
    return sorted(list(all_domains))


def discover_system_dns_records():
    """Descobre todos os registros DNS do sistema"""
    domains = discover_system_domains()
    all_records = []
    
    for domain in domains:
        # Fazer queries DNS
        records = query_dns_records(domain)
        for record in records:
            record['domain'] = domain
            all_records.append(record)
    
    return all_records


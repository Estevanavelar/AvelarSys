"""
Engine Spintax para variação de mensagens

Converte templates com chaves em variações aleatórias:
Input:  "{Oi|Olá|E aí}, {tudo bem|como vai}? Aqui é da {empresa}"
Output: "Olá, como vai? Aqui é da empresa" (aleatório a cada chamada)

Suporte a:
- Chaves simples: {opção1|opção2|opção3}
- Aninhamento: {Oi {amigo|parceiro}|Olá}
- Variáveis de contato: {nome}, {telefone}
"""

import re
import random
from typing import Dict, Optional


class SpintaxEngine:
    """Motor de processamento de templates spintax"""
    
    @staticmethod
    def parse(text: str, variables: Optional[Dict[str, str]] = None) -> str:
        """
        Processa um template spintax e retorna uma variação aleatória
        
        Args:
            text: Template com chaves spintax
            variables: Dicionário de variáveis para substituição (ex: {'nome': 'João'})
            
        Returns:
            Texto processado com variações aleatórias
        """
        if not text:
            return text
            
        # Primeiro processa as variáveis
        if variables:
            text = SpintaxEngine._replace_variables(text, variables)
        
        # Depois processa as chaves spintax (recursivamente)
        result = SpintaxEngine._process_spintax(text)
        
        return result
    
    @staticmethod
    def _replace_variables(text: str, variables: Dict[str, str]) -> str:
        """Substitui variáveis no formato {variavel}"""
        for key, value in variables.items():
            pattern = r'\{' + re.escape(key) + r'\}'
            text = re.sub(pattern, str(value), text, flags=re.IGNORECASE)
        return text
    
    @staticmethod
    def _process_spintax(text: str) -> str:
        """Processa chaves spintax recursivamente"""
        # Encontra a primeira chave não aninhada
        pattern = r'\{([^{}]+)\}'
        
        while True:
            match = re.search(pattern, text)
            if not match:
                break
                
            # Extrai as opções dentro das chaves
            options = match.group(1).split('|')
            # Escolhe uma opção aleatoriamente
            chosen = random.choice(options).strip()
            # Substitui a chave pela opção escolhida
            text = text[:match.start()] + chosen + text[match.end():]
        
        return text
    
    @staticmethod
    def generate_variations(text: str, count: int = 3, 
                          variables: Optional[Dict[str, str]] = None) -> list:
        """
        Gera múltiplas variações de um template
        
        Args:
            text: Template spintax
            count: Quantidade de variações a gerar
            variables: Variáveis para substituição
            
        Returns:
            Lista de variações únicas
        """
        variations = set()
        max_attempts = count * 10  # Evita loop infinito
        attempts = 0
        
        while len(variations) < count and attempts < max_attempts:
            variations.add(SpintaxEngine.parse(text, variables))
            attempts += 1
        
        return list(variations)
    
    @staticmethod
    def validate(text: str) -> Dict:
        """
        Valida se um template spintax está sintaticamente correto
        
        Returns:
            Dict com 'valid' (bool) e 'error' (str ou None)
        """
        # Verifica se há chaves não fechadas
        open_count = text.count('{')
        close_count = text.count('}')
        
        if open_count != close_count:
            return {
                'valid': False,
                'error': f'Chaves desbalanceadas: {open_count} abertas, {close_count} fechadas'
            }
        
        # Verifica se há chaves vazias
        if re.search(r'\{\s*\}', text):
            return {
                'valid': False,
                'error': 'Chaves vazias encontradas'
            }
        
        return {'valid': True, 'error': None}


# Instância global
spintax = SpintaxEngine()


# Exemplos de uso:
if __name__ == "__main__":
    # Exemplo 1: Chaves simples
    template1 = "{Oi|Olá|E aí}, {tudo bem|como vai|beleza}?"
    print("Exemplo 1:")
    for i in range(3):
        print(f"  Variação {i+1}: {spintax.parse(template1)}")
    
    # Exemplo 2: Com variáveis
    template2 = "Olá {nome}, aqui é da {empresa}. {Tudo bem|Como posso ajudar}?"
    vars2 = {'nome': 'João', 'empresa': 'Avelar Company'}
    print("\nExemplo 2 (com variáveis):")
    for i in range(3):
        print(f"  Variação {i+1}: {spintax.parse(template2, vars2)}")
    
    # Exemplo 3: Aninhamento
    template3 = "{Oi {amigo|parceiro}|Olá {pessoal|galera}}"
    print("\nExemplo 3 (aninhado):")
    for i in range(3):
        print(f"  Variação {i+1}: {spintax.parse(template3)}")
    
    # Exemplo 4: Validação
    print("\nExemplo 4 (validação):")
    print(f"  Válido: {spintax.validate('{Oi|Olá}')}")
    print(f"  Inválido: {spintax.validate('{Oi|Olá')}")

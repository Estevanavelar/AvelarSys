import csv
import io
import re
from typing import List, Dict, Tuple, Optional
import pandas as pd
from app.models import Contact


class ContactReader:
    """Leitor genérico de arquivos de contatos (CSV, VCF)"""
    
    @staticmethod
    def read_file(file_content: bytes, filename: str = "contatos.csv") -> Tuple[List[Contact], List[str]]:
        """
        Lê arquivo de contatos (CSV ou VCF) e retorna lista de contatos
        
        Args:
            file_content: Conteúdo do arquivo em bytes
            filename: Nome do arquivo (para detectar formato)
        
        Returns:
            Tuple: (lista de contatos, lista de erros)
        """
        ext = filename.lower().split('.')[-1] if '.' in filename else 'csv'
        
        if ext == 'vcf':
            return VCardReader.read_vcard(file_content)
        else:
            return CSVReader.read_csv(file_content)
    
    @staticmethod
    def validate_contacts(contacts: List[Contact]) -> Tuple[List[Contact], List[str]]:
        """
        Valida lista de contatos
        
        Returns:
            Tuple: (contatos válidos, erros)
        """
        return CSVReader.validate_contacts(contacts)
    
    @staticmethod
    def _format_phone(phone: str) -> str:
        """Formata número de telefone"""
        return CSVReader._format_phone(phone)
        """
        Lê arquivo de contatos (CSV ou VCF) e retorna lista de contatos
        
        Args:
            file_content: Conteúdo do arquivo em bytes
            filename: Nome do arquivo (para detectar formato)
        
        Returns:
            Tuple: (lista de contatos, lista de erros)
        """
        ext = filename.lower().split('.')[-1] if '.' in filename else 'csv'
        
        if ext == 'vcf':
            return VCardReader.read_vcard(file_content)
        else:
            return CSVReader.read_csv(file_content)


class VCardReader:
    """Leitor de arquivos vCard (.vcf)"""
    
    @staticmethod
    def read_vcard(file_content: bytes) -> Tuple[List[Contact], List[str]]:
        """
        Lê arquivo vCard e retorna lista de contatos
        
        Args:
            file_content: Conteúdo do arquivo em bytes
        
        Returns:
            Tuple: (lista de contatos, lista de erros)
        """
        contacts = []
        errors = []
        
        # Detectar encoding
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        content_str = None
        
        for encoding in encodings:
            try:
                content_str = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if content_str is None:
            errors.append("Não foi possível detectar o encoding do arquivo vCard")
            return contacts, errors
        
        try:
            # Normalizar quebras de linha
            content_str = content_str.replace('\r\n', '\n').replace('\r', '\n')
            
            # Dividir em cards individuais
            cards = re.split(r'\nBEGIN:VCARD', content_str)
            
            for i, card in enumerate(cards):
                if not card.strip() or 'END:VCARD' not in card:
                    continue
                
                try:
                    contact = VCardReader._parse_vcard(card)
                    if contact:
                        contacts.append(contact)
                    else:
                        errors.append(f"Card {i+1}: Nenhum telefone encontrado")
                except Exception as e:
                    errors.append(f"Card {i+1}: {str(e)}")
                    
        except Exception as e:
            errors.append(f"Erro ao ler vCard: {str(e)}")
        
        return contacts, errors
    
    @staticmethod
    def _parse_vcard(card: str) -> Optional[Contact]:
        """
        Parse de um único card vCard
        
        Args:
            card: Conteúdo do card vCard
        
        Returns:
            Contact ou None se inválido
        """
        lines = card.strip().split('\n')
        
        phone = None
        name = ""
        email = ""
        organization = ""
        variables = {}
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith('BEGIN:') or line.startswith('END:'):
                continue
            
            # Continuação de linha (folding)
            if line.startswith(' '):
                continue
            
            # Extrair propriedade
            if ':' in line:
                prop, value = line.split(':', 1)
                prop_upper = prop.upper()
                
                # Telefone
                if prop_upper.startswith('TEL'):
                    if not phone:  # Pegar o primeiro telefone
                        phone = VCardReader._extract_phone(value)
                
                # Nome
                elif prop_upper.startswith('FN'):
                    name = value.strip()
                    variables['nome'] = name
                
                # Nome estruturado (N:)
                elif prop_upper.startswith('N'):
                    if not name:  # Usar N apenas se FN não existir
                        name_parts = value.split(';')
                        if len(name_parts) >= 2:
                            name = f"{name_parts[1]} {name_parts[0]}".strip()
                            variables['nome'] = name
                
                # Email
                elif prop_upper.startswith('EMAIL'):
                    email = value.strip()
                    variables['email'] = email
                
                # Organização
                elif prop_upper.startswith('ORG'):
                    organization = value.strip()
                    variables['empresa'] = organization
                
                # Aniversário
                elif prop_upper.startswith('BDAY'):
                    variables['aniversario'] = value.strip()
                
                # Cargo
                elif prop_upper.startswith('TITLE'):
                    variables['cargo'] = value.strip()
        
        if not phone:
            return None
        
        # Formatar telefone
        phone = CSVReader._format_phone(phone)
        
        if not phone:
            return None
        
        return Contact(phone=phone, variables=variables)
    
    @staticmethod
    def _extract_phone(value: str) -> str:
        """Extrai número de telefone do valor vCard"""
        # Remover prefixos tipo TEL;TYPE=CELL:
        if ':' in value:
            value = value.split(':')[-1]
        
        # Limpar o número
        phone = re.sub(r'[^\d+]', '', value)
        
        return phone


class CSVReader:
    """Leitor de arquivos CSV para contatos"""
    
    @staticmethod
    def read_csv(file_content: bytes, filename: str = "contatos.csv") -> Tuple[List[Contact], List[str]]:
        """
        Lê arquivo CSV e retorna lista de contatos
        
        Args:
            file_content: Conteúdo do arquivo em bytes
            filename: Nome do arquivo (para detectar encoding)
        
        Returns:
            Tuple: (lista de contatos, lista de erros)
        """
        contacts = []
        errors = []
        
        # Detectar encoding
        encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
        content_str = None
        
        for encoding in encodings:
            try:
                content_str = file_content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if content_str is None:
            errors.append("Não foi possível detectar o encoding do arquivo")
            return contacts, errors
        
        # Detectar delimitador
        sample = content_str[:1024]
        delimiters = [',', ';', '\t', '|']
        delimiter = ','
        max_count = 0
        
        for delim in delimiters:
            count = sample.count(delim)
            if count > max_count:
                max_count = count
                delimiter = delim
        
        try:
            # Ler CSV
            csv_file = io.StringIO(content_str)
            reader = csv.DictReader(csv_file, delimiter=delimiter)
            
            if not reader.fieldnames:
                errors.append("Arquivo CSV está vazio ou sem cabeçalhos")
                return contacts, errors
            
            # Detectar coluna de telefone
            phone_column = None
            phone_variations = ['telefone', 'phone', 'celular', 'whatsapp', 'numero', 'number', 'tel', 'contato']
            
            for field in reader.fieldnames:
                field_lower = field.lower().strip()
                if any(var in field_lower for var in phone_variations):
                    phone_column = field
                    break
            
            if not phone_column:
                # Se não encontrou, usar primeira coluna
                phone_column = reader.fieldnames[0]
            
            # Processar linhas
            for row_num, row in enumerate(reader, start=2):
                try:
                    phone = row.get(phone_column, '').strip()
                    
                    # Limpar e formatar telefone
                    phone = CSVReader._format_phone(phone)
                    
                    if not phone:
                        errors.append(f"Linha {row_num}: Telefone vazio")
                        continue
                    
                    # Coletar outras colunas como variáveis
                    variables = {}
                    for key, value in row.items():
                        if key != phone_column and value:
                            # Limpar nome da variável (apenas letras, números e underscore)
                            var_name = re.sub(r'[^\w]', '_', key.lower().strip())
                            variables[var_name] = value.strip()
                    
                    contacts.append(Contact(phone=phone, variables=variables))
                    
                except Exception as e:
                    errors.append(f"Linha {row_num}: {str(e)}")
            
        except Exception as e:
            errors.append(f"Erro ao ler CSV: {str(e)}")
        
        return contacts, errors
    
    @staticmethod
    def _format_phone(phone: str) -> str:
        """
        Formata número de telefone para padrão brasileiro
        
        Args:
            phone: Número de telefone (pode ter vários formatos)
        
        Returns:
            Número formatado ou string vazia se inválido
        """
        # Remover tudo que não é dígito
        digits = re.sub(r'\D', '', phone)
        
        # Remover prefixo do país se existir (55)
        if digits.startswith('55') and len(digits) > 10:
            digits = digits[2:]
        
        # Validar tamanho
        if len(digits) < 10 or len(digits) > 11:
            return ""
        
        # Adicionar 9 se necessário (para números de celular)
        if len(digits) == 10:
            # Verificar se é celular (começa com 9)
            if digits[2] != '9':
                # Adicionar 9 para celulares
                digits = digits[:2] + '9' + digits[2:]
        
        # Adicionar prefixo do Brasil
        return f"55{digits}"
    
    @staticmethod
    def validate_contacts(contacts: List[Contact]) -> Tuple[List[Contact], List[str]]:
        """
        Valida lista de contatos
        
        Returns:
            Tuple: (contatos válidos, erros)
        """
        valid = []
        errors = []
        seen_phones = set()
        
        for i, contact in enumerate(contacts):
            # Verificar duplicados
            if contact.phone in seen_phones:
                errors.append(f"Contato {i+1}: Telefone duplicado ({contact.phone})")
                continue
            
            # Validar formato
            if not re.match(r'^55\d{11}$', contact.phone):
                errors.append(f"Contato {i+1}: Formato inválido ({contact.phone})")
                continue
            
            seen_phones.add(contact.phone)
            valid.append(contact)
        
        return valid, errors


class TemplateProcessor:
    """Processador de templates de mensagens"""
    
    @staticmethod
    def process(template: str, variables: Dict[str, str]) -> str:
        """
        Substitui placeholders no template pelas variáveis
        
        Args:
            template: Template com placeholders {variavel}
            variables: Dicionário de variáveis
        
        Returns:
            Mensagem processada
        """
        message = template
        
        # Substituir placeholders
        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            message = message.replace(placeholder, value)
        
        return message
    
    @staticmethod
    def extract_variables(template: str) -> List[str]:
        """
        Extrai nomes de variáveis de um template
        
        Returns:
            Lista de nomes de variáveis
        """
        pattern = r'\{([^{}]+)\}'
        return re.findall(pattern, template)
    
    @staticmethod
    def validate_template(template: str, available_vars: List[str]) -> Tuple[bool, List[str]]:
        """
        Valida se todas as variáveis do template estão disponíveis
        
        Returns:
            Tuple: (válido, lista de variáveis faltantes)
        """
        template_vars = set(TemplateProcessor.extract_variables(template))
        available = set(available_vars)
        
        missing = template_vars - available
        
        return len(missing) == 0, list(missing)
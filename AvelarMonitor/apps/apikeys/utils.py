"""Utilitários para gerenciamento de API Keys"""
import secrets
import hashlib
from .models import APIKey


def generate_secure_key(length=32):
    """Gera uma API key segura"""
    return secrets.token_urlsafe(length)


def hash_key(key):
    """Gera hash de uma key"""
    return hashlib.sha256(key.encode()).hexdigest()


def verify_key(key_hash, key):
    """Verifica se uma key corresponde ao hash"""
    return key_hash == hash_key(key)


def mask_key(key, show_last=4):
    """Mascara uma key mostrando apenas os últimos caracteres"""
    if len(key) <= show_last:
        return '*' * len(key)
    return '*' * (len(key) - show_last) + key[-show_last:]


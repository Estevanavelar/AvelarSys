from django import forms
from .models import Domain, DNSRecord


class DomainForm(forms.ModelForm):
    """Formulário para criar/editar domínio"""
    class Meta:
        model = Domain
        fields = ['name', 'provider', 'api_token', 'zone_id']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'exemplo.com.br'}),
            'provider': forms.Select(attrs={'class': 'form-control'}, choices=[('cloudflare', 'Cloudflare')]),
            'api_token': forms.TextInput(attrs={'class': 'form-control', 'type': 'password', 'placeholder': 'Token da API'}),
            'zone_id': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Zone ID do Cloudflare'}),
        }


class DNSRecordForm(forms.ModelForm):
    """Formulário para criar/editar registro DNS"""
    class Meta:
        model = DNSRecord
        fields = ['domain', 'type', 'name', 'content', 'ttl', 'proxied']
        widgets = {
            'domain': forms.Select(attrs={'class': 'form-control'}),
            'type': forms.Select(attrs={'class': 'form-control'}),
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': '@ ou subdomínio'}),
            'content': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'IP ou valor do registro'}),
            'ttl': forms.NumberInput(attrs={'class': 'form-control', 'min': 120, 'max': 2147483647}),
            'proxied': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }


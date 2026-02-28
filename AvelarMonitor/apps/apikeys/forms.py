from django import forms
from .models import APIKey


class APIKeyForm(forms.ModelForm):
    """Formulário para criar/editar API Key"""
    key = forms.CharField(
        label='API Key',
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'Deixe em branco para gerar automaticamente'
        }),
        help_text='Deixe em branco para gerar uma key automaticamente'
    )
    
    class Meta:
        model = APIKey
        fields = ['name', 'service', 'key', 'active', 'scopes']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Nome da API Key'}),
            'service': forms.Select(attrs={'class': 'form-control'}),
            'active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'scopes': forms.Textarea(attrs={'class': 'form-control', 'rows': 3, 'placeholder': 'Escopos ou permissões (opcional)'}),
        }


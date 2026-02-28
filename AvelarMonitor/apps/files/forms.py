from django import forms


class UploadFileForm(forms.Form):
    """Formulário para upload de arquivo"""
    file = forms.FileField(
        label='Arquivo',
        widget=forms.FileInput(attrs={
            'class': 'form-control',
            'accept': '*/*'
        })
    )


class CreateFileForm(forms.Form):
    """Formulário para criar arquivo"""
    name = forms.CharField(
        label='Nome do arquivo',
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'exemplo.txt'
        })
    )


class CreateDirectoryForm(forms.Form):
    """Formulário para criar diretório"""
    name = forms.CharField(
        label='Nome do diretório',
        max_length=255,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': 'novo_diretorio'
        })
    )


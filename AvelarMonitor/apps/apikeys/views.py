from django.shortcuts import render, redirect, get_object_or_404
from apps.core.jwt_auth import jwt_login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import APIKey, APIKeyUsage
from .forms import APIKeyForm
from .utils import generate_secure_key


@jwt_login_required
def apikeys_view(request):
    """Página principal de gerenciamento de API Keys"""
    keys = APIKey.objects.all()
    
    context = {
        'keys': keys,
    }
    
    return render(request, 'apikeys/index.html', context)


@jwt_login_required
def apikey_create(request):
    """Criar nova API Key"""
    if request.method == 'POST':
        form = APIKeyForm(request.POST)
        if form.is_valid():
            key_obj = form.save(commit=False)
            key_obj.created_by = request.user
            
            # Gerar ou usar key fornecida
            key_value = form.cleaned_data.get('key', '').strip()
            if not key_value:
                key_value = generate_secure_key()
            
            key_obj.set_key(key_value)
            key_obj.save()
            
            # Mostrar key completa apenas uma vez
            messages.success(request, f'API Key criada com sucesso!')
            messages.info(request, f'Key gerada: {key_value} (salve esta key, ela não será exibida novamente)')
            
            return redirect('apikeys')
    else:
        form = APIKeyForm()
    
    return render(request, 'apikeys/form.html', {'form': form, 'action': 'Criar'})


@jwt_login_required
def apikey_edit(request, pk):
    """Editar API Key"""
    key_obj = get_object_or_404(APIKey, pk=pk)
    
    if request.method == 'POST':
        form = APIKeyForm(request.POST, instance=key_obj)
        if form.is_valid():
            key_obj = form.save(commit=False)
            
            # Se uma nova key foi fornecida, atualizar
            key_value = form.cleaned_data.get('key', '').strip()
            if key_value:
                key_obj.set_key(key_value)
                messages.info(request, 'Nova key definida!')
            
            key_obj.save()
            messages.success(request, f'API Key atualizada com sucesso!')
            return redirect('apikeys')
    else:
        form = APIKeyForm(instance=key_obj)
        form.fields['key'].initial = ''  # Não mostrar key atual
    
    return render(request, 'apikeys/form.html', {'form': form, 'key_obj': key_obj, 'action': 'Editar'})


@jwt_login_required
@require_http_methods(["POST"])
def apikey_delete(request, pk):
    """Deletar API Key"""
    key_obj = get_object_or_404(APIKey, pk=pk)
    key_name = key_obj.name
    key_obj.delete()
    messages.success(request, f'API Key {key_name} deletada com sucesso!')
    return redirect('apikeys')


@jwt_login_required
@require_http_methods(["POST"])
def apikey_toggle(request, pk):
    """Ativar/desativar API Key"""
    key_obj = get_object_or_404(APIKey, pk=pk)
    key_obj.active = not key_obj.active
    key_obj.save()
    
    status = 'ativada' if key_obj.active else 'desativada'
    messages.success(request, f'API Key {status} com sucesso!')
    return redirect('apikeys')


@jwt_login_required
@require_http_methods(["POST"])
def apikey_regenerate(request, pk):
    """Regenerar API Key"""
    key_obj = get_object_or_404(APIKey, pk=pk)
    
    # Gerar nova key
    new_key = generate_secure_key()
    key_obj.set_key(new_key)
    key_obj.save()
    
    messages.success(request, f'API Key regenerada com sucesso!')
    messages.info(request, f'Nova key: {new_key} (salve esta key, ela não será exibida novamente)')
    
    return redirect('apikeys')


@jwt_login_required
def apikey_usage(request, pk):
    """Histórico de uso de uma API Key"""
    key_obj = get_object_or_404(APIKey, pk=pk)
    usage_history = APIKeyUsage.objects.filter(key=key_obj)[:100]
    
    context = {
        'key_obj': key_obj,
        'usage_history': usage_history,
    }
    
    return render(request, 'apikeys/usage.html', context)


from django.shortcuts import render, redirect
from apps.core.jwt_auth import jwt_login_required
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os
import json
from .utils import (
    list_directory, get_file_info, safe_delete, safe_create_directory,
    safe_create_file, read_file_content, write_file_content, is_restricted_path
)
from .forms import UploadFileForm, CreateFileForm, CreateDirectoryForm


@jwt_login_required
def files_view(request, path=''):
    """Página principal do gerenciador de arquivos"""
    # Permitir navegação a partir da raiz do sistema (/)
    # Mas manter /home/avelar/AvelarSys como diretório padrão inicial
    current_file = os.path.abspath(__file__)
    default_base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    
    # Se path começar com /, considerar como caminho absoluto a partir da raiz
    if path:
        # Remover barra inicial se existir
        path = path.lstrip('/')
        
        # Se path começar com "root:" ou estiver vazio, começar da raiz
        if path.startswith('root:'):
            # Navegação a partir da raiz do sistema
            root_path = path[5:]  # Remove "root:"
            if root_path:
                current_path = os.path.join('/', root_path)
            else:
                current_path = '/'
        else:
            # Navegação relativa ao diretório padrão
            current_path = os.path.join(default_base_path, path)
    else:
        # Por padrão, começar no diretório do projeto
        current_path = default_base_path
    
    # Normalizar caminho para prevenir path traversal
    current_path = os.path.normpath(current_path)
    
    # Permitir acesso a TODOS os diretórios, incluindo críticos
    # is_restricted_path agora só bloqueia escrita/deleção, não visualização
    
    if not os.path.exists(current_path) or not os.path.isdir(current_path):
        # Se não existir, tentar ir para a raiz, senão usar o padrão
        if os.path.exists('/') and os.path.isdir('/'):
            current_path = '/'
        else:
            current_path = default_base_path
    
    # Calcular tamanhos de pastas por padrão (pode ser lento para pastas muito grandes)
    # Usuário pode desabilitar com ?calculate_sizes=false se necessário
    calculate_sizes = request.GET.get('calculate_sizes', 'true').lower() != 'false'
    
    items = list_directory(current_path, calculate_dir_sizes=calculate_sizes)
    current_info = get_file_info(current_path, calculate_dir_size=False)
    
    # Calcular caminho relativo para navegação
    # Se estiver na raiz, usar caminho absoluto
    if current_path == '/':
        rel_path = 'root:'
        breadcrumb_parts = [('Raiz', 'root:')]
    elif current_path.startswith('/'):
        # Caminho absoluto a partir da raiz
        rel_path = 'root:' + current_path.lstrip('/')
        parts = current_path.strip('/').split(os.sep)
        breadcrumb_parts = [('Raiz', 'root:')]
        current_breadcrumb_path = ''
        for part in parts:
            if part:
                current_breadcrumb_path = os.path.join(current_breadcrumb_path, part) if current_breadcrumb_path else part
                breadcrumb_parts.append((part, 'root:' + current_breadcrumb_path))
    else:
        # Caminho relativo ao diretório padrão
        rel_path = os.path.relpath(current_path, default_base_path)
        if rel_path == '.':
            rel_path = ''
        breadcrumb_parts = []
        if rel_path:
            parts = rel_path.split(os.sep)
            current_breadcrumb_path = ''
            for part in parts:
                if part:
                    current_breadcrumb_path = os.path.join(current_breadcrumb_path, part) if current_breadcrumb_path else part
                    breadcrumb_parts.append((part, current_breadcrumb_path))
    
    # Verificar se o diretório atual é read-only
    from .utils import is_read_only_path
    is_read_only = is_read_only_path(current_path)
    
    context = {
        'items': items,
        'current_path': current_path,
        'rel_path': rel_path,
        'breadcrumb_parts': breadcrumb_parts,
        'base_path': default_base_path,
        'current_info': current_info,
        'is_root': current_path == '/',
        'is_read_only': is_read_only,
    }
    
    return render(request, 'files/index.html', context)


@jwt_login_required
@require_http_methods(["GET"])
def file_view(request, path):
    """Visualizar/editar arquivo"""
    current_file = os.path.abspath(__file__)
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    filepath = os.path.join(base_path, path)
    filepath = os.path.normpath(filepath)
    
    if not filepath.startswith(base_path) or is_restricted_path(filepath):
        raise Http404("Arquivo não encontrado")
    
    if not os.path.exists(filepath) or os.path.isdir(filepath):
        raise Http404("Arquivo não encontrado")
    
    file_info = get_file_info(filepath)
    
    # Tentar ler conteúdo se for arquivo de texto
    content = None
    editable = False
    ext = os.path.splitext(filepath)[1].lower()
    editable_extensions = ['.txt', '.json', '.py', '.js', '.html', '.css', '.md', '.yml', '.yaml', '.env', '.conf', '.config']
    
    if ext in editable_extensions:
        try:
            content = read_file_content(filepath)
            editable = True
        except:
            pass
    
    context = {
        'file_info': file_info,
        'content': content,
        'editable': editable,
        'rel_path': path,
    }
    
    return render(request, 'files/file.html', context)


@jwt_login_required
@require_http_methods(["POST"])
def file_save(request, path):
    """Salvar conteúdo de arquivo"""
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
    filepath = os.path.join(base_path, path)
    filepath = os.path.normpath(filepath)
    
    if not filepath.startswith(base_path) or is_restricted_path(filepath):
        return JsonResponse({'error': 'Operação não permitida'}, status=403)
    
    try:
        content = request.POST.get('content', '')
        write_file_content(filepath, content)
        return JsonResponse({'success': True, 'message': 'Arquivo salvo com sucesso'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@jwt_login_required
@require_http_methods(["POST"])
def file_delete(request):
    """Deletar arquivo ou diretório"""
    current_file = os.path.abspath(__file__)
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    path = request.POST.get('path', '')
    
    # Construir caminho completo
    if path.startswith('root:'):
        filepath = os.path.join('/', path[5:])
    else:
        filepath = os.path.join(base_path, path)
    
    filepath = os.path.normpath(filepath)
    
    # Verificar se está em diretório restrito (bloquear escrita/deleção)
    if is_restricted_path(filepath):
        return JsonResponse({'error': 'Não é permitido deletar em diretórios críticos do sistema'}, status=403)
    
    try:
        safe_delete(filepath)
        return JsonResponse({'success': True, 'message': 'Deletado com sucesso'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@jwt_login_required
@require_http_methods(["POST"])
def file_upload(request):
    """Upload de arquivo"""
    current_file = os.path.abspath(__file__)
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    current_path = request.POST.get('path', '')
    
    if current_path:
        upload_path = os.path.join(base_path, current_path)
        upload_path = os.path.normpath(upload_path)
        if not upload_path.startswith(base_path) or is_restricted_path(upload_path):
            upload_path = base_path
    else:
        upload_path = base_path
    
    if request.FILES:
        form = UploadFileForm(request.POST, request.FILES)
        if form.is_valid():
            uploaded_file = request.FILES['file']
            filepath = os.path.join(upload_path, uploaded_file.name)
            
            if is_restricted_path(filepath):
                return JsonResponse({'error': 'Operação não permitida'}, status=403)
            
            try:
                with open(filepath, 'wb+') as destination:
                    for chunk in uploaded_file.chunks():
                        destination.write(chunk)
                return JsonResponse({'success': True, 'message': 'Arquivo enviado com sucesso'})
            except Exception as e:
                return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Nenhum arquivo enviado'}, status=400)


@jwt_login_required
@require_http_methods(["POST"])
def file_create(request):
    """Criar novo arquivo"""
    current_file = os.path.abspath(__file__)
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    current_path = request.POST.get('path', '')
    name = request.POST.get('name', '')
    
    if not name:
        return JsonResponse({'error': 'Nome do arquivo é obrigatório'}, status=400)
    
    if current_path:
        create_path = os.path.join(base_path, current_path)
        create_path = os.path.normpath(create_path)
        if not create_path.startswith(base_path) or is_restricted_path(create_path):
            create_path = base_path
    else:
        create_path = base_path
    
    try:
        safe_create_file(create_path, name)
        return JsonResponse({'success': True, 'message': 'Arquivo criado com sucesso'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@jwt_login_required
@require_http_methods(["POST"])
def directory_create(request):
    """Criar novo diretório"""
    current_file = os.path.abspath(__file__)
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    current_path = request.POST.get('path', '')
    name = request.POST.get('name', '')
    
    if not name:
        return JsonResponse({'error': 'Nome do diretório é obrigatório'}, status=400)
    
    if current_path:
        create_path = os.path.join(base_path, current_path)
        create_path = os.path.normpath(create_path)
        if not create_path.startswith(base_path) or is_restricted_path(create_path):
            create_path = base_path
    else:
        create_path = base_path
    
    try:
        safe_create_directory(create_path, name)
        return JsonResponse({'success': True, 'message': 'Diretório criado com sucesso'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@jwt_login_required
@require_http_methods(["GET"])
def file_download(request, path):
    """Download de arquivo"""
    current_file = os.path.abspath(__file__)
    base_path = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(current_file))))
    filepath = os.path.join(base_path, path)
    filepath = os.path.normpath(filepath)
    
    if not filepath.startswith(base_path) or is_restricted_path(filepath):
        raise Http404("Arquivo não encontrado")
    
    if not os.path.exists(filepath) or os.path.isdir(filepath):
        raise Http404("Arquivo não encontrado")
    
    with open(filepath, 'rb') as f:
        response = HttpResponse(f.read(), content_type='application/octet-stream')
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(filepath)}"'
        return response


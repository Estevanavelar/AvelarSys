from django.shortcuts import render, redirect, get_object_or_404
from apps.core.jwt_auth import jwt_login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from .models import Domain, DNSRecord, DNSHistory
from .forms import DomainForm, DNSRecordForm
from .utils import (
    check_dns_propagation, create_cloudflare_record, update_cloudflare_record,
    delete_cloudflare_record, sync_cloudflare_records,
    discover_system_domains, discover_system_dns_records, query_dns_records
)


@jwt_login_required
def dns_view(request):
    """Página principal de gerenciamento DNS"""
    # Verificar se deve sincronizar automaticamente
    auto_sync = request.GET.get('sync', 'false').lower() == 'true'
    
    # Descobrir domínios do sistema
    system_domains = discover_system_domains()
    
    # Integrar domínios descobertos ao banco de dados
    domains_created = 0
    records_created = 0
    
    if auto_sync:
        for domain_name in system_domains:
            # Criar domínio se não existir
            domain, created = Domain.objects.get_or_create(
                name=domain_name,
                defaults={
                    'provider': 'system',
                }
            )
            
            if created:
                domains_created += 1
            
            # Fazer queries DNS e criar/atualizar registros
            try:
                records = query_dns_records(domain_name)
                for record_data in records:
                    record, rec_created = DNSRecord.objects.get_or_create(
                        domain=domain,
                        type=record_data['type'],
                        name=record_data['name'],
                        defaults={
                            'content': record_data['content'],
                            'ttl': record_data.get('ttl', 3600),
                        }
                    )
                    if rec_created:
                        records_created += 1
                    else:
                        # Atualizar conteúdo se mudou
                        if record.content != record_data['content']:
                            record.content = record_data['content']
                            record.save()
            except Exception as e:
                pass
        
        if domains_created > 0 or records_created > 0:
            messages.success(
                request, 
                f'Sincronização concluída! {domains_created} domínio(s) e {records_created} registro(s) DNS criados/atualizados.'
            )
    
    # Domínios do banco de dados (agora inclui os sincronizados)
    db_domains = Domain.objects.all()
    db_records = DNSRecord.objects.select_related('domain').all()
    
    # Criar lista combinada de domínios
    all_domains_list = []
    db_domain_names = {d.name for d in db_domains}
    
    # Adicionar domínios do sistema que não estão no banco
    for domain_name in system_domains:
        if domain_name not in db_domain_names:
            all_domains_list.append({
                'name': domain_name,
                'provider': 'system',
                'source': 'nginx/docker/env',
                'is_system': True,
            })
    
    # Adicionar domínios do banco
    for domain in db_domains:
        all_domains_list.append({
            'name': domain.name,
            'provider': domain.provider,
            'source': 'database',
            'is_system': False,
            'id': domain.id,
        })
    
    # Criar lista combinada de registros
    all_records_list = []
    
    # Descobrir registros do sistema (apenas para domínios não no banco)
    system_domains_not_in_db = [d for d in system_domains if d not in db_domain_names]
    for domain_name in system_domains_not_in_db:
        try:
            records = query_dns_records(domain_name)
            for record in records:
                all_records_list.append({
                    'type': record['type'],
                    'name': record['name'],
                    'content': record['content'],
                    'domain': domain_name,
                    'source': 'dns_query',
                    'is_system': True,
                })
        except Exception:
            pass
    
    # Adicionar registros do banco
    for record in db_records:
        all_records_list.append({
            'type': record.type,
            'name': record.name,
            'content': record.content,
            'domain': record.domain.name,
            'source': 'database',
            'is_system': False,
            'id': record.id,
        })
    
    context = {
        'domains': db_domains,
        'records': db_records,
        'system_domains': all_domains_list,
        'system_records': all_records_list,
        'total_domains': len(all_domains_list),
        'total_records': len(all_records_list),
        'auto_sync': auto_sync,
    }
    
    return render(request, 'dns/index.html', context)


@jwt_login_required
def domain_create(request):
    """Criar novo domínio"""
    if request.method == 'POST':
        form = DomainForm(request.POST)
        if form.is_valid():
            domain = form.save()
            messages.success(request, f'Domínio {domain.name} criado com sucesso!')
            return redirect('dns')
    else:
        form = DomainForm()
    
    return render(request, 'dns/domain_form.html', {'form': form, 'action': 'Criar'})


@jwt_login_required
def domain_edit(request, pk):
    """Editar domínio"""
    domain = get_object_or_404(Domain, pk=pk)
    
    if request.method == 'POST':
        form = DomainForm(request.POST, instance=domain)
        if form.is_valid():
            form.save()
            messages.success(request, f'Domínio {domain.name} atualizado com sucesso!')
            return redirect('dns')
    else:
        form = DomainForm(instance=domain)
    
    return render(request, 'dns/domain_form.html', {'form': form, 'domain': domain, 'action': 'Editar'})


@jwt_login_required
def domain_delete(request, pk):
    """Deletar domínio"""
    domain = get_object_or_404(Domain, pk=pk)
    domain_name = domain.name
    
    # Se for GET, mostrar confirmação
    if request.method == 'GET':
        return render(request, 'dns/domain_confirm_delete.html', {
            'domain': domain
        })
    
    # Se for POST, deletar
    if request.method == 'POST':
        domain.delete()
        messages.success(request, f'Domínio {domain_name} deletado com sucesso!')
        return redirect('dns')
    
    # Método não permitido
    return redirect('dns')


@jwt_login_required
def record_create(request):
    """Criar novo registro DNS"""
    if request.method == 'POST':
        form = DNSRecordForm(request.POST)
        if form.is_valid():
            record = form.save(commit=False)
            
            # Tentar criar no Cloudflare se configurado
            if record.domain.provider == 'cloudflare' and record.domain.api_token:
                try:
                    cloudflare_result = create_cloudflare_record(
                        record.domain.name,
                        record.type,
                        record.name,
                        record.content,
                        record.ttl,
                        record.proxied
                    )
                    record.cloudflare_id = cloudflare_result['id']
                    record.save()
                    
                    # Registrar histórico
                    DNSHistory.objects.create(
                        record=record,
                        action='create',
                        user=request.user,
                        new_value=f"{record.type} {record.name} -> {record.content}"
                    )
                    
                    messages.success(request, f'Registro DNS criado com sucesso!')
                    return redirect('dns')
                except Exception as e:
                    messages.error(request, f'Erro ao criar no Cloudflare: {str(e)}')
            else:
                record.save()
                DNSHistory.objects.create(
                    record=record,
                    action='create',
                    user=request.user,
                    new_value=f"{record.type} {record.name} -> {record.content}"
                )
                messages.success(request, f'Registro DNS criado com sucesso!')
                return redirect('dns')
    else:
        form = DNSRecordForm()
    
    return render(request, 'dns/record_form.html', {'form': form, 'action': 'Criar'})


@jwt_login_required
def record_edit(request, pk):
    """Editar registro DNS"""
    record = get_object_or_404(DNSRecord, pk=pk)
    old_value = f"{record.type} {record.name} -> {record.content}"
    
    if request.method == 'POST':
        form = DNSRecordForm(request.POST, instance=record)
        if form.is_valid():
            record = form.save(commit=False)
            
            # Tentar atualizar no Cloudflare se configurado
            if record.domain.provider == 'cloudflare' and record.domain.api_token and record.cloudflare_id:
                try:
                    update_cloudflare_record(
                        record.cloudflare_id,
                        record.domain.name,
                        record.content,
                        record.ttl,
                        record.proxied
                    )
                    record.save()
                    
                    # Registrar histórico
                    DNSHistory.objects.create(
                        record=record,
                        action='update',
                        user=request.user,
                        old_value=old_value,
                        new_value=f"{record.type} {record.name} -> {record.content}"
                    )
                    
                    messages.success(request, f'Registro DNS atualizado com sucesso!')
                    return redirect('dns')
                except Exception as e:
                    messages.error(request, f'Erro ao atualizar no Cloudflare: {str(e)}')
            else:
                record.save()
                DNSHistory.objects.create(
                    record=record,
                    action='update',
                    user=request.user,
                    old_value=old_value,
                    new_value=f"{record.type} {record.name} -> {record.content}"
                )
                messages.success(request, f'Registro DNS atualizado com sucesso!')
                return redirect('dns')
    else:
        form = DNSRecordForm(instance=record)
    
    return render(request, 'dns/record_form.html', {'form': form, 'record': record, 'action': 'Editar'})


@jwt_login_required
@require_http_methods(["POST"])
def record_delete(request, pk):
    """Deletar registro DNS"""
    record = get_object_or_404(DNSRecord, pk=pk)
    old_value = f"{record.type} {record.name} -> {record.content}"
    
    # Tentar deletar no Cloudflare se configurado
    if record.domain.provider == 'cloudflare' and record.domain.api_token and record.cloudflare_id:
        try:
            delete_cloudflare_record(record.cloudflare_id, record.domain.name)
        except Exception as e:
            messages.error(request, f'Erro ao deletar no Cloudflare: {str(e)}')
    
    # Registrar histórico antes de deletar
    DNSHistory.objects.create(
        record=record,
        action='delete',
        user=request.user,
        old_value=old_value
    )
    
    record.delete()
    messages.success(request, 'Registro DNS deletado com sucesso!')
    return redirect('dns')


@jwt_login_required
@require_http_methods(["POST"])
def domain_sync(request, pk):
    """Sincronizar registros DNS do Cloudflare"""
    domain = get_object_or_404(Domain, pk=pk)
    
    try:
        count = sync_cloudflare_records(domain.name)
        messages.success(request, f'{count} registros sincronizados com sucesso!')
    except Exception as e:
        messages.error(request, f'Erro ao sincronizar: {str(e)}')
    
    return redirect('dns')


@jwt_login_required
def check_propagation(request, pk):
    """Verificar propagação DNS"""
    record = get_object_or_404(DNSRecord, pk=pk)
    
    result = check_dns_propagation(record.domain.name, record.type, record.name)
    
    return JsonResponse(result)


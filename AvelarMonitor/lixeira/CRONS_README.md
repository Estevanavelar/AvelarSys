# Módulo de Trabalhos Agendados (Crons)

## Funcionalidades Implementadas

### 1. Interface Web Completa
- **Listagem de Trabalhos**: Visualização de todos os trabalhos agendados com estatísticas
- **Criação de Trabalhos**: Formulário completo para criar novos trabalhos agendados
- **Edição de Trabalhos**: Modificar trabalhos existentes
- **Execução Manual**: Executar trabalhos imediatamente
- **Ativar/Desativar**: Controle de ativação de trabalhos
- **Histórico de Execuções**: Visualizar histórico e resultados

### 2. Tipos de Tarefas Suportadas
- **Reiniciar Frontend**: Reinicia o container `avelarsys-frontend-prod`
- **Reiniciar Backend**: Reinicia o container `avelarsys-backend-prod`
- **Reiniciar Container**: Reinicia um container específico (nome configurável)
- **Backup de Banco de Dados**: Faz backup do banco de dados
- **Limpar Logs**: Limpa logs antigos
- **Comando Customizado**: Executa qualquer comando shell

### 3. Recorrências Suportadas
- **Uma vez**: Executa apenas uma vez na data/hora especificada
- **Diariamente**: Executa todos os dias no horário especificado
- **Semanalmente**: Executa toda semana no dia e horário especificados
- **Mensalmente**: Executa todo mês no dia e horário especificados
- **Personalizado (Cron)**: Usa expressão cron customizada (ex: `0 2 * * *`)

### 4. Sistema de Agendamento
- **APScheduler**: Usa APScheduler para gerenciar execuções
- **Agendamento Automático**: Tarefas são agendadas automaticamente ao criar/editar
- **Inicialização Automática**: Scheduler inicia automaticamente com o Django
- **Persistência**: Trabalhos são salvos no banco de dados SQLite

## Instalação

1. **Instalar dependências**:
```bash
cd painel
pip install -r requirements.txt
```

2. **Criar migrações**:
```bash
python manage.py makemigrations crons
python manage.py migrate
```

3. **Iniciar o scheduler** (opcional - inicia automaticamente):
```bash
python manage.py start_scheduler
```

## Uso

### Acessar a Interface
1. Acesse o painel: `http://localhost:8000`
2. Faça login
3. Clique em "Crons" no menu lateral

### Criar um Trabalho para Reiniciar Frontend Diariamente

1. Clique em "Criar Novo Trabalho"
2. Preencha:
   - **Nome**: "Reiniciar Frontend Diariamente"
   - **Tipo de Tarefa**: "Reiniciar Frontend"
   - **Data/Hora Agendada**: Escolha a data e hora da primeira execução
   - **Recorrência**: "Diariamente"
   - **Ativo**: Marque a checkbox
3. Clique em "Salvar"

### Criar um Trabalho com Expressão Cron

1. Clique em "Criar Novo Trabalho"
2. Preencha:
   - **Nome**: "Reiniciar Frontend às 2h"
   - **Tipo de Tarefa**: "Reiniciar Frontend"
   - **Data/Hora Agendada**: Qualquer data (será ignorada)
   - **Recorrência**: "Personalizado (Cron)"
   - **Expressão Cron**: `0 2 * * *` (diariamente às 2h)
   - **Ativo**: Marque a checkbox
3. Clique em "Salvar"

### Executar Trabalho Manualmente

1. Na listagem de trabalhos, clique no ícone de "play" (▶) ou
2. Acesse os detalhes do trabalho e clique em "Executar Agora"

## Estrutura de Arquivos

```
apps/crons/
├── models.py          # Modelos ScheduledTask e TaskExecution
├── views.py           # Views para CRUD de trabalhos
├── forms.py           # Formulários Django
├── urls.py            # URLs do app
├── utils.py           # Funções para executar tarefas
├── scheduler.py       # Sistema de agendamento com APScheduler
├── apps.py            # Configuração do app (inicia scheduler)
├── admin.py           # Interface admin Django
└── management/
    └── commands/
        └── start_scheduler.py  # Comando para iniciar scheduler manualmente

templates/crons/
├── index.html         # Listagem de trabalhos
├── form.html          # Formulário criar/editar
├── detail.html        # Detalhes e histórico
└── delete_confirm.html  # Confirmação de exclusão
```

## Notas Importantes

1. **Scheduler Automático**: O scheduler inicia automaticamente quando o Django inicia. Se precisar iniciar manualmente, use:
   ```bash
   python manage.py start_scheduler
   ```

2. **Timezone**: O scheduler usa o timezone `America/Sao_Paulo`. Para alterar, edite `apps/crons/scheduler.py`.

3. **Permissões Docker**: O sistema precisa de permissões para executar comandos Docker. Certifique-se de que o usuário tem acesso ao Docker.

4. **Logs**: Os logs do scheduler são salvos no logger Django. Configure logging no `settings.py` para ver os logs.

5. **Expressão Cron**: Formato: `minuto hora dia mês dia-da-semana`
   - Exemplo: `0 2 * * *` = Diariamente às 2h
   - Exemplo: `0 0 1 * *` = Todo dia 1 do mês à meia-noite
   - Exemplo: `0 0 * * 0` = Todo domingo à meia-noite

## Próximos Passos (Opcional)

- [ ] Adicionar notificações por email quando tarefas falharem
- [ ] Adicionar mais tipos de tarefas (backup real, limpeza de cache, etc)
- [ ] Dashboard com gráficos de execuções
- [ ] Exportar histórico de execuções
- [ ] Suporte a grupos de trabalhos
- [ ] Execução condicional (executar apenas se outra tarefa foi bem-sucedida)


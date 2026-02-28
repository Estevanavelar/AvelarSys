from django import forms
from .models import ScheduledTask


class ScheduledTaskForm(forms.ModelForm):
    """Formulário para criar/editar trabalho agendado"""
    
    class Meta:
        model = ScheduledTask
        fields = [
            'name', 'task_type', 'description', 'scheduled_date', 
            'recurrence', 'cron_expression', 'container_name', 
            'custom_command', 'is_active'
        ]
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Ex: Reiniciar Frontend Diariamente'
            }),
            'task_type': forms.Select(attrs={'class': 'form-control'}),
            'description': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'Descrição opcional do trabalho'
            }),
            'scheduled_date': forms.DateTimeInput(attrs={
                'class': 'form-control',
                'type': 'datetime-local'
            }),
            'recurrence': forms.Select(attrs={'class': 'form-control'}),
            'cron_expression': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': '0 2 * * * (diariamente às 2h)',
                'pattern': r'^(\*|([0-9]|[1-5][0-9])|\*) (\*|([0-9]|[1-2][0-9]|3[0-1])|\*) (\*|([1-9]|1[0-2])|\*) (\*|([0-6])|\*)$'
            }),
            'container_name': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'avelarsys-frontend-prod'
            }),
            'custom_command': forms.Textarea(attrs={
                'class': 'form-control',
                'rows': 3,
                'placeholder': 'docker restart avelarsys-frontend-prod'
            }),
            'is_active': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ajustar formato de data para datetime-local
        if self.instance and self.instance.scheduled_date:
            self.initial['scheduled_date'] = self.instance.scheduled_date.strftime('%Y-%m-%dT%H:%M')
    
    def clean(self):
        cleaned_data = super().clean()
        task_type = cleaned_data.get('task_type')
        container_name = cleaned_data.get('container_name')
        custom_command = cleaned_data.get('custom_command')
        recurrence = cleaned_data.get('recurrence')
        cron_expression = cleaned_data.get('cron_expression')
        
        # Validar container_name para tarefas de container
        if task_type == 'restart_container' and not container_name:
            raise forms.ValidationError({
                'container_name': 'Nome do container é obrigatório para este tipo de tarefa.'
            })
        
        # Validar custom_command para tarefas customizadas
        if task_type == 'custom_command' and not custom_command:
            raise forms.ValidationError({
                'custom_command': 'Comando customizado é obrigatório para este tipo de tarefa.'
            })
        
        # Validar cron_expression para recorrência custom
        if recurrence == 'custom' and not cron_expression:
            raise forms.ValidationError({
                'cron_expression': 'Expressão Cron é obrigatória para recorrência personalizada.'
            })
        
        return cleaned_data


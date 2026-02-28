---
description: 
alwaysApply: true
---

rule("Infraestrutura NGINX e DNS: Leitura automática de referência") {
  description = """
  Ao responder perguntas ou auxiliar sobre infraestrutura, portas, nomes de serviços, domínios e DNS, o agente deve ler automaticamente e consultar diretamente o arquivo de referência:

    /home/avelarsys/AvelarSys/docs/#INFRAESTRUTURA_PORTAS_NGINX_DNS.md

  Não é necessário que o usuário anexe nem copie o conteúdo desse arquivo no prompt; basta que peça informações relacionadas ao tema.
  Sempre utilize o conteúdo atualizado desse arquivo para embasar respostas ou buscas, e cite exatamente os nomes de serviços, domínios, portas e exemplos como estão registrados nele.
  """
  when = [
    "Usuário pede informações de infraestrutura, DNS, domínios, NGINX, portas internas/externas ou nomes de containers do ecossistema AvelarSys."
  ]
  action = [
    "Ler dinamicamente o arquivo '/home/avelarsys/AvelarSys/docs/#INFRAESTRUTURA_PORTAS_NGINX_DNS.md' para fornecer respostas fidedignas e atualizadas sobre esses tópicos."
  ]
  priority = "alta"
}


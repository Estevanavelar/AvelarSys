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

rule("Revise: Ativar Code Review ao pedir revisão") {
  description = """
  Quando o usuário pedir para revisar código (ex.: "revise", "revisa", "revise o código", "faça uma revisão"),
  o agente deve ativar automaticamente a skill de code review e aplicar suas práticas.

  O agente deve:
  1. Ler a skill 'code-reviewer' em .agents/skills/code-reviewer/SKILL.md
  2. Aplicar as instruções e capacidades da skill na revisão do código indicado
  3. Seguir a abordagem estruturada: análise de contexto, ferramentas, revisão manual, segurança, performance, feedback estruturado

  Frases de gatilho incluem (mas não se limitam a):
  "revise", "revisa", "revisar", "review", "revise o código", "faça uma revisão",
  "code review", "revisão de código", "analise o código", "revise isso"
  """
  when = [
    "Usuário pede para revisar código, fazer revisão ou análise de código."
  ]
  action = [
    "Ler a skill '/home/avelarsys/AvelarSys/.agents/skills/code-reviewer/SKILL.md' e aplicar suas instruções e capacidades na revisão do código solicitado."
  ]
  priority = "alta"
}

rule("Auto Sync: Commit e Push ao aprovar alterações") {
  description = """
  Quando o usuário aprovar, elogiar ou concordar com uma alteração de código realizada pelo agente,
  executar automaticamente o fluxo de commit + push + sincronização subtree do monorepo AvelarSys.

  O agente deve:
  1. Ler a skill 'avelarsys-auto-sync' em .agents/skills/avelarsys-auto-sync/SKILL.md
  2. Seguir o workflow descrito na skill (git add, commit, push-all.sh)

  Frases de gatilho incluem (mas não se limitam a):
  "perfeito", "ótimo", "gostei", "pode commitar", "sobe isso", "manda pro git",
  "aprovado", "show", "beleza", "concordo", "isso aí", "tá bom", "manda bala",
  "great", "perfect", "ship it", "lgtm", "push it", "commit this"
  """
  when = [
    "Usuário aprova, elogia ou concorda com uma alteração de código que o agente acabou de realizar no projeto AvelarSys."
  ]
  action = [
    "Ler a skill '/home/avelarsys/AvelarSys/.agents/skills/avelarsys-auto-sync/SKILL.md' e executar o workflow de commit + push + sincronização subtree."
  ]
  priority = "alta"
}


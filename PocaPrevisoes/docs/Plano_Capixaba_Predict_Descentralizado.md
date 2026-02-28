# Plano de Implementação: Capixaba Predict
## Mercado de Previsões Descentralizado do Espírito Santo

Este documento consolida a arquitetura técnica do "Guia Completo: Sistema de Mercado de Previsões" com a estratégia de implementação descentralizada (Web3) focada regionalmente no estado do Espírito Santo.

---

## 1. Visão Geral
O **Capixaba Predict** é uma plataforma de mercado de previsões onde usuários negociam contratos sobre o resultado de eventos futuros específicos do Espírito Santo. Ao contrário de plataformas globais, o foco aqui é a "inteligência local", cobrindo desde política municipal até indicadores agrícolas e climáticos regionais.

### Diferencial Estratégico
*   **Hiper-localismo:** Mercados que só interessam e são compreendidos por quem vive no ES.
*   **Descentralização:** Uso de Blockchain para garantir transparência, segurança e baixo custo operacional.
*   **Comunidade:** Incentivos para especialistas locais atuarem como fornecedores de liquidez.

---

## 2. Arquitetura Técnica Descentralizada
Substituindo o modelo centralizado (caro e complexo) por uma infraestrutura Web3 eficiente.

### Stack Tecnológico
*   **Rede Blockchain:** Polygon (PoS) ou Gnosis Chain. Escolhidas pelo custo de transação próximo de zero e alta velocidade.
*   **Protocolo de Contratos:** *Conditional Tokens Framework* (CTF). Permite a criação de ativos que representam resultados binários (SIM/NÃO).
*   **Moeda de Troca:** USDC (Stablecoin pareada ao dólar) ou uma stablecoin de Real (BRZ) para facilitar a entrada de capital local.
*   **Frontend:** React + Next.js hospedado na Vercel/Netlify (custo zero inicial).
*   **Wallet:** Integração com Metamask e WalletConnect.

### Fluxo de Operação (Smart Contracts)
1.  **Criação do Mercado:** Um contrato define a pergunta, as opções e a data de fechamento.
2.  **Custódia:** O dinheiro dos apostadores fica travado no contrato inteligente, não com a plataforma.
3.  **Negociação:** Uso de um **AMM (Automated Market Maker)** para garantir que sempre haja liquidez para compra e venda.
4.  **Resolução:** Integração com o **UMA Optimistic Oracle** para validar o resultado final.

---

## 3. Mercados e Oráculos Capixabas
A "verdade" dos fatos será extraída de fontes oficiais do estado.

| Categoria | Exemplo de Mercado | Fonte de Dados (Oráculo) |
| :--- | :--- | :--- |
| **Política** | "Quem vencerá a prefeitura de Vitória em 2028?" | TRE-ES |
| **Clima** | "A temperatura em Domingos Martins cairá abaixo de 5°C em Julho?" | Incaper |
| **Economia** | "O preço da saca de café conilon passará de R$ 1.200?" | SEFAZ-ES / CEPEA |
| **Infraestrutura** | "A obra do Portal do Príncipe será concluída até a data X?" | Portal da Transparência ES |
| **Cultura** | "Qual escola de samba será campeã do Carnaval de Vitória?" | LIESGE |

---

## 4. Economia da Plataforma (Tokenomics)
Diferente do modelo centralizado que lucra com taxas bancárias, o lucro aqui vem da eficiência do protocolo.

*   **Taxa de Protocolo:** 1% a 2% sobre cada negociação, destinada ao tesouro da plataforma para manutenção e marketing.
*   **Liquidez:** Usuários que "emprestam" capital para os mercados (Liquidity Providers) recebem uma parte das taxas geradas.
*   **Token de Governança ($MOQUECA):** Token opcional para premiar os usuários mais ativos e permitir que a comunidade vote em quais novos mercados devem ser abertos.

---

## 5. Aspectos Legais e Mitigação de Riscos
A descentralização altera o perfil de risco jurídico:

*   **Sem Custódia Direta:** Como a plataforma não toca no dinheiro (quem toca é o código na blockchain), ela se posiciona como uma interface de software, não como uma casa de apostas tradicional.
*   **Fase de Testes (Play Money):** Recomendamos iniciar com um token sem valor financeiro para validar o sistema e criar base de usuários antes de migrar para valores reais.
*   **Conformidade Cripto:** Alinhamento com as novas diretrizes do Banco Central para prestadores de serviços de ativos virtuais (2026).

---

## 6. Roadmap de Implementação

### Fase 1: Fundação (Mês 1-2)
*   Desenvolvimento dos Smart Contracts na Testnet (Polygon Mumbai).
*   Criação da interface básica focada em UX simples para o público capixaba.
*   Parceria com 5 influenciadores locais para teste fechado.

### Fase 2: Lançamento Regional (Mês 3-6)
*   Deploy na Mainnet com mercados de baixo valor.
*   Foco em eventos de grande engajamento (ex: Carnaval de Vitória ou Eleições).
*   Implementação do sistema de oráculos automáticos via API do governo do ES.

### Fase 3: Expansão e Governança (Mês 6+)
*   Lançamento do token de governança.
*   Abertura para mercados criados pela própria comunidade.
*   Integração com sistemas de pagamento locais (PIX para Cripto).

---
**Nota Final:** O sucesso do Capixaba Predict depende da confiança na resolução dos mercados. O uso de fontes oficiais do Espírito Santo como oráculos é o pilar central desta proposta.

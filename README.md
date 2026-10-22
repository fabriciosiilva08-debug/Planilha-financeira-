# 📈 Planilha de Investimentos com atualização automática

Planilha no **Google Sheets** que atualiza sozinha, todos os dias, as cotações e o valor da sua carteira:

| O que | De onde vem | Precisa de cadastro? |
|---|---|---|
| Ações, FIIs, ETFs, BDRs | [brapi.dev](https://brapi.dev) ou GOOGLEFINANCE | Não (brapi é opcional e grátis, porém mais completa) |
| Tesouro Direto | Arquivo público de preços do Tesouro Transparente | Não |
| CDB, LCI, LCA, debêntures (% CDI, CDI+, Prefixado, IPCA+) | CDI e IPCA da API do Banco Central | Não |
| Criptomoedas | CoinGecko | Não |
| Negociações da bolsa | Extrato da Área do Investidor da B3 (importação com 1 clique) | Conta gov.br na B3 |
| **Saldos direto dos bancos/corretoras** | **Open Finance via Pluggy** (opcional) | Sim, veja abaixo |

---

## 1. Instalação (5 minutos)

1. Crie uma planilha nova em [sheets.new](https://sheets.new).
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo de `Código.gs` e cole todo o conteúdo de [`apps-script/Codigo.gs`](apps-script/Codigo.gs). Salve (💾).
4. Volte para a planilha e **recarregue a página**. Vai aparecer o menu **📈 Investimentos**.
5. Clique em **📈 Investimentos → Criar/organizar abas**. Na primeira vez o Google pede autorização:
   *Revisar permissões → sua conta → Avançado → Acessar projeto (não seguro) → Permitir*.
   (O aviso aparece porque o script é seu e não foi verificado pelo Google. O código está todo aqui, pode conferir.)
6. Clique em **📈 Investimentos → Ativar atualização automática**. A planilha passa a se atualizar todo dia por volta das 11h, 14h e 18h, mesmo com ela fechada.

> Confira o fuso em **Arquivo → Configurações → Fuso horário** (deixe *São Paulo*).

## 2. Cadastrando seus investimentos

### Aba `Lançamentos` (bolsa, Tesouro, cripto)
Uma linha por compra ou venda:

| Data | Operação | Classe | Ativo | Quantidade | Preço unitário | Taxas |
|---|---|---|---|---|---|---|
| 10/01/2025 | Compra | Ação | PETR4 | 100 | 35,20 | 4,90 |
| 15/02/2025 | Compra | FII | HGLG11 | 10 | 160,00 | 0 |
| 03/03/2025 | Compra | Tesouro Direto | Tesouro IPCA+ 2035 | 0,52 | 1.950,00 | 0 |
| 05/03/2025 | Compra | Cripto | BTC | 0,005 | 350.000,00 | 0 |

- **Tesouro Direto:** escreva o nome igual ao do site do Tesouro + ano de vencimento, por exemplo `Tesouro Selic 2029`, `Tesouro Prefixado 2031`, `Tesouro IPCA+ com Juros Semestrais 2035`, `Tesouro Renda+ Aposentadoria Extra 2065`. Se houver dois títulos do mesmo tipo com o mesmo ano, use a data completa: `Tesouro IPCA+ 15/05/2035`.
- **Cripto:** use o símbolo (BTC, ETH, SOL...) ou o *id* do CoinGecko para moedas menos conhecidas.
- **Classe "Outro":** sem fonte automática. Preencha o preço à mão na aba `Cotações` e ele fica guardado.

### Aba `Renda Fixa` (CDB, LCI, LCA...)
| Nome | Instituição | Data aplicação | Valor aplicado | Indexador | Taxa (%) | Vencimento |
|---|---|---|---|---|---|---|
| CDB Liquidez | Nubank | 02/01/2025 | 5.000,00 | % CDI | 100 | |
| LCI 2027 | Inter | 10/03/2025 | 10.000,00 | % CDI | 95 | 10/03/2027 |
| CDB Pré | XP | 01/04/2025 | 3.000,00 | Prefixado | 13,5 | 01/04/2028 |
| CDB IPCA | BTG | 01/05/2025 | 4.000,00 | IPCA + | 6,2 | 01/05/2030 |

A **Taxa** é sempre um número em %: `110` = 110% do CDI, `13,5` = 13,5% a.a., `6,2` = IPCA + 6,2% a.a.
O script calcula o **valor bruto estimado** (antes de IR/IOF) com o CDI e o IPCA oficiais do Banco Central. Pode haver pequenas diferenças em relação ao extrato do banco, principalmente no IPCA+.

## 3. Importar automaticamente da B3 (sem digitar nada)

Tudo o que você compra na bolsa fica registrado na B3, em qualquer corretora:

1. Entre em [investidor.b3.com.br](https://www.investidor.b3.com.br) com sua conta gov.br.
2. **Extratos → Negociação**, escolha o período e baixe o arquivo Excel.
3. Abra o arquivo, copie tudo (com o cabeçalho) e cole na célula **A1** da aba `Importar B3`.
4. **📈 Investimentos → Importar negociações da B3.**

Pode repetir quando quiser: o que já foi importado não é duplicado. Confira a coluna *Classe* depois, porque o script presume que tickers terminados em 11 são FIIs, com exceção dos ETFs mais conhecidos.

## 4. Cotações melhores com a brapi (recomendado, grátis)

O GOOGLEFINANCE funciona sem cadastro, mas às vezes falha em FIIs e BDRs. Para usar a brapi:
1. Crie uma conta em [brapi.dev](https://brapi.dev/dashboard) e copie seu token.
2. **📈 Investimentos → Configurar token da brapi** e cole o token.

Com 3 atualizações por dia você fica bem dentro do limite do plano gratuito.

## 5. Conectar bancos e corretoras pelo Open Finance (opcional)

Os bancos brasileiros não liberam API direto para pessoa física. O caminho é passar por um **agregador autorizado de Open Finance**, e a planilha já vem pronta para a [Pluggy](https://pluggy.ai):

1. Crie uma conta de desenvolvedor em [dashboard.pluggy.ai](https://dashboard.pluggy.ai) e crie uma aplicação. Copie o **Client ID** e o **Client Secret**.
2. Conecte suas instituições (pelo [Meu Pluggy](https://meu.pluggy.ai) ou pelo widget de conexão do painel). Cada conexão gera um **Item ID**.
3. **📈 Investimentos → Configurar credenciais Pluggy** e informe Client ID, Client Secret e os Item IDs separados por vírgula.
4. **📈 Investimentos → Sincronizar Open Finance.** Os investimentos aparecem na aba `Open Finance` e entram na `Carteira` e no `Resumo`.

> ⚠️ Não cadastre em `Lançamentos`/`Renda Fixa` um investimento que já vem pelo Open Finance, senão ele conta duas vezes.
> Confira os planos e condições da Pluggy antes de usar. Para uso pessoal costuma existir opção gratuita ou de teste, mas isso pode mudar.
> As credenciais ficam nas *propriedades do script* e não aparecem em nenhuma célula da planilha.

## 6. As abas

| Aba | Para que serve |
|---|---|
| **Resumo** | Total investido × valor atual por classe, rentabilidade e gráfico de distribuição |
| **Carteira** | Posição de cada ativo: quantidade, preço médio, cotação, lucro/prejuízo, % da carteira |
| **Lançamentos** | Suas compras e vendas (você preenche ou importa da B3) |
| **Renda Fixa** | Seus CDBs/LCIs/LCAs (você preenche, o script atualiza o valor) |
| **Cotações** | Últimos preços baixados (gerada automaticamente) |
| **Histórico** | Uma linha por dia com o patrimônio total e o gráfico de evolução |
| **Open Finance** | Investimentos vindos dos bancos via Pluggy |
| **Importar B3** | Área para colar o extrato da B3 |

As abas **Carteira**, **Resumo** e **Cotações** são refeitas a cada atualização. Não escreva nada nelas, exceto o preço manual de ativos da classe "Outro" em `Cotações`.

## Problemas comuns

- **Menu não aparece:** recarregue a planilha (F5).
- **"Título não encontrado" no Tesouro:** confira o nome do título (seção 2).
- **Cotação igual ao preço médio:** a fonte não retornou preço. Veja os avisos no fim da aba `Resumo`.
- **Ver erros detalhados:** Apps Script → *Execuções*.

/**
 * Planilha de Investimentos com atualização automática
 * Google Sheets + Apps Script
 *
 * Fontes de dados:
 *  - Ações, FIIs, ETFs e BDRs (B3): brapi.dev (com token gratuito) ou GOOGLEFINANCE (sem token)
 *  - Tesouro Direto: arquivo público de preços do Tesouro Transparente
 *  - Renda fixa (CDB, LCI, LCA...): CDI e IPCA da API do Banco Central (SGS)
 *  - Criptomoedas: CoinGecko
 *  - Bancos/corretoras (opcional): Open Finance via Pluggy
 */

const ABAS = {
  RESUMO: 'Resumo',
  CARTEIRA: 'Carteira',
  LANCAMENTOS: 'Lançamentos',
  RENDA_FIXA: 'Renda Fixa',
  COTACOES: 'Cotações',
  HISTORICO: 'Histórico',
  OPEN_FINANCE: 'Open Finance',
  IMPORTAR_B3: 'Importar B3',
};

const CABECALHOS = {
  [ABAS.CARTEIRA]: ['Classe', 'Ativo', 'Quantidade', 'Preço médio', 'Custo total', 'Cotação', 'Valor atual', 'Resultado R$', 'Resultado %', '% da carteira'],
  [ABAS.LANCAMENTOS]: ['Data', 'Operação', 'Classe', 'Ativo', 'Quantidade', 'Preço unitário', 'Taxas', 'Total', 'Observação'],
  [ABAS.RENDA_FIXA]: ['Nome', 'Instituição', 'Data aplicação', 'Valor aplicado', 'Indexador', 'Taxa (%)', 'Vencimento', 'Valor bruto atual', 'Rendimento R$', 'Rendimento %', 'Atualizado em'],
  [ABAS.COTACOES]: ['Ativo', 'Classe', 'Preço', 'Variação dia', 'Fonte', 'Atualizado em'],
  [ABAS.HISTORICO]: ['Data', 'Investido', 'Valor atual', 'Resultado R$'],
  [ABAS.OPEN_FINANCE]: ['Instituição', 'Nome', 'Tipo', 'Subtipo', 'Código', 'Quantidade', 'Valor investido', 'Saldo atual', 'Data do saldo', 'Atualizado em'],
};

const CLASSES = ['Ação', 'FII', 'ETF', 'BDR', 'Tesouro Direto', 'Cripto', 'Outro'];
const CLASSES_B3 = ['Ação', 'FII', 'ETF', 'BDR'];
const INDEXADORES = ['% CDI', 'CDI +', 'Prefixado', 'IPCA +'];
const HORARIOS_ATUALIZACAO = [11, 14, 18];

const URL_TESOURO = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv';
const URL_PLUGGY = 'https://api.pluggy.ai';

const ETFS_CONHECIDOS = ['BOVA11', 'IVVB11', 'SMAL11', 'HASH11', 'BOVV11', 'DIVO11', 'NASD11', 'SPXI11', 'XINA11', 'GOLD11', 'ECOO11', 'BRAX11', 'FIND11', 'MATB11', 'PIBB11', 'ACWI11', 'EURP11', 'QBTC11', 'QETH11', 'ETHE11', 'BITH11', 'IMAB11', 'FIXA11', 'B5P211', 'IRFM11', 'LFTS11', 'NTNS11'];

const CRIPTO_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin',
  XRP: 'ripple', ADA: 'cardano', DOGE: 'dogecoin', DOT: 'polkadot', MATIC: 'matic-network', POL: 'polygon-ecosystem-token',
  LINK: 'chainlink', AVAX: 'avalanche-2', LTC: 'litecoin', TRX: 'tron', TON: 'the-open-network',
};

const TIPOS_PLUGGY = {
  FIXED_INCOME: 'Renda Fixa', EQUITY: 'Ação', ETF: 'ETF', MUTUAL_FUND: 'Fundos',
  SECURITY: 'Previdência', COE: 'COE', OTHER: 'Outro',
};

const FMT_REAIS = '"R$" #,##0.00';
const FMT_PCT = '0.00%';
const FMT_DATA = 'dd/mm/yyyy';
const FMT_DATA_HORA = 'dd/mm/yyyy hh:mm';

/* ======================================================================
 * Menu
 * ==================================================================== */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('📈 Investimentos')
    .addItem('Criar/organizar abas', 'configurarPlanilha')
    .addItem('Atualizar tudo agora', 'atualizarTudo')
    .addSeparator()
    .addItem('Importar negociações da B3', 'importarB3')
    .addItem('Sincronizar Open Finance (Pluggy)', 'sincronizarOpenFinance')
    .addSeparator()
    .addItem('Ativar atualização automática', 'ativarAtualizacaoAutomatica')
    .addItem('Desativar atualização automática', 'desativarAtualizacaoAutomatica')
    .addSeparator()
    .addItem('Configurar token da brapi', 'configurarTokenBrapi')
    .addItem('Configurar credenciais Pluggy', 'configurarPluggy')
    .addToUi();
}

function configurarPlanilha() {
  const ss = SpreadsheetApp.getActive();
  const ordem = [ABAS.RESUMO, ABAS.CARTEIRA, ABAS.LANCAMENTOS, ABAS.RENDA_FIXA, ABAS.COTACOES, ABAS.HISTORICO, ABAS.OPEN_FINANCE, ABAS.IMPORTAR_B3];

  ordem.forEach((nome, i) => {
    let sh = ss.getSheetByName(nome);
    if (!sh) sh = ss.insertSheet(nome, i);
    const cab = CABECALHOS[nome];
    if (cab && sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, cab.length).setValues([cab])
        .setFontWeight('bold').setBackground('#1f4e78').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  });

  // Lançamentos
  const lanc = ss.getSheetByName(ABAS.LANCAMENTOS);
  lanc.getRange('A2:A').setNumberFormat(FMT_DATA)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  lanc.getRange('B2:B').setDataValidation(lista_(['Compra', 'Venda']));
  lanc.getRange('C2:C').setDataValidation(lista_(CLASSES));
  lanc.getRange('E2:E').setNumberFormat('#,##0.########');
  lanc.getRange('F2:H').setNumberFormat(FMT_REAIS);
  lanc.getRange('H2').setFormula('=ARRAYFORMULA(IF(E2:E="",,E2:E*F2:F+IF(B2:B="Venda",-G2:G,G2:G)))');

  // Renda Fixa
  const rf = ss.getSheetByName(ABAS.RENDA_FIXA);
  rf.getRange('C2:C').setNumberFormat(FMT_DATA);
  rf.getRange('G2:G').setNumberFormat(FMT_DATA);
  rf.getRange('D2:D').setNumberFormat(FMT_REAIS);
  rf.getRange('E2:E').setDataValidation(lista_(INDEXADORES));
  rf.getRange('F2:F').setNumberFormat('0.00');
  rf.getRange('H2:I').setNumberFormat(FMT_REAIS);
  rf.getRange('J2:J').setNumberFormat(FMT_PCT);
  rf.getRange('K2:K').setNumberFormat(FMT_DATA_HORA);
  rf.getRange('F1').setNote('Sempre em %, como número:\n• % CDI: 110 = 110% do CDI\n• CDI +: 2 = CDI + 2% a.a.\n• Prefixado: 12,5 = 12,5% a.a.\n• IPCA +: 6 = IPCA + 6% a.a.');

  const imp = ss.getSheetByName(ABAS.IMPORTAR_B3);
  if (imp.getLastRow() === 0) {
    imp.getRange('A1').setNote('Cole aqui (a partir da A1, com o cabeçalho) o conteúdo do Excel de "Negociação" baixado na Área do Investidor da B3 e use o menu 📈 Investimentos > Importar negociações da B3.');
  }

  // Remove a aba padrão vazia, se existir
  ['Página1', 'Sheet1', 'Planilha1'].forEach(n => {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });

  notificar_('Abas prontas! Preencha "Lançamentos" e/ou "Renda Fixa" e clique em Atualizar tudo agora.');
}

/* ======================================================================
 * Atualização
 * ==================================================================== */

function atualizarTudo() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) return;
  const erros = [];
  const etapa = (nome, fn) => {
    try { fn(); } catch (e) { erros.push(`${nome}: ${e.message}`); console.error(nome, e); }
  };
  try {
    etapa('Open Finance', () => sincronizarOpenFinance_());
    etapa('Cotações', () => atualizarCotacoes_(erros));
    etapa('Renda Fixa', () => atualizarRendaFixa_());
    etapa('Carteira', () => montarCarteira_());
    SpreadsheetApp.flush();
    etapa('Resumo', () => montarResumo_(erros));
    etapa('Histórico', () => registrarHistorico_());
  } finally {
    lock.releaseLock();
  }
  notificar_(erros.length ? `Atualizado com avisos: ${erros.join(' | ')}` : 'Carteira atualizada!');
}

function ativarAtualizacaoAutomatica() {
  removerGatilhos_();
  HORARIOS_ATUALIZACAO.forEach(h => {
    ScriptApp.newTrigger('atualizarTudo').timeBased().atHour(h).everyDays(1).inTimezone(fuso_()).create();
  });
  notificar_(`Atualização automática ativada (todos os dias por volta de ${HORARIOS_ATUALIZACAO.join('h, ')}h).`);
}

function desativarAtualizacaoAutomatica() {
  removerGatilhos_();
  notificar_('Atualização automática desativada.');
}

function removerGatilhos_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'atualizarTudo')
    .forEach(t => ScriptApp.deleteTrigger(t));
}

/* ======================================================================
 * Posições (a partir dos lançamentos)
 * ==================================================================== */

function calcularPosicoes_() {
  const posicoes = {};
  lerTabela_(ABAS.LANCAMENTOS)
    .filter(l => l[3] && numero_(l[4]) > 0)
    .sort((a, b) => dataEmMs_(a[0]) - dataEmMs_(b[0]))
    .forEach(l => {
      const classe = l[2] || 'Outro';
      const chave = String(l[3]).trim().toUpperCase();
      const nome = CLASSES_B3.includes(classe) || classe === 'Cripto' ? chave : String(l[3]).trim();
      const qtd = numero_(l[4]);
      const preco = numero_(l[5]);
      const taxas = numero_(l[6]);
      const p = posicoes[chave] || (posicoes[chave] = { chave, ativo: nome, classe, qtd: 0, custo: 0 });
      p.classe = classe;
      if (String(l[1]).trim().toLowerCase().startsWith('v')) {
        // Venda: baixa a quantidade pelo preço médio
        const precoMedio = p.qtd > 0 ? p.custo / p.qtd : 0;
        const vendida = Math.min(qtd, p.qtd);
        p.custo -= precoMedio * vendida;
        p.qtd -= vendida;
      } else {
        p.qtd += qtd;
        p.custo += qtd * preco + taxas;
      }
    });
  return Object.values(posicoes).filter(p => p.qtd > 1e-9);
}

/* ======================================================================
 * Cotações
 * ==================================================================== */

function atualizarCotacoes_(erros) {
  const posicoes = calcularPosicoes_();
  const sh = aba_(ABAS.COTACOES);
  const anteriores = {};
  lerTabela_(ABAS.COTACOES).forEach(r => { if (r[0]) anteriores[String(r[0]).trim().toUpperCase()] = r; });

  const token = PropertiesService.getScriptProperties().getProperty('BRAPI_TOKEN');
  const agora = new Date();
  const precos = {};

  const b3 = posicoes.filter(p => CLASSES_B3.includes(p.classe));
  if (b3.length && token) {
    Object.assign(precos, cotacoesBrapi_(b3.map(p => p.ativo), token, erros));
  }

  const cripto = posicoes.filter(p => p.classe === 'Cripto');
  if (cripto.length) {
    try { Object.assign(precos, cotacoesCripto_(cripto.map(p => p.ativo))); } catch (e) { erros.push(`CoinGecko: ${e.message}`); }
  }

  let tesouro = {};
  if (posicoes.some(p => p.classe === 'Tesouro Direto')) {
    try { tesouro = precosTesouro_(); } catch (e) { erros.push(`Tesouro: ${e.message}`); }
  }

  const linhas = posicoes.map(p => {
    const anterior = anteriores[p.chave];
    if (CLASSES_B3.includes(p.classe) && !token) {
      return [p.ativo, p.classe,
        `=IFERROR(GOOGLEFINANCE("BVMF:${p.ativo}"),"")`,
        `=IFERROR(GOOGLEFINANCE("BVMF:${p.ativo}","changepct")/100,"")`,
        'Google Finance', agora];
    }
    if (p.classe === 'Tesouro Direto') {
      const t = tesouro[normalizar_(p.ativo)];
      if (t) return [p.ativo, p.classe, t.pu, '', `Tesouro (${t.dataBase})`, agora];
    }
    const q = precos[p.chave];
    if (q) return [p.ativo, p.classe, q.preco, q.variacao, q.fonte, agora];

    // Sem fonte automática (classe "Outro", ou falha): mantém o preço já informado
    if (anterior && anterior[2] !== '') {
      return [p.ativo, p.classe, anterior[2], anterior[3], anterior[4], anterior[5]];
    }
    return [p.ativo, p.classe, '', '', p.classe === 'Tesouro Direto' ? 'Título não encontrado — confira o nome' : 'Manual — preencha o preço', ''];
  });

  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 6).clearContent();
  if (linhas.length) {
    sh.getRange(2, 1, linhas.length, 6).setValues(linhas);
    sh.getRange(2, 3, linhas.length, 1).setNumberFormat(FMT_REAIS);
    sh.getRange(2, 4, linhas.length, 1).setNumberFormat(FMT_PCT);
    sh.getRange(2, 6, linhas.length, 1).setNumberFormat(FMT_DATA_HORA);
  }
}

function cotacoesBrapi_(tickers, token, erros) {
  const pedidos = tickers.map(t => ({
    url: `https://brapi.dev/api/quote/${encodeURIComponent(t)}?token=${encodeURIComponent(token)}`,
    muteHttpExceptions: true,
  }));
  const respostas = UrlFetchApp.fetchAll(pedidos);
  const precos = {};
  respostas.forEach((r, i) => {
    if (r.getResponseCode() !== 200) {
      erros.push(`brapi ${tickers[i]}: HTTP ${r.getResponseCode()}`);
      return;
    }
    const q = (JSON.parse(r.getContentText()).results || [])[0];
    if (q && q.regularMarketPrice != null) {
      precos[tickers[i]] = {
        preco: q.regularMarketPrice,
        variacao: q.regularMarketChangePercent != null ? q.regularMarketChangePercent / 100 : '',
        fonte: 'brapi',
      };
    }
  });
  return precos;
}

function cotacoesCripto_(simbolos) {
  const ids = {};
  simbolos.forEach(s => { ids[s] = CRIPTO_IDS[s] || s.toLowerCase(); });
  const url = 'https://api.coingecko.com/api/v3/simple/price?vs_currencies=brl&include_24hr_change=true&ids='
    + encodeURIComponent(Object.values(ids).join(','));
  const dados = buscarJson_(url);
  const precos = {};
  simbolos.forEach(s => {
    const d = dados[ids[s]];
    if (d && d.brl != null) {
      precos[s] = { preco: d.brl, variacao: d.brl_24h_change != null ? d.brl_24h_change / 100 : '', fonte: 'CoinGecko' };
    }
  });
  return precos;
}

/**
 * Preços do Tesouro Direto (PU base da manhã) do arquivo público do Tesouro Transparente.
 * O arquivo é grande, então é baixado no máximo uma vez por dia (cache nas propriedades do script).
 * Chaves aceitas: "Tesouro IPCA+ 2035" ou "Tesouro IPCA+ 15/05/2035" (normalizadas).
 */
function precosTesouro_() {
  const props = PropertiesService.getScriptProperties();
  const hoje = Utilities.formatDate(new Date(), fuso_(), 'yyyy-MM-dd');
  const cache = props.getProperty('TESOURO_CACHE');
  if (cache) {
    const c = JSON.parse(cache);
    if (c.dia === hoje) return c.precos;
  }

  const csv = UrlFetchApp.fetch(URL_TESOURO).getContentText('ISO-8859-1');
  const precos = interpretarCsvTesouro_(csv);
  props.setProperty('TESOURO_CACHE', JSON.stringify({ dia: hoje, precos }));
  return precos;
}

function interpretarCsvTesouro_(csv) {
  const linhas = csv.split(/\r?\n/);
  const cab = linhas[0].split(';').map(normalizar_);
  const iTipo = cab.findIndex(c => c.startsWith('tipotitulo'));
  const iVenc = cab.indexOf('datavencimento');
  const iBase = cab.indexOf('database');
  let iPU = cab.indexOf('pubasemanha');
  if (iPU < 0) iPU = cab.indexOf('puvendamanha');
  if ([iTipo, iVenc, iBase, iPU].some(i => i < 0)) throw new Error('formato do arquivo do Tesouro mudou');

  const ultimos = {};
  let maiorBase = 0;
  for (let i = 1; i < linhas.length; i++) {
    const c = linhas[i].split(';');
    if (c.length <= Math.max(iTipo, iVenc, iBase, iPU)) continue;
    const base = dataBrNum_(c[iBase]);
    const chave = c[iTipo] + '|' + c[iVenc];
    if (!ultimos[chave] || base > ultimos[chave].base) {
      ultimos[chave] = { tipo: c[iTipo], venc: c[iVenc], base, dataBase: c[iBase], pu: numero_(c[iPU]) };
    }
    if (base > maiorBase) maiorBase = base;
  }

  // Mantém só títulos com preço recente (os vencidos ficam de fora e o cache fica pequeno)
  const precos = {};
  const paraData = n => new Date(Math.floor(n / 10000), Math.floor(n / 100) % 100 - 1, n % 100);
  const limite = paraData(maiorBase).getTime() - 30 * 864e5;
  Object.values(ultimos)
    .filter(t => paraData(t.base).getTime() >= limite)
    .forEach(t => {
      const valor = { pu: t.pu, dataBase: t.dataBase };
      precos[normalizar_(t.tipo + t.venc)] = valor;
      precos[normalizar_(t.tipo + t.venc.slice(-4))] = valor;
    });
  return precos;
}

/* ======================================================================
 * Renda fixa (CDB, LCI, LCA, debêntures...) — valor bruto estimado
 * ==================================================================== */

function atualizarRendaFixa_() {
  const sh = aba_(ABAS.RENDA_FIXA);
  const dados = lerTabela_(ABAS.RENDA_FIXA);
  const valida = l => l[0] && l[2] instanceof Date && numero_(l[3]) > 0 && l[4];
  const validas = dados.filter(valida);
  if (!validas.length) return;

  const inicio = new Date(Math.min(...validas.map(l => l[2].getTime())));
  const hoje = new Date();
  const cdi = serieBCB_(12, inicio, hoje);
  const ipca = validas.some(l => /IPCA/i.test(l[4])) ? serieBCB_(433, inicio, hoje) : [];

  const saida = dados.map(l => {
    if (!valida(l)) return [l[7], l[8], l[9], l[10]];
    const aplicado = numero_(l[3]);
    const fator = fatorRendaFixa_(String(l[4]), numero_(l[5]), l[2], l[6], cdi, ipca);
    const atual = aplicado * fator;
    return [atual, atual - aplicado, fator - 1, new Date()];
  });
  sh.getRange(2, 8, saida.length, 4).setValues(saida);
}

/**
 * Fator de correção bruto (sem IR/IOF).
 * cdi: [{data, valor}] com o CDI diário em % ao dia (série SGS 12) — também serve de calendário de dias úteis.
 * ipca: [{data, valor}] com o IPCA mensal em % (série SGS 433).
 */
function fatorRendaFixa_(indexador, taxa, dataAplicacao, vencimento, cdi, ipca) {
  const agora = new Date();
  const fim = vencimento instanceof Date && vencimento < agora ? vencimento : agora;
  const dias = cdi.filter(d => d.data >= dataAplicacao && d.data < fim);
  const anos = dias.length / 252;
  const ind = indexador.toUpperCase();

  if (ind.includes('%')) {
    return dias.reduce((f, d) => f * (1 + (d.valor / 100) * (taxa / 100)), 1);
  }
  if (ind.includes('CDI')) {
    return dias.reduce((f, d) => f * (1 + d.valor / 100), 1) * Math.pow(1 + taxa / 100, anos);
  }
  if (ind.includes('IPCA')) {
    const fatorIpca = ipca
      .filter(m => m.data >= dataAplicacao && m.data < fim)
      .reduce((f, m) => f * (1 + m.valor / 100), 1);
    return fatorIpca * Math.pow(1 + taxa / 100, anos);
  }
  return Math.pow(1 + taxa / 100, anos); // Prefixado
}

/** Busca uma série do SGS/Banco Central em janelas de até ~9 anos (limite da API para séries diárias). */
function serieBCB_(codigo, inicio, fim) {
  const resultado = [];
  const fmt = d => Utilities.formatDate(d, fuso_(), 'dd/MM/yyyy');
  let ini = new Date(inicio);
  while (ini <= fim) {
    const fimJanela = new Date(Math.min(fim.getTime(), ini.getTime() + 9 * 365 * 864e5));
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${fmt(ini)}&dataFinal=${fmt(fimJanela)}`;
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) {
      JSON.parse(r.getContentText()).forEach(p => {
        resultado.push({ data: dataBr_(p.data), valor: parseFloat(p.valor) });
      });
    } else if (r.getResponseCode() !== 404) {
      throw new Error(`Banco Central HTTP ${r.getResponseCode()}`);
    }
    ini = new Date(fimJanela.getTime() + 864e5);
  }
  return resultado;
}

/* ======================================================================
 * Carteira, Resumo e Histórico
 * ==================================================================== */

function montarCarteira_() {
  const sh = aba_(ABAS.CARTEIRA);
  const linhas = [];

  calcularPosicoes_()
    .sort((a, b) => a.classe.localeCompare(b.classe) || a.ativo.localeCompare(b.ativo))
    .forEach(p => {
      const r = linhas.length + 2;
      // 1/(1/x) transforma cotação vazia ou zero em erro, e aí cai no preço médio
      linhas.push([p.classe, p.ativo, p.qtd, p.custo / p.qtd, p.custo,
        `=IFERROR(1/(1/VLOOKUP(B${r},'${ABAS.COTACOES}'!A:C,3,FALSE)),D${r})`]);
    });

  lerTabela_(ABAS.RENDA_FIXA)
    .filter(l => l[0] && numero_(l[3]) > 0)
    .forEach(l => {
      const aplicado = numero_(l[3]);
      const atual = numero_(l[7]) || aplicado;
      linhas.push(['Renda Fixa', `${l[0]}${l[1] ? ' (' + l[1] + ')' : ''}`, 1, aplicado, aplicado, atual]);
    });

  lerTabela_(ABAS.OPEN_FINANCE)
    .filter(l => l[1] && numero_(l[7]) > 0)
    .forEach(l => {
      const saldo = numero_(l[7]);
      const investido = numero_(l[6]) || saldo;
      linhas.push([l[2] || 'Outro', `[Open Finance] ${l[0]} - ${l[1]}`, 1, investido, investido, saldo]);
    });

  const completas = linhas.map((l, i) => {
    const r = i + 2;
    return l.concat([`=C${r}*F${r}`, `=G${r}-E${r}`, `=IF(E${r}=0,"",H${r}/E${r})`, `=IFERROR(G${r}/SUM($G$2:$G),0)`]);
  });

  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 10).clearContent();
  if (completas.length) {
    sh.getRange(2, 1, completas.length, 10).setValues(completas);
    sh.getRange(2, 3, completas.length, 1).setNumberFormat('#,##0.########');
    sh.getRange(2, 4, completas.length, 5).setNumberFormat(FMT_REAIS);
    sh.getRange(2, 9, completas.length, 2).setNumberFormat(FMT_PCT);
  }
}

function montarResumo_(erros) {
  const sh = aba_(ABAS.RESUMO);
  sh.clear();
  sh.getCharts().forEach(c => sh.removeChart(c));

  const classes = [...new Set(lerTabela_(ABAS.CARTEIRA).map(l => l[0]).filter(String))];
  const c = `'${ABAS.CARTEIRA}'!`;

  sh.getRange('A1').setValue('Resumo da carteira').setFontSize(16).setFontWeight('bold');
  sh.getRange('A2:B2').setValues([['Atualizado em', new Date()]]);
  sh.getRange('B2').setNumberFormat(FMT_DATA_HORA);

  const cab = ['Classe', 'Investido', 'Valor atual', 'Resultado R$', 'Resultado %', '% da carteira'];
  sh.getRange(4, 1, 1, cab.length).setValues([cab])
    .setFontWeight('bold').setBackground('#1f4e78').setFontColor('#ffffff');

  const linhas = classes.map((cl, i) => {
    const r = i + 5;
    return [cl, `=SUMIF(${c}A:A,A${r},${c}E:E)`, `=SUMIF(${c}A:A,A${r},${c}G:G)`,
      `=C${r}-B${r}`, `=IF(B${r}=0,"",D${r}/B${r})`, `=IFERROR(C${r}/C$${classes.length + 5},0)`];
  });
  const rTotal = classes.length + 5;
  linhas.push(['Total', `=SUM(B5:B${rTotal - 1})`, `=SUM(C5:C${rTotal - 1})`,
    `=C${rTotal}-B${rTotal}`, `=IF(B${rTotal}=0,"",D${rTotal}/B${rTotal})`, `=IF(C${rTotal}=0,0,1)`]);

  sh.getRange(5, 1, linhas.length, 6).setValues(linhas);
  sh.getRange(5, 2, linhas.length, 3).setNumberFormat(FMT_REAIS);
  sh.getRange(5, 5, linhas.length, 2).setNumberFormat(FMT_PCT);
  sh.getRange(rTotal, 1, 1, 6).setFontWeight('bold').setBorder(true, null, null, null, null, null);

  if (erros.length) {
    sh.getRange(rTotal + 2, 1).setValue('Avisos da última atualização:').setFontWeight('bold').setFontColor('#c00000');
    sh.getRange(rTotal + 3, 1, erros.length, 1).setValues(erros.map(e => [e]));
  }

  if (classes.length) {
    sh.insertChart(sh.newChart().asPieChart()
      .addRange(sh.getRange(4, 1, classes.length + 1, 1))
      .addRange(sh.getRange(4, 3, classes.length + 1, 1))
      .setOption('title', 'Distribuição por classe')
      .setOption('pieHole', 0.4)
      .setPosition(4, 8, 0, 0)
      .build());
  }
  sh.autoResizeColumns(1, 6);
}

function registrarHistorico_() {
  const carteira = lerTabela_(ABAS.CARTEIRA);
  if (!carteira.length) return;
  const investido = carteira.reduce((s, l) => s + numero_(l[4]), 0);
  const atual = carteira.reduce((s, l) => s + numero_(l[6]), 0);

  const sh = aba_(ABAS.HISTORICO);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const datas = lerTabela_(ABAS.HISTORICO).map(l => dataEmMs_(l[0]));
  const idx = datas.indexOf(hoje.getTime());
  const linha = idx >= 0 ? idx + 2 : sh.getLastRow() + 1;

  sh.getRange(linha, 1, 1, 4).setValues([[hoje, investido, atual, atual - investido]]);
  sh.getRange(linha, 1).setNumberFormat(FMT_DATA);
  sh.getRange(linha, 2, 1, 3).setNumberFormat(FMT_REAIS);

  if (!sh.getCharts().length) {
    sh.insertChart(sh.newChart().asLineChart()
      .addRange(sh.getRange('A1:C1000'))
      .setOption('title', 'Evolução do patrimônio')
      .setPosition(2, 6, 0, 0)
      .build());
  }
}

/* ======================================================================
 * Importação da B3 (Área do Investidor > Extratos > Negociação)
 * ==================================================================== */

function importarB3() {
  const dados = aba_(ABAS.IMPORTAR_B3).getDataRange().getValues();
  if (dados.length < 2) {
    notificar_('Cole o extrato de Negociação da B3 na aba "Importar B3" (com o cabeçalho) e tente de novo.');
    return;
  }

  const cab = dados[0].map(normalizar_);
  const col = (...nomes) => cab.findIndex(c => nomes.some(n => c.includes(n)));
  const iData = col('datadonegocio', 'data');
  const iTipo = col('tipodemovimentacao', 'compravenda', 'movimentacao');
  const iCodigo = col('codigodenegociacao', 'codigo');
  const iQtd = col('quantidade');
  const iPreco = col('preco');
  if ([iData, iTipo, iCodigo, iQtd, iPreco].some(i => i < 0)) {
    notificar_('Não reconheci as colunas. O cabeçalho precisa ter: Data do Negócio, Tipo de Movimentação, Código de Negociação, Quantidade e Preço.');
    return;
  }

  const chave = (data, op, ativo, qtd, preco) =>
    [Utilities.formatDate(new Date(data), fuso_(), 'yyyy-MM-dd'), op, ativo, numero_(qtd), numero_(preco).toFixed(4)].join('|');
  const existentes = new Set(lerTabela_(ABAS.LANCAMENTOS)
    .filter(l => l[0] && l[3])
    .map(l => chave(l[0], l[1], String(l[3]).toUpperCase(), l[4], l[5])));

  const novos = [];
  dados.slice(1).forEach(l => {
    if (!l[iCodigo] || !l[iData]) return;
    const data = l[iData] instanceof Date ? l[iData] : dataBr_(String(l[iData]));
    const op = /venda/i.test(l[iTipo]) ? 'Venda' : 'Compra';
    // Mercado fracionário: PETR4F -> PETR4
    const ativo = String(l[iCodigo]).trim().toUpperCase().replace(/^([A-Z0-9]{4}\d{1,2})F$/, '$1');
    const k = chave(data, op, ativo, l[iQtd], l[iPreco]);
    if (existentes.has(k)) return;
    existentes.add(k);
    novos.push([data, op, classificarTicker_(ativo), ativo, numero_(l[iQtd]), numero_(l[iPreco]), '', '', 'Importado da B3']);
  });

  if (novos.length) {
    const sh = aba_(ABAS.LANCAMENTOS);
    // Escreve A:G e I separadamente para não sobrescrever a fórmula da coluna H
    const inicio = proximaLinhaVazia_(sh, 1);
    sh.getRange(inicio, 1, novos.length, 7).setValues(novos.map(n => n.slice(0, 7)));
    sh.getRange(inicio, 9, novos.length, 1).setValues(novos.map(n => [n[8]]));
  }
  notificar_(`${novos.length} negociação(ões) importada(s). Confira a coluna "Classe" (FIIs e ETFs terminam em 11).`);
}

function classificarTicker_(ticker) {
  if (ETFS_CONHECIDOS.includes(ticker)) return 'ETF';
  if (/3[2-5]$/.test(ticker)) return 'BDR';
  if (/11$/.test(ticker)) return 'FII';
  return 'Ação';
}

/* ======================================================================
 * Open Finance via Pluggy (opcional)
 * ==================================================================== */

function sincronizarOpenFinance() {
  try {
    if (!sincronizarOpenFinance_()) {
      notificar_('Configure as credenciais da Pluggy primeiro (menu > Configurar credenciais Pluggy).');
      return;
    }
    montarCarteira_();
    notificar_('Investimentos do Open Finance sincronizados!');
  } catch (e) {
    notificar_(`Erro no Open Finance: ${e.message}`);
  }
}

function sincronizarOpenFinance_() {
  const props = PropertiesService.getScriptProperties();
  const clientId = props.getProperty('PLUGGY_CLIENT_ID');
  const clientSecret = props.getProperty('PLUGGY_CLIENT_SECRET');
  const itens = (props.getProperty('PLUGGY_ITEM_IDS') || '').split(',').map(s => s.trim()).filter(String);
  if (!clientId || !clientSecret || !itens.length) return false;

  const auth = UrlFetchApp.fetch(`${URL_PLUGGY}/auth`, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ clientId, clientSecret }),
    muteHttpExceptions: true,
  });
  if (auth.getResponseCode() !== 200) throw new Error(`autenticação Pluggy falhou (HTTP ${auth.getResponseCode()})`);
  const headers = { 'X-API-KEY': JSON.parse(auth.getContentText()).apiKey };

  const agora = new Date();
  const linhas = [];
  itens.forEach(itemId => {
    const item = buscarJson_(`${URL_PLUGGY}/items/${itemId}`, headers);
    const instituicao = (item.connector && item.connector.name) || itemId;
    let pagina = 1;
    let totalPaginas = 1;
    do {
      const r = buscarJson_(`${URL_PLUGGY}/investments?itemId=${itemId}&page=${pagina}&pageSize=100`, headers);
      (r.results || [])
        .filter(inv => inv.status !== 'TOTAL_WITHDRAWAL')
        .forEach(inv => {
          linhas.push([
            instituicao, inv.name || inv.code || '', TIPOS_PLUGGY[inv.type] || inv.type || 'Outro', inv.subtype || '',
            inv.code || '', inv.quantity || '', inv.amountOriginal || inv.amount || '', inv.balance || 0,
            inv.date ? new Date(inv.date) : '', agora,
          ]);
        });
      totalPaginas = r.totalPages || 1;
      pagina++;
    } while (pagina <= totalPaginas);
  });

  const sh = aba_(ABAS.OPEN_FINANCE);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 10).clearContent();
  if (linhas.length) {
    sh.getRange(2, 1, linhas.length, 10).setValues(linhas);
    sh.getRange(2, 7, linhas.length, 2).setNumberFormat(FMT_REAIS);
    sh.getRange(2, 9, linhas.length, 1).setNumberFormat(FMT_DATA);
    sh.getRange(2, 10, linhas.length, 1).setNumberFormat(FMT_DATA_HORA);
  }
  return true;
}

/* ======================================================================
 * Configurações (guardadas nas propriedades do script, fora da planilha)
 * ==================================================================== */

function configurarTokenBrapi() {
  const valor = perguntar_('Token da brapi.dev', 'Crie uma conta grátis em https://brapi.dev, copie seu token e cole aqui.\n(Deixe em branco para usar o GOOGLEFINANCE.)');
  if (valor === null) return;
  const props = PropertiesService.getScriptProperties();
  if (valor) props.setProperty('BRAPI_TOKEN', valor); else props.deleteProperty('BRAPI_TOKEN');
  notificar_(valor ? 'Token da brapi salvo.' : 'Token removido — usando GOOGLEFINANCE.');
}

function configurarPluggy() {
  const id = perguntar_('Pluggy — Client ID', 'Cole o Client ID da sua aplicação em dashboard.pluggy.ai');
  if (id === null) return;
  const secret = perguntar_('Pluggy — Client Secret', 'Cole o Client Secret');
  if (secret === null) return;
  const itens = perguntar_('Pluggy — Item IDs', 'Cole o(s) Item ID(s) das conexões, separados por vírgula');
  if (itens === null) return;
  const props = PropertiesService.getScriptProperties();
  props.setProperties({ PLUGGY_CLIENT_ID: id, PLUGGY_CLIENT_SECRET: secret, PLUGGY_ITEM_IDS: itens });
  notificar_('Credenciais da Pluggy salvas.');
}

/* ======================================================================
 * Utilitários
 * ==================================================================== */

function aba_(nome) {
  const sh = SpreadsheetApp.getActive().getSheetByName(nome);
  if (!sh) throw new Error(`aba "${nome}" não existe — rode "Criar/organizar abas"`);
  return sh;
}

function lerTabela_(nome) {
  const sh = SpreadsheetApp.getActive().getSheetByName(nome);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

function proximaLinhaVazia_(sh, coluna) {
  const valores = sh.getRange(1, coluna, Math.max(sh.getLastRow(), 1), 1).getValues();
  for (let i = valores.length - 1; i >= 0; i--) {
    if (valores[i][0] !== '') return i + 2;
  }
  return 2;
}

function lista_(valores) {
  return SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build();
}

function buscarJson_(url, headers) {
  const r = UrlFetchApp.fetch(url, { headers: headers || {}, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error(`HTTP ${r.getResponseCode()} em ${url.split('?')[0]}`);
  return JSON.parse(r.getContentText());
}

/** Converte números em formato brasileiro ("R$ 1.234,56") ou já numéricos. */
function numero_(v) {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  let s = String(v).replace(/[R$\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizar_(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9+]/g, '');
}

/** "dd/mm/aaaa" -> Date */
function dataBr_(s) {
  const [d, m, a] = String(s).trim().split('/').map(Number);
  return new Date(a, m - 1, d);
}

/** "dd/mm/aaaa" -> aaaammdd (para comparar datas rapidamente) */
function dataBrNum_(s) {
  const [d, m, a] = String(s).trim().split('/').map(Number);
  return a * 10000 + m * 100 + d;
}

function dataEmMs_(v) {
  if (v instanceof Date) {
    const d = new Date(v);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  return v ? dataBr_(v).getTime() : 0;
}

function fuso_() {
  return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || 'America/Sao_Paulo';
}

function notificar_(msg) {
  console.log(msg);
  try { SpreadsheetApp.getActive().toast(msg, '📈 Investimentos', 8); } catch (e) { /* execução por gatilho */ }
}

function perguntar_(titulo, texto) {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(titulo, texto, ui.ButtonSet.OK_CANCEL);
  return r.getSelectedButton() === ui.Button.OK ? r.getResponseText().trim() : null;
}

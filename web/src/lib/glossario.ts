// O glossário da DRE: o que o termo quer dizer aqui e onde ele não quer dizer o mesmo. A fonte dos termos do resto da casa é o `casa.json` do OWP;
// estes dois são só do financeiro e ficam aqui até o dono decidir levá-los para lá.

export interface Termo{
    termo: string;
    sentido: string;
    /** O que o termo não é, onde a casa usa a mesma sigla para outra coisa. */
    nao_confundir?: string;
}

export const GLOSSARIO_DRE: Termo[] = [
    {
        termo: 'LAIR',
        sentido: 'Lucro Antes do Imposto de Renda, na DRE do contador: LAJIR menos o resultado financeiro (RFL), portanto depois da depreciação. É uma linha do demonstrativo do mês inteiro. Atenção: o servidor soma receita e despesa financeira num total só (auditoria A12, defeito 1), então LAIR, LOL e RLE de um mês com lançamento em RFL, RNO ou AED podem estar errados até a conta ser conferida.',
        nao_confundir: 'No OWP, "LAIR" é outra conta: por projeto, o preço comercial menos o custo contratado (equipe e operação), antes do DAS e do INSS. Os dois números não se comparam.',
    },
    {
        termo: 'Resultado do OWP',
        sentido: 'No OWP o resultado de um período é receita menos equipe, operação e impostos (DAS e INSS), em quatro linhas, sem plano de contas.',
    },
];

export interface LinhaDoOwp{
    linha: 'Receita' | 'Equipe' | 'Operação' | 'Impostos';
    contas: string[];
}

/**
 * Onde cada uma das quatro linhas do OWP cai no plano de contas. INFERIDO, A CONFIRMAR com o dono ou o contador (auditoria A12, 6.1):
 * a correspondência não é 1 para 1 (o DAS cairia em DROB_ISV, antes do ROL, e o INSS sobre o pró-labore em DO_DA_PES), e sem a regra
 * confirmada uma comparação automática entre os dois sistemas misturaria conceitos. Por isso é só texto na tela, nunca cálculo.
 */
export const MAPA_QUATRO_LINHAS: LinhaDoOwp[] = [
    { linha: 'Receita', contas: ['ROB'] },
    { linha: 'Equipe', contas: ['CO_CSP_MO', 'CO_CPV_MOD', 'parte de DO_DA_PES'] },
    { linha: 'Operação', contas: ['o resto de CO', 'o resto de DO'] },
    { linha: 'Impostos', contas: ['DROB_ISV (DAS)', 'parte de DO_DA_PES (INSS sobre o pró-labore)'] },
];

export const AVISO_DO_MAPA = 'Inferido, a confirmar com o dono ou o contador: a correspondência não é 1 para 1.';

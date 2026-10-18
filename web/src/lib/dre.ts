// A estrutura do DRE, dirigida por dados: as contas vêm de data/categories.json (o export de backend/categories.json, uma fonte), a ordem
// do demonstrativo e as linhas calculadas vêm daqui. Os totais chegam prontos de /totals/ym (getTotalsByYearMonth), com as calculadas.
import categories from '../data/categories.json';

export interface Conta{
    name: string;
    title: string;
    color: string;
    fillable: boolean;
    left: number;
    right: number;
}

export interface Linha{
    name: string;
    title: string;
    /** A cor da conta (barra à esquerda); as calculadas usam o fundo. */
    color: string;
    fillable: boolean;
    /** 0 é o grupo de topo; filhos de cada conta, um nível abaixo. */
    depth: number;
    kind: 'conta' | 'calculada';
    /** Tem filhos (a linha abre). */
    group: boolean;
}

/** A ordem do demonstrativo, de cima para baixo. As calculadas (ROL, LOB…) não são contas: o backend as deriva por subtração. */
export const ORDEM = ['ROB', 'DROB', 'ROL', 'CO', 'LOB', 'DO', 'LAJIRDA', 'DA', 'LAJIR', 'RFL', 'LAIR', 'CJS', 'LOL', 'RNO', 'AED', 'RLE'] as const;

/** As linhas calculadas: o título e a conta de subtrair que getTotalsByYearMonth faz (a lista é a do backend). */
export const CALCULADAS: Record<string, { title: string; formula: string; fundo: string }> = {
    ROL: { title: 'Receita Operacional Líquida', formula: 'ROB − DROB', fundo: '#1c4587' },
    LOB: { title: 'Lucro Operacional Bruto', formula: 'ROL − CO', fundo: '#1c4587' },
    LAJIRDA: { title: 'Lucro Antes de Juros, I.R, Deprec. e Amort.', formula: 'LOB − DO', fundo: '#1c4587' },
    LAJIR: { title: 'Lucro Antes de Juros e Impostos de Renda', formula: 'LAJIRDA − DA', fundo: '#1c4587' },
    LAIR: { title: 'Lucro Antes do Imposto de Renda', formula: 'LAJIR − RFL', fundo: '#1c4587' },
    LOL: { title: 'Lucro Operacional Líquido', formula: 'LAIR − CJS', fundo: '#1c4587' },
    RLE: { title: 'Resultado Líquido do Exercício', formula: 'LOL − RNO − AED', fundo: '#4c1130' },
};

/** O que o export do Mongo não traz: as depreciações e amortizações, geradas a partir dos bens (mapAssetsToDepreciationOperations, `DA_<tipo>`). */
const EXTRAS: Conta[] = [
    { name: 'DA', title: 'Depreciações e Amortizações', color: '#660000', fillable: false, left: 0, right: 0 },
    { name: 'DA_D', title: 'Depreciações', color: '#990000', fillable: false, left: 0, right: 0 },
    { name: 'DA_A', title: 'Amortizações', color: '#990000', fillable: false, left: 0, right: 0 },
];

/** Todas as contas, na ordem do export (a ordem da árvore); as extras no fim, onde a ordem do demonstrativo as põe. */
export const CONTAS: Conta[] = [...(categories as Conta[]), ...EXTRAS];

const depthOf = (name: string) => name.split('_').length - 1;

/** As linhas do demonstrativo, na ordem: cada grupo de topo com a sua árvore (pela ordem do export), e as calculadas entre eles. */
export function linhasDaDre(contas: Conta[] = CONTAS): Linha[]{

    const lines: Linha[] = [];

    for(const top of ORDEM){

        if(top in CALCULADAS){

            lines.push({ name: top, title: CALCULADAS[top].title, color: CALCULADAS[top].fundo, fillable: false, depth: 0, kind: 'calculada', group: false });
            continue;
        }

        const tree = contas.filter(conta => conta.name === top || conta.name.startsWith(`${top}_`)).sort((a, b) => a.left - b.left);

        // As extras não têm `left`: ficam na ordem em que foram escritas (pai antes dos filhos).
        for(const conta of tree) lines.push({
            name: conta.name, title: conta.title, color: conta.color, fillable: conta.fillable, depth: depthOf(conta.name), kind: 'conta',
            group: contas.some(other => other.name.startsWith(`${conta.name}_`)),
        });
    }

    return lines;
}

/** Há lançamento no mês? Os totais sempre trazem as linhas calculadas (zero sem dado): só uma conta com lançamento diz que há. */
export const temLancamento = (totals: Record<string, number> | null | undefined): boolean => !!totals && Object.keys(totals).some(name => !(name in CALCULADAS));

/**
 * O valor de uma linha no mês, ou `undefined` quando não há (nunca zero inventado). Conta sem lançamento no mês não tem total; a calculada
 * só vale se há lançamento no mês (sem nenhum, o backend a devolve como zero, que não é dado).
 */
export function valorDaLinha(totals: Record<string, number> | null | undefined, name: string): number | undefined{

    if(!totals || !temLancamento(totals)) return undefined;

    const value = totals[name];

    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** A parte da Receita Operacional Bruta (a base do demonstrativo) que o valor é, ou `undefined` sem receita bruta no mês. */
export function parteDaReceita(value: number | undefined, totals: Record<string, number> | null | undefined): number | undefined{

    const base = totals?.ROB;

    if(value === undefined || typeof base !== 'number' || !(base > 0)) return undefined;

    return value / base;
}

/** "12,34%" (duas casas, vírgula). */
export const formatPercent = (part: number): string => `${(part * 100).toFixed(2).replace('.', ',')}%`;

/** Contas em que se lança uma operação (as que aceitam lançamento direto), na ordem do demonstrativo, com o grupo de cada uma. */
export function contasLancaveis(lines: Linha[] = linhasDaDre()): { name: string; title: string; group: string }[]{

    const groupOf = (name: string) => lines.find(line => line.depth === 0 && (line.name === name.split('_')[0]))?.title ?? name;

    return lines.filter(line => line.kind === 'conta' && line.fillable).map(line => ({ name: line.name, title: line.title, group: groupOf(line.name) }));
}

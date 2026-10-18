// O fluxo de caixa: as parcelas das operações, pela data em que o dinheiro se move (e não pela competência), com o sinal da conta.
//
// /cash_flow/s/ym soma as parcelas sem sinal (entrada e saída entram como positivas) e não diz a conta, então o sinal não se acha nele:
// o fluxo é montado das operações do mês (/operations/ym), que trazem a categoria e as parcelas. Não há saldo inicial no sistema: o
// que se mostra é o movimento do período, nunca um saldo.
import type { Competencia } from './competencia';

export interface Parcela{
    date: string;
    value: number;
}

export interface Operacao{
    _id: string;
    name: string;
    category: string;
    value: number;
    competence_date: string;
    cash_flow?: Parcela[];
}

export interface Movimento{
    id: string;
    /** O dia em que o dinheiro se move (`AAAA-MM-DD`). */
    dia: string;
    nome: string;
    categoria: string;
    /** Positivo entra, negativo sai. */
    valor: number;
    /** A competência da operação, para ler a diferença entre o que se reconhece e o que se move. */
    competencia: Competencia;
}

/** As contas em que a parcela é entrada de caixa: receitas, receita financeira, receita não-operacional e aporte de capital. */
const ENTRADAS = ['ROB', 'RFL_RF', 'RNO_RNO', 'AED_AC'];

export const entraNoCaixa = (categoria: string): boolean => ENTRADAS.some(prefix => categoria === prefix || categoria.startsWith(`${prefix}_`));

const diaDe = (date: string): string => new Date(date).toISOString().slice(0, 10);

/** Os movimentos de caixa das operações: uma linha por parcela. Operação sem parcela não move caixa (a depreciação, por exemplo). */
export function movimentosDe(operations: Operacao[]): Movimento[]{

    return operations.flatMap(operation => {

        const at = new Date(operation.competence_date);
        const competencia = { year: at.getUTCFullYear(), month: at.getUTCMonth() + 1 };

        return (operation.cash_flow ?? []).map((parcela, index): Movimento => ({
            id: `${operation._id}:${index}`,
            dia: diaDe(parcela.date),
            nome: operation.name,
            categoria: operation.category,
            valor: entraNoCaixa(operation.category) ? parcela.value : -parcela.value,
            competencia,
        }));
    }).sort((a, b) => a.dia.localeCompare(b.dia));
}

export interface MesDoCaixa{
    /** `AAAA-MM`. */
    mes: string;
    entradas: number;
    saidas: number;
    movimento: number;
}

/** O caixa por mês de movimento: entradas, saídas e o movimento (entradas − saídas). Só os meses em que há parcela. */
export function porMes(movimentos: Movimento[]): MesDoCaixa[]{

    const months = new Map<string, MesDoCaixa>();

    for(const item of movimentos){

        const mes = item.dia.slice(0, 7);
        const current = months.get(mes) ?? { mes, entradas: 0, saidas: 0, movimento: 0 };

        if(item.valor >= 0) current.entradas += item.valor;
        else current.saidas += -item.valor;

        current.movimento += item.valor;
        months.set(mes, current);
    }

    return [...months.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

/** Separa o que já se moveu (até hoje, inclusive) do que ainda vai se mover. `hoje` é `AAAA-MM-DD`. */
export function realizadoEAReceber(movimentos: Movimento[], hoje: string): { realizado: Movimento[]; aRealizar: Movimento[] }{

    return { realizado: movimentos.filter(item => item.dia <= hoje), aRealizar: movimentos.filter(item => item.dia > hoje) };
}

/** A soma dos valores com sinal. Lista vazia é `undefined`: sem movimento não há movimento de R$ 0. */
export const soma = (movimentos: Movimento[]): number | undefined => (movimentos.length === 0 ? undefined : movimentos.reduce((total, item) => total + item.valor, 0));

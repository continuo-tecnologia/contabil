// O que se deriva do que a tela já lê (operações e totais por mês), sem pedir nada novo ao backend:
//  - a falta receber ou pagar de cada mês de competência, derivada do que já se moveu no caixa;
//  - o percentual da receita bruta, mês a mês, de uma linha da DRE.
// Funções puras. Onde não há base, o resultado é `undefined` (a tela diz a ausência): nunca zero inventado.
import type { Competencia } from './competencia';
import { paraIso } from './competencia';
import { parteDaReceita, valorDaLinha } from './dre';
import { entraNoCaixa } from './fluxo';
import type { Operacao } from './fluxo';

/** Depreciação e amortização (`DA`, `DA_D`, `DA_A`, `DA_E`) reconhecem resultado e não movem caixa. */
export const movePorCaixa = (categoria: string): boolean => categoria !== 'DA' && !categoria.startsWith('DA_');

export interface FaltaDoMes{
    /** Mês de competência, `AAAA-MM`. */
    mes: string;
    /** O que a competência reconheceu como entrada e ainda não entrou no caixa. `undefined` sem entrada com parcelas no mês. */
    aReceber: number | undefined;
    /** O que a competência reconheceu como saída e ainda não saiu do caixa. `undefined` sem saída com parcelas no mês. */
    aPagar: number | undefined;
    /** Operações do mês que movem caixa mas não têm parcela: não há como dizer o que falta, e ficam fora das somas. */
    semParcelas: number;
}

/**
 * Por mês de competência: do valor de cada operação tira o que as parcelas já movimentaram até `hoje` (`AAAA-MM-DD`, inclusive).
 * Sobra é o que falta receber (entrada) ou pagar (saída). Operação sem parcela não entra (conta em `semParcelas`); sobra de
 * centavos (arredondamento de ponto flutuante) não vira falta; parcelas além do valor aparecem como falta negativa, sem esconder o excesso.
 */
export function faltaReceberOuPagar(operacoes: Operacao[], hoje: string): FaltaDoMes[]{

    const months = new Map<string, FaltaDoMes>();

    for(const operation of operacoes){

        if(!movePorCaixa(operation.category)) continue;

        const mes = operation.competence_date.slice(0, 7);
        const current = months.get(mes) ?? { mes, aReceber: undefined, aPagar: undefined, semParcelas: 0 };
        months.set(mes, current);

        const parcels = operation.cash_flow ?? [];

        if(parcels.length === 0){ current.semParcelas += 1; continue; }

        const moved = parcels.filter(parcel => parcel.date.slice(0, 10) <= hoje).reduce((total, parcel) => total + parcel.value, 0);
        const rest = Math.round((operation.value - moved) * 100) / 100;

        if(entraNoCaixa(operation.category)) current.aReceber = (current.aReceber ?? 0) + rest;
        else current.aPagar = (current.aPagar ?? 0) + rest;
    }

    return [...months.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}

export interface PercentualDoMes{
    mes: string;
    valor: number | undefined;
    /** A parte da receita bruta do mês; `undefined` sem valor ou sem receita bruta. */
    parte: number | undefined;
}

/** O percentual da receita bruta de uma linha da DRE em cada mês (`totais` é o que `/totals/ym` devolveu, ou `null` quando o mês não pôde ser lido). */
export function percentualDaReceitaPorMes(meses: { competencia: Competencia; totais: Record<string, number> | null }[], linha: string): PercentualDoMes[]{

    return meses.map(({ competencia, totais }) => {

        const valor = valorDaLinha(totais, linha);

        return { mes: paraIso(competencia), valor, parte: parteDaReceita(valor, totais) };
    });
}

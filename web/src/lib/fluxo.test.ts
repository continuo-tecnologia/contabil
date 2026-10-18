import { describe, expect, it } from 'vitest';
import { entraNoCaixa, movimentosDe, porMes, realizadoEAReceber, soma } from './fluxo';
import type { Operacao } from './fluxo';

// Operações montadas aqui, em memória: dado sintético só de teste, nunca de tela.
const receita: Operacao = { _id: 'a', name: 'Receita', category: 'ROB_RBV_RSP', value: 1000, competence_date: '2026-03-15T00:00:00.000Z', cash_flow: [{ date: '2026-03-20T00:00:00.000Z', value: 400 }, { date: '2026-05-20T00:00:00.000Z', value: 600 }] };
const custo: Operacao = { _id: 'b', name: 'Custo', category: 'CO_CSP_MAT', value: 300, competence_date: '2026-03-10T00:00:00.000Z', cash_flow: [{ date: '2026-03-12T00:00:00.000Z', value: 300 }] };
const depreciacao: Operacao = { _id: 'c', name: 'Bem (1/12)', category: 'DA_D', value: 50, competence_date: '2026-03-01T00:00:00.000Z' };

describe('o fluxo de caixa', () => {

    it('receitas entram e o resto sai', () => {

        for(const category of ['ROB_RBV_RSP', 'RFL_RF', 'RNO_RNO', 'AED_AC', 'ROB']) expect(entraNoCaixa(category), category).toBe(true);
        for(const category of ['DROB_ISV', 'CO_CSP_MAT', 'DO_DA_PES', 'RFL_DF', 'AED_DL', 'CJS_IR']) expect(entraNoCaixa(category), category).toBe(false);
    });

    it('uma linha por parcela, pela data do caixa, com sinal; a depreciação (sem parcela) não move caixa', () => {

        const list = movimentosDe([receita, custo, depreciacao]);

        expect(list.map(item => [item.dia, item.valor])).toEqual([['2026-03-12', -300], ['2026-03-20', 400], ['2026-05-20', 600]]);
        expect(list[1].competencia).toEqual({ year: 2026, month: 3 });
        expect(list.some(item => item.nome.startsWith('Bem'))).toBe(false);
    });

    it('agrupa por mês do caixa, e não pelo da competência', () => {

        expect(porMes(movimentosDe([receita, custo]))).toEqual([
            { mes: '2026-03', entradas: 400, saidas: 300, movimento: 100 },
            { mes: '2026-05', entradas: 600, saidas: 0, movimento: 600 },
        ]);
    });

    it('separa o realizado do a realizar pelo dia de hoje, e sem movimento não há soma', () => {

        const { realizado, aRealizar } = realizadoEAReceber(movimentosDe([receita, custo]), '2026-04-01');

        expect(soma(realizado)).toBe(100);
        expect(soma(aRealizar)).toBe(600);
        expect(soma([])).toBeUndefined();
        expect(porMes([])).toEqual([]);
    });
});

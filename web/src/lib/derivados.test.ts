import { describe, expect, it } from 'vitest';
import { faltaReceberOuPagar, movePorCaixa, percentualDaReceitaPorMes } from './derivados';
import type { Operacao } from './fluxo';
import { GLOSSARIO_DRE, MAPA_QUATRO_LINHAS, AVISO_DO_MAPA } from './glossario';

// Operações e totais montados aqui, em memória: dado sintético só de teste, nunca de tela.
const op = (id: string, category: string, value: number, competence_date: string, cash_flow?: { date: string; value: number }[]): Operacao => ({ _id: id, name: id, category, value, competence_date, cash_flow });

describe('falta receber ou pagar', () => {

    it('é o valor da operação menos o que as parcelas já moveram até hoje, separado em entrada e saída', () => {

        const list = faltaReceberOuPagar([
            op('r', 'ROB_RBV_RSP', 1000, '2026-03-15T00:00:00.000Z', [{ date: '2026-03-20T00:00:00.000Z', value: 400 }, { date: '2026-05-20T00:00:00.000Z', value: 600 }]),
            op('c', 'CO_CSP_MAT', 300, '2026-03-10T00:00:00.000Z', [{ date: '2026-03-12T00:00:00.000Z', value: 100 }, { date: '2026-06-12T00:00:00.000Z', value: 200 }]),
        ], '2026-04-01');

        expect(list).toEqual([{ mes: '2026-03', aReceber: 600, aPagar: 200, semParcelas: 0 }]);
    });

    it('a parcela de hoje já se moveu; a de amanhã não', () => {

        const list = faltaReceberOuPagar([op('r', 'ROB', 100, '2026-03-01T00:00:00.000Z', [{ date: '2026-04-01T00:00:00.000Z', value: 40 }, { date: '2026-04-02T00:00:00.000Z', value: 60 }])], '2026-04-01');

        expect(list[0].aReceber).toBe(60);
    });

    it('operação sem parcela não entra na soma e é contada; sem entrada ou saída com parcelas a ausência é undefined, nunca zero', () => {

        const list = faltaReceberOuPagar([op('s', 'ROB', 500, '2026-03-01T00:00:00.000Z', []), op('t', 'CO', 50, '2026-03-01T00:00:00.000Z')], '2026-04-01');

        expect(list).toEqual([{ mes: '2026-03', aReceber: undefined, aPagar: undefined, semParcelas: 2 }]);
    });

    it('depreciação não move caixa e fica fora', () => {

        expect(movePorCaixa('DA_D')).toBe(false);
        expect(movePorCaixa('DA')).toBe(false);
        expect(movePorCaixa('DO_DA_PES')).toBe(true);
        expect(faltaReceberOuPagar([op('d', 'DA_D', 50, '2026-03-01T00:00:00.000Z')], '2026-04-01')).toEqual([]);
    });

    it('tudo movido dá zero de verdade (há parcelas), e o excesso de parcelas aparece negativo; arredondamento de centavos não vira falta', () => {

        const list = faltaReceberOuPagar([
            op('a', 'ROB', 0.3, '2026-03-01T00:00:00.000Z', [{ date: '2026-03-02T00:00:00.000Z', value: 0.1 }, { date: '2026-03-03T00:00:00.000Z', value: 0.2 }]),
            op('b', 'CO', 100, '2026-04-01T00:00:00.000Z', [{ date: '2026-04-02T00:00:00.000Z', value: 130 }]),
        ], '2026-05-01');

        expect(list).toEqual([{ mes: '2026-03', aReceber: 0, aPagar: undefined, semParcelas: 0 }, { mes: '2026-04', aReceber: undefined, aPagar: -30, semParcelas: 0 }]);
    });

    it('lista vazia não dá mês', () => expect(faltaReceberOuPagar([], '2026-04-01')).toEqual([]));
});

describe('percentual da receita bruta por mês', () => {

    const marco = { year: 2026, month: 3 }, abril = { year: 2026, month: 4 }, maio = { year: 2026, month: 5 };

    it('cada mês é a parte da própria receita bruta; mês sem lançamento ou sem receita é ausência', () => {

        const list = percentualDaReceitaPorMes([
            { competencia: marco, totais: { ROB: 1000, CO: 250, RLE: 750 } },
            { competencia: abril, totais: { RLE: 0, LAIR: 0 } },
            { competencia: maio, totais: { CO: 80, DO: 20 } },
        ], 'CO');

        expect(list).toEqual([
            { mes: '2026-03', valor: 250, parte: 0.25 },
            { mes: '2026-04', valor: undefined, parte: undefined },
            { mes: '2026-05', valor: 80, parte: undefined },
        ]);
    });

    it('mês que não pôde ser lido (totais nulos) é ausência', () => {

        expect(percentualDaReceitaPorMes([{ competencia: marco, totais: null }], 'RLE')).toEqual([{ mes: '2026-03', valor: undefined, parte: undefined }]);
    });
});

describe('o glossário da DRE', () => {

    it('o LAIR daqui diz que não é o do OWP, e o mapa das quatro linhas é marcado como inferido', () => {

        expect(GLOSSARIO_DRE.find(t => t.termo === 'LAIR')?.nao_confundir).toMatch(/OWP/);
        expect(MAPA_QUATRO_LINHAS.map(l => l.linha)).toEqual(['Receita', 'Equipe', 'Operação', 'Impostos']);
        expect(AVISO_DO_MAPA).toMatch(/Inferido/);
    });
});

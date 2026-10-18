import { describe, expect, it } from 'vitest';
import { CALCULADAS, CONTAS, ORDEM, contasLancaveis, formatPercent, linhasDaDre, parteDaReceita, temLancamento, valorDaLinha } from './dre';

describe('as contas do DRE', () => {

    it('as linhas seguem a ordem do demonstrativo, com as calculadas entre os grupos', () => {

        const tops = linhasDaDre().filter(line => line.depth === 0).map(line => line.name);

        expect(tops).toEqual([...ORDEM]);
    });

    it('uma conta fica abaixo da sua conta pai, e só as que o export diz aceitam lançamento', () => {

        const names = linhasDaDre().map(line => line.name);

        expect(names.indexOf('CO_CPV')).toBeLessThan(names.indexOf('CO_CPV_MP'));
        expect(names.indexOf('CO_CPV_MP')).toBeLessThan(names.indexOf('CO_CSP'));
        expect(names.indexOf('DA')).toBeLessThan(names.indexOf('DA_D'));
        expect(names.indexOf('DA_D')).toBeLessThan(names.indexOf('DA_A'));
        expect(linhasDaDre().find(line => line.name === 'CO_CPV')!.fillable).toBe(false);
        expect(linhasDaDre().find(line => line.name === 'CO_CPV_MP')!.fillable).toBe(true);
        expect(linhasDaDre().find(line => line.name === 'CO_CPV')!.group).toBe(true);
        expect(linhasDaDre().find(line => line.name === 'CO_CPV_MP')!.group).toBe(false);
        // Nenhuma conta aparece duas vezes: o demonstrativo é uma árvore só.
        expect(new Set(names).size).toBe(names.length);
    });

    it('as contas de lançamento são as que aceitam lançamento, com o grupo de cada uma (e a depreciação, que nasce dos bens, de fora)', () => {

        const list = contasLancaveis();

        expect(list.every(conta => CONTAS.find(item => item.name === conta.name)?.fillable)).toBe(true);
        expect(list.find(conta => conta.name === 'ROB_RBV_RSP')?.group).toBe('Receitas Operacionais Brutas');
        expect(list.some(conta => conta.name.startsWith('DA_'))).toBe(false);
    });
});

describe('o valor de uma linha', () => {

    const sem = { ROL: 0, LOB: 0, LAJIRDA: 0, LAJIR: 0, LAIR: 0, LOL: 0, RLE: 0 };

    it('mês sem lançamento: nenhuma linha tem valor (o zero que o servidor devolve nas calculadas não é dado)', () => {

        expect(temLancamento(sem)).toBe(false);
        expect(valorDaLinha(sem, 'RLE')).toBeUndefined();
        expect(valorDaLinha(sem, 'ROB')).toBeUndefined();
        expect(valorDaLinha(null, 'ROB')).toBeUndefined();
    });

    it('mês com lançamento: a conta sem lançamento diz a ausência, a calculada vale', () => {

        const totals = { ...sem, ROB: 1000, ROB_RBV: 1000, ROB_RBV_RSP: 1000, ROL: 1000, RLE: 1000 };

        expect(temLancamento(totals)).toBe(true);
        expect(valorDaLinha(totals, 'ROB')).toBe(1000);
        expect(valorDaLinha(totals, 'RLE')).toBe(1000);
        expect(valorDaLinha(totals, 'DROB')).toBeUndefined();
        expect(Object.keys(CALCULADAS)).toContain('RLE');
    });

    it('o percentual é da receita bruta, e sem ela não há percentual', () => {

        expect(parteDaReceita(250, { ROB: 1000 })).toBe(0.25);
        expect(parteDaReceita(250, { ROB: 0 })).toBeUndefined();
        expect(parteDaReceita(250, {})).toBeUndefined();
        expect(parteDaReceita(undefined, { ROB: 1000 })).toBeUndefined();
        expect(formatPercent(0.1234)).toBe('12,34%');
        expect(formatPercent(-0.5)).toBe('-50,00%');
    });
});

import { describe, expect, it } from 'vitest';
import casa from '../data/casa.json';
import { enderecoDoFinanceiro, secaoDoCaminho } from './casa';
import type { Casa } from './casa';

describe('o mapa da casa deste app', () => {

    const here = enderecoDoFinanceiro(casa as unknown as Casa);

    it('financeiro. tem a DRE, o fluxo de caixa e as notas fiscais, nessa ordem', () => {

        expect(here.host).toMatch(/^financeiro\./);
        expect(here.secoes.map(secao => secao.id)).toEqual(['dre', 'fluxo-de-caixa', 'notas']);
    });

    it('o caminho acha a seção, com ou sem barra final', () => {

        expect(secaoDoCaminho(here, '/')?.id).toBe('dre');
        expect(secaoDoCaminho(here, '/fluxo-de-caixa')?.id).toBe('fluxo-de-caixa');
        expect(secaoDoCaminho(here, '/fluxo-de-caixa/')?.id).toBe('fluxo-de-caixa');
        expect(secaoDoCaminho(here, '/notas')?.id).toBe('notas');
        expect(secaoDoCaminho(here, '/outra')).toBeUndefined();
    });
});

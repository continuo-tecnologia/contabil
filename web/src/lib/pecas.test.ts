import { describe, expect, it } from 'vitest';
import casa from '../data/casa.json';
import type { Casa } from './casa';
import { pecasDoFinanceiro } from './pecas';

describe('a grade de peças', () => {

    const pecas = pecasDoFinanceiro(casa as unknown as Casa, 'financeiro');

    it('liga o escritório todo, na ordem das outras portas, com o Financeiro marcado e o Painel do Parceiro de fora', () => {

        expect(pecas.map(peca => peca.id)).toEqual(['gestao', 'owp', 'idp', 'financeiro', 'cliente', 'kit']);
        expect(pecas.filter(peca => peca.current).map(peca => peca.id)).toEqual(['financeiro']);
        expect(pecas.every(peca => peca.icon !== undefined && peca.description)).toBe(true);
    });

    it('uma peça que o mapa diz fora do ar vem desligada, dita, sem link', () => {

        const fora = pecas.filter(peca => !peca.href);

        expect(fora.every(peca => peca.unavailable === 'este endereço ainda não está no ar')).toBe(true);
        expect(pecas.find(peca => peca.id === 'owp')?.href).toMatch(/^https:\/\/owp\./);
    });
});

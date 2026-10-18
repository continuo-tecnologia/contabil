import { describe, expect, it } from 'vitest';
import { caminhoDoPdf, diaDaEmissao, mesEscolhido, totalDoMes } from './notas';

const SHA = 'a'.repeat(64);

describe('as notas fiscais da Colinear', () => {

    it('o PDF só vira link com um sha256 de 64 hexadecimais, sob /notas/api/', () => {

        expect(caminhoDoPdf(SHA)).toBe(`/notas/api/arquivo/${SHA}.pdf`);
        expect(caminhoDoPdf('../../etc')).toBeNull();
        expect(caminhoDoPdf(`${SHA}x`)).toBeNull();
        expect(caminhoDoPdf('')).toBeNull();
    });

    it('o total soma em centavos e, sem nota, não existe (nunca R$ 0)', () => {

        const nota = (valor: number) => ({ prestador: 'Teste', numero: '1', valor, emitida_em: '2026-09-01', arquivo: SHA });

        expect(totalDoMes([nota(0.1), nota(0.2)])).toBe(0.3);
        expect(totalDoMes([])).toBeUndefined();
    });

    it('o mês escolhido é o pedido se o índice o tem, senão o mais novo', () => {

        expect(mesEscolhido('2026-08', ['2026-09', '2026-08'])).toBe('2026-08');
        expect(mesEscolhido('2026-01', ['2026-09', '2026-08'])).toBe('2026-09');
        expect(mesEscolhido(null, ['2026-09'])).toBe('2026-09');
        expect(mesEscolhido('2026-09', [])).toBeUndefined();
    });

    it('o dia da emissão sai como dia/mês/ano; fora do formato fica como veio', () => {

        expect(diaDaEmissao('2026-09-05')).toBe('05/09/2026');
        expect(diaDaEmissao('2026-09-05T00:00:00Z')).toBe('05/09/2026');
        expect(diaDaEmissao('ontem')).toBe('ontem');
    });
});

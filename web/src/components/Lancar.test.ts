import { describe, expect, it } from 'vitest';
import { faltaParcelar, parcelasValidas } from './Lancar';

describe('as parcelas do formulário', () => {

    it('só valem completas, com data e valor de R$ 1,00 ou mais (o mínimo da API)', () => {

        expect(parcelasValidas([{ date: '2026-03-10', value: '400' }, { date: '2026-04-10', value: '600,50' }])).toEqual([{ date: '2026-03-10', value: 400 }, { date: '2026-04-10', value: 600.5 }]);
        expect(parcelasValidas([])).toBeNull();
        expect(parcelasValidas([{ date: '', value: '400' }])).toBeNull();
        expect(parcelasValidas([{ date: '2026-03-10', value: '0,50' }])).toBeNull();
        expect(parcelasValidas([{ date: '2026-03-10', value: '' }])).toBeNull();
    });

    it('diz quanto falta parcelar, e nada enquanto o preço não foi escrito', () => {

        expect(faltaParcelar('1000', [{ date: '2026-03-10', value: '400' }])).toBe(600);
        expect(faltaParcelar('1000', [])).toBe(1000);
        expect(faltaParcelar('1000', [{ date: '2026-03-10', value: '1000' }])).toBe(0);
        expect(faltaParcelar('', [])).toBeUndefined();
        expect(faltaParcelar('0', [])).toBeUndefined();
    });
});

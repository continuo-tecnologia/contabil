import { describe, expect, it } from 'vitest';
import { deIso, mesesEntre, paraIso, rotuloDoMes, somaMeses } from './competencia';

describe('a competência', () => {

    it('soma meses atravessando o ano, nos dois sentidos', () => {

        expect(somaMeses({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
        expect(somaMeses({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
        expect(somaMeses({ year: 2026, month: 3 }, 0)).toEqual({ year: 2026, month: 3 });
        expect(somaMeses({ year: 2026, month: 3 }, -14)).toEqual({ year: 2025, month: 1 });
    });

    it('lê e escreve o valor do campo de mês', () => {

        expect(deIso('2026-03')).toEqual({ year: 2026, month: 3 });
        expect(paraIso({ year: 2026, month: 3 })).toBe('2026-03');
        for(const bad of ['', '2026', '2026-13', '2026-00', '2026-3', 'março']) expect(deIso(bad), bad).toBeNull();
    });

    it('diz o mês por extenso', () => {

        expect(rotuloDoMes({ year: 2026, month: 3 })).toBe('Março de 2026');
    });

    it('os meses entre dois, inclusive; vazio se o primeiro vem depois', () => {

        expect(mesesEntre({ year: 2025, month: 11 }, { year: 2026, month: 2 })).toEqual([{ year: 2025, month: 11 }, { year: 2025, month: 12 }, { year: 2026, month: 1 }, { year: 2026, month: 2 }]);
        expect(mesesEntre({ year: 2026, month: 3 }, { year: 2026, month: 3 })).toHaveLength(1);
        expect(mesesEntre({ year: 2026, month: 4 }, { year: 2026, month: 3 })).toEqual([]);
    });
});

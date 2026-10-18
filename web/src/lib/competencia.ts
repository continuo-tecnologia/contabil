// A competência (mês e ano) do demonstrativo. Mês de 1 a 12, como em /totals/ym e /operations/ym.
export interface Competencia{
    year: number;
    month: number;
}

const NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const competenciaDe = (date: Date): Competencia => ({ year: date.getFullYear(), month: date.getMonth() + 1 });

/** A competência `n` meses adiante (ou atrás, negativo). */
export function somaMeses({ year, month }: Competencia, n: number): Competencia{

    const index = year * 12 + (month - 1) + n;

    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/** O valor do campo de mês (`2026-03`) e a competência dele; `null` se não é um mês. */
export function deIso(iso: string): Competencia | null{

    const found = /^(\d{4})-(\d{2})$/.exec(iso);
    const month = found ? Number(found[2]) : 0;

    return found && month >= 1 && month <= 12 ? { year: Number(found[1]), month } : null;
}

export const paraIso = ({ year, month }: Competencia): string => `${year}-${String(month).padStart(2, '0')}`;

/** "Março de 2026". */
export const rotuloDoMes = ({ year, month }: Competencia): string => `${NOMES[month - 1]} de ${year}`;

/** Os meses de `de` até `ate`, inclusive, em ordem; vazio se `de` vem depois de `ate`. */
export function mesesEntre(de: Competencia, ate: Competencia): Competencia[]{

    const total = (ate.year * 12 + ate.month) - (de.year * 12 + de.month);
    const list: Competencia[] = [];

    for(let i = 0; i <= total; i++) list.push(somaMeses(de, i));

    return list;
}

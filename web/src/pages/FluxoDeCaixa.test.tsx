import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHouseThemes } from '@ctn/base/theme';
import casa from '../data/casa.json';
import * as api from '../lib/api';
import { FluxoDeCaixa } from './FluxoDeCaixa';

vi.mock('../lib/api');

const themes = createHouseThemes(casa.marca as Parameters<typeof createHouseThemes>[0]);
const show = (ui: React.ReactElement) => render(<ThemeProvider theme={themes.light}>{ui}</ThemeProvider>);

// Hoje fixo (15/03/2026) e operações montadas em memória.
const HOJE = new Date('2026-03-15T12:00:00Z');
const operacoes = [
    { _id: 'r', name: 'Receita do teste', category: 'ROB_RBV_RSP', value: 1000, competence_date: '2026-03-01T00:00:00.000Z', cash_flow: [{ date: '2026-03-10T00:00:00.000Z', value: 400 }, { date: '2026-04-10T00:00:00.000Z', value: 600 }] },
    { _id: 'c', name: 'Custo do teste', category: 'CO_CSP_MAT', value: 300, competence_date: '2026-03-01T00:00:00.000Z', cash_flow: [{ date: '2026-03-12T00:00:00.000Z', value: 300 }] },
];

beforeEach(() => vi.mocked(api.operacoesDoMes).mockReset());

describe('o fluxo de caixa', () => {

    it('lê cada mês desde o escolhido até o atual, e o mês inicial é o que a pessoa escolheu', async () => {

        vi.mocked(api.operacoesDoMes).mockResolvedValue([]);
        show(<FluxoDeCaixa desde={{ year: 2026, month: 1 }} onDesde={() => undefined} hoje={HOJE}/>);

        await screen.findByTestId('sem-parcelas');

        expect(vi.mocked(api.operacoesDoMes).mock.calls.map(call => call[0])).toEqual([{ year: 2026, month: 1 }, { year: 2026, month: 2 }, { year: 2026, month: 3 }]);
    });

    it('sem parcela diz a ausência; não desenha R$ 0', async () => {

        vi.mocked(api.operacoesDoMes).mockResolvedValue([]);
        show(<FluxoDeCaixa desde={{ year: 2026, month: 3 }} onDesde={() => undefined} hoje={HOJE}/>);

        expect((await screen.findByTestId('sem-parcelas')).textContent).toContain('Nenhuma parcela de caixa desde Março de 2026');
        expect(screen.queryByTestId('totais')).toBeNull();
    });

    it('mostra o movimento por mês do caixa, o realizado e o a realizar, e diz que não há saldo', async () => {

        vi.mocked(api.operacoesDoMes).mockResolvedValue(operacoes);
        show(<FluxoDeCaixa desde={{ year: 2026, month: 3 }} onDesde={() => undefined} hoje={HOJE}/>);

        const table = await screen.findByTestId('por-mes');

        expect(table.textContent).toContain('Março de 2026');
        expect(table.textContent).toContain('Abril de 2026');
        // março: entram 400 e saem 300; abril: entram 600
        expect(screen.getByTestId('total-realizado').textContent).toContain('100,00');
        expect(screen.getByTestId('total-a-realizar').textContent).toContain('600,00');
        expect(screen.getByTestId('pagina-fluxo').textContent).toContain('Não há saldo inicial');
        expect(screen.getByTestId('parcelas').textContent).toContain('A realizar');
    });

    it('mostra o que falta receber e pagar por mês de competência, derivado do que já se moveu', async () => {

        vi.mocked(api.operacoesDoMes).mockResolvedValue([...operacoes, { _id: 's', name: 'Sem parcela', category: 'CO_CSP_MAT', value: 50, competence_date: '2026-03-01T00:00:00.000Z', cash_flow: [] }]);
        show(<FluxoDeCaixa desde={{ year: 2026, month: 3 }} onDesde={() => undefined} hoje={HOJE}/>);

        const table = await screen.findByTestId('falta');

        // receita 1000 com 400 movidos: falta receber 600; custo 300 com 300 movidos: falta pagar 0 (há parcela); a operação sem parcela é dita, não somada
        expect(table.textContent).toContain('Março de 2026');
        expect(table.textContent).toContain('600,00');
        expect(table.textContent).toContain('1 operação');
    });

    it('um mês inicial no futuro diz isso e não lê nada', async () => {

        show(<FluxoDeCaixa desde={{ year: 2026, month: 8 }} onDesde={() => undefined} hoje={HOJE}/>);

        expect(await screen.findByTestId('desde-futuro')).toBeTruthy();
        expect(api.operacoesDoMes).not.toHaveBeenCalled();
    });
});

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHouseThemes } from '@ctn/base/theme';
import casa from '../data/casa.json';
import * as api from '../lib/api';
import { Dre } from './Dre';

vi.mock('../lib/api');

const themes = createHouseThemes(casa.marca as Parameters<typeof createHouseThemes>[0]);
const show = (ui: React.ReactElement) => render(<ThemeProvider theme={themes.light}>{ui}</ThemeProvider>);

const CALCULADAS_ZERO = { ROL: 0, LOB: 0, LAJIRDA: 0, LAJIR: 0, LAIR: 0, LOL: 0, RLE: 0 };

// Dados montados aqui, em memória (teste de tela com API simulada): não são dado da casa.
const COM_LANCAMENTO = { ...CALCULADAS_ZERO, ROB: 1000, ROB_RBV: 1000, ROB_RBV_RSP: 1000, CO: 250, CO_CSP: 250, CO_CSP_MAT: 250, ROL: 1000, LOB: 750, LAJIRDA: 750, LAJIR: 750, LAIR: 750, LOL: 750, RLE: 750 };
const operacoes = [
    { _id: 'o1', name: 'Serviço do teste', category: 'ROB_RBV_RSP', value: 1000, competence_date: '2026-03-15T00:00:00.000Z', cash_flow: [] },
    { _id: 'o2', name: 'Material do teste', category: 'CO_CSP_MAT', value: 250, competence_date: '2026-03-15T00:00:00.000Z', cash_flow: [] },
];

beforeEach(() => {
    vi.mocked(api.operacoesDoMes).mockResolvedValue(operacoes);
});

describe('a DRE', () => {

    it('mês sem lançamento diz a ausência: nem o RLE nem as contas mostram zero', async () => {

        vi.mocked(api.totaisDoMes).mockResolvedValue(CALCULADAS_ZERO);
        vi.mocked(api.operacoesDoMes).mockResolvedValue([]);
        show(<Dre competencia={{ year: 2026, month: 3 }} onCompetencia={() => undefined}/>);

        const rle = await screen.findByTestId('rle');

        expect(rle.textContent).toContain('Sem lançamento em Março de 2026');
        expect(rle.textContent).not.toMatch(/R\$/);
        expect(screen.getByTestId('mes-sem-lancamento')).toBeTruthy();
        expect(screen.getByTestId('valor-ROB').textContent).toBe('Sem lançamento');
        expect(screen.getByTestId('valor-RLE').textContent).toBe('Sem lançamento');
    });

    it('mês com lançamento: o RLE no topo com a parte da receita bruta, e a conta sem lançamento diz a ausência', async () => {

        vi.mocked(api.totaisDoMes).mockResolvedValue(COM_LANCAMENTO);
        show(<Dre competencia={{ year: 2026, month: 3 }} onCompetencia={() => undefined}/>);

        const rle = await screen.findByTestId('rle');

        expect(rle.textContent).toContain('750,00');
        expect(rle.textContent).toContain('75,00% da receita bruta');
        expect(screen.getByTestId('valor-ROB').textContent).toContain('1.000,00');
        expect(screen.getByTestId('valor-DROB').textContent).toBe('Sem lançamento');
    });

    it('abre a conta e mostra os lançamentos; Lançar abre o formulário já na conta da linha', async () => {

        vi.mocked(api.totaisDoMes).mockResolvedValue(COM_LANCAMENTO);
        show(<Dre competencia={{ year: 2026, month: 3 }} onCompetencia={() => undefined}/>);

        await screen.findByTestId('rle');
        fireEvent.click(screen.getByLabelText('Abrir Receitas Operacionais Brutas'));
        fireEvent.click(screen.getByLabelText('Abrir Receitas Brutas de Vendas'));
        fireEvent.click(screen.getByLabelText('Abrir Receitas dos Serviços Prestados'));

        expect(screen.getByTestId('lancamento').textContent).toContain('Serviço do teste');

        fireEvent.click(screen.getByLabelText('Lançar em Receitas dos Serviços Prestados'));

        const dialog = await screen.findByTestId('lancar');

        expect(within(dialog).getByTestId('conta').textContent).toContain('Receitas dos Serviços Prestados');
    });

    it('apagar uma linha que não é operação (de um bem) diz o motivo e não some com a linha', async () => {

        vi.mocked(api.totaisDoMes).mockResolvedValue(COM_LANCAMENTO);
        vi.mocked(api.apagarOperacao).mockResolvedValue(0);
        show(<Dre competencia={{ year: 2026, month: 3 }} onCompetencia={() => undefined}/>);

        await screen.findByTestId('rle');
        fireEvent.click(screen.getByLabelText('Abrir Receitas Operacionais Brutas'));
        fireEvent.click(screen.getByLabelText('Abrir Receitas Brutas de Vendas'));
        fireEvent.click(screen.getByLabelText('Abrir Receitas dos Serviços Prestados'));
        fireEvent.click(screen.getByLabelText('Apagar Serviço do teste'));
        fireEvent.click(await screen.findByText('Apagar', { selector: 'button' }));

        await waitFor(() => expect(screen.getByRole('dialog').textContent).toContain('bens não se apagam aqui'));
        expect(screen.getByTestId('lancamento')).toBeTruthy();
    });

    it('a leitura que falha diz o erro e oferece tentar de novo', async () => {

        vi.mocked(api.totaisDoMes).mockRejectedValue(new Error('Network Error'));
        show(<Dre competencia={{ year: 2026, month: 3 }} onCompetencia={() => undefined}/>);

        expect((await screen.findByRole('alert')).textContent).toContain('Network Error');
        expect(screen.getByText('Tentar de novo')).toBeTruthy();
    });
});

describe('a DRE: percentual por mês e como ler', () => {

    it('mostra o percentual da receita bruta de cada mês até o escolhido e o glossário com o mapa inferido', async () => {

        vi.mocked(api.totaisDoMes).mockResolvedValue(COM_LANCAMENTO);
        show(<Dre competencia={{ year: 2026, month: 3 }} onCompetencia={() => undefined}/>);

        const table = await screen.findByTestId('percentual-tabela');

        expect(within(table).getAllByRole('row')).toHaveLength(1 + 3);
        expect(table.textContent).toContain('25,00%');
        expect(screen.getByTestId('termo-LAIR').textContent).toMatch(/outra conta/);
        expect(screen.getByTestId('mapa-aviso').textContent).toMatch(/Inferido/);
    });

    it('sem receita bruta em nenhum mês, diz a ausência no lugar da tabela', async () => {

        vi.mocked(api.totaisDoMes).mockResolvedValue(CALCULADAS_ZERO);
        vi.mocked(api.operacoesDoMes).mockResolvedValue([]);
        show(<Dre competencia={{ year: 2026, month: 3 }} onCompetencia={() => undefined}/>);

        expect((await screen.findByTestId('percentual-sem-receita')).textContent).toContain('Sem receita bruta em 2026');
        expect(screen.queryByTestId('percentual-tabela')).toBeNull();
    });
});

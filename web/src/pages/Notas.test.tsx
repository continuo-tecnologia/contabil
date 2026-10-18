import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHouseThemes } from '@ctn/base/theme';
import casa from '../data/casa.json';
import * as notas from '../lib/notas';
import { Notas } from './Notas';

vi.mock('../lib/notas', async importOriginal => ({ ...(await importOriginal<typeof import('../lib/notas')>()), mesesComNota: vi.fn(), notasDoMes: vi.fn() }));

const themes = createHouseThemes(casa.marca as Parameters<typeof createHouseThemes>[0]);
const show = (ui: React.ReactElement) => render(<ThemeProvider theme={themes.light}>{ui}</ThemeProvider>);
const SHA = 'b'.repeat(64);

beforeEach(() => { vi.mocked(notas.mesesComNota).mockReset(); vi.mocked(notas.notasDoMes).mockReset(); });

describe('a tela de notas fiscais', () => {

    it('sem nenhum mês aceito, diz a ausência', async () => {

        vi.mocked(notas.mesesComNota).mockResolvedValue([]);
        show(<Notas pedido={null} onMes={() => undefined}/>);

        expect((await screen.findByTestId('sem-meses')).textContent).toContain('Nenhuma nota aceita ainda');
    });

    it('lê o mês mais novo do índice, lista as notas e abre o PDF pelo caminho relativo', async () => {

        vi.mocked(notas.mesesComNota).mockResolvedValue(['2026-09', '2026-08']);
        vi.mocked(notas.notasDoMes).mockResolvedValue({ notas: [{ prestador: 'Teste', numero: '12', valor: 1500.5, emitida_em: '2026-09-03', arquivo: SHA }] });
        show(<Notas pedido={null} onMes={() => undefined}/>);

        const table = await screen.findByTestId('notas');

        expect(vi.mocked(notas.notasDoMes)).toHaveBeenCalledWith('2026-09');
        expect(table.textContent).toContain('Teste');
        expect(table.textContent).toContain('03/09/2026');
        expect(screen.getByRole('link', { name: 'Abrir PDF' }).getAttribute('href')).toBe(`/notas/api/arquivo/${SHA}.pdf`);
        expect(screen.getByTestId('total').textContent).toContain('1.500,50');
    });

    it('mês sem nota aceita mostra o motivo da rota, não uma tabela vazia', async () => {

        vi.mocked(notas.mesesComNota).mockResolvedValue(['2026-09']);
        vi.mocked(notas.notasDoMes).mockResolvedValue({ semNota: 'Nenhuma nota aceita neste mês.' });
        show(<Notas pedido='2026-09' onMes={() => undefined}/>);

        expect((await screen.findByTestId('sem-nota')).textContent).toContain('Nenhuma nota aceita neste mês.');
        expect(screen.queryByTestId('notas')).toBeNull();
        expect(screen.queryByTestId('total')).toBeNull();
    });

    it('erro de leitura aparece e não vira lista', async () => {

        vi.mocked(notas.mesesComNota).mockRejectedValue(new Error('Request failed with status code 502'));
        show(<Notas pedido={null} onMes={() => undefined}/>);

        expect(await screen.findByText(/502/)).toBeTruthy();
        expect(screen.queryByTestId('notas')).toBeNull();
    });
});

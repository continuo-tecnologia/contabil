import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import { createHouseThemes } from '@ctn/base/theme';
import { AppShell, HouseThemeProvider, NavigationProvider } from '@ctn/base/casa';
import type { Casa } from './lib/casa';
import casa from './data/casa.json';
import { competenciaDe, deIso, paraIso } from './lib/competencia';
import type { Competencia } from './lib/competencia';
import { enderecoDoFinanceiro, secaoDoCaminho } from './lib/casa';
import { Dre } from './pages/Dre';
import { FluxoDeCaixa } from './pages/FluxoDeCaixa';
import { IconeDoFinanceiro } from './components/IconeDoFinanceiro';

const LOGO = { simbolo: '/marca-simbolo.svg', claro: '/marca-claro.svg', escuro: '/marca-escuro.svg' } as const;

/** A leitura do endereço: o caminho diz a seção; `?mes=` e `?desde=`, o mês (a DRE) e o mês inicial (o fluxo de caixa). */
function useEndereco(): { caminho: string; search: URLSearchParams; ir: (to: string) => void; trocar: (key: string, value: string) => void }{

    const [state, set_state] = useState(() => ({ caminho: window.location.pathname, search: window.location.search }));

    useEffect(() => {

        const reler = () => set_state({ caminho: window.location.pathname, search: window.location.search });

        window.addEventListener('popstate', reler);

        return () => window.removeEventListener('popstate', reler);
    }, []);

    const ir = useCallback((to: string) => {

        window.history.pushState(null, '', to);
        set_state({ caminho: window.location.pathname, search: window.location.search });
        window.scrollTo({ top: 0 });
    }, []);

    // Trocar um parâmetro troca a entrada do histórico: navegar pelos meses não enche o botão voltar.
    const trocar = useCallback((key: string, value: string) => {

        const next = new URLSearchParams(window.location.search);
        next.set(key, value);
        window.history.replaceState(null, '', `${window.location.pathname}?${next.toString()}`);
        set_state({ caminho: window.location.pathname, search: window.location.search });
    }, []);

    return { caminho: state.caminho, search: new URLSearchParams(state.search), ir, trocar };
}

export function App(){

    const themes = useMemo(() => createHouseThemes((casa as unknown as Casa).marca), []);
    const here = useMemo(() => enderecoDoFinanceiro(casa as unknown as Casa), []);
    const { caminho, search, ir, trocar } = useEndereco();
    const secao = secaoDoCaminho(here, caminho);

    const hoje = useMemo(() => new Date(), []);
    const mes = deIso(search.get('mes') ?? '') ?? competenciaDe(hoje);
    // O fluxo começa em janeiro do ano corrente enquanto a pessoa não escolhe: um começo de exercício, e não um mês inventado.
    const desde = deIso(search.get('desde') ?? '') ?? { year: hoje.getFullYear(), month: 1 };

    const mudarMes = (next: Competencia) => trocar('mes', paraIso(next));
    const mudarDesde = (next: Competencia) => trocar('desde', paraIso(next));

    return (
        <HouseThemeProvider themes={themes} storageKey='ctn-modo' defaultMode={window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}>
            <NavigationProvider navigate={ir}>
                <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, md: 3 }, py: 2 }}>
                    <AppShell
                        brand={{ nome: (casa as unknown as Casa).marca.nome, logo: LOGO.claro, logoDark: LOGO.escuro, mark: LOGO.simbolo, logoAlt: (casa as unknown as Casa).marca.nome, wordmark: true, icon: <IconeDoFinanceiro/> }}
                        here={here.peca} sections={here.secoes} currentPath={secao?.caminho ?? caminho} documentTitle={`${secao?.rotulo ?? 'Financeiro'} — ${here.peca}`}>
                        {secao?.id === 'fluxo-de-caixa'
                            ? <FluxoDeCaixa desde={desde} onDesde={mudarDesde}/>
                            : <Dre competencia={mes} onCompetencia={mudarMes}/>}
                    </AppShell>
                </Box>
            </NavigationProvider>
        </HouseThemeProvider>
    );
}

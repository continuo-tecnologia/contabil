import { useCallback, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Absence, AsyncState, Block, ConfirmDialog, Page, useAct } from '@ctn/base/casa';
import { apagarOperacao, operacoesDoMes, totaisDoMes } from '../lib/api';
import type { Totais } from '../lib/api';
import { rotuloDoMes } from '../lib/competencia';
import type { Competencia } from '../lib/competencia';
import { CALCULADAS, formatPercent, parteDaReceita, temLancamento, valorDaLinha } from '../lib/dre';
import type { Operacao } from '../lib/fluxo';
import { Mes } from '../components/Mes';
import { TabelaDre, brl } from '../components/TabelaDre';
import { Lancar } from '../components/Lancar';
import { ComoLer } from '../components/ComoLer';
import { PercentualPorMes } from '../components/PercentualPorMes';

const mensagem = (erro: unknown): string => (erro instanceof Error ? erro.message : 'Não foi possível ler.');

/** A DRE do mês de competência: no topo o Resultado Líquido do Exercício (RLE), o navegador de meses e a tabela única do demonstrativo. */
export function Dre({ competencia, onCompetencia }: { competencia: Competencia; onCompetencia: (next: Competencia) => void }){

    const [totals, set_totals] = useState<Totais | null>(null);
    const [operations, set_operations] = useState<Operacao[]>([]);
    const [error, set_error] = useState<string | null>(null);
    const [lancando, set_lancando] = useState<{ category: string } | null>(null);
    const [apagando, set_apagando] = useState<Operacao | null>(null);

    const load = useCallback(async () => {

        try{
            const [next_totals, next_operations] = await Promise.all([totaisDoMes(competencia), operacoesDoMes(competencia)]);
            set_totals(next_totals);
            set_operations(next_operations);
            set_error(null);
        }
        catch(failure){
            set_error(mensagem(failure));
        }
    }, [competencia]);

    // A competência mudou: a tela some com o mês de antes até o do novo chegar, para não mostrar o número de um mês no título de outro.
    useEffect(() => { set_totals(null); void load(); }, [load]);

    const apagar = useAct(async () => {

        if(!apagando) return;

        const apagadas = await apagarOperacao(apagando._id);

        if(apagadas === 0) throw new Error('Esta linha não é uma operação lançada (é de um bem): bens não se apagam aqui.');

        set_apagando(null);
        await load();
        return 'Operação apagada.';
    });

    const rle = valorDaLinha(totals, 'RLE');
    const part = parteDaReceita(rle, totals);

    return (
        <Page title='DRE' lead='O demonstrativo de resultado do mês de competência: o resultado no topo e, abaixo, a tabela do exercício.' data-testid='pagina-dre'>
            <Mes value={competencia} onChange={onCompetencia} data-testid='mes'/>

            <AsyncState status={error && !totals ? 'error' : totals ? 'ready' : 'loading'} error={error} actions={[{ label: 'Tentar de novo', onClick: () => void load() }]}>
                {totals && (
                    <>
                        <Block title={CALCULADAS.RLE.title}>
                            <Box data-testid='rle' sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 2 }}>
                                {rle === undefined
                                    ? <Absence title={`Sem lançamento em ${rotuloDoMes(competencia)}`}>Nenhuma operação tem competência neste mês: não há resultado a mostrar.</Absence>
                                    : (
                                        <>
                                            <Typography variant='h4' component='p' sx={{ fontWeight: 700, m: 0 }}>{brl(rle)}</Typography>
                                            <Typography color='text.secondary'>{part === undefined ? 'Sem receita bruta no mês: não há percentual.' : `${formatPercent(part)} da receita bruta`} · {rotuloDoMes(competencia)}</Typography>
                                        </>
                                    )}
                            </Box>
                        </Block>

                        <Block title='Demonstrativo'>
                            {!temLancamento(totals) && <Absence data-testid='mes-sem-lancamento' title={`Sem lançamento em ${rotuloDoMes(competencia)}`}>Lance uma operação numa conta para o mês ter demonstrativo.</Absence>}
                            <TabelaDre totals={totals} operations={operations} onLancar={category => set_lancando({ category })} onApagar={set_apagando}/>
                        </Block>

                        <PercentualPorMes competencia={competencia}/>
                        <ComoLer/>
                    </>
                )}
            </AsyncState>

            <Lancar open={lancando !== null} categoriaInicial={lancando?.category} competencia={competencia} onClose={() => set_lancando(null)} onFeito={() => { set_lancando(null); void load(); }}/>

            <ConfirmDialog open={apagando !== null} title='Apagar operação' destructive confirmLabel='Apagar' busy={apagar.busy} error={apagar.error}
                onConfirm={() => void apagar.run()} onCancel={() => { set_apagando(null); apagar.reset(); }}>
                {apagando ? `${apagando.name}, ${brl(apagando.value)}. A operação sai do demonstrativo.` : ''}
            </ConfirmDialog>
        </Page>
    );
}

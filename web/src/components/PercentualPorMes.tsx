import { useEffect, useMemo, useState } from 'react';
import { Typography } from '@mui/material';
import { Absence, AsyncState, Block, ReadTable } from '@ctn/base/casa';
import { totaisDoMes } from '../lib/api';
import type { Totais } from '../lib/api';
import { mesesEntre, rotuloDoMes } from '../lib/competencia';
import type { Competencia } from '../lib/competencia';
import { percentualDaReceitaPorMes } from '../lib/derivados';
import { CALCULADAS, formatPercent } from '../lib/dre';
import { brl } from './TabelaDre';

/** As linhas que se acompanham mês a mês, em % da receita bruta: custos, despesas e o resultado. */
const LINHAS = [{ name: 'CO', title: 'Custos Operacionais' }, { name: 'DO', title: 'Despesas Operacionais' }, { name: 'RLE', title: CALCULADAS.RLE.title }];

/**
 * O percentual da receita bruta de cada linha, de janeiro até o mês escolhido. Cada mês é uma leitura à API; um mês que não pôde ser lido
 * aparece como ausência, e o resto da tela segue.
 */
export function PercentualPorMes({ competencia }: { competencia: Competencia }){

    const months = useMemo(() => mesesEntre({ year: competencia.year, month: 1 }, competencia), [competencia.year, competencia.month]); // eslint-disable-line react-hooks/exhaustive-deps
    const [lidos, set_lidos] = useState<{ competencia: Competencia; totais: Totais | null }[] | null>(null);

    useEffect(() => {

        let current = true;
        set_lidos(null);

        void Promise.all(months.map(async month => ({ competencia: month, totais: await totaisDoMes(month).catch(() => null) }))).then(list => { if(current) set_lidos(list); });

        return () => { current = false; };
    }, [months]);

    const series = useMemo(() => LINHAS.map(line => ({ ...line, meses: percentualDaReceitaPorMes(lidos ?? [], line.name) })), [lidos]);
    const receita = useMemo(() => percentualDaReceitaPorMes(lidos ?? [], 'ROB'), [lidos]);
    const sem_dado = lidos !== null && receita.every(item => item.valor === undefined);

    return (
        <Block title={`Percentual da receita bruta em ${competencia.year}`} data-testid='percentual-por-mes'>
            <AsyncState status={lidos ? 'ready' : 'loading'}>
                {!lidos ? null : sem_dado
                    ? <Absence data-testid='percentual-sem-receita' title={`Sem receita bruta em ${competencia.year} até ${rotuloDoMes(competencia)}`}>Nenhum mês do período tem receita bruta lançada: não há percentual.</Absence>
                    : (
                        <>
                            <ReadTable label='Percentual da receita bruta por mês' data-testid='percentual-tabela' limit={Infinity}
                                head={['Mês', 'Receita bruta', ...LINHAS.map(line => line.title)]} align={['left', 'right', 'right', 'right', 'right']}
                                rows={months.map((_, index) => ({
                                    key: receita[index].mes,
                                    cells: [
                                        rotuloDoMes(months[index]),
                                        receita[index].valor === undefined ? <Absence key='r' variant='cell' title='Sem lançamento'/> : brl(receita[index].valor!),
                                        ...series.map(line => line.meses[index].parte === undefined ? <Absence key={line.name} variant='cell' title='—'/> : formatPercent(line.meses[index].parte!)),
                                    ],
                                }))}/>
                            <Typography variant='caption' color='text.secondary'>Mês sem receita bruta não tem percentual: aparece como ausência, não como zero.</Typography>
                        </>
                    )}
            </AsyncState>
        </Block>
    );
}

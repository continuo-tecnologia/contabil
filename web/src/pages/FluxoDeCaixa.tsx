import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Absence, AsyncState, Block, Page, ReadTable, StatusChip } from '@ctn/base/casa';
import type { ReadTableRow } from '@ctn/base/casa';
import { operacoesDoMes } from '../lib/api';
import { competenciaDe, mesesEntre, rotuloDoMes } from '../lib/competencia';
import type { Competencia } from '../lib/competencia';
import { faltaReceberOuPagar } from '../lib/derivados';
import { movimentosDe, porMes, realizadoEAReceber, soma } from '../lib/fluxo';
import type { Movimento, Operacao } from '../lib/fluxo';
import { Mes } from '../components/Mes';
import { brl } from '../components/TabelaDre';

/** O teto de meses lidos de uma vez: cada mês é uma leitura à API. */
export const TETO_DE_MESES = 36;

const dia = (iso: string): string => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
const mesDe = (iso: string): string => { const [year, month] = iso.split('-').map(Number); return rotuloDoMes({ year, month }); };

/**
 * O fluxo de caixa desde o mês escolhido: as parcelas das operações pela data em que o dinheiro se move, contra o que a competência reconhece.
 * Não há saldo inicial no sistema: o que se mostra é o movimento do período (entradas menos saídas), nunca um saldo. Parcela de data futura
 * é "a realizar", à parte do realizado.
 */
export function FluxoDeCaixa({ desde, onDesde, hoje = new Date() }: { desde: Competencia; onDesde: (next: Competencia) => void; hoje?: Date }){

    const ate = competenciaDe(hoje);
    const months = useMemo(() => mesesEntre(desde, ate), [desde.year, desde.month, ate.year, ate.month]); // eslint-disable-line react-hooks/exhaustive-deps
    const [operations, set_operations] = useState<Operacao[] | null>(null);
    const [error, set_error] = useState<string | null>(null);

    const load = useCallback(async () => {

        try{
            const lists = await Promise.all(months.slice(-TETO_DE_MESES).map(month => operacoesDoMes(month)));
            set_operations(lists.flat());
            set_error(null);
        }
        catch(failure){
            set_error(failure instanceof Error ? failure.message : 'Não foi possível ler.');
        }
    }, [months]);

    useEffect(() => { set_operations(null); void load(); }, [load]);

    const movements = useMemo(() => movimentosDe(operations ?? []), [operations]);
    const today = hoje.toISOString().slice(0, 10);
    const split = useMemo(() => realizadoEAReceber(movements, today), [movements, today]);
    const per_month = useMemo(() => porMes(movements), [movements]);
    const falta = useMemo(() => faltaReceberOuPagar(operations ?? [], today), [operations, today]);
    const cut = months.length > TETO_DE_MESES;

    const row = (item: Movimento): ReadTableRow => ({
        key: item.id,
        cells: [
            dia(item.dia),
            item.nome,
            <StatusChip key='s' tone={item.dia <= today ? 'ok' : 'info'} label={item.dia <= today ? 'Realizado' : 'A realizar'}/>,
            <Box key='v' component='span' sx={{ color: item.valor < 0 ? 'error.main' : 'success.main' }}>{item.valor < 0 ? `− ${brl(-item.valor)}` : brl(item.valor)}</Box>,
        ],
    });

    return (
        <Page title='Fluxo de caixa' lead='As parcelas das operações pela data em que o dinheiro se move, desde o mês escolhido. Não há saldo inicial: o que se vê é o movimento do período.' data-testid='pagina-fluxo'>
            <Mes value={desde} onChange={onDesde} label='Desde o mês' data-testid='desde'/>

            {months.length === 0 && <Absence data-testid='desde-futuro' title='O mês escolhido é futuro'>Escolha um mês até o mês atual.</Absence>}

            {months.length > 0 && (
                <AsyncState status={error && !operations ? 'error' : operations ? 'ready' : 'loading'} error={error} actions={[{ label: 'Tentar de novo', onClick: () => void load() }]}>
                    {cut && <Typography variant='body2' color='text.secondary' data-testid='teto'>São lidos os últimos {TETO_DE_MESES} meses até o mês atual; escolha um mês mais próximo para ver o resto.</Typography>}

                    <Block title='Resumo do período'>
                        {movements.length === 0
                            ? <Absence data-testid='sem-parcelas' title={`Nenhuma parcela de caixa desde ${rotuloDoMes(desde)}`}>As operações do período não têm parcelas, ou não há operação.</Absence>
                            : (
                                <ReadTable label='Movimento por mês' data-testid='por-mes' limit={Infinity} head={['Mês', 'Entradas', 'Saídas', 'Movimento']} align={['left', 'right', 'right', 'right']}
                                    rows={per_month.map(item => ({ key: item.mes, cells: [mesDe(item.mes), brl(item.entradas), brl(item.saidas), item.movimento < 0 ? `− ${brl(-item.movimento)}` : brl(item.movimento)] }))}/>
                            )}
                        {movements.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} data-testid='totais'>
                                <div><Typography variant='caption' color='text.secondary'>Movimento realizado</Typography><Typography variant='h6' component='p' data-testid='total-realizado'>{soma(split.realizado) === undefined ? <Absence variant='cell' title='Nada realizado ainda'/> : brl(soma(split.realizado)!)}</Typography></div>
                                <div><Typography variant='caption' color='text.secondary'>A realizar</Typography><Typography variant='h6' component='p' data-testid='total-a-realizar'>{soma(split.aRealizar) === undefined ? <Absence variant='cell' title='Nada a realizar'/> : brl(soma(split.aRealizar)!)}</Typography></div>
                            </Box>
                        )}
                    </Block>

                    {falta.length > 0 && (
                        <Block title='Falta receber ou pagar'>
                            <ReadTable label='Falta receber ou pagar por mês de competência' data-testid='falta' limit={Infinity} head={['Competência', 'Falta receber', 'Falta pagar', 'Sem parcelas']} align={['left', 'right', 'right', 'right']}
                                rows={falta.map(item => ({
                                    key: item.mes,
                                    cells: [
                                        mesDe(`${item.mes}-01`),
                                        item.aReceber === undefined ? <Absence key='r' variant='cell' title='Sem entrada com parcelas'/> : brl(item.aReceber),
                                        item.aPagar === undefined ? <Absence key='p' variant='cell' title='Sem saída com parcelas'/> : brl(item.aPagar),
                                        item.semParcelas === 0 ? '—' : `${item.semParcelas} ${item.semParcelas === 1 ? 'operação' : 'operações'}`,
                                    ],
                                }))}/>
                            <Typography variant='caption' color='text.secondary'>É o valor da operação menos o que as parcelas já moveram até hoje. Operação sem parcela não tem como dizer o que falta e fica fora da soma.</Typography>
                        </Block>
                    )}

                    {movements.length > 0 && (
                        <Block title='Parcelas'>
                            <ReadTable label='Parcelas de caixa' data-testid='parcelas' limit={20} head={['Data do caixa', 'Operação', 'Situação', 'Valor']} align={['left', 'left', 'left', 'right']} rows={movements.map(row)}/>
                        </Block>
                    )}
                </AsyncState>
            )}
        </Page>
    );
}

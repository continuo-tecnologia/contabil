import { useCallback, useEffect, useState } from 'react';
import { Link, MenuItem, TextField, Typography } from '@mui/material';
import { Absence, AsyncState, Block, Page, ReadTable } from '@ctn/base/casa';
import { caminhoDoPdf, diaDaEmissao, mesEscolhido, mesesComNota, notasDoMes, totalDoMes } from '../lib/notas';
import type { LeituraDoMes } from '../lib/notas';
import { rotuloDoMes } from '../lib/competencia';
import { brl } from '../components/TabelaDre';

const rotulo = (mes: string): string => { const [year, month] = mes.split('-').map(Number); return rotuloDoMes({ year, month }); };

const mensagem = (erro: unknown): string => (erro instanceof Error ? erro.message : 'Não foi possível ler.');

/**
 * As notas fiscais que a Contínuo aceitou, por mês, para a contabilidade conferir e lançar. Só leitura. O mês vem do índice da rota (só meses
 * com nota aceita); mês sem nota diz a ausência com o motivo da rota. Nota que espera ou voltou ao parceiro não aparece.
 */
export function Notas({ pedido, onMes }: { pedido: string | null; onMes: (mes: string) => void }){

    const [meses, set_meses] = useState<string[] | null>(null);
    const [leitura, set_leitura] = useState<LeituraDoMes | null>(null);
    const [error, set_error] = useState<string | null>(null);
    const mes = meses ? mesEscolhido(pedido, meses) : undefined;

    const carregarMeses = useCallback(async () => {

        try{ set_meses(await mesesComNota()); set_error(null); }
        catch(failure){ set_error(mensagem(failure)); }
    }, []);

    useEffect(() => { void carregarMeses(); }, [carregarMeses]);

    const carregarMes = useCallback(async () => {

        if(!mes) return;

        try{ set_leitura(await notasDoMes(mes)); set_error(null); }
        catch(failure){ set_error(mensagem(failure)); }
    }, [mes]);

    useEffect(() => { set_leitura(null); void carregarMes(); }, [carregarMes]);

    const pronto = meses !== null && (meses.length === 0 || leitura !== null);
    const total = leitura && 'notas' in leitura ? totalDoMes(leitura.notas) : undefined;

    return (
        <Page title='Notas fiscais' lead='As notas que a Contínuo aceitou, por mês de referência. Só entram as notas aceitas: a que espera ou voltou ao parceiro não aparece.' data-testid='pagina-notas'>
            <AsyncState status={error && !pronto ? 'error' : pronto ? 'ready' : 'loading'} error={error} actions={[{ label: 'Tentar de novo', onClick: () => void (meses ? carregarMes() : carregarMeses()) }]}>
                {meses && meses.length === 0 && <Absence data-testid='sem-meses' title='Nenhuma nota aceita ainda'>Quando a Contínuo aceitar a primeira nota fiscal de um parceiro, o mês dela aparece aqui.</Absence>}

                {meses && meses.length > 0 && mes && (
                    <>
                        <TextField select size='small' label='Mês de referência' value={mes} onChange={event => onMes(event.target.value)} sx={{ maxWidth: 260 }} data-testid='mes'>
                            {meses.map(item => <MenuItem key={item} value={item}>{rotulo(item)}</MenuItem>)}
                        </TextField>

                        <Block title={rotulo(mes)}>
                            {leitura && 'semNota' in leitura && <Absence data-testid='sem-nota' title={`Sem nota aceita em ${rotulo(mes)}`}>{leitura.semNota}</Absence>}

                            {leitura && 'notas' in leitura && (
                                <ReadTable label='Notas fiscais aceitas do mês' data-testid='notas' limit={Infinity} head={['Prestador', 'Número', 'Emitida em', 'Valor', 'PDF']} align={['left', 'left', 'left', 'right', 'left']}
                                    rows={leitura.notas.map(nota => {

                                        const pdf = caminhoDoPdf(nota.arquivo);

                                        return { key: `${nota.prestador}:${nota.numero}:${nota.arquivo}`, cells: [
                                            nota.prestador, nota.numero, diaDaEmissao(nota.emitida_em), brl(nota.valor),
                                            pdf ? <Link key='pdf' href={pdf} target='_blank' rel='noopener'>Abrir PDF</Link> : <Absence key='pdf' variant='cell' title='Sem arquivo'/>,
                                        ] };
                                    })}/>
                            )}

                            {total !== undefined && <Typography variant='h6' component='p' data-testid='total'>Total do mês: {brl(total)}</Typography>}
                        </Block>
                    </>
                )}
            </AsyncState>
        </Page>
    );
}

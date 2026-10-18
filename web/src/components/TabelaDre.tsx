import { Fragment, useMemo, useState } from 'react';
import { Box, Button, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { Add, ChevronRight, Close, ExpandMore } from '@mui/icons-material';
import { Absence } from '@ctn/base/casa';
import { format_brl } from '@ctn/base/money';
import { formatPercent, linhasDaDre, parteDaReceita, valorDaLinha } from '../lib/dre';
import type { Linha } from '../lib/dre';
import type { Operacao } from '../lib/fluxo';
import type { Totais } from '../lib/api';

/** O dinheiro com centavos. */
export const brl = (value: number): string => format_brl(value, 2);

const dia = (iso: string): string => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export interface TabelaDreProps{
    totals: Totais;
    operations: Operacao[];
    /** Lançar numa conta (a linha da DRE pré-preenche a categoria). */
    onLancar: (category: string) => void;
    /** Apagar uma operação. */
    onApagar: (operation: Operacao) => void;
}

/**
 * O demonstrativo, numa tabela só dirigida por dados: as linhas vêm de `linhasDaDre` (categories.json), os totais chegam prontos do servidor.
 * Uma conta sem lançamento no mês diz a ausência; nunca um zero que pareça dado. A linha abre para as contas filhas e os lançamentos.
 */
export function TabelaDre({ totals, operations, onLancar, onApagar }: TabelaDreProps){

    const lines = useMemo(() => linhasDaDre(), []);
    const [open, set_open] = useState<Set<string>>(() => new Set());

    const toggle = (name: string) => set_open(current => { const next = new Set(current); if(next.has(name)) next.delete(name); else next.add(name); return next; });

    // Uma linha aparece se todas as contas acima dela estão abertas.
    const visible = (line: Linha) => line.depth === 0 || line.name.split('_').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('_')).every(parent => open.has(parent));

    const of = (name: string) => operations.filter(operation => operation.category === name);

    return (
        <Table size='small' data-testid='dre' aria-label='Demonstrativo de resultado do exercício'>
            <TableHead>
                <TableRow>
                    <TableCell>Conta</TableCell>
                    <TableCell align='right'>Valor</TableCell>
                    <TableCell align='right'>% da receita bruta</TableCell>
                    <TableCell align='right'>Lançar</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {lines.filter(visible).map(line => {

                    const value = valorDaLinha(totals, line.name);
                    const part = parteDaReceita(value, totals);
                    const ops = line.kind === 'conta' ? of(line.name) : [];
                    const expandable = line.group || ops.length > 0;
                    const is_open = open.has(line.name);
                    const calculated = line.kind === 'calculada';

                    return (
                        <Fragment key={line.name}>
                            <TableRow data-testid={`linha-${line.name}`} hover={!calculated}
                                sx={calculated ? { bgcolor: line.color, '& td': { color: '#fff', fontWeight: 700 } } : { '& td:first-of-type': { borderLeft: `4px solid ${line.color}` } }}>
                                <TableCell sx={{ pl: 1 + line.depth * 3 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        {expandable
                                            ? <IconButton size='small' onClick={() => toggle(line.name)} aria-expanded={is_open} aria-label={`${is_open ? 'Fechar' : 'Abrir'} ${line.title}`}>{is_open ? <ExpandMore fontSize='small'/> : <ChevronRight fontSize='small'/>}</IconButton>
                                            : <Box sx={{ width: 30 }}/>}
                                        <Typography component='span' sx={{ fontWeight: line.depth === 0 ? 700 : 400 }}>{line.title}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align='right' data-testid={`valor-${line.name}`}>{value === undefined ? <Absence variant='cell' title='Sem lançamento'/> : brl(value)}</TableCell>
                                <TableCell align='right'>{part === undefined ? <Absence variant='cell' title='—'/> : formatPercent(part)}</TableCell>
                                <TableCell align='right'>
                                    {line.fillable
                                        ? <Button size='small' variant='outlined' startIcon={<Add/>} onClick={() => onLancar(line.name)} aria-label={`Lançar em ${line.title}`}>Lançar</Button>
                                        : null}
                                </TableCell>
                            </TableRow>

                            {is_open && ops.map(operation => (
                                <TableRow key={operation._id} data-testid='lancamento'>
                                    <TableCell sx={{ pl: 1 + (line.depth + 1) * 3 + 4 }}>
                                        <Typography component='span' variant='body2' color='text.secondary' sx={{ mr: 1 }}>{dia(operation.competence_date)}</Typography>
                                        {operation.name}
                                    </TableCell>
                                    <TableCell align='right'>{brl(operation.value)}</TableCell>
                                    <TableCell align='right'>{parteDaReceita(operation.value, totals) === undefined ? <Absence variant='cell' title='—'/> : formatPercent(parteDaReceita(operation.value, totals)!)}</TableCell>
                                    <TableCell align='right'>
                                        <IconButton size='small' onClick={() => onApagar(operation)} aria-label={`Apagar ${operation.name}`}><Close fontSize='small'/></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </Fragment>
                    );
                })}
            </TableBody>
        </Table>
    );
}

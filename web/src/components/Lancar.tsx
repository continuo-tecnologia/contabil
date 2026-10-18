import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, ListSubheader, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { Add, Close } from '@mui/icons-material';
import { DateField, useAct } from '@ctn/base/casa';
import { lancarBem, lancarOperacao } from '../lib/api';
import { paraIso } from '../lib/competencia';
import type { Competencia } from '../lib/competencia';
import { contasLancaveis } from '../lib/dre';
import type { Parcela } from '../lib/fluxo';
import { brl } from './TabelaDre';

/** O dia 15 do mês: o dia de competência quando só o mês importa (o mesmo que o formulário de antes usava, longe da virada de fuso). */
const meio = (mes: string): string => `${mes}-15`;

const vazio = (): { date: string; value: string }[] => [];

type ParcelaEdit = { date: string; value: string };

const numero = (text: string): number => Number(text.replace(',', '.'));

/** As parcelas do formulário em parcelas da API; `null` se alguma está incompleta ou fora do mínimo da API (R$ 1,00 por parcela). */
export function parcelasValidas(parcelas: ParcelaEdit[]): Parcela[] | null{

    const list = parcelas.map(parcela => ({ date: parcela.date, value: numero(parcela.value) }));

    return list.length > 0 && list.every(parcela => /^\d{4}-\d{2}-\d{2}$/.test(parcela.date) && Number.isFinite(parcela.value) && parcela.value >= 1) ? list : null;
}

/** A quantia que ainda falta distribuir em parcelas (preço menos as já escritas), ou `undefined` se o preço não foi escrito. */
export function faltaParcelar(price: string, parcelas: ParcelaEdit[]): number | undefined{

    const total = numero(price);

    if(!Number.isFinite(total) || total <= 0) return undefined;

    return Math.round((total - parcelas.reduce((sum, parcela) => sum + (Number.isFinite(numero(parcela.value)) ? numero(parcela.value) : 0), 0)) * 100) / 100;
}

function Parcelas({ price, value, onChange, firstDay }: { price: string; value: ParcelaEdit[]; onChange: (next: ParcelaEdit[]) => void; firstDay: string }){

    const falta = faltaParcelar(price, value);

    return (
        <Box data-testid='parcelas' sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant='subtitle2' component='h3'>Parcelas do caixa (quando o dinheiro se move)</Typography>
            {value.length === 0 && <Typography variant='body2' color='text.secondary'>Sem parcela: a operação não move caixa e não entra no fluxo de caixa.</Typography>}
            {value.map((parcela, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                    <DateField name={`parcela-data-${index}`} label={`Data da parcela ${index + 1}`} value={parcela.date} onChange={date => onChange(value.map((item, i) => (i === index ? { ...item, date } : item)))}/>
                    <TextField size='small' label={`Valor da parcela ${index + 1} (R$)`} type='number' value={parcela.value} slotProps={{ htmlInput: { min: 1, step: 0.01 } }}
                        onChange={event => onChange(value.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))}/>
                    <IconButton aria-label={`Tirar a parcela ${index + 1}`} onClick={() => onChange(value.filter((_, i) => i !== index))}><Close/></IconButton>
                </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Button size='small' startIcon={<Add/>} onClick={() => onChange([...value, { date: firstDay, value: falta !== undefined && falta > 0 ? String(falta) : '' }])}>Adicionar parcela</Button>
                {falta !== undefined && value.length > 0 && <Typography variant='body2' color={falta === 0 ? 'text.secondary' : 'warning.main'}>{falta === 0 ? 'As parcelas somam o valor.' : `Falta parcelar ${brl(falta)}.`}</Typography>}
            </Box>
        </Box>
    );
}

export interface LancarProps{
    open: boolean;
    /** A conta da linha da DRE em que se clicou em "Lançar": pré-preenche a categoria. */
    categoriaInicial?: string;
    /** O mês aberto na DRE: a competência do lançamento nasce nele. */
    competencia: Competencia;
    onClose: () => void;
    onFeito: () => void;
}

/** "Lançar": uma operação (receita, custo, despesa…) ou um bem (depreciado em meses). Fora do caminho do dia a dia: abre da linha da DRE. */
export function Lancar({ open, categoriaInicial, competencia, onClose, onFeito }: LancarProps){

    const contas = useMemo(() => contasLancaveis(), []);
    const mes = paraIso(competencia);

    const [tab, set_tab] = useState<'operacao' | 'bem'>('operacao');
    const [name, set_name] = useState('');
    const [category, set_category] = useState('');
    const [value, set_value] = useState('');
    const [competence, set_competence] = useState(mes);
    const [parcelas, set_parcelas] = useState<ParcelaEdit[]>(vazio());
    const [type, set_type] = useState<'D' | 'A' | 'E'>('D');
    const [quantity, set_quantity] = useState('1');
    const [purchase, set_purchase] = useState(meio(mes));
    const [use_start, set_use_start] = useState(meio(mes));
    const [lifetime, set_lifetime] = useState('12');
    const [fields, set_fields] = useState<Record<string, string>>({});

    // Ao abrir: a competência é a do mês aberto na DRE e a categoria, a da linha em que se clicou.
    useEffect(() => {

        if(!open) return;

        set_category(categoriaInicial ?? '');
        set_competence(mes);
        set_purchase(meio(mes));
        set_use_start(meio(mes));
        set_fields({});
    }, [open, categoriaInicial, mes]);

    const reset = () => { set_name(''); set_value(''); set_parcelas(vazio()); set_quantity('1'); set_lifetime('12'); set_type('D'); };

    const save = useAct(async () => {

        const cash_flow = parcelasValidas(parcelas);

        if(!cash_flow) throw new Error('Escreva ao menos uma parcela, com data e valor de R$ 1,00 ou mais.');

        if(tab === 'operacao'){

            if(!category) throw new Error('Escolha a conta em que lançar.');
            if(!name.trim()) throw new Error('Qual o nome da operação?');

            const amount = numero(value);

            if(!(amount >= 0.1)) throw new Error('O valor mínimo de uma operação é R$ 0,10.');
            if(!/^\d{4}-\d{2}$/.test(competence)) throw new Error('Escolha o mês de competência.');

            await lancarOperacao({ name: name.trim(), category, value: amount, competence_date: meio(competence), cash_flow });
            reset();
            onFeito();
            return 'Operação lançada.';
        }

        const problem = await lancarBem({
            name: name.trim(), type, price: numero(value), quantity: Math.trunc(numero(quantity)), purchase_date: purchase, cash_flow, use_start_date: use_start, lifetime_in_months: Math.trunc(numero(lifetime)),
        });

        if(problem){

            set_fields(problem.campos);
            throw new Error(Object.values(problem.campos)[0] ?? 'O servidor recusou o bem.');
        }

        reset();
        onFeito();
        return 'Bem lançado.';
    });

    const close = () => { save.reset(); onClose(); };

    return (
        <Dialog open={open} onClose={() => { if(!save.busy) close(); }} fullWidth maxWidth='sm' aria-labelledby='lancar-titulo' data-testid='lancar'>
            <DialogTitle id='lancar-titulo'>Lançar</DialogTitle>
            <DialogContent>
                <Stack gap={2} sx={{ pt: 1 }}>
                    <Tabs value={tab} onChange={(_, next) => { set_tab(next); save.reset(); }} aria-label='O que lançar'>
                        <Tab value='operacao' label='Operação'/>
                        <Tab value='bem' label='Bem (depreciação)'/>
                    </Tabs>

                    {tab === 'operacao' && (
                        <TextField select size='small' label='Conta' value={category} onChange={event => set_category(event.target.value)} required data-testid='conta'>
                            <MenuItem value='' disabled>Escolha…</MenuItem>
                            {contas.flatMap((conta, index) => [
                                ...(index === 0 || contas[index - 1].group !== conta.group ? [<ListSubheader key={`g-${conta.group}`}>{conta.group}</ListSubheader>] : []),
                                <MenuItem key={conta.name} value={conta.name}>{conta.title}</MenuItem>,
                            ])}
                        </TextField>
                    )}

                    <TextField size='small' label={tab === 'operacao' ? 'Nome da operação' : 'Nome do bem'} value={name} onChange={event => set_name(event.target.value)} required error={!!fields.name} helperText={fields.name}/>
                    <TextField size='small' label={tab === 'operacao' ? 'Valor (R$)' : 'Preço de um bem (R$)'} type='number' value={value} onChange={event => set_value(event.target.value)} required
                        slotProps={{ htmlInput: { min: 0.1, step: 0.01 } }} error={!!fields.price} helperText={fields.price}/>

                    {tab === 'operacao'
                        ? <DateField name='competencia' label='Mês de competência' type='month' value={competence} onChange={set_competence} required helperText='O mês em que o DRE reconhece a operação.'/>
                        : (
                            <>
                                <TextField select size='small' label='Como perde valor' value={type} onChange={event => set_type(event.target.value as 'D' | 'A' | 'E')}>
                                    <MenuItem value='D'>Depreciação</MenuItem>
                                    <MenuItem value='A'>Amortização</MenuItem>
                                    <MenuItem value='E'>Exaustão</MenuItem>
                                </TextField>
                                <TextField size='small' label='Quantidade' type='number' value={quantity} onChange={event => set_quantity(event.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} error={!!fields.quantity} helperText={fields.quantity}/>
                                <DateField name='compra' label='Data de compra' value={purchase} onChange={set_purchase} required/>
                                <DateField name='uso' label='Começo de uso' value={use_start} onChange={set_use_start} required/>
                                <TextField size='small' label='Vida útil (meses)' type='number' value={lifetime} onChange={event => set_lifetime(event.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} error={!!fields.lifetime_in_months} helperText={fields.lifetime_in_months}/>
                            </>
                        )}

                    <Parcelas price={tab === 'bem' ? String(numero(value) * Math.max(1, numero(quantity) || 1)) : value} value={parcelas} onChange={set_parcelas} firstDay={tab === 'operacao' ? meio(competence) : purchase}/>

                    {save.error && <Alert severity='error' data-testid='erro-lancar'>{save.error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button color='inherit' disabled={save.busy} onClick={close}>Cancelar</Button>
                <Button variant='contained' disabled={save.busy} onClick={() => void save.run()} data-testid='gravar'>{save.busy ? 'Gravando…' : 'Lançar'}</Button>
            </DialogActions>
        </Dialog>
    );
}

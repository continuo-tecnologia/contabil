import { Box, Button } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { DateField } from '@ctn/base/casa';
import { deIso, paraIso, somaMeses } from '../lib/competencia';
import type { Competencia } from '../lib/competencia';

/** O navegador de meses: anterior, o campo de mês e seguinte. Mês incompleto no campo não troca a competência. */
export function Mes({ value, onChange, label = 'Mês de competência', 'data-testid': testid }: { value: Competencia; onChange: (next: Competencia) => void; label?: string; 'data-testid'?: string }){

    return (
        <Box data-testid={testid} sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
            <Button variant='outlined' color='inherit' aria-label='Mês anterior' onClick={() => onChange(somaMeses(value, -1))} sx={{ minWidth: 40, height: 40 }}><ChevronLeft/></Button>
            <DateField name='mes' label={label} type='month' value={paraIso(value)} onChange={iso => { const next = deIso(iso); if(next) onChange(next); }}/>
            <Button variant='outlined' color='inherit' aria-label='Mês seguinte' onClick={() => onChange(somaMeses(value, 1))} sx={{ minWidth: 40, height: 40 }}><ChevronRight/></Button>
        </Box>
    );
}

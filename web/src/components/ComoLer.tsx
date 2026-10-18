import { Box, Typography } from '@mui/material';
import { Block } from '@ctn/base/casa';
import { AVISO_DO_MAPA, GLOSSARIO_DRE, MAPA_QUATRO_LINHAS } from '../lib/glossario';

/** Como ler a DRE: o glossário (LAIR daqui e o do OWP não são a mesma conta) e o mapa das quatro linhas do OWP para o plano de contas, marcado como inferido. */
export function ComoLer(){

    return (
        <Block title='Como ler' data-testid='como-ler'>
            {GLOSSARIO_DRE.map(item => (
                <Box key={item.termo} data-testid={`termo-${item.termo}`}>
                    <Typography sx={{ fontWeight: 700 }}>{item.termo}</Typography>
                    <Typography variant='body2'>{item.sentido}</Typography>
                    {item.nao_confundir && <Typography variant='body2' color='text.secondary'>{item.nao_confundir}</Typography>}
                </Box>
            ))}

            <Box data-testid='mapa-quatro-linhas'>
                <Typography sx={{ fontWeight: 700 }}>As quatro linhas do OWP no plano de contas</Typography>
                <Typography variant='body2' color='text.secondary' data-testid='mapa-aviso'>{AVISO_DO_MAPA}</Typography>
                <Box component='ul' sx={{ m: 0, pl: 3 }}>
                    {MAPA_QUATRO_LINHAS.map(item => <li key={item.linha}><Typography variant='body2'><strong>{item.linha}</strong>: {item.contas.join(' e ')}</Typography></li>)}
                </Box>
            </Box>
        </Block>
    );
}

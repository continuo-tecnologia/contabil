// As notas fiscais aceitas dos parceiros, para a Colinear (contabilidade): leitura pelo proxy do nginx (/notas/api/), que guarda o token do
// leitor `financeiro` do OWP no servidor. O navegador só fala com a mesma origem e nunca vê o token.
import axios from 'axios';

export interface Nota{
    prestador: string;
    numero: string;
    valor: number;
    /** O dia da emissão (`AAAA-MM-DD`). */
    emitida_em: string;
    /** O sha256 do PDF. */
    arquivo: string;
}

/** O que a tela sabe de uma leitura do mês: com notas, ou sem nota aceita (com o motivo que a rota deu), nunca uma lista vazia que pareça dado. */
export type LeituraDoMes = { notas: Nota[] } | { semNota: string };

export const BASE = '/notas/api';

export const MOTIVO_SEM_NOTA = 'Nenhuma nota aceita neste mês.';

const http = axios.create({ baseURL: import.meta.env.VITE_NOTAS_URL ?? BASE, timeout: 15_000, validateStatus: status => status === 200 || status === 404 });

/** O caminho do PDF de uma nota (sha256 de 64 hexadecimais); outra coisa não vira link. */
export const caminhoDoPdf = (sha256: string): string | null => /^[0-9a-f]{64}$/.test(sha256) ? `${BASE}/arquivo/${sha256}.pdf` : null;

/** Os meses com nota aceita, do mais novo ao mais antigo (como a rota os dá). 404 é "nenhum mês", dito pela tela. */
export async function mesesComNota(): Promise<string[]>{

    const { data, status } = await http.get<{ meses?: string[] }>('/meses.json');

    return status === 404 ? [] : (data.meses ?? []).filter(mes => /^\d{4}-\d{2}$/.test(mes));
}

/** As notas aceitas do mês (`AAAA-MM`). 404 da rota é mês sem nota aceita, com o motivo dela. */
export async function notasDoMes(mes: string): Promise<LeituraDoMes>{

    const { data, status } = await http.get<{ notas?: Nota[]; motivo?: string }>(`/${mes}.json`);

    if(status === 404 || !data.notas?.length) return { semNota: data.motivo ?? MOTIVO_SEM_NOTA };

    return { notas: data.notas };
}

/** O total do mês, somado em centavos para não carregar erro de ponto flutuante. `undefined` sem nota (nunca R$ 0). */
export function totalDoMes(notas: Nota[]): number | undefined{

    if(notas.length === 0) return undefined;

    return notas.reduce((sum, nota) => sum + Math.round(nota.valor * 100), 0) / 100;
}

/** O mês a mostrar: o pedido se o índice o tem, senão o mais novo do índice; `undefined` sem nenhum mês. */
export const mesEscolhido = (pedido: string | null, meses: string[]): string | undefined => (pedido && meses.includes(pedido) ? pedido : meses[0]);

/** `AAAA-MM-DD` como dia/mês/ano, sem passar por fuso. Data fora do formato fica como veio. */
export function diaDaEmissao(iso: string): string{

    const found = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);

    return found ? `${found[3]}/${found[2]}/${found[1]}` : iso;
}

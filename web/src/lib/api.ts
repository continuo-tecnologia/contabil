import axios from 'axios';
import type { Competencia } from './competencia';
import type { Operacao, Parcela } from './fluxo';

/** A API é a mesma (Express/Mongo). Na imagem o nginx a serve em /api, na mesma origem; `VITE_API_URL` só muda isso. */
// O servidor não responde a uma validação do Mongoose que falha numa operação (sem tratamento de erro no Express 4): o prazo evita a tela pendurada.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api', timeout: 15_000 });

export type Totais = Record<string, number>;

export interface NovaOperacao{
    name: string;
    category: string;
    value: number;
    competence_date: string;
    cash_flow: Parcela[];
}

export interface NovoBem{
    name: string;
    type: 'D' | 'A' | 'E';
    price: number;
    quantity: number;
    purchase_date: string;
    cash_flow: Parcela[];
    use_start_date: string;
    lifetime_in_months: number;
}

export const totaisDoMes = async ({ year, month }: Competencia): Promise<Totais> => (await api.get<Totais>(`/totals/ym/${year}/${month}`)).data;

export const operacoesDoMes = async ({ year, month }: Competencia): Promise<Operacao[]> => (await api.get<Operacao[]>(`/operations/ym/${year}/${month}`)).data;

export const lancarOperacao = async (operation: NovaOperacao): Promise<void> => { await api.post('/operations', operation); };

/** O servidor devolve `{ error, asset }`: o erro de validação do Mongoose, com o campo e a frase, ou nulo. */
export async function lancarBem(asset: NovoBem): Promise<{ campos: Record<string, string> } | null>{

    const { data } = await api.post<{ error: { errors?: Record<string, { message: string }> } | null }>('/assets', asset);

    if(!data.error) return null;

    return { campos: Object.fromEntries(Object.entries(data.error.errors ?? {}).map(([field, problem]) => [field, problem.message])) };
}

/** Quantas operações o servidor apagou: 0 quando o id não é de uma operação lançada (as linhas de bens, de compra e depreciação, vêm de outra coleção). */
export async function apagarOperacao(id: string): Promise<number>{

    const { data } = await api.delete<{ deletedCount?: number; n?: number }>(`/operation/${id}`);

    return data.deletedCount ?? data.n ?? 0;
}

export default api;

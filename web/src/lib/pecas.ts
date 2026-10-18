import type { CommonHeaderPlatform } from '@ctn/base';
import type { HouseIconId } from '@ctn/base/casa';
import { createElement } from 'react';
import { HouseIcon } from '@ctn/base/casa';
import type { Casa } from './casa';

/** Uma frase curta de cada peça, para a grade de peças da marca. */
const FRASES: Record<string, string> = {
    gestao: 'Pendências e decisões do sócio.',
    owp: 'Planejamento, atendimento, pessoas e financeiro.',
    idp: 'Entregas, confiabilidade e custos.',
    financeiro: 'DRE, fluxo de caixa e notas fiscais.',
    cliente: 'A visão do cliente, como ele a vê.',
    kit: 'O catálogo de telas e componentes.',
};

/** As peças da casa que este app liga, na mesma ordem das outras portas. O Painel do Parceiro fica de fora: este endereço é do escritório. */
const ORDEM = ['gestao', 'owp', 'idp', 'financeiro', 'cliente', 'kit'] as const;

/**
 * A grade de peças do cabeçalho: toda peça da equipe que o mapa tem, com a atual marcada. Uma que o mapa diz fora do ar vem desligada, dita.
 * Este app não tem login (a porta é a lista de IPs do escritório): quem chega aqui é do escritório, e a grade não depende de papel.
 */
export function pecasDoFinanceiro(casa: Casa, atual: string): CommonHeaderPlatform[]{

    return ORDEM.flatMap((id): CommonHeaderPlatform[] => {

        const item = casa.enderecos.find(endereco => endereco.id === id);

        if(!item) return [];

        const base = { id, label: item.peca, icon: createElement(HouseIcon, { id: id as HouseIconId }), description: FRASES[id] };

        if(id === atual) return [{ ...base, href: '/', current: true }];

        return item.no_ar ? [{ ...base, href: `https://${item.host}/` }] : [{ ...base, unavailable: 'este endereço ainda não está no ar' }];
    });
}

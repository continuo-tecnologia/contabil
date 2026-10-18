// O mapa da casa que este app lê: a cópia de data/casa.json (a fonte é o OWP, que a publica em /casa.json). O app nunca a lê do OWP em tempo de execução.
export interface CasaSecao{
    id: string;
    rotulo: string;
    caminho: string;
}

export interface CasaEndereco{
    id: string;
    host: string;
    peca: string;
    secoes: CasaSecao[];
    fora_do_menu?: CasaSecao[];
}

export interface Casa{
    marca: Parameters<typeof import('@ctn/base/theme').createHouseThemes>[0];
    enderecos: CasaEndereco[];
}

/** O endereço deste app no mapa. */
export function enderecoDoFinanceiro(casa: Casa): CasaEndereco{

    const found = casa.enderecos.find(item => item.id === 'financeiro');

    if(!found) throw new Error('o mapa da casa não tem o endereço financeiro');

    return found;
}

/** A seção do caminho (`/` e `/fluxo-de-caixa`, com ou sem barra final); `undefined` se o mapa não a tem. */
export function secaoDoCaminho(endereco: CasaEndereco, caminho: string): CasaSecao | undefined{

    const clean = caminho.length > 1 ? caminho.replace(/\/+$/, '') : caminho;

    return [...endereco.secoes, ...(endereco.fora_do_menu ?? [])].find(secao => (secao.caminho.length > 1 ? secao.caminho.replace(/\/+$/, '') : secao.caminho) === clean);
}

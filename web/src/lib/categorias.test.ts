// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import categories from '../data/categories.json';

// A tela lê data/categories.json (o Docker só leva web/ ao build); o export do Mongo do backend é a fonte, e os dois não podem divergir.
it('o data/categories.json é o export de backend/categories.json, sem diferença', () => {

    const exported = readFileSync(resolve(process.cwd(), '../backend/categories.json'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const num = (v: { $numberInt?: string } | number) => (typeof v === 'number' ? v : Number(v.$numberInt));

    expect(categories).toEqual(exported.map(item => ({ name: item.name, title: item.title, color: item.color, fillable: item.fillable, left: num(item.left), right: num(item.right) })));
});

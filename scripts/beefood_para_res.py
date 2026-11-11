"""BeeFood (extraído do cardápio público) → formato de private.importar_cardapio (D-049)."""
import json, re, sys
from collections import Counter

def limpa(t):
    if t is None: return ''
    t = re.sub(r'\{#[0-9a-fA-F]{3,8}:\s*([^}]*)\}', r'\1', t)  # marcação de cor do BeeFood
    return t.strip()

def converter(d, prefixo):
    out = {'setores': [], 'grupos': [], 'produtos': []}
    for s in sorted(d['setores'], key=lambda s: s['o']):
        out['setores'].append({'chave': f'{prefixo}:setor:{s["id"]}', 'nome': limpa(s['d']), 'ordem': s['o']})
    for g in d['grupos']:
        nome = limpa(g['d'])
        n = nome.lower()
        pizza = 'sabor' in n and ('pizza' in n or 'sobremesa' in n)
        if not g['av']: formacao = 'brinde'
        elif g['vm']: formacao = 'maior'
        elif g['prop']: formacao = 'proporcional'
        else: formacao = 'soma'
        opcs = [o for o in g['opc'] if o['a'] and o['dl'] is not False]
        pids = Counter(o['pid'] for o in opcs)
        assert all(c == 1 for c in pids.values()), (g['id'], [p for p, c in pids.items() if c > 1])
        assert g['ob'] is False or g['mn'] >= 1, g['id']
        assert g['mx'] >= g['mn'] >= 0, g['id']
        assert len(nome) <= 100, nome
        omax = [max(1, min(o['mx'] or 1, g['mx'])) for o in opcs]
        out['grupos'].append({
            'chave': f'{prefixo}:grupo:{g["id"]}', 'nome': nome, 'obrigatorio': bool(g['ob']), 'pizza': pizza,
            'formacao': formacao, 'min': g['mn'], 'max': g['mx'], 'permite_repetir': g['mx'] > 1 and any(m > 1 for m in omax),
            'opcoes': [{
                'chave': f'{prefixo}:opcao:{g["id"]}:{o["pid"]}', 'nome': limpa(o['d']), 'preco': o['v'] or 0,
                'max': m, 'ordem': i + 1, 'descricao': limpa(o['ds'])[:200], 'imagem': o['img'] or ''}
                for i, (o, m) in enumerate(zip(opcs, omax))]})
    G = {g['chave']: g for g in out['grupos']}
    for p in sorted(d['prods'], key=lambda p: (p['os'], p['op'], p['d'])):
        if not p['a'] or p['dl'] is False: continue
        grupos = [f'{prefixo}:grupo:{x["id"]}' for x in sorted(p['g'], key=lambda x: x['o'])]
        det = p['det'] or {}
        restr = [k for k, v in (('vegetariano', det.get('veg')), ('vegano', det.get('vgn')), ('sem_gluten', det.get('sg')),
                                ('sem_acucar', det.get('sa')), ('zero_lactose', det.get('zl')), ('gelado', det.get('gel'))) if v]
        # fator da ficha por sabor (D-040): tamanho pelo diâmetro do produto de pizza (25=1, 30=2, 35=3, 40=4)
        fator = None
        pz = [G[c] for c in grupos if G[c]['pizza']]
        m = re.search(r'(\d{2})\s*cm', p['d'], re.I)
        if len(pz) == 1 and m and int(m.group(1)) in (25, 30, 35, 40):
            fator = {25: 1, 30: 2, 35: 3, 40: 4}[int(m.group(1))]
        preco = p['v'] or 0
        out['produtos'].append({
            'chave': f'{prefixo}:produto:{p["id"]}', 'setor': f'{prefixo}:setor:{p["sid"]}', 'nome': limpa(p['d']),
            'descricao': limpa(p['ds']), 'preco': preco,
            'preco_delivery': p['vd'] if p['vd'] is not None and p['vd'] != preco else '',
            'preco_presencial': p['vp'] if p['vp'] is not None and p['vp'] != preco else '',
            'imagem': p['img'] or '', 'ordem': p['op'], 'serve': p['serve'] or '', 'restricoes': restr,
            'fator': fator or '', 'grupos': grupos})
    usados = {c for p in out['produtos'] for c in p['grupos']}
    out['grupos'] = [g for g in out['grupos'] if g['chave'] in usados]
    return out

if __name__ == '__main__':
    d = json.load(open(sys.argv[1]))
    out = converter(d, sys.argv[2])
    json.dump(out, open(sys.argv[3], 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(out['setores']), 'setores', len(out['produtos']), 'produtos', len(out['grupos']), 'grupos',
          sum(len(g['opcoes']) for g in out['grupos']), 'opções')

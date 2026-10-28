import json,sys,re
bfp,resp,vitp=sys.argv[1:4]
res=json.load(open(resp)); vit=json.load(open(vitp)); bf=json.load(open(bfp))
def L(t): return re.sub(r'\{#[0-9a-fA-F]{3,8}:\s*([^}]*)\}', r'\1', t or '').strip()
erros=[]; n=0
G={g['id']:g for g in bf['grupos']}
bset=[L(s['d']) for s in sorted(bf['setores'],key=lambda s:s['o'])]
rset=[s['nome'] for s in res['setores']]
if bset!=rset: erros.append(('categorias',bset,rset))
rprod={}
for s in res['setores']:
    for p in s['produtos']: rprod.setdefault((s['nome'],p['nome']),[]).append(p)
for s in res['setores']:
    bord=[L(p['d']) for p in sorted([p for p in bf['prods'] if L(p['setor'])==s['nome']],key=lambda p:(p['op'],L(p['d'])))]
    if bord!=[p['nome'] for p in s['produtos']]: erros.append(('ordem produtos',s['nome']))
for p in bf['prods']:
    n+=1
    k=(L(p['setor']),L(p['d']))
    rp=rprod.get(k)
    if not rp or len(rp)!=1: erros.append(('produto ausente/duplicado',k)); continue
    r=rp[0]
    if r['preco']!=round((p['v'] or 0)*100): erros.append(('preço',k,p['v'],r['preco']))
    if (r['descricao'] or '')!=L(p['ds']): erros.append(('descrição',k))
    if r['imagem_url']!=p['img']: erros.append(('foto',k))
    ex=(vit.get('produtos') or {}).get(r['id'],{})
    if (ex.get('serve') or None)!=(p['serve'] or None): erros.append(('serve',k,p['serve'],ex.get('serve')))
    bg=[G[x['id']] for x in sorted(p['g'],key=lambda x:x['o'])]
    if len(bg)!=len(r['grupos']): erros.append(('nº grupos',k,len(bg),len(r['grupos']))); continue
    for b,g in zip(bg,r['grupos']):
        form='brinde' if not b['av'] else 'maior' if b['vm'] else 'proporcional' if b['prop'] else 'soma'
        if L(b['d'])!=g['nome'] or b['mn']!=g['min'] or b['mx']!=g['max'] or bool(b['ob'])!=g['obrigatorio'] or g['formacao']!=form:
            erros.append(('regra grupo',k,b['d'],g))
        bo=[o for o in b['opc'] if o['a']]
        if [L(o['d']) for o in bo]!=[o['nome'] for o in g['opcoes']]: erros.append(('opções/ordem',k,b['d'])); continue
        for o,ro in zip(bo,g['opcoes']):
            n+=1
            if round((o['v'] or 0)*100)!=ro['preco']: erros.append(('preço opção',k,o['d'],o['v'],ro['preco']))
            if max(1,min(o['mx'],b['mx']))!=ro['max']: erros.append(('máx opção',k,o['d']))
            if (o['img'] or None)!=ro['imagem_url']: erros.append(('foto opção',k,o['d']))
            vo=(vit.get('opcoes') or {}).get(ro['id'],{})
            if (vo.get('descricao') or '')!=L(o['ds'])[:200]: erros.append(('desc opção',k,o['d']))
        if g['permite_repetir']!=(b['mx']>1 and any(min(o['mx'],b['mx'])>1 for o in bo)): erros.append(('repetir',k,b['d']))
extras=set(rprod)-{(L(p['setor']),L(p['d'])) for p in bf['prods']}
if extras: erros.append(('sobrando no RES',extras))
print('itens conferidos:',n,'| erros:',len(erros))
for e in erros[:30]: print(e)

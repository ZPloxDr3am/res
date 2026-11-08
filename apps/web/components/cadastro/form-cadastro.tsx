'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { COMO_CONHECEU, PEDIDOS_DIA, QTD_LOJAS, SISTEMA_ATUAL, TIPOS_RESTAURANTE, formatarTelefone, slugValido, sugerirSlug } from '@res/core';
import { cadastrarRestaurante, conferirEtapa, verificarSlug, type DadosCadastro } from '@/app/cadastro/actions';
import { CamposEmpresa, type CamposEmpresaValor } from '@/components/cadastro/campos-empresa';

const ETAPAS = ['Responsável', 'Empresa', 'Restaurante'] as const;
const VAZIO: DadosCadastro = {
  nome: '', email: '', senha: '', whatsapp: '',
  semCnpj: false, documento: '', razaoSocial: '', nomeFantasia: '', inscricaoEstadual: '', telefoneLoja: '', emailLoja: '',
  endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', lat: null, lng: null },
  restaurante: '', tipo: '', slug: '', qtdLojas: '', sistemaAtual: '', pedidosDia: '', comoConheceu: '', exemplo: true, aceite: false,
};

/** Cadastro completo do restaurante (D-076/D-077): responsável → empresa (CNPJ preenche sozinho) → restaurante. */
export function FormCadastro({ dominio }: { dominio: string }) {
  const [d, setD] = useState<DadosCadastro>(VAZIO);
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [slugEditado, setSlugEditado] = useState(false);
  const [livre, setLivre] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const topo = useRef<HTMLFormElement>(null);
  const muda = <K extends keyof DadosCadastro>(k: K, v: DadosCadastro[K]) => setD((x) => ({ ...x, [k]: v }));
  // endereço do cardápio segue o nome até a pessoa mexer nele
  useEffect(() => {
    if (!slugEditado) setD((x) => ({ ...x, slug: sugerirSlug(x.restaurante) }));
  }, [d.restaurante, slugEditado]);
  useEffect(() => {
    setLivre(null);
    if (!slugValido(d.slug)) return;
    const t = setTimeout(() => void verificarSlug(d.slug).then(setLivre).catch(() => setLivre(null)), 400);
    return () => clearTimeout(t);
  }, [d.slug]);

  const avancar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const problema = await conferirEtapa(d, etapa);
      if (problema) return setErro(problema);
      if (etapa < 3) {
        setEtapa((etapa + 1) as 2 | 3);
        topo.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (livre === false) return setErro('Esse endereço do cardápio já está em uso. Escolha outro.');
      const r = await cadastrarRestaurante(d);
      if (r && !r.ok) setErro(r.erro);
    });
  };

  return (
    <form ref={topo} className="cartao grade cad-form" onSubmit={avancar} noValidate>
      <div>
        <div className="marca-res" style={{ fontSize: '1.6rem' }}>RES</div>
        <h1 style={{ margin: '0.3rem 0 0' }}>Cadastre seu restaurante</h1>
        <p className="dica" style={{ margin: 0 }}>Cardápio digital, pedidos, entregas e gestão num lugar só.</p>
      </div>

      <ol className="cad-etapas" aria-label="Etapas do cadastro">
        {ETAPAS.map((n, i) => (
          <li key={n} data-atual={etapa === i + 1 || undefined} data-feita={etapa > i + 1 || undefined}>
            <button type="button" disabled={etapa <= i + 1 || pendente} onClick={() => { setErro(null); setEtapa((i + 1) as 1 | 2 | 3); }}>
              <span className="cad-etapa-num">{etapa > i + 1 ? '✓' : i + 1}</span> {n}
            </button>
          </li>
        ))}
      </ol>

      {etapa === 1 && (
        <fieldset className="grade">
          <legend>Responsável pela conta</legend>
          <label>Nome completo<input value={d.nome} onChange={(e) => muda('nome', e.target.value)} required maxLength={120} autoComplete="name" /></label>
          <label>Celular / WhatsApp<input value={d.whatsapp} onChange={(e) => muda('whatsapp', formatarTelefone(e.target.value))} required inputMode="tel" autoComplete="tel" placeholder="(47) 99999-0000" />
            <span className="dica">O time do RES fala com você por aqui.</span></label>
          <label>E-mail<input type="email" value={d.email} onChange={(e) => muda('email', e.target.value)} required autoComplete="email" autoCapitalize="none" spellCheck={false} /></label>
          <label>Senha<input type="password" value={d.senha} onChange={(e) => muda('senha', e.target.value)} required minLength={8} autoComplete="new-password" />
            <span className="dica">Pelo menos 8 caracteres.</span></label>
        </fieldset>
      )}

      {etapa === 2 && (
        <fieldset className="grade">
          <legend>Dados da empresa</legend>
          <CamposEmpresa
            v={d}
            onChange={(f) => setD((x) => ({ ...x, ...f(x as CamposEmpresaValor) }))}
            onReceita={(r) => setD((x) => ({ ...x, restaurante: x.restaurante || r.nome_fantasia || r.razao_social }))}
            dicaCpf="Quando tiver o CNPJ, é só trocar em Lojas e equipe → Dados da empresa."
          />
        </fieldset>
      )}

      {etapa === 3 && (
        <fieldset className="grade">
          <legend>Seu restaurante no RES</legend>
          <label>Nome no cardápio<input value={d.restaurante} onChange={(e) => muda('restaurante', e.target.value)} maxLength={120} placeholder="Como o cliente conhece você" /></label>
          <div className="grade" style={{ gap: '0.3rem' }}>
            <span>Tipo</span>
            <div className="cad-tipos" role="radiogroup" aria-label="Tipo de restaurante">
              {TIPOS_RESTAURANTE.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={d.tipo === t.id} className="cad-tipo" onClick={() => muda('tipo', t.id)}>
                  <span aria-hidden="true">{t.emoji}</span> {t.rotulo}
                </button>
              ))}
            </div>
          </div>
          <label>
            Endereço do cardápio
            <span className="cad-slug">
              <span className="dica">{dominio}/c/</span>
              <input value={d.slug} onChange={(e) => { setSlugEditado(true); muda('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} maxLength={60} autoCapitalize="none" spellCheck={false} aria-describedby="cad-slug-sit" />
            </span>
            <span id="cad-slug-sit" className={livre === false ? 'erro' : 'dica'} role="status">
              {!d.slug ? 'É o link que você vai mandar para os clientes.' : !slugValido(d.slug) ? 'Letras minúsculas, números e hífen (3 a 60).' : livre === null ? 'Conferindo…' : livre ? '✅ Disponível' : '❌ Já está em uso, escolha outro'}
            </span>
          </label>
          <div className="cad-2">
            <label>Quantas lojas você tem?<select value={d.qtdLojas} onChange={(e) => muda('qtdLojas', e.target.value)}><option value="">—</option>{QTD_LOJAS.map((q) => <option key={q.id} value={q.id}>{q.rotulo}</option>)}</select></label>
            <label>Pedidos por dia <span className="dica">(aprox.)</span><select value={d.pedidosDia} onChange={(e) => muda('pedidosDia', e.target.value)}><option value="">—</option>{PEDIDOS_DIA.map((q) => <option key={q}>{q}</option>)}</select></label>
          </div>
          <div className="cad-2">
            <label>Usa qual sistema hoje?<select value={d.sistemaAtual} onChange={(e) => muda('sistemaAtual', e.target.value)}><option value="">—</option>{SISTEMA_ATUAL.map((q) => <option key={q}>{q}</option>)}</select></label>
            <label>Como conheceu o RES?<select value={d.comoConheceu} onChange={(e) => muda('comoConheceu', e.target.value)}><option value="">—</option>{COMO_CONHECEU.map((q) => <option key={q}>{q}</option>)}</select></label>
          </div>
          {d.qtdLojas && d.qtdLojas !== '1' && <p className="dica" style={{ margin: 0 }}>Você começa com esta loja; o time do RES fala com você para liberar as outras no mesmo grupo.</p>}
          <label className="linha" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
            <input type="checkbox" checked={d.exemplo} onChange={(e) => muda('exemplo', e.target.checked)} style={{ width: 'auto', marginTop: '0.2rem' }} />
            <span>Começar com um cardápio de exemplo do meu tipo de restaurante <span className="dica">(dá para editar ou apagar tudo depois)</span></span>
          </label>
          <label className="linha" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
            <input type="checkbox" checked={d.aceite} onChange={(e) => muda('aceite', e.target.checked)} style={{ width: 'auto', marginTop: '0.2rem' }} />
            <span>Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank">Política de Privacidade</Link>.</span>
          </label>
        </fieldset>
      )}

      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
      <div className="linha" style={{ gap: '0.5rem' }}>
        {etapa > 1 && <button type="button" className="botao" disabled={pendente} onClick={() => { setErro(null); setEtapa((etapa - 1) as 1 | 2); }}>Voltar</button>}
        <button className="botao-primario" style={{ flex: 1 }} disabled={pendente || (etapa === 3 && (!d.aceite || livre === false))}>
          {pendente ? (etapa === 3 ? 'Criando…' : 'Conferindo…') : etapa < 3 ? 'Continuar' : 'Criar minha conta'}
        </button>
      </div>
      <p className="dica" style={{ margin: 0, textAlign: 'center' }}>Já tem conta? <Link href="/login">Entrar</Link></p>
    </form>
  );
}

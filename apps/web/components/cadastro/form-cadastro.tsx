'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { TIPOS_RESTAURANTE, slugValido, sugerirSlug } from '@res/core';
import { cadastrarRestaurante, verificarSlug, type DadosCadastro } from '@/app/cadastro/actions';

/** Cadastro sozinho (D-076): uma tela só, conta + restaurante. */
export function FormCadastro({ dominio }: { dominio: string }) {
  const [d, setD] = useState<DadosCadastro>({ nome: '', email: '', senha: '', whatsapp: '', restaurante: '', tipo: '', cidade: '', slug: '', exemplo: true, aceite: false });
  const [slugEditado, setSlugEditado] = useState(false);
  const [livre, setLivre] = useState<boolean | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const muda = <K extends keyof DadosCadastro>(k: K, v: DadosCadastro[K]) => setD((x) => ({ ...x, [k]: v }));

  // endereço do cardápio segue o nome do restaurante até a pessoa mexer nele
  useEffect(() => {
    if (!slugEditado) setD((x) => ({ ...x, slug: sugerirSlug(x.restaurante) }));
  }, [d.restaurante, slugEditado]);
  useEffect(() => {
    setLivre(null);
    if (!slugValido(d.slug)) return;
    const t = setTimeout(() => void verificarSlug(d.slug).then(setLivre).catch(() => setLivre(null)), 400);
    return () => clearTimeout(t);
  }, [d.slug]);

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    iniciar(async () => {
      const r = await cadastrarRestaurante(d);
      if (r && !r.ok) setErro(r.erro);
    });
  };

  return (
    <form className="cartao grade cad-form" onSubmit={enviar}>
      <div>
        <div className="marca-res" style={{ fontSize: '1.6rem' }}>RES</div>
        <h1 style={{ margin: '0.3rem 0 0' }}>Crie a conta do seu restaurante</h1>
        <p className="dica" style={{ margin: 0 }}>Cardápio digital, pedidos, entregas e gestão. Leva uns 2 minutos.</p>
      </div>

      <fieldset className="grade">
        <legend>Você</legend>
        <label>Seu nome<input value={d.nome} onChange={(e) => muda('nome', e.target.value)} required maxLength={120} autoComplete="name" /></label>
        <label>WhatsApp<input value={d.whatsapp} onChange={(e) => muda('whatsapp', e.target.value)} required inputMode="tel" autoComplete="tel" placeholder="(47) 99999-0000" /></label>
        <label>E-mail<input type="email" value={d.email} onChange={(e) => muda('email', e.target.value)} required autoComplete="email" autoCapitalize="none" spellCheck={false} /></label>
        <label>Senha<input type="password" value={d.senha} onChange={(e) => muda('senha', e.target.value)} required minLength={8} autoComplete="new-password" />
          <span className="dica">Pelo menos 8 caracteres.</span></label>
      </fieldset>

      <fieldset className="grade">
        <legend>Seu restaurante</legend>
        <label>Nome do restaurante<input value={d.restaurante} onChange={(e) => muda('restaurante', e.target.value)} required maxLength={120} placeholder="Ex.: Pizzaria do Bairro" /></label>
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
        <label>Cidade<input value={d.cidade} onChange={(e) => muda('cidade', e.target.value)} required maxLength={80} autoComplete="address-level2" /></label>
        <label>
          Endereço do cardápio
          <span className="cad-slug">
            <span className="dica">{dominio}/c/</span>
            <input value={d.slug} onChange={(e) => { setSlugEditado(true); muda('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); }} required maxLength={60} autoCapitalize="none" spellCheck={false} aria-describedby="cad-slug-sit" />
          </span>
          <span id="cad-slug-sit" className={livre === false ? 'erro' : 'dica'} role="status">
            {!d.slug ? 'É o link que você vai mandar para os clientes.' : !slugValido(d.slug) ? 'Letras minúsculas, números e hífen (3 a 60).' : livre === null ? 'Conferindo…' : livre ? '✅ Disponível' : '❌ Já está em uso, escolha outro'}
          </span>
        </label>
        <label className="linha" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={d.exemplo} onChange={(e) => muda('exemplo', e.target.checked)} style={{ width: 'auto', marginTop: '0.2rem' }} />
          <span>Começar com um cardápio de exemplo do meu tipo de restaurante <span className="dica">(dá para editar ou apagar tudo depois)</span></span>
        </label>
      </fieldset>

      <label className="linha" style={{ gap: '0.5rem', alignItems: 'flex-start' }}>
        <input type="checkbox" checked={d.aceite} onChange={(e) => muda('aceite', e.target.checked)} required style={{ width: 'auto', marginTop: '0.2rem' }} />
        <span>Li e aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> e a <Link href="/privacidade" target="_blank">Política de Privacidade</Link>.</span>
      </label>

      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
      <button className="botao-primario" disabled={pendente || livre === false || !d.tipo || !d.aceite}>{pendente ? 'Criando…' : 'Criar minha conta'}</button>
      <p className="dica" style={{ margin: 0, textAlign: 'center' }}>Já tem conta? <Link href="/login">Entrar</Link></p>
    </form>
  );
}

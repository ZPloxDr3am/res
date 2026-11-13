'use client';
import { useState, useTransition } from 'react';
import { cadastrarMotoboy } from './actions';

const APK = 'https://github.com/ZPloxDr3am/res/releases/download/motoboy-latest/RES-Motoboy.apk';

export function FormMotoboy({ token, loja }: { token: string; loja: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  if (feito) {
    return (
      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>✅ Cadastro enviado</h2>
        <p style={{ margin: 0 }}>Agora é só esperar o gerente da {loja} aprovar. Enquanto isso, instale o app:</p>
        <a className="botao botao-primario" href={APK}>Baixar o app do motoboy (Android)</a>
        <p className="dica" style={{ margin: 0 }}>Depois de aprovado, entre no app com o usuário <b>{feito}</b> e a sua senha.</p>
      </section>
    );
  }
  return (
    <form
      className="cartao grade"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        iniciar(async () => {
          setErro(null);
          const r = await cadastrarMotoboy(token, f);
          if (!r.ok) return setErro(r.erro);
          setFeito(String(f.get('usuario') ?? '').trim().toLowerCase());
        });
      }}
    >
      <label>Seu nome<input name="nome" required maxLength={120} autoComplete="name" /></label>
      <label>WhatsApp com DDD<input name="telefone" required inputMode="tel" autoComplete="tel" placeholder="(47) 99999-0000" /></label>
      <div className="cad-2">
        <label>Veículo <span className="dica">(opcional)</span><input name="veiculo" maxLength={40} placeholder="Ex.: Honda CG 160" /></label>
        <label>Placa <span className="dica">(opcional)</span><input name="placa" maxLength={8} placeholder="ABC1D23" style={{ textTransform: 'uppercase' }} /></label>
      </div>
      <label>Chave Pix para receber <span className="dica">(opcional)</span><input name="pix" maxLength={120} /></label>
      <hr />
      <label>Escolha um usuário<input name="usuario" required minLength={3} maxLength={30} autoComplete="username" autoCapitalize="none" placeholder="ex.: joao.moto" />
        <span className="dica">Letras minúsculas, números, ponto ou traço.</span></label>
      <label>Escolha uma senha<input name="senha" type="password" required minLength={6} autoComplete="new-password" /></label>
      <label className="check" style={{ alignItems: 'flex-start' }}>
        <input type="checkbox" name="aceite" value="sim" required />
        <span className="dica">Concordo que a {loja} guarde meus dados (nome, WhatsApp, veículo e Pix) para organizar e pagar as entregas.</span>
      </label>
      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
      <button type="submit" className="botao-primario" disabled={pendente}>{pendente ? 'Enviando…' : 'Enviar cadastro'}</button>
    </form>
  );
}

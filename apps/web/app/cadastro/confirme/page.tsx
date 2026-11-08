import Link from 'next/link';

export default function ConfirmeEmail() {
  return (
    <main className="conteudo" style={{ maxWidth: 480, marginTop: '8vh' }}>
      <div className="cartao grade">
        <div className="marca-res" style={{ fontSize: '1.6rem' }}>RES</div>
        <h1 style={{ margin: 0 }}>📬 Confira seu e-mail</h1>
        <p>Mandamos um link de confirmação. Toque nele e o RES abre já com o seu restaurante criado, nos <strong>Primeiros passos</strong>.</p>
        <p className="dica" style={{ margin: 0 }}>Não chegou em alguns minutos? Veja a caixa de spam ou promoções. O link vale por 24 horas.</p>
        <Link className="botao" href="/login">Ir para o login</Link>
      </div>
    </main>
  );
}

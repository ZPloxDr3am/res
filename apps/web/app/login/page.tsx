import { entrar, cadastrar } from './actions';

export default async function Login({ searchParams }: { searchParams: Promise<{ erro?: string; aviso?: string }> }) {
  const { erro, aviso } = await searchParams;
  return (
    <main className="conteudo" style={{ maxWidth: 420, marginTop: '8vh' }}>
      <div className="cartao grade">
        <div>
          <div className="marca-res" style={{ fontSize: '1.6rem' }}>RES</div>
          <p className="dica">Pedidos, cardápio e gestão do seu restaurante.</p>
        </div>
        {erro && <p className="erro" role="alert">{erro}</p>}
        {aviso && <p className="dica" role="status">{aviso}</p>}
        <form className="grade">
          <label>
            E-mail
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            Senha
            <input type="password" name="senha" required minLength={8} autoComplete="current-password" />
          </label>
          <div className="linha">
            <button className="botao-primario" formAction={entrar}>Entrar</button>
            <button formAction={cadastrar}>Criar conta</button>
          </div>
        </form>
      </div>
    </main>
  );
}

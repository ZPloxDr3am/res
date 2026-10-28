/** Enquanto a próxima tela carrega: o menu fica e o conteúdo mostra um esboço (resposta imediata ao clique). */
export default function Carregando() {
  return (
    <div className="esboco" aria-busy="true" aria-label="Carregando">
      <span className="esboco-titulo" />
      <span className="esboco-linha" />
      <div className="esboco-grade">
        <span /><span /><span />
      </div>
      <span className="esboco-bloco" />
    </div>
  );
}

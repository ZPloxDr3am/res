/** Enquanto a próxima tela carrega (D-120): o símbolo oficial SINO (desenho próprio de 48 px) e uma barra de progresso. */
export default function Carregando() {
  return (
    <div className="s-carregando" role="status" aria-live="polite">
      <img className="s-carregando-simbolo" data-fundo="claro" src="/marca/sino-simbolo-48px-cor.svg" alt="" width={48} height={48} />
      <img className="s-carregando-simbolo" data-fundo="escuro" src="/marca/sino-simbolo-48px-negativo.svg" alt="" width={48} height={48} />
      <span className="s-carregando-barra" aria-hidden="true"><span /></span>
      <span className="s-carregando-texto">Carregando…</span>
    </div>
  );
}

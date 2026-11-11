/** Enquanto a próxima tela carrega: a marca RES animada (mostra que o clique foi recebido). */
export default function Carregando() {
  return (
    <div className="carregando-res" role="status" aria-live="polite">
      <div className="carregando-marca" aria-hidden="true">
        <span className="carregando-selo" />
        <span className="carregando-letras">
          <span>R</span>
          <span>E</span>
          <span>S</span>
        </span>
      </div>
      <span className="carregando-barra" aria-hidden="true"><span /></span>
      <span className="carregando-texto">Carregando…</span>
    </div>
  );
}

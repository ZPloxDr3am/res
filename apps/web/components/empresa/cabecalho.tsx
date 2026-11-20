import type { ReactNode } from 'react';

/** Cabeçalho SINO das telas da empresa (D-127): família do menu + título + subtítulo, como no painel do restaurante. */
export function CabecalhoEmpresa({ familia, titulo, subtitulo, children }: { familia: 'Inteligência' | 'Gestão' | 'Configurações'; titulo: string; subtitulo?: ReactNode; children?: ReactNode }) {
  return (
    <header className="s-cabecalho">
      <div className="s-cabecalho-texto">
        <p className="s-sobretitulo">{familia}</p>
        <h1 className="s-titulo">{titulo}</h1>
        {subtitulo && <p className="s-subtitulo">{subtitulo}</p>}
      </div>
      {children}
    </header>
  );
}

/** Indicador no formato do Resumo (s-kpi). O principal ganha o filete tomate. */
export function KpiEmpresa({ rotulo, valor, detalhe, principal }: { rotulo: string; valor: ReactNode; detalhe?: ReactNode; principal?: boolean }) {
  return (
    <article className="s-kpi" data-principal={principal ? '' : undefined} aria-label={rotulo}>
      <div className="s-kpi-topo">
        <h2 className="s-kpi-rotulo">{rotulo}</h2>
      </div>
      <p className="s-kpi-valor">{valor}</p>
      {detalhe && <p className="s-kpi-detalhe">{detalhe}</p>}
    </article>
  );
}

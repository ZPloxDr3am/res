'use client';
export function BotaoImprimir({ rotulo = '🖨️ Imprimir' }: { rotulo?: string }) {
  return <button type="button" className="botao-primario" onClick={() => window.print()}>{rotulo}</button>;
}

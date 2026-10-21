'use client';
import { CEDULAS, ehMoeda, formatarReais, rotuloCedula, totalContagem, type Contagem } from '@res/core';

/** Contagem guiada por cédula e moeda: quantidade de cada uma, subtotal na linha e total embaixo. */
export function Calculadora({ valor, onChange, titulo }: { valor: Contagem; onChange: (c: Contagem) => void; titulo: string }) {
  const linha = (c: number) => {
    const q = valor[String(c)] ?? 0;
    return (
      <label key={c} className="calc-linha">
        <span className={ehMoeda(c) ? 'calc-moeda' : 'calc-nota'}>{rotuloCedula(c)}</span>
        <span className="dica">×</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={99999}
          step={1}
          value={q || ''}
          placeholder="0"
          aria-label={`Quantidade de ${rotuloCedula(c)}`}
          onChange={(e) => {
            const n = Math.max(0, Math.min(99999, Math.floor(Number(e.target.value) || 0)));
            onChange({ ...valor, [String(c)]: n });
          }}
        />
        <span className="calc-sub">{q ? formatarReais(q * c) : ''}</span>
      </label>
    );
  };
  return (
    <fieldset className="calc">
      <legend>{titulo}</legend>
      <div className="calc-colunas">
        <div>{CEDULAS.filter((c) => !ehMoeda(c)).map(linha)}</div>
        <div>{CEDULAS.filter((c) => ehMoeda(c)).map(linha)}</div>
      </div>
      <div className="calc-total">
        <span>Total contado</span>
        <strong>{formatarReais(totalContagem(valor))}</strong>
      </div>
    </fieldset>
  );
}

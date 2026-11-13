'use client';
import { useState } from 'react';
import { ErroBoleto, lerBoleto, type Boleto } from '@res/core';
import { Bipar } from '@/components/estoque/bipar';
import { brl, dataBr, hojeSP } from '@/lib/financeiro';

/**
 * Boleto → conta a pagar (D-105): cole a linha digitável, digite, bipe com o leitor ou leia o código de barras
 * com a câmera. Confere os dígitos e devolve valor, vencimento e quem cobra para preencher a despesa.
 */
export function LerBoleto({ aoUsar, fechar, jaLancado }: { aoUsar: (b: Boleto) => void; fechar: () => void; jaLancado: (linha: string) => string | null }) {
  const [boleto, setBoleto] = useState<Boleto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ler = (cod: string) => {
    try {
      setBoleto(lerBoleto(cod, hojeSP()));
      setErro(null);
    } catch (e) {
      setBoleto(null);
      setErro(e instanceof ErroBoleto ? e.message : 'Não consegui ler este código.');
    }
  };
  const repetido = boleto ? jaLancado(boleto.linhaDigitavel) : null;

  return (
    <div className="pub-folha-fundo" role="dialog" aria-modal="true" aria-label="Ler boleto" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="pub-folha qp-folha">
        <div className="linha" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>▦ Lançar boleto</h2>
          <button type="button" className="mini" onClick={fechar}>Fechar</button>
        </div>
        <p className="dica" style={{ margin: 0 }}>
          Cole a <b>linha digitável</b> (a do app do banco ou do PDF), digite os números, bipe o código de barras com o leitor ou use a câmera. Vale para boleto de
          fornecedor e para conta de luz, água e telefone.
        </p>
        <Bipar aoLer={ler} rotulo="Linha digitável ou código de barras" botao="Ler boleto" />
        {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
        {boleto && (
          <div className="boleto-lido">
            <strong>{boleto.emissor}</strong>
            <span>
              Valor: <b>{boleto.valor != null ? brl(boleto.valor / 100) : 'não informado no código'}</b> · Vencimento:{' '}
              <b>{boleto.vencimento ? dataBr(boleto.vencimento) : 'não informado no código'}</b>
            </span>
            <code>{boleto.linhaDigitavel}</code>
            {repetido && <span className="erro">Atenção: este boleto já foi lançado ({repetido}).</span>}
          </div>
        )}
        <div className="linha" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="botao-primario" disabled={!boleto} onClick={() => boleto && aoUsar(boleto)}>
            Continuar para a despesa
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

/** Baixa um CSV (abre no Excel e no Google Planilhas). */
export function BaixarCsv({ nome, conteudo, rotulo = '⬇ Baixar para Excel' }: { nome: string; conteudo: string; rotulo?: string }) {
  return (
    <button
      type="button"
      className="mini"
      onClick={() => {
        const url = URL.createObjectURL(new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = nome;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      {rotulo}
    </button>
  );
}

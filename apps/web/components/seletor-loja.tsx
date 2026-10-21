'use client';
import { useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { trocarLoja } from '@/app/(painel)/lojas/actions';

/** Troca a loja aberta no painel. Só aparece para quem acessa mais de uma loja. */
export function SeletorLoja({ lojas, atual }: { lojas: { id: string; nome: string }[]; atual: string }) {
  const caminho = usePathname();
  const [pendente, iniciar] = useTransition();
  return (
    <label className="seletor-loja">
      <span className="dica">Loja</span>
      <select value={atual} disabled={pendente} onChange={(e) => { const id = e.target.value; iniciar(() => trocarLoja(id, caminho)); }} aria-label="Trocar de loja">
        {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
      </select>
    </label>
  );
}

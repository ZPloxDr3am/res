'use client';
import { useEffect } from 'react';
import { reportarErro } from '@/lib/erros';

/** Pega erros que escapam das telas (D-084). */
export function CapturaErros() {
  useEffect(() => {
    const erro = (ev: ErrorEvent) => reportarErro(ev.error ?? ev.message);
    const promessa = (ev: PromiseRejectionEvent) => reportarErro(ev.reason);
    window.addEventListener('error', erro);
    window.addEventListener('unhandledrejection', promessa);
    return () => {
      window.removeEventListener('error', erro);
      window.removeEventListener('unhandledrejection', promessa);
    };
  }, []);
  return null;
}

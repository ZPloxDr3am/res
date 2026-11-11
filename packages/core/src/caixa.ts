// Caixa: contagem por cédula/moeda, diferenças do fechamento e usuários de caixa (D-012, D-013).
// O banco repete as regras em supabase/migrations/*_caixa.sql (total_contagem, fechar_caixa).

import type { Centavos } from './tipos.js';

/** Cédulas e moedas do real, em centavos, da maior para a menor. */
export const CEDULAS: readonly Centavos[] = [20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 25, 10, 5];

export type Contagem = Partial<Record<string, number>>; // {"centavos": quantidade}

export const rotuloCedula = (c: Centavos) => (c >= 100 ? `R$ ${c / 100}` : `${c} ¢`);
export const ehMoeda = (c: Centavos) => c <= 100;

/** Total de uma contagem, em centavos. Quantidades inválidas contam como zero. */
export function totalContagem(c: Contagem): Centavos {
  return CEDULAS.reduce((s, v) => {
    const q = Number(c[String(v)] ?? 0);
    return s + (Number.isInteger(q) && q > 0 ? q * v : 0);
  }, 0);
}

/** Só as cédulas com quantidade > 0 (o que vai para o banco). */
export function limparContagem(c: Contagem): Record<string, number> {
  const r: Record<string, number> = {};
  for (const v of CEDULAS) {
    const q = Number(c[String(v)] ?? 0);
    if (Number.isInteger(q) && q > 0) r[String(v)] = q;
  }
  return r;
}

export type SituacaoDiferenca = 'confere' | 'sobra' | 'falta';
export const situacaoDiferenca = (d: Centavos): SituacaoDiferenca => (d === 0 ? 'confere' : d > 0 ? 'sobra' : 'falta');

// ---------------------------------------------------------------- usuários de caixa

/** Domínio dos e-mails internos (nunca recebem e-mail). Igual a private.dominio_usuarios(). */
export const DOMINIO_USUARIOS = 'equipe.res.invalid';

/** "Ana.Caixa " → "ana.caixa". */
export const normalizarUsuario = (u: string) => u.trim().toLowerCase();

/** null se válido; senão a mensagem para a tela. Mesma regra do banco (usuarios_login.usuario). */
export function validarUsuario(u: string): string | null {
  const n = normalizarUsuario(u);
  if (n.length < 3 || n.length > 30) return 'O usuário deve ter de 3 a 30 caracteres.';
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(n)) return 'Use letras sem acento, números, ponto, hífen ou sublinhado (começando por letra ou número).';
  return null;
}

/** E-mail interno usado no login por usuário. Quem digita e-mail (com @) continua entrando por e-mail. */
export const emailDeLogin = (entrada: string) => {
  const t = entrada.trim();
  return t.includes('@') ? t : `${normalizarUsuario(t)}@${DOMINIO_USUARIOS}`;
};

export function validarSenha(s: string): string | null {
  if (s.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (s.length > 72) return 'A senha pode ter no máximo 72 caracteres.';
  return null;
}

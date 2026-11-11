// Cor de cada loja nos gráficos: segue a loja (ordem do seletor de lojas), nunca a posição no ranking,
// para a mesma loja ter sempre a mesma cor ao trocar filtro ou período. Mais de 8 lojas → cinza "outras".
export const MAX_CORES = 8;
export function corDaLoja(indice: number): string {
  return indice >= 0 && indice < MAX_CORES ? `var(--serie-${indice + 1})` : 'var(--serie-outras)';
}

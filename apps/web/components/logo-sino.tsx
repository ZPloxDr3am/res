/**
 * Logotipo principal oficial SINO (Brand Book v1.2, pasta 01; arquivo nunca redesenhado).
 * Versão cor em fundo claro e negativo em fundo escuro, pelo tema do aparelho.
 * Largura mínima do logotipo principal: 120 px.
 */
export function LogoSino({ largura = 132, variante = 'auto' }: { largura?: number; variante?: 'auto' | 'cor' }) {
  const w = Math.max(120, largura);
  const h = Math.round((w * 104) / 315.544);
  // 'cor' para o que vai para o papel (cartão de acesso impresso): nunca a versão negativa
  if (variante === 'cor') return <img className="logo-sino" src="/marca/sino-logotipo-horizontal-cor.svg" alt="SINO" width={w} height={h} style={{ display: 'block' }} />;
  return (
    <picture className="logo-sino">
      <source srcSet="/marca/sino-logotipo-horizontal-negativo.svg" media="(prefers-color-scheme: dark)" />
      <img src="/marca/sino-logotipo-horizontal-cor.svg" alt="SINO" width={w} height={h} style={{ display: 'block' }} />
    </picture>
  );
}

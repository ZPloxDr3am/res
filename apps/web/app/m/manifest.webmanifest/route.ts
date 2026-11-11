// Permite "Adicionar à tela inicial" no celular: o app do motoboy abre como aplicativo.
export function GET() {
  return Response.json(
    {
      name: 'RES Motoboy',
      short_name: 'RES Motoboy',
      start_url: '/m',
      scope: '/m',
      display: 'standalone',
      background_color: '#0f1513',
      theme_color: '#1f6f5c',
      icons: [{ src: '/m/icone.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}

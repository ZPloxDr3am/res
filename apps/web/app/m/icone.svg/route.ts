export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#1f6f5c"/><text x="256" y="300" font-family="Arial, sans-serif" font-size="150" font-weight="800" text-anchor="middle" fill="#fff">RES</text><text x="256" y="400" font-family="Arial, sans-serif" font-size="70" font-weight="700" text-anchor="middle" fill="#f0bd4f">MOTOBOY</text></svg>`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' } });
}

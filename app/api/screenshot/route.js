// API route deprecada - Usar proxy + html2canvas en el cliente
// Esta API ya no se usa porque Puppeteer no funciona bien en Vercel

export async function POST(request) {
  return Response.json({ 
    error: 'Esta API está deprecada. Use el método de proxy + html2canvas en el cliente.',
    success: false,
    deprecated: true
  }, { status: 410 });
}

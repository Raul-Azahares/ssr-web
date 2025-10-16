import { chromium } from 'playwright-core';

// Para desarrollo local, usar chromium instalado localmente
// Para producción en Vercel, usar @sparticuz/chromium
const isDev = process.env.NODE_ENV === 'development';

export async function POST(request) {
  let browser = null;
  
  try {
    const { url } = await request.json();
    
    if (!url) {
      return Response.json({ error: 'URL requerida' }, { status: 400 });
    }

    console.log('[Playwright] Capturando screenshot de:', url);

    // Configuración del navegador optimizada para Vercel
    const browserConfig = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled'
      ]
    };

    // En desarrollo, usar chromium local
    if (isDev) {
      console.log('[Playwright] Usando Chromium local (desarrollo)');
      browser = await chromium.launch(browserConfig);
    } else {
      // En producción, usar chromium optimizado para serverless
      console.log('[Playwright] Usando Chromium optimizado (producción)');
      const chromiumPkg = await import('@sparticuz/chromium');
      
      // Configurar chromium para Vercel
      chromiumPkg.default.setHeadlessMode = true;
      chromiumPkg.default.setGraphicsMode = false;
      
      browserConfig.executablePath = await chromiumPkg.default.executablePath();
      browser = await chromium.launch(browserConfig);
    }

    // Crear página
    const page = await browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });

    // Configurar timeout
    page.setDefaultTimeout(30000); // 30 segundos

    console.log('[Playwright] Navegando a la URL...');
    
    // Navegar a la URL
    await page.goto(url, {
      waitUntil: 'networkidle', // Esperar a que no haya más peticiones de red
      timeout: 30000
    });

    console.log('[Playwright] Página cargada, esperando renderizado...');

    // Esperar un poco más para asegurar que todo se renderice
    await page.waitForTimeout(2000);

    console.log('[Playwright] Capturando screenshot...');

    // Capturar screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true, // Capturar página completa
      animations: 'disabled' // Deshabilitar animaciones
    });

    console.log('[Playwright] Screenshot capturado, tamaño:', screenshot.length, 'bytes');

    // Cerrar navegador
    await browser.close();

    // Devolver imagen
    return new Response(screenshot, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': screenshot.length.toString()
      }
    });

  } catch (error) {
    console.error('[Playwright] Error:', error);
    
    // Asegurar que el navegador se cierre en caso de error
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('[Playwright] Error cerrando navegador:', e);
      }
    }

    return Response.json({ 
      error: 'Error capturando screenshot',
      details: error.message 
    }, { status: 500 });
  }
}

// Endpoint GET para testing
export async function GET(request) {
  return Response.json({
    message: 'API de Screenshot con Playwright',
    usage: 'POST con body: { "url": "https://example.com" }',
    status: 'ready'
  });
}

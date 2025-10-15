// API route para captura de screenshots usando Puppeteer
// Optimizado para Vercel Pro con @sparticuz/chromium
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export async function POST(request) {
  let browser = null;
  
  try {
    const { url } = await request.json();
    
    if (!url) {
      return Response.json({ error: 'URL requerida' }, { status: 400 });
    }

    console.log('Screenshot API: intentando capturar:', url);

    // Validar URL
    new URL(url);

    // Detectar entorno
    const isProduction = process.env.VERCEL === '1';
    
    console.log('Entorno:', isProduction ? 'Vercel Pro' : 'Desarrollo Local');

    if (isProduction) {
      // Configuración optimizada para Vercel Pro
      console.log('Usando @sparticuz/chromium para Vercel Pro');
      
      // Configurar chromium para Vercel
      chromium.setHeadlessMode = true;
      chromium.setGraphicsMode = false;
      
      const executablePath = await chromium.executablePath();
      console.log('Chromium path:', executablePath);
      
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    } else {
      // Desarrollo local
      const localChromePath = process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/chromium-browser';
      
      console.log('Usando Chrome local:', localChromePath);
      
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: localChromePath,
        headless: 'new',
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Navegando a:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('Capturando screenshot...');
    const screenshot = await page.screenshot({
      type: 'png',
      encoding: 'base64'
    });

    await browser.close();
    console.log('Screenshot capturado exitosamente');

    return Response.json({
      success: true,
      image: `data:image/png;base64,${screenshot}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en screenshot API:', error);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Error cerrando navegador:', e);
      }
    }
    
    return Response.json({ 
      error: `Error al capturar screenshot: ${error.message}`,
      success: false
    }, { status: 500 });
  }
}

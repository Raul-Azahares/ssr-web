// API route para captura de screenshots usando Puppeteer
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

    // Lanzar navegador
    console.log('Lanzando navegador...');
    
    // Detectar si estamos en Vercel (producción) o desarrollo local
    const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
    
    console.log('Entorno:', isVercel ? 'Vercel/Producción' : 'Desarrollo Local');
    
    // Configuración para Vercel
    if (isVercel) {
      const executablePath = await chromium.executablePath();
      console.log('Usando Chromium de @sparticuz en:', executablePath);
      
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true
      });
    } else {
      // Configuración para desarrollo local
      const localChromePath = process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : process.platform === 'darwin'
        ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        : '/usr/bin/chromium-browser';
      
      console.log('Usando Chrome/Chromium local en:', localChromePath);
      
      browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ],
        executablePath: localChromePath,
        headless: 'new',
        ignoreHTTPSErrors: true
      });
    }

    const page = await browser.newPage();
    
    // Configurar viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1
    });

    // Configurar user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Navegando a:', url);
    
    // Navegar a la URL con estrategia más flexible y múltiples intentos
    try {
      // Intento 1: networkidle0 (espera a que no haya conexiones de red)
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 90000
      });
      console.log('Página cargada con networkidle0');
    } catch (error) {
      console.log('networkidle0 falló, intentando con networkidle2...');
      try {
        // Intento 2: networkidle2 (espera a que haya máximo 2 conexiones)
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 90000
        });
        console.log('Página cargada con networkidle2');
      } catch (error2) {
        console.log('networkidle2 falló, intentando con domcontentloaded...');
        // Intento 3: domcontentloaded (más permisivo)
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 90000
        });
        console.log('Página cargada con domcontentloaded');
      }
    }

    // Esperar a que se carguen recursos adicionales y se ejecuten scripts
    console.log('Esperando carga de recursos adicionales...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Capturando screenshot...');
    
    // Capturar screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      encoding: 'base64'
    });

    console.log('Screenshot capturado exitosamente');

    // Cerrar navegador
    await browser.close();
    browser = null;

    // Devolver imagen en base64
    return Response.json({
      success: true,
      image: `data:image/png;base64,${screenshot}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en screenshot API:', error);
    
    // Asegurar que el navegador se cierre
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error cerrando navegador:', closeError);
      }
    }
    
    return Response.json({ 
      error: `Error al capturar screenshot: ${error.message}`,
      success: false
    }, { status: 500 });
  }
}

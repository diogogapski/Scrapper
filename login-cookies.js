const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

puppeteer.use(StealthPlugin());

const PROXY_HOST = 'proxy.glamourify.shop';
const PROXY_PORT = '824';
const PROXY_USER = '08d27ebedcfe776d29b2';
const PROXY_PASS = '8607bcb6a23bf45a';

(async () => {
  console.log('🚀 Iniciando navegador com proxy...');

  const browser = await puppeteer.launch({
    headless: false,  // precisa ser visível pra criar conta manualmente
    args: [`--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`]
  });

  const page = await browser.newPage();

  // Autenticando no proxy
  await page.authenticate({
    username: PROXY_USER,
    password: PROXY_PASS
  });

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'accept-language': 'pt-BR,pt;q=0.9' });
  await page.setViewport({ width: 1280, height: 800 });

  console.log('entrando no LinkedIn');

  try {
    await page.goto('https://www.linkedin.com/signup', { waitUntil: 'domcontentloaded', timeout: 120000 });
    console.log('Pgn de criaçao de conta carregada');

    console.log(' coloca os dados ai.');
    console.log(' depois que fizer, feche a aba ou pressione ENTER no terminal pra salvar os cookies.');

    
    process.stdin.resume();
    process.stdin.on('data', async () => {
      const cookies = await page.cookies();
      fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
      console.log('🍪 Cookies salvos em cookies.json');

      await browser.close();
      console.log(' Navegador fechado');
      process.exit(0);
    });

  } catch (err) {
    console.error(` Erro ao acessar LinkedIn: ${err.message}`);
    await browser.close();
  }
})();

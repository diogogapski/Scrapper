const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

(async () => {
  try {
    const timestamp = Date.now();
    const userDataDir = path.join(__dirname, `google-session-${timestamp}`);

    console.log(`🚀 Abrindo navegador para armazenar sessão: ${userDataDir}`);

    const browser = await puppeteer.launch({
      headless: false,
      userDataDir: userDataDir,
      defaultViewport: null,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();

    console.log('🌐 Acessando Google...');

    try {
      await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (err) {
      console.warn('⚠️ Não foi possível carregar completamente a página (possível captcha ou bloqueio).');
    }

    console.log(' Navegador aberto. Se aparecer captcha, resolva manualmente.');
    console.log(' Quando terminar, feche o navegador para encerrar o script.');

    browser.on('disconnected', () => {
      console.log('🔒 Navegador fechado, sessão armazenada.');
      process.exit(0);
    });

    await new Promise(() => {});

  } catch (err) {
    console.error('❌ Erro ao abrir o navegador:', err);
  }
})();

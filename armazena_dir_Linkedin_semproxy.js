const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

(async () => {
  try {
    
    const USER_DATA_DIR_LINKEDIN = path.join(__dirname, 'linkedin-session');

    console.log(` Abrindo navegador para armazenar sessão: ${USER_DATA_DIR_LINKEDIN}`);

    const browser = await puppeteer.launch({
      headless: false,
      userDataDir: USER_DATA_DIR_LINKEDIN,
      defaultViewport: null,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();

    console.log(' Acessando LinkedIn...');

    try {
      await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    } catch (err) {
      console.warn('(possível bloqueio ou captcha).');
    }

    console.log(' Navegador aberto. login manualmente no LinkedIn.');
    console.log(' feche o navegador para armazenar a sessão.');

    browser.on('disconnected', () => {
      console.log(' LinkedIn armazenada em:', USER_DATA_DIR_LINKEDIN);
      process.exit(0);
    });

    
    await new Promise(() => {});

  } catch (err) {
    console.error(' Erro ao abrir o navegador:', err);
  }
})();

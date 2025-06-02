const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

(async () => {
  try {
    const USER_DATA_DIR_LINKEDIN = path.join(__dirname, 'linkedin-session');

    console.log(` abriu com ${USER_DATA_DIR_LINKEDIN}`);

    const browser = await puppeteer.launch({
      headless: false,
      userDataDir: USER_DATA_DIR_LINKEDIN,
      defaultViewport: null,
      args: ['--start-maximized']
    });

    const page = await browser.newPage();

    console.log('tentando acessar..');

    await page.goto('https://www.linkedin.com/feed', { waitUntil: 'domcontentloaded', timeout: 60000 });

    

    browser.on('disconnected', () => {
      console.log(' Navegador fechado');
      process.exit(0);
    });

    await new Promise(() => {});

  } catch (err) {
    console.error(' Erro ao abrir o navegador:', err);
  }
})();

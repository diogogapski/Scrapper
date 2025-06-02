const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const PROXY_HOST = 'proxy.glamourify.shop';
const PROXY_PORT = '824';
const PROXY_USER = '08d27ebedcfe776d29b2';
const PROXY_PASS = '8607bcb6a23bf45a';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36';

const USER_DATA_DIR = './linkedin-session';

(async () => {
  console.log('🚀 Abrindo navegador para iniciar sessão...');

  const browser = await puppeteer.launch({
    headless: false,
    args: [`--proxy-server=http://${PROXY_HOST}:${PROXY_PORT}`],
    userDataDir: USER_DATA_DIR
  });

  const page = await browser.newPage();

  await page.authenticate({
    username: PROXY_USER,
    password: PROXY_PASS
  });

  await page.setUserAgent(USER_AGENT);
  await page.setViewport({ width: 1280, height: 800 });

  console.log('🔗 Acesse o LinkedIn, faça login manualmente e depois feche o navegador.');
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded' });

  // Agora só deixa o navegador aberto.
  // Depois que logar e LinkedIn redirecionar, feche manualmente o navegador.

})();

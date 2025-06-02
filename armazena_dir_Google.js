const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const PROXIES_BUSCA = [
  { host: 'proxy.glamourify.shop', port: '824', user: '0e4df509e38661cf63a0', pass: 'f9e0f308e3d11b98' },
  { host: 'proxy.glamourify.shop', port: '824', user: 'e00962b06922be474368', pass: '5cd76cbe4043d0ae' },
  { host: 'proxy.glamourify.shop', port: '824', user: '4b2ce5907c2ab9486aa2', pass: '98402a78ea9a9ba7' }
];

// ✅ Lista de User-Agents pra rotação
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...Chrome/115 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...Chrome/114 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64)...Chrome/113 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)...Safari/605.1.15'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

async function autenticarNoProxy(page, proxy) {
  await page.authenticate({
    username: proxy.user,
    password: proxy.pass
  });
}

(async () => {
  for (const proxy of PROXIES_BUSCA) {
    const userDataDir = `./google-session-${proxy.user}`;
    const userAgent = getRandomUserAgent();

    console.log(`🚀 Abrindo navegador para proxy ${proxy.user} com sessão em ${userDataDir}`);

    const browser = await puppeteer.launch({
      headless: false,
      args: [`--proxy-server=http://${proxy.host}:${proxy.port}`],
      userDataDir: userDataDir
    });

    const page = await browser.newPage();
    await autenticarNoProxy(page, proxy);

    await page.setUserAgent(userAgent);
    await page.setViewport({ width: 1280, height: 800 });

    await page.setExtraHTTPHeaders({
      'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'sec-ch-ua': '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'upgrade-insecure-requests': '1'
    });

    console.log(`🔗 Acesse o Google, resolva o CAPTCHA e depois feche o navegador.`);

    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

    // Espera manualmente → fecha o browser quando quiser
    await new Promise(resolve => {
      console.log(`✅ Quando terminar de resolver o captcha, feche o navegador para continuar...`);
      browser.on('disconnected', resolve);
    });
  }

  console.log('✅ Todas as sessões inicializadas!');
})();

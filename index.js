// LinkedIn Scraper com detecção de "sem emprego"
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const path = require("path");

puppeteer.use(StealthPlugin());

const app = express();
app.use(cors());
const PORT = 3000;

const USER_DATA_DIR_LINKEDIN = path.join(__dirname, "linkedin-session");
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115 Safari/537.36";
const SENHA_LINKEDIN = "pandinha";

const GOOGLE_KEYS = [
  { key: "AIzaSyBrwyanFtfUxjFKlwr9oKnk1LeEKNuMiJg", cx: "e3d2a15563e93471e" },
  { key: "AIzaSyBdV95pFhYQgM3JfRh9ldk7bL_1dugYUp4", cx: "e3d2a15563e93471e" },
  { key: "AIzaSyBDfS2YkBGLZgI-_leXBhmLn0n-wV9z_xM", cx: "e3d2a15563e93471e" },
  { key: "AIzaSyCCo-TO5BcFHJnIRVSASq6yvCGmLO-uFW8", cx: "e3d2a15563e93471e" },
  { key: "AIzaSyC6xBCvbZGlXI20fOiXjVzQoccbch2pCwM", cx: "e3d2a15563e93471e" }
];

let keyIndex = 0;

function getNextGoogleKey() {
  const key = GOOGLE_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % GOOGLE_KEYS.length;
  return key;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buscarLinksViaAPI(banco, maxPerfis = 20, maxPaginas = 3) {
  const links = [];
  const query = `site:linkedin.com/in ("${banco}") ("Agência" OR "Caixa" OR "Gerente" OR "Bancário") ("Brasil")`;

  for (let i = 0; i < maxPaginas && links.length < maxPerfis; i++) {
    const start = i * 10 + 1;
    const { key, cx } = getNextGoogleKey();
    const url = `https://www.googleapis.com/customsearch/v1?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}&start=${start}`;
    console.log(`🔍 Buscando via API (KEY ${keyIndex}/${GOOGLE_KEYS.length}): página ${i + 1}`);

    try {
      const response = await axios.get(url);
      const items = response.data.items || [];
      const encontrados = items.map(item => item.link).filter(link => link.includes("linkedin.com/in"));
      console.log(`✅ Página ${i + 1}: ${encontrados.length} links`);

      for (const link of encontrados) {
        if (!links.includes(link)) links.push(link);
        if (links.length >= maxPerfis) break;
      }
    } catch (err) {
      console.error(`❌ Erro na API do Google: ${err.message}`);
    }
  }

  return links;
}

async function resolverTelaLogin(page) {
  try {
    await delay(2000);
    const senhaInput = await page.$('input[name="session_password"]');
    if (senhaInput) {
      console.log("🔐 Tela de senha detectada — preenchendo...");
      await senhaInput.type(SENHA_LINKEDIN, { delay: 100 });
      const botaoEntrar = await page.$('button[type="submit"]');
      if (botaoEntrar) {
        await botaoEntrar.click();
        await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
        console.log("✅ Senha enviada com sucesso.");
      }
      return;
    }

    const welcomeBtn = await page.waitForSelector('button.member-profile__details', {
      timeout: 7000,
      visible: true
    }).catch(() => null);

    if (welcomeBtn) {
      console.log("⚠️ Welcome Back encontrado — clicando...");
      await welcomeBtn.click();
      await page.waitForNavigation({ timeout: 30000 }).catch(() => {});
      console.log("✅ Passou do Welcome Back.");
    }
  } catch (err) {
    console.warn("⚠️ Erro ao resolver tela de login:", err.message);
  }
}

function perfilEhBom(dados, banco) {
  const aliases = [banco, banco.toLowerCase(), banco.toUpperCase(), "banco"];
  const palavrasAtuais = ["presente", "atual", "present", "até o momento", "hoje", "o momento"];

  const experienciasBanco = dados.experiencias.filter(
    exp => exp.empresa && aliases.some(alias => exp.empresa.toLowerCase().includes(alias.toLowerCase()))
  );
  const trabalhaAtualmente = experienciasBanco.some(
    exp => exp.periodo && palavrasAtuais.some(p => exp.periodo.toLowerCase().includes(p))
  );
  const brasileiro = dados.local && dados.local.toLowerCase().includes("brasil");

  if (!experienciasBanco.length) return { bom: false, motivo: "Sem experiência no banco" };
  if (!trabalhaAtualmente) return { bom: false, motivo: "Experiência antiga" };
  if (!brasileiro) return { bom: false, motivo: "Perfil fora do Brasil" };

  return { bom: true, motivo: "Perfil válido e brasileiro" };
}

async function extrairPerfil(page, url, banco) {
  try {
    await page.goto(url, { timeout: 60000 });
    await resolverTelaLogin(page);
    await delay(1000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(500);

    const nome = await page.$eval("h1", el => el.innerText.trim()).catch(() => null);
    const cargoAtual = await page.$eval(".text-body-medium.break-words", el => el.innerText.trim()).catch(() => null);
    const local = await page.$eval(".text-body-small.inline.t-black--light", el => el.innerText.trim()).catch(() => null);

    const experiencias = await page.$$eval("section", sections => {
      const exps = [];
      sections.forEach(sec => {
        if (sec.innerText.toLowerCase().includes("experiência")) {
          sec.querySelectorAll("li").forEach(li => {
            const cargo = li.querySelector('span[aria-hidden="true"]')?.innerText || null;
            const empresa = li.querySelector("span.t-14.t-normal")?.innerText || null;
            const periodo = li.querySelectorAll("span.t-14.t-normal.t-black--light span")[1]?.innerText || null;
            if (cargo || empresa) exps.push({ cargo, empresa, periodo });
          });
        }
      });
      return exps;
    }).catch(() => []);

    const padroesSemEmprego = ["em busca", "disponível", "procurando", "freelancer", "desempregado", "em transição", "transição de carreira"];
    const textoGeral = (nome || "") + " " + (cargoAtual || "") + " " + experiencias.map(e => `${e.cargo} ${e.empresa}`).join(" ");
    const semEmprego = padroesSemEmprego.some(p => textoGeral.toLowerCase().includes(p));

    const dados = { nome, cargoAtual, local, experiencias, semEmprego };
    const validacao = perfilEhBom(dados, banco);

    console.log(`✅ Perfil extraído: ${nome} — ${url} — Sem emprego: ${semEmprego ? 'Sim' : 'Não'}`);
    return { sucesso: true, url, dados, validacao };
  } catch (err) {
    return { sucesso: false, url, erro: err.message };
  }
}

app.get("/buscar", async (req, res) => {
  const banco = req.query.banco;
  const maxPerfis = parseInt(req.query.maxPerfis) || 10;
  const maxPaginas = parseInt(req.query.paginas) || 3;

  if (!banco) return res.status(400).json({ erro: "Parâmetro 'banco' é obrigatório." });

  try {
    const links = await buscarLinksViaAPI(banco, maxPerfis, maxPaginas);
    if (!links.length) return res.json({ banco, total: 0, perfis_bons: [], perfis_ruins: [] });

    const browser = await puppeteer.launch({
      headless: true,
      userDataDir: USER_DATA_DIR_LINKEDIN,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setUserAgent(USER_AGENT);
    await page.goto("https://www.linkedin.com/feed", { timeout: 30000 });
    await resolverTelaLogin(page);
    await page.close();

    const perfisBons = [];
    const perfisRuins = [];
    const concorrencia = 3;

    for (let i = 0; i < links.length; i += concorrencia) {
      const chunk = links.slice(i, i + concorrencia);
      const resultados = await Promise.all(
        chunk.map(async url => {
          const page = await browser.newPage();
          await page.setUserAgent(USER_AGENT);
          await page.setViewport({ width: 1280, height: 800 });
          const resultado = await extrairPerfil(page, url, banco);
          await page.close();
          return resultado;
        })
      );

      for (const r of resultados) {
        if (!r.sucesso) {
          perfisRuins.push({ url: r.url, erro: r.erro });
        } else if (r.validacao.bom) {
          perfisBons.push({ url: r.url, ...r.dados });
        } else {
          perfisRuins.push({ url: r.url, motivo: r.validacao.motivo, ...r.dados });
        }
      }
    }

    await browser.close();
    res.json({
      banco,
      total: perfisBons.length + perfisRuins.length,
      perfis_bons: perfisBons,
      perfis_ruins: perfisRuins
    });
  } catch (e) {
    console.error("❌ Erro interno:", e.message);
    res.status(500).json({ erro: "Erro ao processar", detalhes: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

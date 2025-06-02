const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());

async function buscarPerfisDoBing(banco, paginas = 3) {
  const linksEncontrados = [];
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Define user agent para parecer um navegador normal
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');

  for (let i = 0; i < paginas; i++) {
    const first = i * 10 + 1;
    const query = `site:linkedin.com/in ${banco}`;
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${first}`;
    console.log(`🔍 Acessando: ${url}`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 5000)); // espera 5s para garantir carregamento

      // Salva o html para inspeção (comente se quiser)
      const html = await page.content();
      fs.writeFileSync(`pagina${i + 1}.html`, html);

      // Extrai links
      const links = await page.$$eval('li.b_algo h2 a', anchors =>
        anchors.map(a => a.href).filter(href => href.includes('linkedin.com/in'))
      );

      links.forEach(link => {
        if (!linksEncontrados.includes(link)) {
          linksEncontrados.push(link);
        }
      });

      console.log(`Página ${i + 1}: encontrados ${links.length} links.`);
    } catch (err) {
      console.error(`Erro na busca:`, err.message);
    }
  }

  await browser.close();
  return linksEncontrados;
}

app.get('/buscar', async (req, res) => {
  const banco = req.query.banco;
  let paginas = parseInt(req.query.paginas) || 3;

  if (!banco) {
    return res.status(400).json({ erro: 'Parâmetro "banco" é obrigatório.' });
  }

  try {
    const resultados = await buscarPerfisDoBing(banco, paginas);
    res.json({ banco, paginas, total: resultados.length, resultados });
  } catch (err) {
    res.status(500).json({ erro: 'Erro interno ao buscar.', detalhes: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

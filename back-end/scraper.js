const puppeteer = require('puppeteer');

// Fonction pour transformer "79,93 $" en nombre 79.93
function nettoyerPrix(texte) {
  if (!texte) return null;
  return parseFloat(
    texte
      .replace('$', '')
      .replace(/\s/g, '')
      .replace(',', '.')
      .trim()
  );
}

// Fonction pour calculer le % de rabais
function calculerRabais(prixActuel, prixRegulier) {
  if (!prixActuel || !prixRegulier || prixRegulier === 0) return null;
  const rabais = ((prixRegulier - prixActuel) / prixRegulier) * 100;
  return Math.round(rabais);
}

async function scrapeProduct(url) {
  console.log('🚀 Lancement du navigateur...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-CA,fr;q=0.9' });

    console.log('🔍 Téléchargement de la page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    await page.waitForSelector('.nl-product__title', { timeout: 10000 }).catch(() => {});

    const resultat = await page.evaluate(() => {
      const nom = document.querySelector('.nl-product__title')?.innerText.trim();
      const prixActuel = document.querySelector('.nl-price--total--red')?.innerText.trim();
      const prixRegulier = document.querySelector('.nl-price--was s')?.innerText.trim();
      const image = document.querySelector('.nl-media-gallery img')?.src;
      return { nom, prixActuel, prixRegulier, image };
    });

    // Nettoyage et calculs
    const prixActuelNum = nettoyerPrix(resultat.prixActuel);
    const prixRegulierNum = nettoyerPrix(resultat.prixRegulier);
    const rabaisPourcent = calculerRabais(prixActuelNum, prixRegulierNum);

    const produitFinal = {
      nom: resultat.nom,
      prixActuel: prixActuelNum,
      prixRegulier: prixRegulierNum,
      rabaisPourcent: rabaisPourcent,
      image: resultat.image,
      url: url,
      dateScrape: new Date().toISOString()
    };

    console.log('---RÉSULTAT FINAL---');
    console.log(JSON.stringify(produitFinal, null, 2));

    return produitFinal;

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 Navigateur fermé');
  }
}

scrapeProduct('https://www.canadiantire.ca/fr/pdp/garde-robe-a-2-portes-sauder-blanc-1680208p.html');
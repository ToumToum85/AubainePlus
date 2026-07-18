const puppeteer = require('puppeteer');

async function scrapeProduct(url) {
  console.log('🚀 Lancement du navigateur...');

  const browser = await puppeteer.launch({
    headless: true, // true = invisible, false = tu vois Chrome s'ouvrir
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // On simule un vrai navigateur
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-CA,fr;q=0.9'
    });

    console.log('🔍 Téléchargement de la page...');
    await page.goto(url, {
      waitUntil: 'networkidle2', // attend que le réseau soit calme (JS chargé)
      timeout: 30000
    });

    console.log('✅ Page chargée, extraction des données...');

    // On attend que le titre du produit apparaisse (sécurité supplémentaire)
    await page.waitForSelector('.nl-product__title', { timeout: 10000 }).catch(() => {
      console.log('⚠️ Le sélecteur du titre n\'est jamais apparu');
    });

    // Extraction des données directement dans le navigateur
    const resultat = await page.evaluate(() => {
      const nom = document.querySelector('.nl-product__title')?.innerText.trim();
      const prixActuel = document.querySelector('.nl-price--total--red')?.innerText.trim();
      const prixRegulier = document.querySelector('.nl-price--was s')?.innerText.trim();
      const image = document.querySelector('.nl-media-gallery img')?.src;

      return { nom, prixActuel, prixRegulier, image };
    });

    console.log('---RÉSULTATS---');
    console.log('Nom:', resultat.nom || '❌ NON TROUVÉ');
    console.log('Prix actuel:', resultat.prixActuel || '❌ NON TROUVÉ');
    console.log('Prix régulier:', resultat.prixRegulier || '❌ NON TROUVÉ');
    console.log('Image:', resultat.image || '❌ NON TROUVÉ');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await browser.close();
    console.log('🔒 Navigateur fermé');
  }
}

scrapeProduct('https://www.canadiantire.ca/fr/pdp/armoire-haute-et-large-mastercraft-a-2-portes-3-tablettes-reglables-122-x-46-x-183-cm-noir-0680667p.html');
const puppeteer = require('puppeteer');

async function explorerPage(url) {
  const browser = await puppeteer.launch({ headless: false }); // false pour VOIR ce qui se passe
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('📄 Chargement de la page...');
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('⏳ Attente du chargement des produits...');
  
  // On attend quelques secondes pour laisser le JS charger les produits
  await new Promise(resolve => setTimeout(resolve, 5000));

  // On essaie de détecter des liens de produits (pattern habituel: /fr/pdp/)
  const liens = await page.evaluate(() => {
    const tousLesLiens = Array.from(document.querySelectorAll('a'));
    return tousLesLiens
      .map(a => a.href)
      .filter(href => href.includes('/pdp/')); // les pages produits contiennent "/pdp/"
  });

  console.log(`✅ ${liens.length} liens de produits trouvés !`);
  console.log(liens.slice(0, 10)); // affiche les 10 premiers

  // On sauvegarde aussi le HTML complet pour inspection
  const html = await page.content();
  const fs = require('fs');
  fs.writeFileSync('page-categorie.html', html);
  console.log('💾 HTML sauvegardé dans page-categorie.html');

  // On laisse le navigateur ouvert 30 secondes pour que tu puisses regarder
  console.log('🔍 Navigateur ouvert - regarde la page, on ferme dans 30 secondes...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  await browser.close();
}

explorerPage('https://www.canadiantire.ca/fr/promotions/liquidation/outils-et-quincaillerie.html');
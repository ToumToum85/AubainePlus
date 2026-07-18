const puppeteer = require('puppeteer');
const fs = require('fs');

// ---- Fonction utilitaire : timeout de sécurité ----
function avecTimeout(promesse, ms, urlPourErreur) {
  return Promise.race([
    promesse,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`⏱️ Timeout global (${ms}ms) sur ${urlPourErreur}`)), ms)
    )
  ]);
}

// ---- FONCTION 1 : Récupérer les liens ----
async function getLiensProduits(browser, urlCategorie) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('📄 Chargement de la page catégorie...');
  await page.goto(urlCategorie, { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(resolve => setTimeout(resolve, 5000));

  const liens = await page.evaluate(() => {
    const tousLesLiens = Array.from(document.querySelectorAll('a'));
    return tousLesLiens.map(a => a.href).filter(href => href.includes('/pdp/'));
  });

  await page.close();
  const liensUniques = [...new Set(liens)];
  console.log(`✅ ${liensUniques.length} produits uniques trouvés`);
  return liensUniques;
}

// ---- FONCTION 2 : Scraper un produit (avec sélecteurs multiples de secours) ----
async function scrapeProduit(browser, url) {
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (type === 'image' || type === 'stylesheet' || type === 'font') {
      req.abort();
    } else {
      req.continue();
    }
  });

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    const data = await avecTimeout((async () => {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });

      await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 2000)); // laisser le JS finir de charger le prix

      return await page.evaluate(() => {
        const nom = document.querySelector('.nl-product__title')?.innerText.trim()
          || document.querySelector('h1.pdp-header__title')?.innerText.trim()
          || document.querySelector('h1[data-testid="product-title"]')?.innerText.trim()
          || document.querySelector('h1')?.innerText.trim();

        const prixActuel = document.querySelector('.nl-price--total--red')?.innerText.trim()
          || document.querySelector('.nl-price__total')?.innerText.trim()
          || document.querySelector('[data-testid="price-now"]')?.innerText.trim()
          || document.querySelector('.price-now')?.innerText.trim();

        const prixRegulier = document.querySelector('.nl-price--was s')?.innerText.trim()
          || document.querySelector('.nl-price__was')?.innerText.trim()
          || document.querySelector('[data-testid="price-was"]')?.innerText.trim()
          || document.querySelector('.price-was')?.innerText.trim();

        const image = document.querySelector('.nl-media-gallery img')?.src
          || document.querySelector('img[class*="product"]')?.src
          || document.querySelector('picture img')?.src;

        return {
          nom: nom || null,
          prixActuel: prixActuel || null,
          prixRegulier: prixRegulier || null,
          image: image || null,
        };
      });
    })(), 30000, url);

    await page.close().catch(() => {});
    return { url, ...data, erreur: null };

  } catch (error) {
    await page.close().catch(() => {});
    return { url, nom: null, prixActuel: null, prixRegulier: null, image: null, erreur: error.message };
  }
}

// ---- FONCTION 3 : Scraper en parallèle par lots d'onglets ----
async function scraperEnLots(browser, liens, tailleLot = 15) {
  const resultats = [];

  for (let i = 0; i < liens.length; i += tailleLot) {
    const lot = liens.slice(i, i + tailleLot);
    console.log(`\n📦 Lot ${Math.floor(i / tailleLot) + 1} — produits ${i + 1} à ${Math.min(i + tailleLot, liens.length)}`);

    const promesses = lot.map(url => scrapeProduit(browser, url));
    const resultatsLot = await Promise.all(promesses);

    resultatsLot.forEach(r => {
      console.log('  ─────────────────────────────');
      if (r.nom) {
        console.log(`  ✅ ${r.nom}`);
        console.log(`     💰 Prix actuel: ${r.prixActuel || 'N/A'}`);
        console.log(`     🏷️  Prix régulier: ${r.prixRegulier || 'N/A'}`);
        console.log(`     🖼️  Image: ${r.image ? 'Oui' : 'Non'}`);
      } else {
        console.log(`  ❌ ÉCHEC: ${r.url}`);
        console.log(`     Erreur: ${r.erreur || 'Sélecteur introuvable'}`);
      }
    });

    resultats.push(...resultatsLot);
  }

  return resultats;
}

// ---- FONCTION PRINCIPALE ----
async function scraperCategorieComplete(urlCategorie) {
  console.time('⏱️ Temps total');
  console.log('🚀 Début du scraping de la catégorie\n');

  const browser = await puppeteer.launch({ headless: true });

  const liens = await getLiensProduits(browser, urlCategorie);

  console.log('\n🏃 Scraping des produits en parallèle (5 onglets à la fois)...');
  const resultats = await scraperEnLots(browser, liens, 5);

  await browser.close();

  fs.writeFileSync('produits-canadian-tire.json', JSON.stringify(resultats, null, 2));
  console.log('\n💾 Résultats sauvegardés dans produits-canadian-tire.json');

  const reussis = resultats.filter(r => r.nom !== null).length;
  console.log(`\n📊 RÉSUMÉ: ${reussis}/${resultats.length} produits scrapés avec succès`);
  console.timeEnd('⏱️ Temps total');

  return resultats;
}

// ---- APPEL FINAL ----
scraperCategorieComplete('https://www.canadiantire.ca/fr/promotions/liquidation/outils-et-quincaillerie.html');
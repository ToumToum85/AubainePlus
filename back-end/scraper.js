require('dotenv').config();
console.log('URL:', process.env.SUPABASE_URL);
console.log('KEY existe:', !!process.env.SUPABASE_KEY);
const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

// ---- Configuration Supabase ----
const supabase = createClient(
 process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ---- Cache pour éviter de refaire les mêmes requêtes ----
const cacheCategories = {};
const cacheMagasins = {};

async function getCategorieId(slug) {
  if (cacheCategories[slug]) return cacheCategories[slug];

  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    console.log(`  ⚠️ Catégorie "${slug}" introuvable en BD`);
    return null;
  }

  cacheCategories[slug] = data.id;
  return data.id;
}

async function getMagasinId(nomMagasin) {
  if (cacheMagasins[nomMagasin]) return cacheMagasins[nomMagasin];

  const { data, error } = await supabase
    .from('magasins')
    .select('id')
    .eq('nom', nomMagasin)
    .single();

  if (error || !data) {
    console.log(`  ⚠️ Magasin "${nomMagasin}" introuvable en BD`);
    return null;
  }

  cacheMagasins[nomMagasin] = data.id;
  return data.id;
}

// ---- Convertir "129,99 $" en 129.99 ----
function parsePrix(prixTexte) {
  if (!prixTexte) return null;
  const nettoye = prixTexte.replace(/[^0-9,.]/g, '').replace(',', '.');
  const nombre = parseFloat(nettoye);
  return isNaN(nombre) ? null : nombre;
}

// ---- Sauvegarder un produit dans Supabase ----
async function sauvegarderProduit(produit, categorieSlug, nomMagasin) {
  const categorieId = await getCategorieId(categorieSlug);
  const magasinId = await getMagasinId(nomMagasin);

  const prixActuel = parsePrix(produit.prixActuel);
  const prixOriginal = parsePrix(produit.prixRegulier);

  let pourcentageRabais = produit.pourcentageRabais;
  if (!pourcentageRabais && prixActuel && prixOriginal && prixOriginal > prixActuel) {
    pourcentageRabais = Math.round(((prixOriginal - prixActuel) / prixOriginal) * 100);
  }
// Dans ta fonction de sauvegarde BD, avant l'insertion
const prixOriginalFinal = produit.prixRegulier || produit.prixActuel;
  const { error } = await supabase
    .from('produits')
    .upsert({
      url_produit: produit.url,
      categorie_id: categorieId,
      magasin_id: magasinId,
      nom: produit.nom,
      description: produit.description || null,
      prix_actuel: prixActuel,
      prix_original: prixOriginal,
      url_image: produit.image,
      pourcentage_rabais: pourcentageRabais,
      actif: true,
      derniere_maj: new Date().toISOString()
    }, { onConflict: 'url_produit' });

  if (error) {
    console.log(`  ⚠️ Erreur BD pour ${produit.nom}: ${error.message}`);
  } else {
    console.log(`  💾 Sauvegardé: ${produit.nom}`);
  }
}

async function scraperProduit(browser, url, essai = 1) {  // ✅ ajouté avec valeur par défaut
  const page = await browser.newPage();  
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1500));

    const produit = await page.evaluate(() => {
      const nom = document.querySelector('.nl-product__title')?.innerText.trim()
        || document.querySelector('h1.pdp-header__title')?.innerText.trim()
        || document.querySelector('h1[data-testid="product-title"]')?.innerText.trim()
        || document.querySelector('h1')?.innerText.trim();

      const prixActuel = document.querySelector('.nl-price--total--red')?.innerText.trim()
        || document.querySelector('.nl-price__total')?.innerText.trim()
        || document.querySelector('[data-testid="price-now"]')?.innerText.trim()
        || document.querySelector('.price-now')?.innerText.trim()
        || document.querySelector('[class*="price"][class*="current"]')?.innerText.trim()
        || document.querySelector('[class*="price"][class*="sale"]')?.innerText.trim();

      const prixRegulier = document.querySelector('.nl-price--was s')?.innerText.trim()
        || document.querySelector('.nl-price__was')?.innerText.trim()
        || document.querySelector('[data-testid="price-was"]')?.innerText.trim()
        || document.querySelector('.price-was')?.innerText.trim()
        || document.querySelector('[class*="price"][class*="regular"]')?.innerText.trim()
        || document.querySelector('[class*="price"][class*="original"]')?.innerText.trim();

      const image = document.querySelector('.nl-media-gallery img')?.src
        || document.querySelector('img[class*="product"]')?.src
        || document.querySelector('picture img')?.src
        || document.querySelector('img[alt*="product" i]')?.src;

      return {
        nom: nom || null,
        prixActuel: prixActuel || null,
        prixRegulier: prixRegulier || null,
        image: image || null,
      };
    });

    produit.url = url;
    await page.close();

    if (!produit.nom && essai === 1) {
      console.log(`  🔄 Retry pour ${url}`);
      return await scraperProduit(browser, url, 2);
    }

    return produit;

  } catch (err) {
    console.log(`  ⚠️ Erreur scraping ${url}: ${err.message}`);
    
    // Fermer la page seulement si elle n'est pas déjà fermée
    if (!page.isClosed()) {
      await page.close().catch(() => {});
    }
    
    if (essai === 1) {
      return await scraperProduit(browser, url, 2);
    }
    return null;
  }
}

function construireUrlPage(urlBase, pageNum) {
  if (pageNum === 1) return urlBase;
  
  const separateur = urlBase.includes('?') ? '&' : '?';
  return `${urlBase}${separateur}page=${pageNum}`;
}

// ---- Scraper en lots pour aller plus vite ----
async function scraperEnLots(browser, liens, categorieSlug, nomMagasin, tailleLot = 4) {
  const resultats = [];

  for (let i = 0; i < liens.length; i += tailleLot) {
    const lot = liens.slice(i, i + tailleLot);
    console.log(`\nLot ${Math.floor(i / tailleLot) + 1} — produits ${i + 1} à ${Math.min(i + tailleLot, liens.length)}`);

    const promesses = lot.map(url => scraperProduit(browser, url));
    const produitsLot = await Promise.all(promesses);

    for (const produit of produitsLot) {
      if (produit) {
        await sauvegarderProduit(produit, categorieSlug, nomMagasin);
        resultats.push(produit);
      }
    }
  }

  return resultats;
}

// ---- Récupérer tous les liens produits d'une page de catégorie ----
async function recupererLiensProduits(page) {
  return await page.evaluate(() => {
    const liens = Array.from(document.querySelectorAll('a.product-tile__link, a[href*="/pdp/"]'));
    return [...new Set(liens.map(a => a.href))];
  });
}

// ---- Fonction principale : scraper une catégorie complète (avec pagination) ----
async function scraperCategorieComplete(urlBase, categorieSlug, nomMagasin) {
  const browser = await puppeteer.launch({ headless: true });

  let pageNum = 1;
  let continuerPagination = true;
  let totalScrapes = 0;
  const MAX_PAGES = 20; // sécurité anti-boucle infinie

  while (continuerPagination) {
    const urlPage = construireUrlPage(urlBase, pageNum);
    console.log(`\n📄 PAGE ${pageNum}: ${urlPage}`);

    const page = await browser.newPage();
    await page.goto(urlPage, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const liens = await recupererLiensProduits(page);
    await page.close();

    if (liens.length === 0) {
      console.log(`  ℹ️ Aucun produit trouvé — fin de la pagination.`);
      continuerPagination = false;
      break;
    }

    console.log(`  ${liens.length} produits trouvés sur cette page`);

    const resultats = await scraperEnLots(browser, liens, categorieSlug, nomMagasin);
    totalScrapes += resultats.length;

    pageNum++;
    if (pageNum > MAX_PAGES) {
      console.log(`  ⚠️ Limite de ${MAX_PAGES} pages atteinte, arrêt sécurité.`);
      continuerPagination = false;
    }
  }

  await browser.close();

  console.log(`\n✅ Catégorie "${categorieSlug}" terminée: ${totalScrapes} produits scrapés et sauvegardés`);
  return totalScrapes;
}
// ---- APPEL FINAL ----
async function main() {
  console.time('⏱️ Temps total');

  const categoriesAScrapper = [
    {
      url: 'https://www.canadiantire.ca/fr/promotions/liquidation/outils-et-quincaillerie.html',
      slug: 'outils-et-quincaillerie'
    },
    {
      url: 'https://www.canadiantire.ca/fr/promotions/liquidation/sports-et-loisirs.html',
      slug: 'sports-et-loisirs'
    }
  ];

  for (const cat of categoriesAScrapper) {
    console.log(`\n\n========== CATÉGORIE: ${cat.slug} ==========`);
    await scraperCategorieComplete(cat.url, cat.slug, 'Canadian Tire');
  }

  console.log('\n\n🎉 TOUT EST TERMINÉ !');
  console.timeEnd('⏱️ Temps total');
}

main();
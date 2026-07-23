const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ============ IMPORTS DES FONCTIONS DE SCRAPING ============
const {
  scraperCategorieComplete,
  scraperUnProduitDepuisUrl
} = require('./scraper.js');

// ============ CONFIGURATION ============
const app = express();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(cors());

// ============ CONTENT SECURITY POLICY ============
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: http: https:; " +
    "connect-src 'self' http://localhost:* https:; " +
    "font-src 'self' data:;"
  );
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../front-end')));

// ============ CACHE POUR CATÉGORIES & MAGASINS ============
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

// ============ ROUTE PUBLIQUE - RÉCUPÉRER PRODUITS ACTIFS ============
app.get('/api/produits', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('produits')
      .select('*, categories(slug, nom), magasins(nom)')
      .eq('actif', true)
      .order('derniere_maj', { ascending: false });

    if (error) throw error;

    const produitsFormates = (data || []).map(p => ({
      id: p.id,
      nom: p.nom,
      categorie: p.categories?.slug || '',
      prix_original: p.prix_original,
      prix_actuel: p.prix_actuel,
      magasin: p.magasins?.nom || '',
      description: p.description,
      image_url: p.url_image,
      url_produit: p.url_produit,
      pourcentage_rabais: p.pourcentage_rabais,
    }));

    res.json(produitsFormates);
  } catch (err) {
    console.error('Erreur API /produits:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ ROUTES ADMIN ============

// Récupérer TOUS les produits (admin - actifs ET inactifs)
app.get('/api/produits/admin', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('produits')
      .select('*, categories(slug, nom), magasins(nom)')
      .order('derniere_maj', { ascending: false });

    if (error) throw error;

    const produitsFormates = (data || []).map(p => ({
      id: p.id,
      nom: p.nom,
      categorie: p.categories?.slug || '',
      prix_original: p.prix_original,
      prix_actuel: p.prix_actuel,
      magasin: p.magasins?.nom || '',
      description: p.description,
      image_url: p.url_image,
      url_produit: p.url_produit,
      pourcentage_rabais: p.pourcentage_rabais,
    }));

    res.json(produitsFormates);
  } catch (err) {
    console.error('Erreur API /produits/admin:', err);
    res.status(500).json({ error: err.message });
  }
});

// Scraper un produit à la demande (retourne les données SANS sauvegarder)
app.post('/api/produits/scraper', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL manquante' });

    console.log(`🔍 Scraping demandé pour: ${url}`);
    const produit = await scraperUnProduitDepuisUrl(url);

    if (!produit || !produit.nom) {
      return res.status(422).json({ error: 'Impossible d\'extraire les données de ce produit' });
    }

    res.json(produit);
  } catch (err) {
    console.error('Erreur scraping:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ajouter un nouveau produit
app.post('/api/produits', async (req, res) => {
  try {
    const {
      nom,
      categorie,
      prix_original,
      prix_actuel,
      magasin,
      description,
      image_url,
      url_produit
    } = req.body;

    if (!nom || !categorie || !magasin || !prix_actuel) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const categorieId = await getCategorieId(categorie);
    if (!categorieId) {
      return res.status(400).json({ error: `Catégorie "${categorie}" introuvable en BD` });
    }

    const magasinId = await getMagasinId(magasin);
    if (!magasinId) {
      return res.status(400).json({ error: `Magasin "${magasin}" introuvable en BD` });
    }

    let pourcentageRabais = null;
    if (prix_original && prix_actuel && prix_original > prix_actuel) {
      pourcentageRabais = Math.round(((prix_original - prix_actuel) / prix_original) * 100);
    }

    const { data, error } = await supabase
      .from('produits')
      .insert({
        nom,
        categorie_id: categorieId,
        magasin_id: magasinId,
        prix_original: prix_original || null,
        prix_actuel,
        description: description || null,
        url_image: image_url || null,
        url_produit: url_produit || null,
        pourcentage_rabais: pourcentageRabais,
        actif: true,
        derniere_maj: new Date().toISOString(),
      })
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    console.error('Erreur ajout produit:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== ROUTE NOUVELLE : SCRAPER UNE CATÉGORIE COMPLÈTE ==========
app.post('/api/scraper-categorie', async (req, res) => {
  try {
    const { magasin, url, categorieSlug } = req.body;

    if (!url || !categorieSlug) {
      return res.status(400).json({ error: 'URL et slug de catégorie requis' });
    }

    // Vérifie que la catégorie existe en BD
    const categorieId = await getCategorieId(categorieSlug);
    if (!categorieId) {
      return res.status(400).json({ error: `Catégorie "${categorieSlug}" introuvable en BD. Ajoute-la d'abord !` });
    }

    console.log(`\n🚀 Début du scraping pour: ${categorieSlug}`);
    console.log(`📍 URL: ${url}`);

    // Lance le scraping (cette fonction vient de scraper.js)
    const totalProduits = await scraperCategorieComplete(url, categorieSlug, magasin || 'Canadian Tire');

    res.json({
      success: true,
      total: totalProduits,
      message: `✅ ${totalProduits} produits scrapés et sauvegardés pour "${categorieSlug}"`
    });

  } catch (err) {
    console.error('❌ Erreur scraper-categorie:', err);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un produit
app.delete('/api/produits/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('produits')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('Erreur suppression:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ DÉMARRAGE DU SERVEUR ============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}/api/produits`);
});

module.exports = app;
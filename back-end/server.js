
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ---- Configuration ----
app.use(cors());
app.use(express.json());

// 🔥 IMPORTANT : Sert le dossier front-end en STATIQUE
app.use(express.static(path.join(__dirname, '../front-end')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ---- ROUTES API ----

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../front-end/index.html'));
});

// Route : Récupérer TOUS les produits
app.get('/api/produits', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('produits')
      .select('*')
      .eq('actif', true)
      .order('derniere_maj', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Erreur API /produits:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route : Récupérer produits par catégorie
app.get('/api/produits/categorie/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (catError || !catData) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    const { data, error } = await supabase
      .from('produits')
      .select('*')
      .eq('categorie_id', catData.id)
      .eq('actif', true)
      .order('derniere_maj', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Erreur API:', err);
    res.status(500).json({ error: err.message });
  }
});

// Route : Récupérer produits par catégorie
app.get('/api/produits/categorie/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (catError || !catData) {
      return res.status(404).json({ error: 'Catégorie non trouvée' });
    }

    const { data, error } = await supabase
      .from('produits')
      .select('*')
      .eq('categorie_id', catData.id)
      .eq('actif', true)
      .order('derniere_maj', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Erreur API:', err);
    res.status(500).json({ error: err.message });
  }
});
// Route : Récupérer toutes les catégories
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('nom', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Erreur API:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔥 ROUTE DEBUG : Vérifier les images
app.get('/api/debug/produits', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('produits')
      .select('id, nom, url_image, actif')  // ✅ url_image au lieu de image_url
      .limit(10);

    if (error) throw error;

    console.log('📸 PRODUITS DEBUG:', data);
    res.json(data);
  } catch (err) {
    console.error('Erreur DEBUG:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---- Démarrage du serveur ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
});

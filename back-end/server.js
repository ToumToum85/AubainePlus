require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./supabaseClient');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'API AubainePlus fonctionne! 🎉' });
});

// Récupérer tous les produits actifs (avec le nom de catégorie et magasin)
app.get('/api/produits', async (req, res) => {
  const { data, error } = await supabase
    .from('produits')
    .select(`
      id,
      nom,
      description,
      url_produit,
      url_image,
      prix_original,
      prix_actuel,
      categories ( nom, slug, icone ),
      magasins ( nom, logo )
    `)
    .eq('actif', true);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Récupérer les produits d'une seule catégorie
app.get('/api/produits/categorie/:slug', async (req, res) => {
  const { slug } = req.params;

  const { data, error } = await supabase
    .from('produits')
    .select(`
      id,
      nom,
      description,
      url_produit,
      url_image,
      prix_original,
      prix_actuel,
      categories!inner ( nom, slug, icone ),
      magasins ( nom, logo )
    `)
    .eq('categories.slug', slug)
    .eq('actif', true);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Récupérer toutes les catégories
app.get('/api/categories', async (req, res) => {
  const { data, error } = await supabase
    .from('categories')
    .select('*');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
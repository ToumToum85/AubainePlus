// ========== API BASE URL ========== 
const API_BASE = 'http://localhost:3000/api';

// ========== DOM ELEMENTS ==========
const urlInput = document.getElementById('url-input');
const scrapeBtn = document.getElementById('scrape-btn');
const scrapeLoader = document.getElementById('scrape-loader');
const produitForm = document.getElementById('produit-form');
const cancelBtn = document.getElementById('cancel-btn');
const submitBtn = produitForm.querySelector('button[type="submit"]');
const produitsList = document.getElementById('produits-list');
const searchInput = document.getElementById('search-input');
const filterCategorie = document.getElementById('filter-categorie');

// ========== FORM FIELDS ==========
const formFields = {
  nom: document.getElementById('nom'),
  categorie: document.getElementById('categorie'),
  prixOriginal: document.getElementById('prix-original'),
  prixActuel: document.getElementById('prix-actuel'),
  magasin: document.getElementById('magasin'),
  description: document.getElementById('description'),
  imageUrl: document.getElementById('image-url'),
  urlProduit: document.getElementById('url-produit'),
};

let tousLesProduits = [];

// ========== EVENT LISTENERS ==========
scrapeBtn.addEventListener('click', scrapeProduit);
produitForm.addEventListener('submit', ajouterProduit);
cancelBtn.addEventListener('click', resetForm);
searchInput.addEventListener('input', filtrerProduits);
filterCategorie.addEventListener('change', filtrerProduits);

// ========== FONCTIONS ==========

// 1. Scraper le produit automatiquement
async function scrapeProduit() {
  const url = urlInput.value.trim();

  if (!url) {
    alert('Veuillez coller un lien valide !');
    return;
  }

  scrapeLoader.style.display = 'block';
  scrapeBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/produits/scraper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) throw new Error('Erreur lors du scraping');

    const data = await response.json();

    // Remplir le formulaire
    formFields.nom.value = data.nom || '';
    formFields.prixOriginal.value = data.prix_original || '';
    formFields.prixActuel.value = data.prix_actuel || '';
    formFields.imageUrl.value = data.image_url || '';
    formFields.urlProduit.value = url;
    formFields.description.value = data.description || '';
    formFields.magasin.value = data.magasin || '';

    // Afficher l'aperçu de l'image
    if (data.image_url) {
      document.getElementById('preview-img').src = data.image_url;
      document.getElementById('image-preview').style.display = 'block';
    }

    // Calculer le rabais
    mettreAJourRabais();

    // Afficher le formulaire
    produitForm.style.display = 'block';
    scrapeLoader.style.display = 'none';
  } catch (error) {
    console.error(error);
    alert('❌ Impossible de lire ce lien. Vérifiez que c\'est un vrai lien produit.');
    scrapeLoader.style.display = 'none';
  } finally {
    scrapeBtn.disabled = false;
  }
}

// 2. Mettre à jour le pourcentage de rabais
function mettreAJourRabais() {
  const prixOriginal = parseFloat(formFields.prixOriginal.value) || 0;
  const prixActuel = parseFloat(formFields.prixActuel.value) || 0;

  if (prixOriginal > 0) {
    const pourcentage = Math.round(((prixOriginal - prixActuel) / prixOriginal) * 100);
    const rabaisInfo = document.getElementById('rabais-info');

    if (pourcentage > 0) {
      rabaisInfo.textContent = `📊 Rabais: ${pourcentage}% - Économies: $${(prixOriginal - prixActuel).toFixed(2)}`;
    } else {
      rabaisInfo.textContent = '⚠️ Attention: Le prix en rabais n\'est pas inférieur au prix original.';
    }
  }
}

// 3. Ajouter le produit
async function ajouterProduit(e) {
  e.preventDefault();

  const produit = {
    nom: formFields.nom.value,
    categorie: formFields.categorie.value,
    prix_original: parseFloat(formFields.prixOriginal.value),
    prix_actuel: parseFloat(formFields.prixActuel.value),
    magasin: formFields.magasin.value,
    description: formFields.description.value,
    image_url: formFields.imageUrl.value,
    url_produit: formFields.urlProduit.value,
  };

  // Validation
  if (!produit.nom || !produit.categorie || !produit.magasin) {
    alert('Veuillez remplir tous les champs obligatoires !');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Ajout en cours...';

  try {
    const response = await fetch(`${API_BASE}/produits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produit),
    });

    if (!response.ok) throw new Error('Erreur lors de l\'ajout');

    alert('✅ Produit ajouté avec succès !');
    resetForm();
    chargerProduits(); // Rafraîchir la liste
  } catch (error) {
    console.error(error);
    alert('❌ Erreur lors de l\'ajout du produit');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ Ajouter le produit';
  }
}

// 4. Charger tous les produits
async function chargerProduits() {
  try {
    const response = await fetch(`${API_BASE}/produits/admin`);
    if (!response.ok) throw new Error('Erreur');

    tousLesProduits = await response.json();
    afficherProduits(tousLesProduits);
  } catch (error) {
    console.error(error);
    produitsList.innerHTML = '<p style="color: red;">❌ Erreur de chargement</p>';
  }
}


async function lancerScrapingCategorie() {
  const magasin = document.getElementById('scrapMagasinSelect').value;
  const url = document.getElementById('scrapUrl').value.trim();
  const categorieSlug = document.getElementById('scrapSlugCategorie').value.trim();
  const btn = document.getElementById('btnScraperCategorie');

  if (!url || !categorieSlug) {
    alert('Merci de remplir tous les champs');
    return;
  }

  const statusDiv = document.getElementById('scrapStatus');
  statusDiv.innerText = '⏳ Scraping en cours... cela peut prendre 1-2 minutes, ne ferme pas la page.';
  btn.disabled = true;

  try {
    const res = await fetch('/api/scraper-categorie', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magasin, url, categorieSlug })
    });

    const data = await res.json();

    if (!res.ok) {
      statusDiv.innerText = '❌ Erreur: ' + data.error;
      return;
    }

    statusDiv.innerText = `✅ Terminé ! ${data.total} produits scrapés et sauvegardés.`;
  } catch (err) {
    statusDiv.innerText = '❌ Erreur: ' + err.message;
  } finally {
    btn.disabled = false;
  }
}

// 5. Afficher les produits
function afficherProduits(produits) {
  if (produits.length === 0) {
    produitsList.innerHTML = '<p style="text-align: center; color: #7f8c8d;">Aucun produit ajouté pour le moment.</p>';
    return;
  }

  produitsList.innerHTML = produits.map(p => `
    <div class="produit-item">
      <img src="${p.image_url || 'https://via.placeholder.com/100'}" alt="${p.nom}">
      
      <div class="produit-info">
        <h3>${p.nom}</h3>
        <p><span class="produit-badge">${p.categorie}</span></p>
        <p><strong>$${p.prix_actuel}</strong> <span style="text-decoration: line-through; color: #999;">$${p.prix_original}</span></p>
        <p style="color: #ff6b35; font-weight: bold;">${Math.round(((p.prix_original - p.prix_actuel) / p.prix_original) * 100)}% rabais</p>
        <p style="font-size: 0.85rem;">📍 ${p.magasin}</p>
      </div>

      <div class="produit-actions">
        <button class="btn btn-secondary btn-small" onclick="editerProduit(${p.id})">✏️ Éditer</button>
        <button class="btn btn-danger btn-small" onclick="supprimerProduit(${p.id})">🗑️ Supprimer</button>
      </div>
    </div>
  `).join('');
}

// 6. Filtrer les produits
function filtrerProduits() {
  const search = searchInput.value.toLowerCase();
  const categorie = filterCategorie.value;

  const filtered = tousLesProduits.filter(p => 
    (p.nom.toLowerCase().includes(search)) &&
    (categorie === '' || p.categorie === categorie)
  );

  afficherProduits(filtered);
}

// 7. Supprimer un produit
async function supprimerProduit(id) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;

  try {
    const response = await fetch(`${API_BASE}/produits/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Erreur');

    alert('✅ Produit supprimé');
    chargerProduits();
  } catch (error) {
    alert('❌ Erreur lors de la suppression');
  }
}

// 8. Éditer un produit (TODO - optionnel)
function editerProduit(id) {
  alert('À venir : Fonctionnalité d\'édition');
}

// 9. Réinitialiser le formulaire
function resetForm() {
  produitForm.reset();
  produitForm.style.display = 'none';
  urlInput.value = '';
  document.getElementById('image-preview').style.display = 'none';
  document.getElementById('rabais-info').textContent = '';
}

// ========== INIT ==========
chargerProduits();

// Calculer rabais en temps réel
formFields.prixOriginal.addEventListener('change', mettreAJourRabais);
formFields.prixActuel.addEventListener('change', mettreAJourRabais);
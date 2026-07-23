// ========== CONSTANTES ==========
const PRODUITS_PAR_PAGE = 30;
let tousLesProduits = [];
let pageActuelle = 1;
let categorieActuelle = null;

// ========== CHARGER LES CATÉGORIES ==========
async function chargerCategories() {
  try {
    const response = await fetch('/api/produits');
    const produits = await response.json();

    // Extraire les catégories uniques
    const categories = [...new Set(produits.map(p => p.categorie))];

    const navDiv = document.getElementById('categories-nav');
    if (!navDiv) return;

    navDiv.innerHTML = categories
      .filter(cat => cat) // Enlever les vides
      .map(cat => `<a href="/categorie/${cat}" class="cat-link">${cat}</a>`)
      .join('');
  } catch (error) {
    console.error('Erreur chargement catégories:', error);
  }
}

// ========== CHARGER LES PRODUITS ==========
async function chargerProduits(categorieFilter = null) {
  const container = document.getElementById('produits-container');
  if (!container) return;

  container.innerHTML = '<div class="loading">Chargement des produits...</div>';

  try {
    const response = await fetch('/api/produits');
    if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

    let produits = await response.json();

    // Filtrer par catégorie si nécessaire
    if (categorieFilter) {
      produits = produits.filter(p => p.categorie === categorieFilter);
    }

    if (!produits || produits.length === 0) {
      container.innerHTML = '<div class="empty">Aucun produit disponible pour le moment.</div>';
      return;
    }

    tousLesProduits = produits;
    pageActuelle = 1;
    afficherPage(1);

    console.log(`✅ ${tousLesProduits.length} produit(s) chargé(s)`);

  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    container.innerHTML = `
      <div class="empty">
        ⚠️ Erreur : Impossible de charger les produits.<br>
        <small>${error.message}</small>
      </div>
    `;
  }
}
// ========== AFFICHER UNE PAGE ==========
function afficherPage(numeroPage) {
  const container = document.getElementById('produits-container');
  if (!container) return;

  const debut = (numeroPage - 1) * PRODUITS_PAR_PAGE;
  const fin = debut + PRODUITS_PAR_PAGE;
  const produitsDeLaPage = tousLesProduits.slice(debut, fin);

  container.innerHTML = produitsDeLaPage
    .map(produit => creerCarteProduit(produit))  // ✅ pas de caractère spécial
    .join('');

  afficherPagination(numeroPage);
}

// ========== CRÉER UNE CARTE PRODUIT ==========
function creerCarteProduit(produit) {
  const prixOriginal = produit.prix_original ? `$${produit.prix_original.toFixed(2)}` : '';
  const badge = produit.pourcentage_rabais ? `<span class="produit-card__badge">-${produit.pourcentage_rabais}%</span>` : '';

  return `
    <div class="produit-card">
      <div class="produit-card__image-container">
        ${badge}
        <div class="produit-card__image-wrapper">
          <img 
            src="${produit.image_url || 'https://via.placeholder.com/280x200?text=Erreur+image'}" 
            alt="${produit.nom}"
            class="produit-card__image"
            onerror="this.src='https://via.placeholder.com/280x200?text=Erreur+image'"
          >
        </div>
      </div>
      <div class="produit-card__content">
        <h3 class="produit-card__nom">${produit.nom}</h3>
        <p class="produit-card__categorie">${produit.categorie}</p>
        <p class="produit-card__description">${produit.description || ''}</p>
        
        <div class="produit-card__prix">
          ${prixOriginal ? `<span class="produit-card__prix-original">${prixOriginal}</span>` : ''}
          <span class="produit-card__prix-actuel">$${produit.prix_actuel.toFixed(2)}</span>
        </div>

        <p class="produit-card__magasin">🏪 ${produit.magasin}</p>

        <a 
          href="${produit.url_produit}" 
          target="_blank" 
          rel="noopener noreferrer"
          class="produit-card__btn-voir"
        >
          Voir le produit
        </a>
      </div>
    </div>
  `;
}

// ========== PAGINATION ==========
function afficherPagination(numeroPage) {
  const paginationDiv = document.getElementById('pagination');
  if (!paginationDiv) return;

  const totalPages = Math.ceil(tousLesProduits.length / PRODUITS_PAR_PAGE);

  if (totalPages <= 1) {
    paginationDiv.innerHTML = '';
    return;
  }

  let html = '';

  // Bouton précédent
  if (numeroPage > 1) {
    html += `<button class="pagination__btn" onclick="allerAPage(${numeroPage - 1})">← Précédent</button>`;
  }

  // Numéros de pages
  for (let i = 1; i <= totalPages; i++) {
    if (i === numeroPage) {
      html += `<span class="pagination__current">${i}</span>`;
    } else {
      html += `<button class="pagination__btn" onclick="allerAPage(${i})">${i}</button>`;
    }
  }

  // Bouton suivant
  if (numeroPage < totalPages) {
    html += `<button class="pagination__btn" onclick="allerAPage(${numeroPage + 1})">Suivant →</button>`;
  }

  paginationDiv.innerHTML = html;
}

function allerAPage(numeroPage) {
  pageActuelle = numeroPage;
  afficherPage(numeroPage);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== GÉRER LE ROUTAGE ==========
function handleNavigation() {
  const path = window.location.pathname;

  if (path.startsWith('/categorie/')) {
    const slug = path.split('/categorie/')[1];
    categorieActuelle = slug;
    chargerProduits(slug);
  } else {
    categorieActuelle = null;
    chargerProduits();
  }
}

// ========== AU CHARGEMENT DE LA PAGE ==========
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Application lancée');
  chargerCategories();
  handleNavigation();
});

// Écoute les changements d'URL
window.addEventListener('popstate', handleNavigation);

// Intercepte les clics sur les catégories
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('cat-link')) {
    e.preventDefault();
    const href = e.target.getAttribute('href');
    window.history.pushState({}, '', href);
    handleNavigation();
  }
});
// ========== CONSTANTES ==========
const PRODUITS_PAR_PAGE = 30;
let tousLesProduits = [];
let pageActuelle = 1;
let categorieActuelle = null; // Nouvelle variable

// ========== CHARGER LES CATÉGORIES ==========
async function chargerCategories() {
  try {
    const response = await fetch('/api/categories');
    
    if (!response.ok) throw new Error('Erreur API');
    
    const categories = await response.json();
    afficherNavCategories(categories);
    
  } catch (error) {
    console.error('Erreur catégories:', error);
  }
}

// ========== AFFICHER LA NAV DES CATÉGORIES ==========
function afficherNavCategories(categories) {
  const nav = document.getElementById('categories-nav');
  
  let html = '<a href="/" class="cat-link active">Tous les produits</a>';
  
  categories.forEach(cat => {
    html += `<a href="/categorie/${cat.slug}" class="cat-link">${cat.nom}</a>`;
  });
  
  nav.innerHTML = html;
}

// ========== CRÉER UNE CARTE PRODUIT ==========
function creerCarteProduit(produit) {
  const {
    id,
    nom,
    description,
    prix_actuel,
    prix_original,
    pourcentage_rabais,
    url_produit,
    url_image,
    magasin
  } = produit;

  let imageUrl = url_image;

  if (imageUrl && !imageUrl.startsWith('http')) {
    imageUrl = `https://via.placeholder.com/280x200?text=${encodeURIComponent(nom)}`;
  }

  if (!imageUrl) {
    imageUrl = 'https://via.placeholder.com/280x200?text=Pas+d%27image';
  }

  function echapperHtml(texte) {
    const div = document.createElement('div');
    div.textContent = texte;
    return div.innerHTML;
  }

  function formatPrix(prix) {
    return parseFloat(prix).toFixed(2);
  }

  return `
    <div class="produit-card">
      <div class="produit-card__image-wrapper">
        <img
          class="produit-card__image"
          src="${imageUrl}"
          alt="${echapperHtml(nom)}"
          onerror="this.src='https://via.placeholder.com/280x200?text=Erreur+image'"
        >
        ${pourcentage_rabais ? `<span class="produit-card__badge">-${pourcentage_rabais}%</span>` : ''}
      </div>

      <div class="produit-card__content">
        <h3 class="produit-card__title">${echapperHtml(nom)}</h3>

        ${description ? `<p class="produit-card__description">${echapperHtml(description)}</p>` : ''}

        <div class="produit-card__prices">
          <div class="produit-card__price-current">
            ${prix_actuel ? `${formatPrix(prix_actuel)} $` : 'Prix non disponible'}
          </div>
          ${prix_original ? `<div class="produit-card__price-original">${formatPrix(prix_original)} $</div>` : ''}
        </div>

        <a
          href="${url_produit}"
          target="_blank"
          rel="noopener noreferrer"
          class="produit-card__link"
        >
          Voir l'offre →
        </a>
      </div>
    </div>
  `;
}

// ========== AFFICHER LA PAGE ACTUELLE ==========
function afficherPage(numeroPage) {
  const container = document.getElementById('produits-container');
  const debut = (numeroPage - 1) * PRODUITS_PAR_PAGE;
  const fin = debut + PRODUITS_PAR_PAGE;
  const produitsPage = tousLesProduits.slice(debut, fin);

  container.innerHTML = produitsPage
    .map(produit => creerCarteProduit(produit))
    .join('');

  mettreAJourPagination(numeroPage);
}

// ========== METTRE À JOUR LES BOUTONS DE PAGINATION ==========
function mettreAJourPagination(numeroPage) {
  const totalPages = Math.ceil(tousLesProduits.length / PRODUITS_PAR_PAGE);
  const paginationContainer = document.getElementById('pagination');

  paginationContainer.innerHTML = '';

  if (numeroPage > 1) {
    const btnPrecedent = document.createElement('button');
    btnPrecedent.textContent = '← Précédent';
    btnPrecedent.className = 'pagination-btn';
    btnPrecedent.onclick = () => {
      pageActuelle = numeroPage - 1;
      afficherPage(pageActuelle);
      window.scrollTo(0, 0);
    };
    paginationContainer.appendChild(btnPrecedent);
  }

  const conteneurNumeros = document.createElement('div');
  conteneurNumeros.className = 'pagination-numbers';

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.className = `pagination-number ${i === numeroPage ? 'active' : ''}`;
    btn.onclick = () => {
      pageActuelle = i;
      afficherPage(pageActuelle);
      window.scrollTo(0, 0);
    };
    conteneurNumeros.appendChild(btn);
  }

  paginationContainer.appendChild(conteneurNumeros);

  if (numeroPage < totalPages) {
    const btnSuivant = document.createElement('button');
    btnSuivant.textContent = 'Suivant →';
    btnSuivant.className = 'pagination-btn';
    btnSuivant.onclick = () => {
      pageActuelle = numeroPage + 1;
      afficherPage(pageActuelle);
      window.scrollTo(0, 0);
    };
    paginationContainer.appendChild(btnSuivant);
  }

  const info = document.createElement('div');
  info.className = 'pagination-info';
  info.textContent = `Page ${numeroPage} sur ${totalPages} (${tousLesProduits.length} produits)`;
  paginationContainer.appendChild(info);
}

// ========== CHARGER LES PRODUITS ==========
async function chargerProduits(slug = null) {
  const container = document.getElementById('produits-container');

  try {
    const url = slug ? `/api/produits/categorie/${slug}` : '/api/produits';
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    tousLesProduits = await response.json();

    if (!tousLesProduits || tousLesProduits.length === 0) {
      container.innerHTML = '<div class="empty">Aucun produit disponible pour le moment.</div>';
      return;
    }

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
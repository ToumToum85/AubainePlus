// Données de produits temporaires (à remplacer plus tard par une BD)
const produits = [
  {
    nom: "Casque Bluetooth Sans Fil",
    categorie: "Électronique",
    prixOriginal: 79.99,
    prixRabais: 39.99,
    image: "images/produits/casque.jpg"
  },
  {
    nom: "Veste d'hiver Homme",
    categorie: "Mode",
    prixOriginal: 129.99,
    prixRabais: 69.99,
    image: "images/produits/veste.jpg"
  },
  {
    nom: "Robot Culinaire 8-en-1",
    categorie: "Maison",
    prixOriginal: 199.99,
    prixRabais: 99.99,
    image: "images/produits/robot.jpg"
  },
  {
    nom: "Manette de Jeu Sans Fil",
    categorie: "Jeux vidéo",
    prixOriginal: 59.99,
    prixRabais: 34.99,
    image: "images/produits/manette.jpg"
  }
];

function calculerRabais(original, rabais) {
  return Math.round(((original - rabais) / original) * 100);
}

function afficherProduits() {
  const grid = document.getElementById('produitsGrid');
  grid.innerHTML = '';

  produits.forEach(p => {
    const pourcentage = calculerRabais(p.prixOriginal, p.prixRabais);

    const card = document.createElement('div');
    card.className = 'produit-card';
    card.innerHTML = `
      <span class="produit-badge">-${pourcentage}%</span>
      <img src="${p.image}" alt="${p.nom}" class="produit-image">
      <div class="produit-info">
        <div class="produit-categorie">${p.categorie}</div>
        <div class="produit-nom">${p.nom}</div>
        <div class="produit-prix">
          <span class="prix-original">${p.prixOriginal.toFixed(2)}$</span>
          <span class="prix-rabais">${p.prixRabais.toFixed(2)}$</span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', afficherProduits);
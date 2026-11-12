import type { SiteCopy } from './types'
export const fr: SiteCopy = {
  hero: { title: "Moi, c’est Elodie.", lines: ['Je crée des sites web', 'qui prennent vie.'] },
  labels: { home: 'Accueil', about: 'À propos', playground: 'Playground', guestbook: 'Coucou', close: 'Fermer', next: 'Projet suivant', visit: 'Voir le site', role: 'Rôle', duration: 'Contexte', platform: 'Plateforme', tools: 'Outils', problem: 'Le défi', solution: 'La réponse', process: 'Comment le projet prend forme', contact: 'CV & contact', code: 'Code sur GitHub', contents: 'Sommaire du projet', allProjects: 'Tous les projets' },
  about: { title: 'Elodie Lin', subtitle: 'Développeuse web, curieuse de tout.', bio: ['Étudiante en troisième année à Efrei et développeuse web en alternance chez Ody, je m’intéresse autant à ce qu’un site permet de faire qu’à la manière dont il se ressent.', 'J’aime construire des interfaces vivantes, relier le design au code et explorer de nouvelles idées. En dehors du web, la photographie et la culture chinoise nourrissent ma curiosité.'], experience: 'Expérience', education: 'Formation', languages: 'Langues', credits: 'Objets 3D et expériences interactives créés pour ce portfolio.', portraitAlt: 'Portrait d’Elodie Lin', location: 'Paris, FR', highlights: ['Alternance chez Ody', 'Stage à Shanghai', 'Chinois HSK 6', 'Efrei 2027'], interestsLabel: 'Centres d’intérêt', interests: ['Piano', 'Photographie', 'Badminton', 'Voyages'], languageRows: [{ name: 'Français' }, { name: 'Anglais', level: 'B1', rank: 3 }, { name: 'Chinois', level: 'HSK 6', rank: 6 }], strengthsLabel: 'Atouts', strengths: ['Motivation', 'Communication', 'Empathie', 'Curiosité'], experienceRows: [{ name: 'Ody', logo: '/media/logos/ody.svg', logoTile: 'dark', role: 'Développeuse web en alternance', period: 'depuis 09/2026', points: ['Création et refonte de sites responsives pour restaurateurs et commerçants : design, intégration, UX', 'Ajout de fonctionnalités, corrections de bugs et pull requests sur GitHub pour la plateforme ODY', 'Tests fonctionnels sur ordinateur, tablette et mobile, suivi et documentation des anomalies, vérification des corrections', 'Déploiement, maintenance et suivi via Cloudflare et l’administration ODY', 'Collaboration en anglais au sein d’une équipe internationale, avec les équipes produit et commerciale'] }, { name: 'Info2soft', logo: '/media/logos/info2soft.webp', role: 'Stagiaire en développement web', period: '06–08/2025', place: 'Shanghai', badge: 'International', points: ['Contribution à la refonte du site web de l’entreprise', 'Adaptation de l’interface en anglais pour un public international', 'Amélioration de la visibilité et de l’accessibilité du site à l’étranger'] }, { name: 'Sushi Tokyo', role: 'Stage en développement web', period: '04–06/2025', place: 'Asnières-sur-Seine', points: ['Conception et développement d’un menu numérique', 'React et responsive design, accès par QR code', 'Amélioration de l’expérience utilisateur'] }, { name: 'Delpech', logo: '/media/logos/delpech.webp', role: 'Stage pharmacie et laboratoire', period: '04/2019', place: 'Paris', points: ['Conseil en parapharmacie', 'Initiation aux logiciels de gestion de laboratoire', 'Échanges avec les équipes scientifiques'] }, { name: 'Arteque', logo: '/media/logos/arteque.webp', role: 'Bénévolat', period: 'depuis 2024', place: 'Paris', points: ['Création de tutoriels d’initiation à la programmation pour enfants', 'Animation d’ateliers musicaux', 'Bénévolat lors du Nouvel An chinois à la mairie du 13ᵉ'] }], educationRows: [{ name: 'Efrei', logo: '/media/logos/efrei.webp', role: 'Bachelor Ingénierie & Numérique', period: '2024–2027' }, { name: 'Elysée Marbeuf', logo: '/media/logos/elysee-marbeuf.webp', role: 'CAP Esthétique', period: '2023–2024' }, { name: 'UPEC', logo: '/media/logos/upec.webp', role: 'Licence Sciences pour la santé (PASS)', period: '2022–2023' }, { name: 'Lycée Saint-André', logo: '/media/logos/lycee-saint-andre.webp', role: 'Baccalauréat, option maths/physique-chimie', period: '2019–2022' }] },
  playground: {
    "title": "Playground",
    "intro": "Six petits jeux codés à la main, dans l’eau du bassin. Choisis-en un, joue en plein écran et bats ton record.",
    "instruction": "Souris ou toucher pour diriger. Au clavier : flèches pour bouger, Entrée pour agir. Le bouton Recommencer relance l’expérience.",
    "markers": [
      "Plein écran",
      "Ton record est gardé"
    ],
    "ui": {
      "today": "Jeu du jour",
      "play": "Jouer",
      "fullscreen": "Plein écran",
      "exitFullscreen": "Quitter le plein écran",
      "how": "Comment c’est codé",
      "open": "Ouvrir et jouer",
      "replay": "Recommencer",
      "pause": "Pause",
      "resume": "Reprendre",
      "controls": "Commandes",
      "notes": "Notes de labo",
      "best": "Meilleur score",
      "notPlayed": "Pas encore joué",
      "technique": "Technique",
      "keys": "Touches",
      "hint": "Souris ou toucher. Au clavier : flèches pour diriger, Entrée pour agir.",
      "tags": [
        "Jeu · Course",
        "Jeu · Gravité",
        "Jeu · Casse-briques",
        "Jeu · Adresse",
        "Jeu · Plongée",
        "Jeu · Réflexes"
      ],
      "canvas": {"start": "Clique pour jouer", "startTouch": "Touche pour jouer", "againTouch": "Touche pour rejouer", "keys": "ou appuie sur Entrée", "again": "Clique pour rejouer", "over": "Partie terminée", "level": "Niveau", "combo": "Combo"}
    },
    "items": [
      {
        "id": "koi",
        "title": "Couloir",
        "description": "Glisse sur ta bouée flamant rose d’une ligne d’eau à l’autre : attrape les canards en plastique et évite bouées et ballons. Quand tes trois cœurs sont perdus, clique pour replonger.",
        "hook": "Canards, bouées et flamant rose à toute vitesse",
        "technique": "Canvas 2D, projection en perspective, file d’objets",
        "keys": "Souris ou ← → · clic ou Entrée pour plonger",
        "touch": "Glisse le doigt · touche pour replonger",
        "notes": "Chaque objet n’a qu’une ligne et une profondeur ; une seule fonction le projette à l’écran, plus gros et plus bas quand il approche. Les collisions se testent à l’instant où un objet franchit la profondeur du flamant, sans aucune géométrie. La vitesse monte avec le temps, et chaque flèche fait sauter une ligne entière pour que le clavier soit aussi vif que la souris."
      },
      {
        "id": "encre",
        "title": "Remous",
        "description": "Maintiens le clic pour attirer le ballon vers ton curseur et attrape les 7 canards de chaque niveau sans toucher les bouées. Clique pour rejouer.",
        "hook": "Un ballon, sept canards, des bouées qui tournent",
        "technique": "Canvas 2D, attraction vectorielle, rebonds",
        "keys": "Souris maintenue ou flèches · Entrée pour attirer",
        "touch": "Garde le doigt posé pour attirer le ballon",
        "notes": "Le ballon est attiré vers le pointeur par une force qui grandit avec la distance, puis sa vitesse est bornée. Sa traînée est stockée dans un tampon circulaire fixe, sans allocation à chaque image. Les bouées suivent deux orbites elliptiques en sens inverse, et un choc renvoie le ballon le long de la normale de contact."
      },
      {
        "id": "hanzi",
        "title": "Carrelage",
        "description": "Fais rebondir le ballon sur ta planche pour casser les carreaux de mosaïque, et attrape les capsules bonus qui tombent. Tu as trois ballons ; clique pour relancer une partie.",
        "hook": "Casse la mosaïque de la piscine, carreau par carreau",
        "technique": "Canvas 2D, collisions cercle-rectangle en sous-pas",
        "keys": "Souris ou ← → · clic ou Entrée pour lancer",
        "touch": "Glisse le doigt · touche pour lancer",
        "notes": "Le ballon avance par sous-pas de 6 px au plus, pour ne jamais traverser un carreau, même à pleine vitesse. L’angle de rebond dépend de l’endroit où il touche la planche : au centre il remonte droit, au bord il part en biais. Chaque niveau est une grille de dix colonnes écrite en texte, où « 2 » marque les carreaux qui demandent deux coups."
      },
      {
        "id": "chambre-noire",
        "title": "Ricochet",
        "description": "Vise avec la hauteur de la souris, puis lance quand la jauge est haute : plus le galet arrive à plat et vite, plus il rebondit. Cinq galets par manche, clique pour rejouer.",
        "hook": "Fais rebondir le galet le plus loin possible",
        "technique": "Canvas 2D, balistique, rebonds à angle critique",
        "keys": "Souris ou ↑ ↓ · clic ou Entrée pour lancer",
        "touch": "Glisse le doigt pour viser · touche pour lancer",
        "notes": "Le galet suit une balistique simple, calculée en deux sous-pas par image. À chaque contact avec l’eau, l’angle d’impact décide : sous 26° il rebondit et perd de la vitesse, sinon il coule. La caméra suit le galet en douceur, et le décor défile en parallaxe à trois vitesses."
      },
      {
        "id": "sable",
        "title": "Plongée",
        "description": "Guide la plongeuse avec la souris, ramasse coquillages et perles, évite méduses et oursins, et attrape des bulles pour garder de l’air. Un clic donne un sprint qui rend invincible un instant ; clique pour rejouer.",
        "hook": "Plonge, ramasse les perles, garde ton souffle",
        "technique": "Canvas 2D, défilement en parallaxe, collisions elliptiques",
        "keys": "Souris ou ↑ ↓ · clic ou Entrée pour sprinter",
        "touch": "Glisse le doigt · touche pour sprinter",
        "notes": "Le récif est fait de bandes de décor qui se répètent, chacune défilant à sa propre vitesse. Les objets viennent d’un tableau fixe réutilisé, et des motifs de plus en plus serrés font monter la difficulté. Les collisions testent des ellipses autour de la plongeuse, généreuses pour les bonus et plus serrées pour les dangers."
      },
      {
        "id": "bulles",
        "title": "Bulles",
        "description": "Éclate les bulles avant qu’elles s’échappent et enchaîne la même couleur pour faire grimper le combo, mais évite les oursins piquants. Clique pour rejouer.",
        "hook": "Éclate, enchaîne les couleurs, évite les oursins",
        "technique": "Canvas 2D, réserve d’objets, difficulté progressive",
        "keys": "Souris ou flèches · clic ou Entrée pour éclater",
        "touch": "Touche les bulles pour les éclater",
        "notes": "Les bulles viennent d’une réserve fixe de 40 objets réutilisés, sans allocation pendant la partie. Le clic vise le bord de bulle le plus proche, avec une marge plus large quand on joue au clavier. Le rythme d’apparition et la vitesse montent avec le temps, et les oursins deviennent plus fréquents."
      }
    ]
  },
  projects: {
    streamflix: { type: 'Projet d’équipe à Efrei', tagline: 'Du catalogue au grand écran.', role: 'Projet réalisé en équipe avec mes camarades', duration: '2026, 6 mois', platform: 'Site de films', problem: 'Relier la découverte d’un film à une expérience de visionnage cohérente, dans le cadre d’un projet d’équipe.', solution: 'Une plateforme PHP qui rassemble un catalogue connecté à TMDB, un panier en session, des achats à l’unité et trois formules d’abonnement.', process: [{ icon: '01', title: 'Organiser', text: 'Structurer les pages et le routage de l’application.' }, { icon: '02', title: 'Connecter', text: 'Relier PostgreSQL, PDO et les données de l’API TMDB.' }, { icon: '03', title: 'Visionner', text: 'Articuler le catalogue, le panier et le lecteur HTML5.' }], sections: [{ id: 'catalogue', title: 'Un catalogue connecté', body: ['Les informations des films proviennent de TMDB, interrogé avec Guzzle. La base PostgreSQL et PDO assurent la persistance des données de l’application.'], media: [{ shot: 0, alt: 'Le catalogue StreamFlix : le top 10 des films du moment' }] }, { id: 'parcours', title: 'Un parcours, plusieurs usages', body: ['Achat à l’unité, panier conservé en session et abonnement mensuel : le projet explore plusieurs façons d’accéder aux films, avec un lecteur HTML5.'], media: [{ shot: 1, alt: 'Les rangées de films par genre sur StreamFlix' }] }], alts: { hero: 'Composition graphique StreamFlix, projet de plateforme vidéo' } },
    yoru: { type: 'Site de restaurant chez Ody', tagline: 'Une table à Paris. Une expérience qui commence en ligne.', role: 'Développement web chez Ody', duration: 'Projet Ody', platform: 'Site web FR / EN', problem: 'Donner une place claire à la carte du restaurant et proposer une réservation directement depuis le site.', solution: 'Un site bilingue avec une carte structurée et un parcours de réservation sur mesure relié à l’API publique Odyssey.', process: [{ icon: '01', title: 'Structurer', text: 'Organiser la carte à partir des données du restaurant.' }, { icon: '02', title: 'Réserver', text: 'Construire les étapes de réservation en accordéon.' }, { icon: '03', title: 'Accompagner', text: 'Prévoir les erreurs et le repli vers le téléphone.' }], sections: [{ id: 'reservation', title: 'La réservation, étape par étape', body: ['Le parcours interroge les disponibilités puis transmet la réservation à Odyssey. Les réponses d’erreur sont traitées et un délai de dix secondes conduit à une alternative par téléphone.'], media: [{ shot: 0, alt: 'La page des infos pratiques de YORU : adresse, horaires, métro et téléphone' }] }, { id: 'identite', title: 'Une identité en mouvement', body: ['Un fond WebGL évoque le marbre liquide. La carte comprend 181 plats répartis dans 28 sections à partir d’un fichier Excel. Des données structurées Restaurant accompagnent les pages.'], media: [{ shot: 1, alt: 'Le fond liquide évoquant le marbre, sur la page d’accueil de YORU' }, { shot: 2, alt: 'La carte de YORU : entrées, sushis et sashimis, rolls' }] }], alts: { hero: 'Composition graphique YORU, site de restaurant à Montparnasse' } },
    kanpai: { type: 'Site de restaurant réalisé chez Ody', tagline: 'L’esprit du Japon, au cœur de Paris.', role: 'Développement web chez Ody, mon entreprise actuelle', duration: 'Projet Ody', platform: 'Site web', problem: 'Présenter l’identité de Kanpai Paris et faciliter la découverte de sa carte et de son restaurant.', solution: 'Un site React avec des animations GSAP, une galerie et des accès directs à la réservation et à la commande Odyssey.', process: [{ icon: '01', title: 'Présenter', text: 'Mettre en valeur le restaurant, sa cuisine et son chef.' }, { icon: '02', title: 'Animer', text: 'Accompagner la lecture avec des animations GSAP.' }, { icon: '03', title: 'Relier', text: 'Rendre la réservation et la commande accessibles.' }], sections: [{ id: 'restaurant', title: 'Une adresse japonaise à Paris', body: ['Le site présente Kanpai, restaurant japonais situé rue Bréa dans le sixième arrondissement de Paris, à travers sa carte, son chef et ses photographies.'], media: [{ shot: 0, alt: 'La galerie de photos du restaurant Kanpai, rue Bréa' }] }, { id: 'technique', title: 'Une réalisation chez Ody', body: ['Ce projet a été réalisé chez Ody, mon entreprise actuelle. Son socle associe React, TypeScript, Tailwind et GSAP, avec des liens vers les services de réservation et de commande Odyssey.'], media: [{ shot: 1, alt: 'Les signatures de la maison, sur le site Kanpai' }, { shot: 2, alt: 'Les rangées de la carte du site Kanpai : sushi et sashimi, avec leurs prix' }] }], alts: { hero: 'Aperçu du site Kanpai Paris, réalisé chez Ody' } },
    carnival: { type: 'Site de restaurant conçu chez Ody', tagline: 'Un buffet asiatique raconté comme un monde peint à la main.', role: 'Design et développement chez Ody (alternance)', duration: 'Refonte complète · novembre 2026', platform: 'Site web FR / EN / JA', problem: 'Refaire de zéro le site de Carnival 17, buffet asiatique à Puilboreau, près de La Rochelle, à partir d’une planche d’ambiance, en gardant les informations pratiques faciles à trouver.', solution: 'Un site React de cinq pages inspiré de l’animation japonaise peinte à la main, animé avec GSAP et Lenis, en trois langues.', process: [{ icon: '01', title: 'Imaginer', text: 'Transformer la planche d’ambiance en un monde : nuit indigo, papier washi déchiré, cerisiers en fleur, lanternes et couleurs traditionnelles modernisées.' }, { icon: '02', title: 'Animer', text: 'Créer chaque effet pour le site : rideau noren d’ouverture, hero en plusieurs plans, lanternes, vagues seigaiha, carte en makimono et pétales qui tombent.' }, { icon: '03', title: 'Adapter', text: 'Concevoir le mobile à part avec des effets plus légers, traduire le site en français, anglais et japonais, et pré-rendre les pages pour le référencement.' }], sections: [{ id: 'univers', title: 'Un monde peint à la main', body: ['À l’ouverture, un rideau noren s’écarte pour donner l’impression d’entrer dans le monde Carnival. Le hero est construit en plusieurs plans : chaque couche de la scène peinte bouge à sa propre profondeur, pendant que des pétales tombent.', 'Au fil du défilement, adouci par Lenis, les lanternes s’allument et les vagues seigaiha ondulent selon la vitesse du scroll. Les spécialités prennent la forme d’un carrousel de photos de la salle qui défile seul, dans des cadres dorés.'], media: [{ shot: 0, alt: 'La section « Nos spécialités » de Carnival 17 sur fond indigo : un carrousel de photos encadrées d’or, avec le salon aux lanternes et son chat porte-bonheur, le bar doré et un escalier de torii peint parmi les cerisiers' }] }, { id: 'carte', title: 'La carte en makimono', body: ['Sur la page La carte, le menu se présente comme un makimono, un rouleau qui se déroule. Les cinq pages, Accueil, Restaurant, La carte, Galerie et Informations, partagent le même univers, et des pétales accompagnent le passage de l’une à l’autre.'], media: [{ shot: 1, alt: 'La page La carte de Carnival 17 : la carte complète, avec horaires, prix du buffet et boissons, déroulée sur un makimono entre deux baguettes de bois' }] }, { id: 'pratique', title: 'Pensé pour le téléphone, pratique partout', body: ['Le mobile a été conçu à part, et non comme la version ordinateur empilée, avec des effets plus légers. Les horaires, l’adresse et une carte Google sont visibles directement ; les boutons d’appel restent dans le pied de page et la page Informations.', 'J’ai mené le design et le développement de cette refonte chez Ody, à partir de zéro, avec Vite, React, TypeScript, Tailwind, GSAP et Lenis.'], media: [{ shot: 2, alt: 'La page Galerie de Carnival 17 sur papier washi crème : le salon aux lanternes avec son mur d’affiches et son chat porte-bonheur, et les comptoirs du buffet éclairés en doré' }] }], alts: { hero: 'L’accueil du site Carnival 17 : une nuit peinte avec lanternes, cerisiers, pleine lune, mont Fuji et torii rouge, sous le titre doré « Bienvenue chez Carnival »' } },
  },
}

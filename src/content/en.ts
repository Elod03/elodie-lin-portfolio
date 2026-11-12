import type { SiteCopy } from './types'
export const en: SiteCopy = {
  hero: { title: "Hi, I’m Elodie.", lines: ['I build websites', 'that come to life.'] },
  labels: { home: 'Home', about: 'About', playground: 'Playground', guestbook: 'Say hi', close: 'Close', next: 'Next project', visit: 'Visit website', role: 'Role', duration: 'Context', platform: 'Platform', tools: 'Tools', problem: 'The challenge', solution: 'The response', process: 'How the project takes shape', contact: 'CV & contact', code: 'Code on GitHub', contents: 'Project contents', allProjects: 'All projects' },
  about: { title: 'Elodie Lin', subtitle: 'Web developer, curious about everything.', bio: ['I’m a third-year Efrei student and a web development apprentice at Ody. I care about what a website lets people do and how it feels to use.', 'I enjoy building lively interfaces, connecting design and code, and trying new ideas. Outside the web, photography and Chinese culture keep me curious.'], experience: 'Experience', education: 'Education', languages: 'Languages', credits: '3D objects and interactive experiments created for this portfolio.', portraitAlt: 'Portrait of Elodie Lin', location: 'Paris, FR', highlights: ['Apprenticeship at Ody', 'Internship in Shanghai', 'Chinese HSK 6', 'Efrei 2027'], interestsLabel: 'Interests', interests: ['Piano', 'Photography', 'Badminton', 'Travel'], languageRows: [{ name: 'French' }, { name: 'English', level: 'B1', rank: 3 }, { name: 'Chinese', level: 'HSK 6', rank: 6 }], strengthsLabel: 'Strengths', strengths: ['Motivation', 'Communication', 'Empathy', 'Curiosity'], experienceRows: [{ name: 'Ody', logo: '/media/logos/ody.svg', logoTile: 'dark', role: 'Web development apprentice', period: 'since 09/2026', points: ['Building and redesigning responsive websites for restaurateurs and shopkeepers: design, integration, UX', 'Adding features, fixing bugs and opening pull requests on GitHub for the ODY platform', 'Functional testing on desktop, tablet and mobile, issue tracking and documentation, verification of fixes', 'Deployment, maintenance and monitoring with Cloudflare and the ODY admin', 'Collaboration in English within an international team, alongside the product and sales teams'] }, { name: 'Info2soft', logo: '/media/logos/info2soft.webp', role: 'Web development intern', period: '06–08/2025', place: 'Shanghai', badge: 'International', points: ['Contributed to the redesign of the company website', 'Adapted the interface into English for an international audience', 'Improved the site’s visibility and accessibility abroad'] }, { name: 'Sushi Tokyo', role: 'Web development internship', period: '04–06/2025', place: 'Asnières-sur-Seine', points: ['Designed and built a digital menu', 'React and responsive design, reached by QR code', 'Improved the user experience'] }, { name: 'Delpech', logo: '/media/logos/delpech.webp', role: 'Pharmacy and laboratory internship', period: '04/2019', place: 'Paris', points: ['Advice on parapharmacy products', 'Introduction to laboratory management software', 'Exchanges with the scientific teams'] }, { name: 'Arteque', logo: '/media/logos/arteque.webp', role: 'Volunteer', period: 'since 2024', place: 'Paris', points: ['Created beginner programming tutorials for children', 'Ran music workshops', 'Volunteered at the Chinese New Year event at the 13th arrondissement town hall'] }], educationRows: [{ name: 'Efrei', logo: '/media/logos/efrei.webp', role: 'Bachelor in Engineering & Digital Technology', period: '2024–2027' }, { name: 'Elysée Marbeuf', logo: '/media/logos/elysee-marbeuf.webp', role: 'CAP in Aesthetics', period: '2023–2024' }, { name: 'UPEC', logo: '/media/logos/upec.webp', role: 'Bachelor in Health Sciences (PASS)', period: '2022–2023' }, { name: 'Lycée Saint-André', logo: '/media/logos/lycee-saint-andre.webp', role: 'Baccalauréat, maths and physics-chemistry track', period: '2019–2022' }] },
  playground: {
    "title": "Playground",
    "intro": "Six small games coded by hand, in the pool water. Pick one, play full screen and beat your best.",
    "instruction": "Steer with your mouse or touch. On a keyboard: arrows to move, Enter to act. Restart resets the experience.",
    "markers": [
      "Full screen",
      "Your best is kept"
    ],
    "ui": {
      "today": "Game of the day",
      "play": "Play",
      "fullscreen": "Full screen",
      "exitFullscreen": "Exit full screen",
      "how": "How it’s coded",
      "open": "Open and play",
      "replay": "Restart",
      "pause": "Pause",
      "resume": "Resume",
      "controls": "Controls",
      "notes": "Lab notes",
      "best": "Best score",
      "notPlayed": "Not played yet",
      "technique": "Technique",
      "keys": "Keys",
      "hint": "Mouse or touch. On a keyboard: arrows to steer, Enter to act.",
      "tags": [
        "Game · Racing",
        "Game · Gravity",
        "Game · Brick breaker",
        "Game · Skill",
        "Game · Diving",
        "Game · Reflexes"
      ],
      "canvas": {"start": "Click to play", "startTouch": "Tap to play", "againTouch": "Tap to play again", "keys": "or press Enter", "again": "Click to play again", "over": "Game over", "level": "Level", "combo": "Combo"}
    },
    "items": [
      {
        "id": "koi",
        "title": "Lane",
        "description": "Steer your flamingo float across three pool lanes: grab the rubber ducks and dodge buoys and beach balls. When your three hearts are gone, click to dive back in.",
        "hook": "Ducks, buoys and a flamingo at full speed",
        "technique": "Canvas 2D, perspective projection, object queue",
        "keys": "Mouse or ← → · click or Enter to dive in",
        "touch": "Slide your finger · tap to dive back in",
        "notes": "Every object is just a lane and a depth; one function projects it on screen, bigger and lower as it gets closer. Collisions are checked at the exact moment an object crosses the flamingo’s depth, with no geometry at all. Speed ramps up over time, and each arrow press jumps a whole lane so the keyboard feels as quick as the mouse."
      },
      {
        "id": "encre",
        "title": "Ripples",
        "description": "Hold the click to pull the ball toward your cursor and catch the 7 ducks of each level without touching the buoys. Click to play again.",
        "hook": "One ball, seven ducks, spinning buoys",
        "technique": "Canvas 2D, vector attraction, bounces",
        "keys": "Hold mouse or arrows · Enter to pull",
        "touch": "Keep your finger down to pull the ball",
        "notes": "The ball is pulled toward the pointer by a force that grows with distance, then its speed is clamped. Its trail lives in a fixed ring buffer, with no per-frame allocation. Buoys follow two counter-rotating elliptical orbits, and a hit reflects the ball along the contact normal."
      },
      {
        "id": "hanzi",
        "title": "Tiles",
        "description": "Bounce the ball off your kickboard to smash the mosaic tiles, and catch the bonus capsules as they fall. You have three balls; click to start a new game.",
        "hook": "Smash the pool mosaic, one tile at a time",
        "technique": "Canvas 2D, sub-stepped circle-rectangle collisions",
        "keys": "Mouse or ← → · click or Enter to launch",
        "touch": "Slide your finger · tap to launch",
        "notes": "The ball moves in sub-steps of at most 6 px, so it never tunnels through a tile, even at full speed. The bounce angle depends on where it hits the board: straight up in the middle, sharply sideways at the edges. Each level is a ten-column grid written as text, where “2” marks tiles that need two hits."
      },
      {
        "id": "chambre-noire",
        "title": "Skimming",
        "description": "Aim with the pointer’s height and throw when the gauge is high: the flatter and faster the pebble lands, the more it skips. Five pebbles per round, click to play again.",
        "hook": "Skip the pebble as far as you can",
        "technique": "Canvas 2D, ballistics, critical-angle bounces",
        "keys": "Mouse or ↑ ↓ · click or Enter to throw",
        "touch": "Slide to aim · tap to throw",
        "notes": "The pebble follows simple ballistics, computed in two sub-steps per frame. On each water contact the impact angle decides: under 26° it skips and loses speed, otherwise it sinks. The camera follows it smoothly, and the scenery scrolls in parallax at three speeds."
      },
      {
        "id": "sable",
        "title": "Dive",
        "description": "Steer the diver with the pointer, collect shells and pearls, dodge jellyfish and urchins, and grab bubbles to keep your air. A click gives a short dash that makes you invincible for a moment; click to play again.",
        "hook": "Dive, grab the pearls, mind your air",
        "technique": "Canvas 2D, parallax scrolling, elliptical collisions",
        "keys": "Mouse or ↑ ↓ · click or Enter to dash",
        "touch": "Slide your finger · tap to dash",
        "notes": "The reef is built from repeating scenery strips, each scrolling at its own speed. Objects come from a fixed, reused array, and spawn patterns get tighter to raise the difficulty. Collisions test ellipses around the diver, generous for pickups and tighter for hazards."
      },
      {
        "id": "bulles",
        "title": "Bubbles",
        "description": "Pop the bubbles before they escape and chain the same colour to grow your combo, but avoid the spiky urchins. Click to play again.",
        "hook": "Pop, chain colours, dodge the urchins",
        "technique": "Canvas 2D, object pool, difficulty ramp",
        "keys": "Mouse or arrows · click or Enter to pop",
        "touch": "Tap the bubbles to pop them",
        "notes": "Bubbles come from a fixed pool of 40 reused objects, so nothing is allocated during play. A click targets the nearest bubble edge, with a wider margin for keyboard play. Spawn rate and rising speed grow over time, and urchins become more frequent."
      }
    ]
  },
  projects: {
    streamflix: { type: 'Team project at Efrei', tagline: 'From the catalogue to the screen.', role: 'Team project with my classmates', duration: '2026, 6 months', platform: 'Movie website', problem: 'Connect film discovery with a coherent viewing experience as a team project.', solution: 'A PHP platform with a TMDB-connected catalogue, a session cart, individual purchases and three subscription plans.', process: [{ icon: '01', title: 'Organise', text: 'Structure the pages and application routing.' }, { icon: '02', title: 'Connect', text: 'Connect PostgreSQL, PDO and TMDB data.' }, { icon: '03', title: 'Watch', text: 'Bring the catalogue, cart and HTML5 player together.' }], sections: [{ id: 'catalogue', title: 'A connected catalogue', body: ['Film information comes from TMDB through Guzzle. PostgreSQL and PDO provide application data persistence.'], media: [{ shot: 0, alt: 'The StreamFlix catalogue: the top 10 films of the moment' }] }, { id: 'parcours', title: 'One journey, different uses', body: ['Individual purchases, a session cart and monthly subscriptions explore different ways of accessing films through an HTML5 player.'], media: [{ shot: 1, alt: 'Rows of films by genre on StreamFlix' }] }], alts: { hero: 'StreamFlix graphic composition, video platform project' } },
    yoru: { type: 'Restaurant website at Ody', tagline: 'A table in Paris. An experience that starts online.', role: 'Web development at Ody', duration: 'Ody project', platform: 'FR / EN website', problem: 'Make the restaurant menu easy to explore and offer reservations directly on the website.', solution: 'A bilingual website with a structured menu and a custom reservation flow connected to the public Odyssey API.', process: [{ icon: '01', title: 'Structure', text: 'Organise the menu from the restaurant’s data.' }, { icon: '02', title: 'Book', text: 'Build accordion-based booking steps.' }, { icon: '03', title: 'Support', text: 'Handle errors and provide a telephone alternative.' }], sections: [{ id: 'reservation', title: 'Booking, step by step', body: ['The flow checks availability before sending a reservation to Odyssey. Error responses are handled and a ten-second timeout offers a telephone alternative.'], media: [{ shot: 0, alt: 'The YORU practical information page: address, opening hours, metro and telephone' }] }, { id: 'identite', title: 'An identity in motion', body: ['A WebGL background evokes liquid marble. The menu contains 181 dishes across 28 sections sourced from Excel. Restaurant structured data accompanies the pages.'], media: [{ shot: 1, alt: 'The liquid marble background on the YORU home page' }, { shot: 2, alt: 'The YORU menu: starters, sushi and sashimi, rolls' }] }], alts: { hero: 'Screenshot of the YORU Montparnasse restaurant website' } },
    kanpai: { type: 'Restaurant website made at Ody', tagline: 'The spirit of Japan, in the heart of Paris.', role: 'Web development at Ody, my current employer', duration: 'Ody project', platform: 'Website', problem: 'Present Kanpai Paris and make its menu and restaurant easy to discover.', solution: 'A React website with GSAP animations, a gallery and direct links to Odyssey booking and ordering services.', process: [{ icon: '01', title: 'Present', text: 'Showcase the restaurant, its food and its chef.' }, { icon: '02', title: 'Animate', text: 'Support the reading experience with GSAP animations.' }, { icon: '03', title: 'Connect', text: 'Make bookings and ordering easy to reach.' }], sections: [{ id: 'restaurant', title: 'A Japanese address in Paris', body: ['The website introduces Kanpai, a Japanese restaurant on rue Bréa in the sixth arrondissement of Paris, through its menu, chef and photography.'], media: [{ shot: 0, alt: 'The photo gallery of the Kanpai restaurant, rue Bréa' }] }, { id: 'technique', title: 'A project made at Ody', body: ['This project was made at Ody, my current employer. Its foundation combines React, TypeScript, Tailwind and GSAP, with links to Odyssey booking and ordering services.'], media: [{ shot: 1, alt: 'The house signatures on the Kanpai website' }, { shot: 2, alt: 'The rows of the Kanpai website menu: sushi and sashimi, with their prices' }] }], alts: { hero: 'Preview of the Kanpai Paris website, made at Ody' } },
    carnival: { type: 'Restaurant website designed at Ody', tagline: 'An Asian buffet told as a hand-painted world.', role: 'Design and development at Ody (work-study)', duration: 'Full redesign · November 2026', platform: 'FR / EN / JA website', problem: 'Rebuild from scratch the website of Carnival 17, an Asian buffet in Puilboreau near La Rochelle, starting from a mood board, while keeping the practical information easy to find.', solution: 'A five-page React website inspired by hand-painted Japanese animation, animated with GSAP and Lenis, in three languages.', process: [{ icon: '01', title: 'Imagine', text: 'Turn the mood board into a world: night indigo, torn washi paper, cherry blossoms, lanterns and traditional colours made modern.' }, { icon: '02', title: 'Animate', text: 'Build every effect for the site: an opening noren curtain, a multi-plane hero, lanterns, seigaiha waves, a makimono menu and falling petals.' }, { icon: '03', title: 'Adapt', text: 'Design the mobile version on its own with lighter effects, translate the site into French, English and Japanese, and prerender the pages for SEO.' }], sections: [{ id: 'univers', title: 'A hand-painted world', body: ['On arrival, a noren curtain parts to give the feeling of stepping into the world of Carnival. The hero is built in several planes: each layer of the painted scene moves at its own depth while petals fall.', 'As you scroll, smoothed by Lenis, the lanterns light up and the seigaiha waves ripple with the scroll speed. The specialties take the form of a self-scrolling carousel of dining-room photos in gold frames.'], media: [{ shot: 0, alt: 'The “Nos spécialités” section of Carnival 17 on night indigo: a carousel of gold-framed photos showing the lantern lounge with its lucky cat, the gold bar counter and a painted torii staircase among cherry trees' }] }, { id: 'carte', title: 'A menu on a makimono', body: ['On the menu page, La carte, the menu is presented as a makimono, a scroll that unrolls. The five pages, Home, Restaurant, Menu, Gallery and Information, share the same world, and petals carry you from one to the next.'], media: [{ shot: 1, alt: 'The Carnival 17 menu page: the full menu, with opening hours, buffet prices and drinks, unrolled on a makimono between two wooden rods' }] }, { id: 'pratique', title: 'Designed for phones, practical everywhere', body: ['The mobile version was designed on its own, not as the desktop layout stacked up, with lighter effects. Opening hours, the address and a Google map are shown directly; call buttons stay in the footer and on the Information page.', 'I led the design and the development of this redesign at Ody, from scratch, with Vite, React, TypeScript, Tailwind, GSAP and Lenis.'], media: [{ shot: 2, alt: 'The Carnival 17 Gallery page on cream washi paper: the lantern lounge with its poster wall and lucky cat, and the gold-lit buffet counters' }] }], alts: { hero: 'The Carnival 17 home page: a painted night with lanterns, cherry blossoms, a full moon, Mount Fuji and a red torii, under the gold title “Bienvenue chez Carnival”' } },
  },
}

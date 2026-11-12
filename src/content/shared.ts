import type { ProjectSlug } from './types'
import { skills } from './skills'
export const projectSlugs: readonly ProjectSlug[] = ['streamflix', 'yoru', 'kanpai', 'carnival']
export const shared = {
  name: 'Elodie Lin', email: 'Linelodie2004@gmail.com', github: 'https://github.com/Elod03', linkedin: 'https://www.linkedin.com/in/elodie-lin-b36918253',
  projects: [
    { slug: 'streamflix', name: 'StreamFlix', color: '#be2942', ink: '#be2942', iconFace: '/media/projects/streamflix.svg', hero: '/media/projects/streamflix-capture.jpg', tools: ['PHP', 'PostgreSQL', 'PDO', 'TMDB'], url: 'https://streamflix-murex.vercel.app/', shots: [{ src: '/media/projects/shots/streamflix-1.webp', width: 1200, height: 750 }, { src: '/media/projects/shots/streamflix-2.webp', width: 1200, height: 750 }], next: 'yoru' },
    { slug: 'yoru', name: 'YORU', color: '#514c8b', ink: '#514c8b', iconFace: '/media/projects/yoru.svg', hero: '/media/projects/yoru-capture.jpg', tools: ['JavaScript', 'WebGL', 'API Odyssey'], url: 'https://yorumontparnasse.com', shots: [{ src: '/media/projects/shots/yoru-1.webp', width: 1200, height: 750 }, { src: '/media/projects/shots/yoru-2.webp', width: 1200, height: 750 }, { src: '/media/projects/shots/yoru-3.webp', width: 1200, height: 750 }], next: 'kanpai' },
    { slug: 'kanpai', name: 'Kanpai', color: '#9b7939', ink: '#7a5e26', iconFace: '/media/projects/kanpai-icon.webp', hero: '/media/projects/kanpai.webp', tools: ['React', 'TypeScript', 'Tailwind', 'GSAP'], url: 'https://www.kanpaiparis.fr', shots: [{ src: '/media/projects/shots/kanpai-1.webp', width: 1200, height: 750 }, { src: '/media/projects/shots/kanpai-2.webp', width: 1200, height: 750 }, { src: '/media/projects/shots/kanpai-3.webp', width: 1200, height: 750 }], next: 'carnival' },
    { slug: 'carnival', name: 'Carnival 17', color: '#2c3a78', ink: '#2c3a78', iconFace: '/media/projects/carnival-icon.webp', hero: '/media/projects/carnival-capture.jpg', tools: ['React', 'TypeScript', 'Tailwind', 'GSAP'], url: 'https://carnival17.sites.ody.app/', shots: [{ src: '/media/projects/shots/carnival-1.webp', width: 1200, height: 750 }, { src: '/media/projects/shots/carnival-2.webp', width: 1200, height: 750 }, { src: '/media/projects/shots/carnival-3.webp', width: 1200, height: 750 }], next: 'streamflix' },
  ],
  languages: ['Français', 'English · B1', '中文 · HSK 6'],
  skills,
} as const

import { siGithub } from 'simple-icons'
export function GithubIcon({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={siGithub.path}/></svg>
}

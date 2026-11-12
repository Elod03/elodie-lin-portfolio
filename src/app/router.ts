import { useEffect, useState } from 'react'

export function usePath(initialPath?: string) {
  const [path, setPath] = useState(initialPath ?? (typeof window === 'undefined' ? '/' : window.location.pathname))
  useEffect(() => {
    const update = () => { setPath(window.location.pathname); window.scrollTo(0, 0) }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]')
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href)
      if (url.origin !== location.origin || url.hash || /\.[a-z0-9]+$/i.test(url.pathname) || !['http:', 'https:'].includes(url.protocol)) return
      event.preventDefault()
      if (url.pathname !== location.pathname) history.pushState(null, '', url.pathname)
      update()
    }
    window.addEventListener('popstate', update)
    document.addEventListener('click', click)
    return () => { window.removeEventListener('popstate', update); document.removeEventListener('click', click) }
  }, [])
  return path
}

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { addGuestbookLine } from './store'
const copy = {
  fr: { title: 'Un petit mot au fil de l’eau', hint: 'Ton message reste dans ce navigateur.', send: 'Envoyer', placeholder: 'Laisse un mot sur l’eau…', sent: 'Ton message flotte maintenant sur l’eau.', error: 'Écris entre 1 et 60 caractères, sans insulte.', storage: 'Le navigateur ne permet pas de sauvegarder le message.' },
  en: { title: 'A little note on the water', hint: 'Your message stays in this browser.', send: 'Send', placeholder: 'Leave a note on the water…', sent: 'Your message is now floating on the water.', error: 'Write 1–60 characters, without profanity.', storage: 'Your browser could not save the message.' },
  zh: { title: '在水面上留句话', hint: '留言仅保存在此浏览器中。', send: '发送', placeholder: '留下一句话…', sent: '你的留言正在水面上漂浮。', error: '请输入1至60个字符，请文明留言。', storage: '浏览器无法保存留言。' },
}
/** The pill hangs from the cloud: centred under it, kept inside the viewport. */
function pillPosition(): CSSProperties {
  const cloud = document.querySelector<HTMLElement>('.object-cloud')
  const width = Math.min(380, innerWidth - 32)
  if (!cloud) return { top: '27svh', left: Math.max(16, innerWidth - width - 16) }
  const rect = cloud.getBoundingClientRect()
  return { top: Math.round(rect.bottom + 8), left: Math.round(Math.min(Math.max(16, rect.left + rect.width / 2 - width / 2), innerWidth - width - 16)) }
}
export function Guestbook({ lang, onClose, onSend }: { lang: keyof typeof copy; onClose: () => void; onSend: (line: string) => void }) {
  const c = copy[lang]
  const input = useRef<HTMLInputElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState(false)
  const [position, setPosition] = useState<CSSProperties>({ top: '27svh', right: 16 })
  useLayoutEffect(() => {
    const place = () => setPosition(pillPosition())
    place(); addEventListener('resize', place)
    return () => removeEventListener('resize', place)
  }, [])
  useEffect(() => {
    input.current?.focus()
    document.documentElement.dataset.guestbook = 'open'
    const outside = (event: PointerEvent) => {
      const target = event.target as Element
      if (!form.current?.contains(target) && !target.closest('.object-cloud')) onClose()
    }
    document.addEventListener('pointerdown', outside)
    return () => { delete document.documentElement.dataset.guestbook; document.removeEventListener('pointerdown', outside) }
  }, [])
  return <form ref={form} className="guestbook" style={position} aria-label={c.title} aria-describedby="guest-hint" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose() } }} onSubmit={e => {
    e.preventDefault()
    try {
      const line = addGuestbookLine(localStorage, message)
      onSend(line); setMessage(''); setError(false); setStatus(c.sent); input.current?.focus()
    } catch (err) { setError(true); setStatus(err instanceof Error && ['empty', 'too-long', 'profanity'].includes(err.message) ? c.error : c.storage) }
  }}>
    <label className="sr-only" htmlFor="guest-message">{c.title}</label>
    <input id="guest-message" ref={input} value={message} onChange={e => setMessage(e.target.value)} placeholder={c.placeholder} autoComplete="off"/>
    <button type="submit">{c.send}</button>
    <p id="guest-hint" className="sr-only">{c.hint}</p>
    <p role="status" className={error ? 'guestbook-note' : 'sr-only'}>{status}</p>
  </form>
}

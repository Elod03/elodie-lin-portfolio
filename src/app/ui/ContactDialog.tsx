import { useEffect, useRef, useState, type ReactNode } from 'react'
import { shared, type Lang } from '../../content'
import '../../styles/contact.css'
import { GithubIcon } from './GithubIcon'

const translations = {
  fr: { title: 'Et si on créait quelque chose ?', intro: 'Un projet, une idée ou simplement envie de discuter ? Voici où me trouver.', close: 'Fermer le contact', email: 'Mon adresse email', copy: 'Copier l’adresse', copied: 'Adresse copiée !', manual: 'Sélectionne l’adresse ci-dessus et copie-la avec ton clavier.', mail: 'Ouvrir ma messagerie', cv: 'Télécharger mon CV', code: 'Mes projets et mon code', network: 'Mon parcours professionnel', resume: 'PDF, version française' },
  en: { title: 'Let’s create something together.', intro: 'A project, an idea, or just a conversation? Here is where to find me.', close: 'Close contact', email: 'My email address', copy: 'Copy email', copied: 'Email copied!', manual: 'Select the address above and copy it using your keyboard.', mail: 'Open my email app', cv: 'Download my résumé', code: 'My projects and code', network: 'My professional background', resume: 'PDF, English version' },
  zh: { title: '一起创造点什么吧。', intro: '有项目、想法，或者只是想聊聊？欢迎通过以下方式联系我。', close: '关闭联系方式', email: '我的电子邮箱', copy: '复制邮箱', copied: '邮箱已复制！', manual: '请选中上面的邮箱地址，然后使用键盘复制。', mail: '打开邮件应用', cv: '下载我的简历', code: '我的项目和代码', network: '我的职业经历', resume: 'PDF，英文版' },
}
const glyph = (children: ReactNode) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
const linkedinIcon = glyph(<><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10.5V16M8 7.8v.01M12 16v-5.5M12 12.8c0-1.5 1-2.4 2.3-2.4s2.2.9 2.2 2.6V16" /></>)
const resumeIcon = glyph(<path d="M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h5M9.5 15.5h5" />)
const chevron = <svg className="contact-chevron" width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m1 1 6 6-6 6" /></svg>

/** Fenêtre Contact : une feuille ancrée sous l'en-tête (design-direction §4.7). `<dialog>` modal, focus rendu à la fermeture. */
export function ContactDialog({ lang, onClose, returnFocus }: { lang: Lang; onClose: () => void; returnFocus: HTMLElement | null }) {
  const copy = translations[lang]
  const dialog = useRef<HTMLDialogElement>(null), close = useRef<HTMLButtonElement>(null), email = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal(); close.current?.focus()
    return () => {
      element.close(); document.body.style.overflow = previousOverflow
      const target = returnFocus?.isConnected && returnFocus.getClientRects().length ? returnFocus : document.querySelector<HTMLButtonElement>('.menu-toggle')
      target?.focus({ preventScroll: true })
    }
  }, [returnFocus])
  async function copyEmail() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(shared.email); setStatus(copy.copied)
    } catch {
      email.current?.focus(); email.current?.select()
      try {
        if (document.execCommand('copy')) { setStatus(copy.copied); return }
      } catch { /* Keep the selected email visible for manual copying. */ }
      setStatus(copy.manual)
    }
  }
  const rows = [
    { href: shared.github, icon: <GithubIcon size={22} />, name: 'GitHub', note: copy.code, external: true },
    { href: shared.linkedin, icon: linkedinIcon, name: 'LinkedIn', note: copy.network, external: true },
    { href: `/cv/elodie-lin-cv-${lang === 'fr' ? 'fr' : 'en'}.pdf`, icon: resumeIcon, name: copy.cv, note: copy.resume, external: true, download: `elodie-lin-cv-${lang === 'fr' ? 'fr' : 'en'}.pdf` },
  ]
  return <dialog ref={dialog} className="contact-dialog" aria-modal="true" aria-labelledby="contact-title" aria-describedby="contact-intro" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose()
  }}>
    <button ref={close} className="contact-close" type="button" onClick={onClose} aria-label={copy.close}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
    <h2 id="contact-title">{copy.title}</h2>
    <p id="contact-intro">{copy.intro}</p>
    <div className="contact-email">
      <label className="sr-only" htmlFor="contact-email">{copy.email}</label>
      <input id="contact-email" ref={email} readOnly value={shared.email} spellCheck={false} />
      <div className="contact-email-actions">
        <button className="btn-solid" type="button" onClick={() => void copyEmail()}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12" rx="2.5" /><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" /></svg>{copy.copy}</button>
        <a href={`mailto:${shared.email}`}>{copy.mail}</a>
      </div>
      <p className="contact-status" role="status">{status}</p>
    </div>
    <ul className="contact-rows">{rows.map(row => <li key={row.name}><a href={row.href} download={'download' in row ? row.download : undefined} target="_blank" rel="noopener noreferrer"><span className="contact-row-icon">{row.icon}</span><span className="contact-row-text"><strong>{row.name}</strong><span>{row.note}</span></span>{chevron}</a></li>)}</ul>
  </dialog>
}

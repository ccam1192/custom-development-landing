import { useEffect } from 'react'

interface PageMeta {
  title: string
  description: string
  ogTitle?: string
  ogDescription?: string
  ogUrl?: string
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export function usePageMeta({ title, description, ogTitle, ogDescription, ogUrl }: PageMeta) {
  useEffect(() => {
    document.title = title
    setMetaTag('name', 'description', description)
    setMetaTag('property', 'og:title', ogTitle ?? title)
    setMetaTag('property', 'og:description', ogDescription ?? description)
    setMetaTag('name', 'twitter:title', ogTitle ?? title)
    setMetaTag('name', 'twitter:description', ogDescription ?? description)
    if (ogUrl) {
      setMetaTag('property', 'og:url', ogUrl)
    }
  }, [title, description, ogTitle, ogDescription, ogUrl])
}

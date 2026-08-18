import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { isCustomDevelopmentPath, PATHS } from '../config'

interface SiteHashLinkProps {
  hash: `#${string}`
  className?: string
  onClick?: () => void
  children: ReactNode
}

export default function SiteHashLink({ hash, className, onClick, children }: SiteHashLinkProps) {
  const { pathname } = useLocation()

  if (isCustomDevelopmentPath(pathname)) {
    return (
      <a href={hash} className={className} onClick={onClick}>
        {children}
      </a>
    )
  }

  return (
    <Link to={`${PATHS.customDevelopment}${hash}`} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}

import { useEffect, useRef, useState } from 'react'

const HS_SCRIPT_SRC = 'https://js-na2.hsforms.net/forms/embed/244917625.js'
const HS_FORM_ID = '92775519-ef14-413c-ab7d-cdbdf7001e5a'
const HS_PORTAL_ID = '244917625'
const HS_REGION = 'na2'

function loadHubSpotScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${HS_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('HubSpot script failed')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = HS_SCRIPT_SRC
    script.defer = true
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true'
      resolve()
    })
    script.addEventListener('error', () => reject(new Error('HubSpot script failed')))
    document.body.appendChild(script)
  })
}

function hasRenderedForm(root: HTMLElement) {
  return Boolean(
    root.querySelector('iframe, form, .hs-form, .submitted-message'),
  )
}

export default function HubSpotForm({ formId = HS_FORM_ID }: { formId?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showPlaceholder, setShowPlaceholder] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined
    let observer: MutationObserver | undefined
    const root = containerRef.current

    const markLoaded = () => {
      if (!cancelled) setShowPlaceholder(false)
    }

    if (root) {
      observer = new MutationObserver(() => {
        if (hasRenderedForm(root)) markLoaded()
      })
      observer.observe(root, { childList: true, subtree: true })
    }

    loadHubSpotScript()
      .then(() => {
        if (cancelled || !root) return
        if (hasRenderedForm(root)) {
          markLoaded()
          return
        }
        // If HubSpot never injects (blocked / local quirks), show a preview shell.
        timeoutId = window.setTimeout(() => {
          if (!cancelled && root && !hasRenderedForm(root)) {
            setShowPlaceholder(true)
          }
        }, 2800)
      })
      .catch(() => {
        if (!cancelled) setShowPlaceholder(true)
      })

    return () => {
      cancelled = true
      if (timeoutId) window.clearTimeout(timeoutId)
      observer?.disconnect()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      id="conversion-form-container"
      className="hs-form-wrapper relative w-full"
      data-conversion-target="hubspot-form"
    >
      {/* Exact HubSpot embed — IDs must not change */}
      <div
        className="hs-form-frame"
        data-region={HS_REGION}
        data-form-id={formId}
        data-portal-id={HS_PORTAL_ID}
      />

      {showPlaceholder && (
        <div
          className="mt-1 flex flex-col justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-6"
          aria-hidden="true"
        >
          <div className="space-y-1.5">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-lg border border-gray-200 bg-white" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-gray-200" />
            <div className="h-10 w-full rounded-lg border border-gray-200 bg-white" />
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-gray-200" />
            <div className="h-24 w-full rounded-lg border border-gray-200 bg-white" />
          </div>
          <div className="h-11 w-full rounded-lg bg-primary/80" />
          <p className="text-center text-xs text-gray-400">
            HubSpot form loads when scripts are available
          </p>
        </div>
      )}
    </div>
  )
}

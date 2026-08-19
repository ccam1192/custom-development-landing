const logoClass =
  'flex items-center justify-center gap-2.5 text-gray-400 hover:text-gray-500 transition-colors'

function NissanLogo() {
  return (
    <div className={logoClass} title="Nissan">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="2.25" />
        <path d="M4 16h24" stroke="currentColor" strokeWidth="2.25" />
      </svg>
      <span className="text-[15px] font-semibold tracking-[0.28em]">NISSAN</span>
    </div>
  )
}

function JPMorganChaseLogo() {
  return (
    <div className={logoClass} title="JPMorgan Chase">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <polygon
          points="10,2.5 22,2.5 29.5,10 29.5,22 22,29.5 10,29.5 2.5,22 2.5,10"
          fill="currentColor"
        />
      </svg>
      <span className="text-[13px] font-semibold tracking-wide leading-tight">
        JPMORGAN
        <span className="block text-[11px] tracking-[0.18em] font-medium">CHASE</span>
      </span>
    </div>
  )
}

function PGLogo() {
  return (
    <div className={logoClass} title="P&G">
      <span className="text-[26px] font-semibold tracking-tight leading-none">P&amp;G</span>
    </div>
  )
}

function LockheedMartinLogo() {
  return (
    <div className={logoClass} title="Lockheed Martin">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
        <path
          d="M16 2.5 18.2 13.8 30 16 18.2 18.2 16 29.5 13.8 18.2 2 16 13.8 13.8Z"
          fill="currentColor"
        />
      </svg>
      <span className="text-[11px] font-semibold tracking-[0.16em] leading-tight">
        LOCKHEED
        <span className="block tracking-[0.12em]">MARTIN</span>
      </span>
    </div>
  )
}

function PfizerLogo() {
  return (
    <div className={logoClass} title="Pfizer">
      <span className="text-[22px] font-semibold italic tracking-tight leading-none">Pfizer</span>
    </div>
  )
}

const logos = [
  { name: 'Nissan', Logo: NissanLogo },
  { name: 'JPMorgan Chase', Logo: JPMorganChaseLogo },
  { name: 'P&G', Logo: PGLogo },
  { name: 'Lockheed Martin', Logo: LockheedMartinLogo },
  { name: 'Pfizer', Logo: PfizerLogo },
]

export default function ClientLogos() {
  return (
    <div className="mt-16 pt-10 border-t border-gray-200/70">
      <p className="text-center text-xs font-semibold tracking-widest text-gray-400 uppercase mb-8">
        Enterprise implementation experience includes
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-8 sm:gap-x-14">
        {logos.map(({ name, Logo }) => (
          <div key={name} role="img" aria-label={name}>
            <Logo />
          </div>
        ))}
      </div>
    </div>
  )
}

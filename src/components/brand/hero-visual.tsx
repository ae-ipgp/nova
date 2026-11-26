import { t } from '@/i18n'
/**
 * Hero visual — a restrained, abstract "document stack" built from layered
 * panels and the NoVA node. One visual moment for the landing page only;
 * workspace screens must not use illustrations (Blueprint §03).
 */
export function HeroVisual({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 420 420" className={className} role="img" aria-label={t('Ilustrasi abstrak susunan dokumen NoVA')}>
      <defs>
        <linearGradient id="hv-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dcebfa" />
        </linearGradient>
        <linearGradient id="hv-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2c86d9" />
          <stop offset="1" stopColor="#1769aa" />
        </linearGradient>
        <radialGradient id="hv-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2c86d9" stopOpacity="0.45" />
          <stop offset="1" stopColor="#2c86d9" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="230" cy="200" r="190" fill="url(#hv-glow)" />

      {/* Back panel */}
      <g transform="translate(150 60) rotate(8)">
        <rect width="200" height="260" rx="22" fill="#1b3d63" stroke="rgb(255 255 255 / 0.12)" />
        <rect x="24" y="34" width="110" height="8" rx="4" fill="rgb(255 255 255 / 0.18)" />
        <rect x="24" y="54" width="150" height="6" rx="3" fill="rgb(255 255 255 / 0.10)" />
        <rect x="24" y="68" width="130" height="6" rx="3" fill="rgb(255 255 255 / 0.10)" />
      </g>

      {/* Middle panel */}
      <g transform="translate(110 90) rotate(-4)">
        <rect width="210" height="270" rx="22" fill="url(#hv-blue)" />
        <rect x="24" y="30" width="70" height="20" rx="10" fill="rgb(255 255 255 / 0.18)" />
        <rect x="24" y="70" width="160" height="7" rx="3.5" fill="rgb(255 255 255 / 0.35)" />
        <rect x="24" y="86" width="140" height="7" rx="3.5" fill="rgb(255 255 255 / 0.25)" />
        <rect x="24" y="102" width="150" height="7" rx="3.5" fill="rgb(255 255 255 / 0.25)" />
      </g>

      {/* Front document */}
      <g transform="translate(70 130)">
        <rect width="220" height="250" rx="22" fill="url(#hv-panel)" />
        <path d="M34 40v58h12V62l30 36h12V40H76v36L46 40z" fill="#102d4f" />
        <circle cx="104" cy="92" r="7" fill="#2c86d9" />
        <rect x="34" y="128" width="152" height="7" rx="3.5" fill="#d9e2ec" />
        <rect x="34" y="144" width="128" height="7" rx="3.5" fill="#d9e2ec" />
        <rect x="34" y="160" width="140" height="7" rx="3.5" fill="#d9e2ec" />
        <rect x="34" y="196" width="96" height="26" rx="13" fill="#e3f2e9" />
        <circle cx="50" cy="209" r="4" fill="#2f7d4f" />
        <rect x="60" y="205" width="56" height="8" rx="4" fill="#2f7d4f" opacity="0.6" />
      </g>

      {/* Floating chip */}
      <g transform="translate(250 330)">
        <rect width="150" height="44" rx="22" fill="#ffffff" />
        <circle cx="22" cy="22" r="10" fill="#dcebfa" />
        <path d="M17 22l3.5 3.5L27 19" stroke="#1769aa" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="42" y="14" width="88" height="7" rx="3.5" fill="#102d4f" opacity="0.8" />
        <rect x="42" y="26" width="60" height="5" rx="2.5" fill="#63758a" opacity="0.5" />
      </g>

      {/* Champagne accent node — restricted use */}
      <circle cx="350" cy="88" r="6" fill="#d4b77a" />
    </svg>
  )
}

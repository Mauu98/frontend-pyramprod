import { useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Reference images (1 medida) ───────────────────────────────────────────────
import barras from '@/assets/materials/barras.jpg'
import rollos from '@/assets/materials/rollos.jpg'
import flejes from '@/assets/materials/flejes.jpg'
import listones from '@/assets/materials/listones.jpg'
import tiras from '@/assets/materials/tiras.jpg'
import cintas from '@/assets/materials/cintas.jpg'
import cadenas from '@/assets/materials/cadenas.jpg'
import cables from '@/assets/materials/cables.jpg'

// ─── Reference images (2 medidas) ──────────────────────────────────────────────
import chapas from '@/assets/materials/chapas.jpg'
import planchas from '@/assets/materials/planchas.jpg'
import hojas from '@/assets/materials/hojas.jpg'
import mallas from '@/assets/materials/mallas.jpg'
import placas from '@/assets/materials/placas.jpg'
import rejillas from '@/assets/materials/rejillas.jpg'

// ─── Reference images (3 medidas) ──────────────────────────────────────────────
import bloques from '@/assets/materials/bloques.jpg'
import liquidos from '@/assets/materials/líquidos.jpg'
import gases from '@/assets/materials/gases.jpg'
import polvos from '@/assets/materials/polvos.jpg'
import aridos from '@/assets/materials/áridos.jpg'
import plasticos from '@/assets/materials/plásticos.jpg'
import gelesypastas from '@/assets/materials/gelesypastas.jpg'
import virutas from '@/assets/materials/virutas.jpg'

export type MaterialWeightGroup = 'Mm.' | 'Mm2.' | 'Mm3.'

interface MaterialRefItem {
  key:   string
  label: string
  src:   string
}

const GROUPS: { value: MaterialWeightGroup; tabLabel: string; items: MaterialRefItem[] }[] = [
  {
    value: 'Mm.',
    tabLabel: '1 medida',
    items: [
      { key: 'barras',   label: 'Barras',   src: barras },
      { key: 'rollos',   label: 'Rollos',   src: rollos },
      { key: 'flejes',   label: 'Flejes',   src: flejes },
      { key: 'listones', label: 'Listones', src: listones },
      { key: 'tiras',    label: 'Tiras',    src: tiras },
      { key: 'cintas',   label: 'Cintas',   src: cintas },
      { key: 'cadenas',  label: 'Cadenas',  src: cadenas },
      { key: 'cables',   label: 'Cables',   src: cables },
    ],
  },
  {
    value: 'Mm2.',
    tabLabel: '2 medidas',
    items: [
      { key: 'chapas',   label: 'Chapas',            src: chapas },
      { key: 'planchas', label: 'Planchas',           src: planchas },
      { key: 'hojas',    label: 'Hojas',              src: hojas },
      { key: 'mallas',   label: 'Mallas metálicas',   src: mallas },
      { key: 'placas',   label: 'Placas',             src: placas },
      { key: 'rejillas', label: 'Rejillas',           src: rejillas },
    ],
  },
  {
    value: 'Mm3.',
    tabLabel: '3 medidas',
    items: [
      { key: 'bloques',       label: 'Bloques para mecanizar',  src: bloques },
      { key: 'liquidos',      label: 'Líquidos',                src: liquidos },
      { key: 'gases',         label: 'Gases',                   src: gases },
      { key: 'polvos',        label: 'Polvos',                  src: polvos },
      { key: 'aridos',        label: 'Áridos a granel',         src: aridos },
      { key: 'plasticos',     label: 'Plásticos a granel',      src: plasticos },
      { key: 'gelesypastas',  label: 'Geles viscosos y pastas', src: gelesypastas },
      { key: 'virutas',       label: 'Virutas y aglomerados',   src: virutas },
    ],
  },
]

/**
 * Tabbed gallery of reference materials that map onto the three
 * `weightMethod` sub-options (Mm. / Mm2. / Mm3.) of "Método 1".
 * Each tab renders its items as a 3-column grid.
 * Clicking a thumbnail selects the corresponding weight method.
 */
export function MaterialReferenceGallery({ onSelect }: { onSelect: (method: MaterialWeightGroup) => void }) {
  const [active, setActive] = useState<MaterialWeightGroup>('Mm.')
  const group = GROUPS.find(g => g.value === active) ?? GROUPS[0]

  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-[#344054]">Materiales de referencia:</p>

      <div className="mb-3 flex gap-1.5">
        {GROUPS.map(g => (
          <button
            key={g.value}
            type="button"
            onClick={() => setActive(g.value)}
            className={cn(
              'rounded-full px-3 py-1 text-[12px] font-medium transition',
              active === g.value
                ? 'bg-[#2C6B2F] text-white'
                : 'border border-[#E4E7EC] text-[#344054] hover:bg-[#F9FAFB]',
            )}
          >
            {g.tabLabel}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-[10px]">
        {group.items.map(it => (
          <button
            key={it.key}
            type="button"
            onClick={() => onSelect(group.value)}
            title={it.label}
            className="flex flex-col items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white p-2 text-center transition hover:border-[#2C6B2F]/40 hover:bg-[#2C6B2F]/5 active:scale-95"
          >
            <img src={it.src} alt={it.label} className="h-[96px] w-full rounded object-cover" />
            <span className="text-xs leading-tight text-[#344054]">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

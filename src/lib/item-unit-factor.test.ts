import { describe, expect, it } from 'vitest'
import { computeUnitFactor, type ItemFactorContext } from './item-unit-factor'

const kgGr = { fromUnit: 'Kg.', toUnit: 'Gr.', factor: 1000 }

const mmItem = (dim: number, weight: number): ItemFactorContext => ({
  equivalencies: [kgGr],
  dimUnit: 'Mm.',
  dimProduct: dim,
  weight,
})

describe('computeUnitFactor', () => {
  const ctx250 = mmItem(250, 12.4000107)

  it('returns 1 for identical units', () => {
    expect(computeUnitFactor('Kg.', 'Kg.', ctx250)).toBe(1)
  })

  it('Und -> Gr. goes through weight and the Kg./Gr. equivalency', () => {
    expect(computeUnitFactor('Und', 'Gr.', ctx250)).toBe(12400.0107)
  })

  it('Und -> Mm. is the dimension product', () => {
    expect(computeUnitFactor('Und', 'Mm.', ctx250)).toBe(250)
  })

  it('Kg. -> Mm. traverses the item edges in reverse then forward', () => {
    expect(computeUnitFactor('Kg.', 'Mm.', ctx250)).toBe(20.16127293)
  })

  it('Gr. -> Mm. chains an inverse equivalency', () => {
    expect(computeUnitFactor('Gr.', 'Mm.', ctx250)).toBe(0.02016127)
  })

  it('keeps Kg. -> Mm. stable when the length changes proportionally (275 Mm)', () => {
    expect(computeUnitFactor('Kg.', 'Mm.', mmItem(275, 13.64001177))).toBe(20.16127293)
  })

  it('uses a company equivalency M. -> Mm. combined with the item edge', () => {
    const ctx: ItemFactorContext = { ...ctx250, equivalencies: [kgGr, { fromUnit: 'M.', toUnit: 'Mm.', factor: 1000 }] }
    expect(computeUnitFactor('M.', 'Mm.', ctx)).toBe(1000)
  })

  it('Und -> Mm2. for a Mm2. class (2440 x 1220)', () => {
    const ctx: ItemFactorContext = { equivalencies: [], dimUnit: 'Mm2.', dimProduct: 2440 * 1220, weight: null }
    expect(computeUnitFactor('Und', 'Mm2.', ctx)).toBe(2976800)
  })

  it('returns null for an unknown pair', () => {
    expect(computeUnitFactor('Und', 'Lts.', ctx250)).toBeNull()
  })

  it('ignores edges with non-positive factors', () => {
    const ctx: ItemFactorContext = { equivalencies: [{ fromUnit: 'A', toUnit: 'B', factor: 0 }] }
    expect(computeUnitFactor('A', 'B', ctx)).toBeNull()
    expect(computeUnitFactor('Und', 'Kg.', { equivalencies: [], weight: 0 })).toBeNull()
  })

  it('omits the dimension edge when there is no dimUnit', () => {
    const ctx: ItemFactorContext = { equivalencies: [], dimUnit: null, dimProduct: 250, weight: 2 }
    expect(computeUnitFactor('Und', 'Kg.', ctx)).toBe(2)
    expect(computeUnitFactor('Und', 'Mm.', ctx)).toBeNull()
  })

  it('an exact forward row wins over its inconsistent inverse', () => {
    const ctx: ItemFactorContext = {
      equivalencies: [{ fromUnit: 'A', toUnit: 'B', factor: 2 }, { fromUnit: 'B', toUnit: 'A', factor: 0.4 }],
    }
    expect(computeUnitFactor('A', 'B', ctx)).toBe(2)
    expect(computeUnitFactor('B', 'A', ctx)).toBe(0.4)
  })

  it('item edges are explored before company edges', () => {
    const ctx: ItemFactorContext = {
      equivalencies: [
        { fromUnit: 'Und', toUnit: 'Caja', factor: 10 },
        { fromUnit: 'Caja', toUnit: 'X', factor: 3 },
        { fromUnit: 'Mm.', toUnit: 'X', factor: 2 },
      ],
      dimUnit: 'Mm.',
      dimProduct: 5,
    }
    expect(computeUnitFactor('Und', 'X', ctx)).toBe(10)
  })

  describe('specific-weight formula (volume edge)', () => {
    // Planchuela 1"x1/8": section 81.28 Mm2. fixed in the class, item length 6000 Mm., sw 7850 Kg/M3.
    const volEqs = [
      kgGr,
      { fromUnit: 'M3.', toUnit: 'Mm3.', factor: 1e9 },
      { fromUnit: 'M3.', toUnit: 'Lts.', factor: 1000 },
    ]
    const bar: ItemFactorContext = {
      equivalencies: volEqs, dimUnit: 'Mm.', dimProduct: 6000, weight: 3.828288, volume: 6000 * 81.28,
    }

    it('Und -> Mm3. is the item volume', () => {
      expect(computeUnitFactor('Und', 'Mm3.', bar)).toBe(487680)
    })

    it('Und -> Lts. chains the inverse M3./Mm3. row and M3./Lts.', () => {
      expect(computeUnitFactor('Und', 'Lts.', bar)).toBe(0.48768)
    })

    it('Kg. -> M3. is the inverse specific weight', () => {
      expect(computeUnitFactor('Kg.', 'M3.', bar)).toBe(0.00012739)
    })

    it('Gr. -> Lts. converts weight and volume units on both sides', () => {
      expect(computeUnitFactor('Gr.', 'Lts.', bar)).toBe(0.00012739)
    })

    it('Lts. -> Mm. solves the length from the volume', () => {
      expect(computeUnitFactor('Lts.', 'Mm.', bar)).toBe(12303.1496063)
    })

    it('no volume edge without a volume', () => {
      expect(computeUnitFactor('Und', 'Lts.', { ...bar, volume: null })).toBeNull()
    })

    it('a Mm3. class keeps a single Und -> Mm3. edge from its boxes', () => {
      const ctx: ItemFactorContext = { equivalencies: volEqs, dimUnit: 'Mm3.', dimProduct: 500, weight: null, volume: 500 }
      expect(computeUnitFactor('Und', 'Lts.', ctx)).toBe(0.0005)
    })
  })
})

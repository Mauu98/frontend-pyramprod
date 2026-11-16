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
})

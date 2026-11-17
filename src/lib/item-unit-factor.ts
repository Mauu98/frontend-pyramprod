/**
 * Unit conversion factor engine for items ("1 <provision> equivale a F <consumption>").
 *
 * Generalizes the legacy cambi_med algorithm to a conversion graph: nodes are unit names,
 * edges are company equivalencies plus the item-specific edges of the specific-weight formula
 * (weight = specific weight x volume): its dimension product, its volume and its weight.
 * Any weight unit reaches Kg. and any volume unit reaches Mm3. through company equivalencies.
 * The factor is the product of edge factors along a BFS path.
 */

export interface UnitEquivalency {
  id?: number
  /** 1 fromUnit = factor toUnit */
  fromUnit: string
  toUnit: string
  factor: number
}

export interface ItemFactorContext {
  /** Company equivalencies (GET /api/measures/equivalencies). */
  equivalencies: readonly UnitEquivalency[]
  /** Unit of the product of the active dimension boxes (Mm./Mm2./Mm3.), if any. */
  dimUnit?: string | null
  /** Product of the active dimension boxes (1 Und = dimProduct dimUnit). */
  dimProduct?: number | null
  /** Item weight in Kg. (1 Und = weight Kg.). */
  weight?: number | null
  /** Item volume in Mm3. (1 Und = volume Mm3.): dimension product x the class fixed dimension. */
  volume?: number | null
}

export const FACTOR_DECIMALS = 8
const ITEM_UNIT = 'Und'
const WEIGHT_UNIT = 'Kg.'
const VOLUME_UNIT = 'Mm3.'

export function roundFactor(value: number): number {
  return Number(value.toFixed(FACTOR_DECIMALS))
}

interface Edge { to: string; factor: number }

/**
 * Adjacency with legacy cambi_med priority per node: item edges (Und<->dimUnit, Und<->Kg., Und<->Mm3.) first,
 * then forward company rows, then inverted company rows.
 */
function buildGraph(ctx: ItemFactorContext): Map<string, Edge[]> {
  const itemEdges = new Map<string, Edge[]>()
  const forward = new Map<string, Edge[]>()
  const inverted = new Map<string, Edge[]>()
  const push = (m: Map<string, Edge[]>, k: string, e: Edge) => m.set(k, [...(m.get(k) ?? []), e])
  const valid = (from: string, to: string, factor: number | null | undefined): factor is number =>
    factor != null && Number.isFinite(factor) && factor > 0 && !!from && !!to && from !== to

  for (const e of ctx.equivalencies) {
    if (!valid(e.fromUnit, e.toUnit, e.factor)) continue
    push(forward, e.fromUnit, { to: e.toUnit, factor: e.factor })
    push(inverted, e.toUnit, { to: e.fromUnit, factor: 1 / e.factor })
  }
  const linkItem = (from: string, to: string, factor: number | null | undefined) => {
    if (!valid(from, to, factor)) return
    push(itemEdges, from, { to, factor })
    push(itemEdges, to, { to: from, factor: 1 / factor })
  }
  if (ctx.dimUnit) linkItem(ITEM_UNIT, ctx.dimUnit, ctx.dimProduct)
  linkItem(ITEM_UNIT, WEIGHT_UNIT, ctx.weight)
  // A Mm3. class already links Und<->Mm3. through its dimension product, which equals its volume.
  if (ctx.dimUnit !== VOLUME_UNIT) linkItem(ITEM_UNIT, VOLUME_UNIT, ctx.volume)

  const graph = new Map<string, Edge[]>()
  const units = new Set([...itemEdges.keys(), ...forward.keys(), ...inverted.keys()])
  for (const u of units) {
    graph.set(u, [...(itemEdges.get(u) ?? []), ...(forward.get(u) ?? []), ...(inverted.get(u) ?? [])])
  }
  return graph
}

/**
 * Factor F such that 1 `from` = F `to`, rounded to 8 decimals, or null when no path exists.
 */
export function computeUnitFactor(from: string, to: string, ctx: ItemFactorContext): number | null {
  if (!from || !to) return null
  if (from === to) return 1
  // Legacy: an exact forward company row wins even when the table is inconsistent with its inverse.
  const direct = ctx.equivalencies.find(e => e.fromUnit === from && e.toUnit === to && e.factor > 0)
  if (direct) return roundFactor(direct.factor)
  const graph = buildGraph(ctx)
  const visited = new Set<string>([from])
  const queue: Array<{ unit: string; factor: number }> = [{ unit: from, factor: 1 }]
  for (let i = 0; i < queue.length; i++) {
    const { unit, factor } = queue[i]
    for (const edge of graph.get(unit) ?? []) {
      if (visited.has(edge.to)) continue
      const next = factor * edge.factor
      if (edge.to === to) return roundFactor(next)
      visited.add(edge.to)
      queue.push({ unit: edge.to, factor: next })
    }
  }
  return null
}

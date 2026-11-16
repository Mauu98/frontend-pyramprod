import { useQuery } from '@tanstack/react-query'
import { catalogService } from '@/services/catalog.service'

export function useMeasures() {
  return useQuery({ queryKey: ['measures'], queryFn: catalogService.getMeasures })
}

export function useUnitEquivalencies() {
  return useQuery({
    queryKey: ['measure-equivalencies'],
    queryFn: catalogService.getEquivalencies,
    // Equivalencies are edited elsewhere; always refetch on mount so a just-added one is used.
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

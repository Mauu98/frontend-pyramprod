import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { apiClient } from '@/lib/api-client'
import type { Segment } from '@/types/api.types'
import { Tag } from 'lucide-react'

const columns: ColumnDef<Segment>[] = [
  { accessorKey: 'code', header: 'Código', size: 80 },
  { accessorKey: 'name', header: 'Nombre' },
  { accessorKey: 'abbreviation', header: 'Abreviatura', size: 120 },
  {
    accessorKey: 'description',
    header: 'Descripción',
    cell: ({ getValue }) => (getValue() as string | null) ?? '—',
  },
]

export function CategoriesPage() {
  const { data: segments = [], isLoading, isError } = useQuery({
    queryKey: ['segments'],
    queryFn: () => apiClient.get<Segment[]>('/segments').then((r) => r.data),
  })

  const table = useReactTable({
    data: segments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag size={18} className="text-primary" />
          <h1 className="text-base font-semibold">Codificación</h1>
          <span className="text-muted text-sm">/ Segmentos</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-medium">Segmentos ({segments.length})</h2>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-16 text-muted text-sm">
              Cargando...
            </div>
          )}

          {isError && (
            <div className="flex items-center justify-center py-16 text-destructive text-sm">
              Error al cargar segmentos
            </div>
          )}

          {!isLoading && !isError && (
            <table className="w-full text-sm">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border bg-slate-50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-4 py-2.5 text-left text-xs font-medium text-muted uppercase tracking-wide"
                        style={{ width: header.getSize() }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-10 text-center text-muted">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2.5 text-foreground">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

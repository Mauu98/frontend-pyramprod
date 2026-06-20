import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

export const Tabs = TabsPrimitive.Root
export const TabsList = ({ className, ...props }: TabsPrimitive.TabsListProps) => (
  <TabsPrimitive.List
    className={cn('inline-flex items-center border-b border-border w-full gap-0', className)}
    {...props}
  />
)
export const TabsTrigger = ({ className, ...props }: TabsPrimitive.TabsTriggerProps) => (
  <TabsPrimitive.Trigger
    className={cn(
      'px-4 py-2.5 text-sm font-medium border-b-2 border-transparent -mb-px transition-colors',
      'text-muted hover:text-foreground',
      'data-[state=active]:border-primary data-[state=active]:text-primary',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
      className,
    )}
    {...props}
  />
)
export const TabsContent = TabsPrimitive.Content

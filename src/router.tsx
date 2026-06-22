import { createRouter, createRoute, createRootRoute, redirect } from '@tanstack/react-router'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { CodificacionPage } from '@/pages/catalog/CodificacionPage'
import { ItemFichaPage } from '@/pages/catalog/ItemFichaPage'
import { MedidasPage } from '@/pages/catalog/MedidasPage'
import { StockPage } from '@/pages/stock/StockPage'
import { ProductionPage } from '@/pages/production/ProductionPage'
import { useAuthStore } from '@/stores/auth.store'

const rootRoute = createRootRoute()

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/app',
  component: AppLayout,
  beforeLoad: () => {
    if (!useAuthStore.getState().isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

const catalogRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/catalog',
  component: CodificacionPage,
})

const measuresRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/measures',
  component: MedidasPage,
})

const itemDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/catalog/items/$itemId',
  component: () => {
    const { itemId } = itemDetailRoute.useParams()
    return <ItemFichaPage itemId={Number(itemId)} />
  },
})

const stockRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/stock',
  component: StockPage,
})

const productionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/production',
  component: ProductionPage,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: useAuthStore.getState().isAuthenticated() ? '/app/catalog' : '/login' })
  },
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  appRoute.addChildren([catalogRoute, itemDetailRoute, measuresRoute, stockRoute, productionRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

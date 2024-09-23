/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

import { createFileRoute } from '@tanstack/react-router'

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as RosterImport } from './routes/roster'

// Create Virtual Routes

const StationsLazyImport = createFileRoute('/stations')()
const SettingsLazyImport = createFileRoute('/settings')()
const LogsLazyImport = createFileRoute('/logs')()
const HelpLazyImport = createFileRoute('/help')()
const ExportLazyImport = createFileRoute('/export')()
const IndexLazyImport = createFileRoute('/')()

// Create/Update Routes

const StationsLazyRoute = StationsLazyImport.update({
  path: '/stations',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/stations.lazy').then((d) => d.Route))

const SettingsLazyRoute = SettingsLazyImport.update({
  path: '/settings',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/settings.lazy').then((d) => d.Route))

const LogsLazyRoute = LogsLazyImport.update({
  path: '/logs',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/logs.lazy').then((d) => d.Route))

const HelpLazyRoute = HelpLazyImport.update({
  path: '/help',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/help.lazy').then((d) => d.Route))

const ExportLazyRoute = ExportLazyImport.update({
  path: '/export',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/export.lazy').then((d) => d.Route))

const RosterRoute = RosterImport.update({
  path: '/roster',
  getParentRoute: () => rootRoute,
} as any)

const IndexLazyRoute = IndexLazyImport.update({
  path: '/',
  getParentRoute: () => rootRoute,
} as any).lazy(() => import('./routes/index.lazy').then((d) => d.Route))

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexLazyImport
      parentRoute: typeof rootRoute
    }
    '/roster': {
      id: '/roster'
      path: '/roster'
      fullPath: '/roster'
      preLoaderRoute: typeof RosterImport
      parentRoute: typeof rootRoute
    }
    '/export': {
      id: '/export'
      path: '/export'
      fullPath: '/export'
      preLoaderRoute: typeof ExportLazyImport
      parentRoute: typeof rootRoute
    }
    '/help': {
      id: '/help'
      path: '/help'
      fullPath: '/help'
      preLoaderRoute: typeof HelpLazyImport
      parentRoute: typeof rootRoute
    }
    '/logs': {
      id: '/logs'
      path: '/logs'
      fullPath: '/logs'
      preLoaderRoute: typeof LogsLazyImport
      parentRoute: typeof rootRoute
    }
    '/settings': {
      id: '/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof SettingsLazyImport
      parentRoute: typeof rootRoute
    }
    '/stations': {
      id: '/stations'
      path: '/stations'
      fullPath: '/stations'
      preLoaderRoute: typeof StationsLazyImport
      parentRoute: typeof rootRoute
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  IndexLazyRoute,
  RosterRoute,
  ExportLazyRoute,
  HelpLazyRoute,
  LogsLazyRoute,
  SettingsLazyRoute,
  StationsLazyRoute,
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/roster",
        "/export",
        "/help",
        "/logs",
        "/settings",
        "/stations"
      ]
    },
    "/": {
      "filePath": "index.lazy.tsx"
    },
    "/roster": {
      "filePath": "roster.tsx"
    },
    "/export": {
      "filePath": "export.lazy.tsx"
    },
    "/help": {
      "filePath": "help.lazy.tsx"
    },
    "/logs": {
      "filePath": "logs.lazy.tsx"
    },
    "/settings": {
      "filePath": "settings.lazy.tsx"
    },
    "/stations": {
      "filePath": "stations.lazy.tsx"
    }
  }
}
ROUTE_MANIFEST_END */

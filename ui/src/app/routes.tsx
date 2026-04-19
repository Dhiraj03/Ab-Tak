import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { HomePage } from '../pages/home-page'
import { ObservabilityPage } from '../pages/observability-page'
import { LivePage } from '../pages/live-page'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'observability',
        element: <ObservabilityPage />,
      },
    ],
  },
  {
    path: '/live',
    element: <LivePage />,
  },
])

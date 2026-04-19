import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { HomePage } from '../pages/home-page'
import { ObservabilityPage } from '../pages/observability-page'
import { LivePage } from '../pages/live-page'
import { EvalPage } from '../pages/eval-page'

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
      {
        path: 'eval',
        element: <EvalPage />,
      },
    ],
  },
  {
    path: '/live',
    element: <LivePage />,
  },
])

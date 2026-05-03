import React from 'react'
import { createRoot } from 'react-dom/client'
import { Harness } from './Harness'
// @ts-expect-error CSS side-effect import has no type declarations
import '@agentskit/react/theme'

const root = createRoot(document.getElementById('root')!)
root.render(<Harness />)

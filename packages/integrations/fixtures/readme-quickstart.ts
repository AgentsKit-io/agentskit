import { defineIntegration, defineAction } from '@agentskit/integrations'

// Most consumers don't author integrations directly — they pull ready-made
// service descriptors from the registry and project them into tools:
import { registry, toTools } from '@agentskit/integrations'

const tools = toTools(registry.get('resend'))

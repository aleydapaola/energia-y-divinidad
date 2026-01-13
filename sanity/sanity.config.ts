import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schemas'

// Hardcoded values for deployed Studio (env vars not available in static build)
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'sds3d4z3jm05xypoyzukhdj6'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

export default defineConfig({
  name: 'default',
  title: 'Energia y Divinidad - CMS',

  projectId,
  dataset,

  basePath: '/studio',

  plugins: [
    structureTool(),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
})

import { handle } from '@hono/node-server'
import app from '../packages/api/src/index'

export default async function handler(req: any, res: any) {
  await handle(app, req, res)
}

export const config = {
  api: {
    externalResolver: true,
  },
}
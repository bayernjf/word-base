// Vercel Serverless Function entry – adapts the Hono API for Vercel Node runtime.
// Located in apps/web/api/[[...all]].ts: Vercel auto-detects /api/* as SF root when the
// project root is apps/web (Vercel dashboard "Root Directory" setting).
import { handle } from '@hono/node-server/vercel';
import app from '../../../packages/api/src/index';

export default handle(app);

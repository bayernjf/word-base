// Next.js App Router catch-all route – mounts the Hono API onto /api/*.
// This works for:
//   - Local dev (`next dev`) – Next.js App Router route handler
//   - Vercel deployment – Next.js handles both SSR and API routes natively
//   - Self-hosted (standalone) – same route handler runs in the Node server
import { handle } from 'hono/vercel';
import app from '../../../../../../packages/api/src/index';

// Hono routes are prefixed with /api/v1/..., which matches Next.js App Router
// mounting this file at src/app/api/[[...all]]/route.ts → /api/*
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const HEAD = handle(app);
export const OPTIONS = handle(app);

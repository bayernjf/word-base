process.env.NODE_ENV = 'vercel-serverless';

import app from '../supabase-server.js';

export default function handler(req, res) {
  app(req, res);
}

export const config = {
  api: {
    externalResolver: true,
  },
};

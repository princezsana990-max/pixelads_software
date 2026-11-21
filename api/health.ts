import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'operational',
    service: 'OrderFlow Pro Enterprise API',
    database: 'Supabase PostgreSQL',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

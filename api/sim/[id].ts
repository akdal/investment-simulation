import { Redis } from '@upstash/redis';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Simulation ID is required' });
    }

    const data = await redis.get(`sim:${id}`);

    if (!data) {
      return res.status(404).json({ error: 'Simulation not found' });
    }

    // data is already parsed by @upstash/redis
    const simulation = typeof data === 'string' ? JSON.parse(data) : data;

    return res.status(200).json({ simulation });
  } catch (error) {
    console.error('Error loading simulation:', error);
    return res.status(500).json({ error: 'Failed to load simulation' });
  }
}

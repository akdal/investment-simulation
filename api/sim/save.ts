import { Redis } from '@upstash/redis';
import { nanoid } from 'nanoid';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = Redis.fromEnv();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { simulation } = req.body;

    if (!simulation) {
      return res.status(400).json({ error: 'Simulation data is required' });
    }

    // Generate unique ID (10 characters)
    const id = nanoid(10);

    // Store in Redis with 30 day expiry
    await redis.set(`sim:${id}`, JSON.stringify(simulation), { ex: 60 * 60 * 24 * 30 });

    return res.status(200).json({ id });
  } catch (error) {
    console.error('Error saving simulation:', error);
    return res.status(500).json({ error: 'Failed to save simulation' });
  }
}

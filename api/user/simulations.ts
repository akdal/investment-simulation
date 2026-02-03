import { Redis } from '@upstash/redis';
import { jwtVerify } from 'jose';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const redis = Redis.fromEnv();
const SIMULATIONS_KEY = 'user:admin:simulations';

async function verifyAuth(req: VercelRequest): Promise<boolean> {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) return false;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

  const token = authHeader.substring(7);
  const SECRET = new TextEncoder().encode(JWT_SECRET);

  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // GET: Load simulations
  if (req.method === 'GET') {
    const isAuthed = await verifyAuth(req);
    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const data = await redis.get(SIMULATIONS_KEY);

      if (!data) {
        return res.status(200).json({ simulations: [], currentSimId: null });
      }

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return res.status(200).json(parsed);
    } catch (error) {
      console.error('Error loading simulations:', error);
      return res.status(500).json({ error: 'Failed to load simulations' });
    }
  }

  // POST: Save simulations
  if (req.method === 'POST') {
    const isAuthed = await verifyAuth(req);
    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const { simulations, currentSimId } = req.body;

      if (!simulations || !Array.isArray(simulations)) {
        return res.status(400).json({ error: 'Invalid simulations data' });
      }

      await redis.set(SIMULATIONS_KEY, JSON.stringify({ simulations, currentSimId }));
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving simulations:', error);
      return res.status(500).json({ error: 'Failed to save simulations' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

import { RequestHandler } from 'express';
import { pool } from '../shared/db.js';

const recentlyTracked = new Set<number>();
const TRACK_INTERVAL_MS = 5 * 60 * 1000;

export const trackActivity: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (userId && !recentlyTracked.has(userId)) {
      recentlyTracked.add(userId);

      await pool.query(
        'UPDATE users SET last_activity_at = NOW() WHERE id = $1',
        [userId]
      );

      setTimeout(() => {
        recentlyTracked.delete(userId);
      }, TRACK_INTERVAL_MS);
    }
  } catch {
    // Silently fail — activity tracking should never break a request
  }

  next();
};

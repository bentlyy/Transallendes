import { RequestHandler } from 'express';
import { pool } from '../shared/db.js';
import { ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const featureCache = new Map<string, boolean>();
const CACHE_TTL = 5 * 60 * 1000;
const cacheTimestamps = new Map<string, number>();

async function isFeatureEnabled(tenantId: string, featureKey: string): Promise<boolean> {
  const cacheKey = `${tenantId}:${featureKey}`;
  const cached = featureCache.get(cacheKey);
  const timestamp = cacheTimestamps.get(cacheKey);

  if (cached !== undefined && timestamp && Date.now() - timestamp < CACHE_TTL) {
    return cached;
  }

  try {
    const result = await pool.query(
      `SELECT enabled FROM tenant_features
       WHERE tenant_id = $1 AND feature_key = $2
       LIMIT 1`,
      [tenantId, featureKey]
    );

    const enabled = result.rows.length > 0 ? result.rows[0].enabled : false;

    featureCache.set(cacheKey, enabled);
    cacheTimestamps.set(cacheKey, Date.now());

    return enabled;
  } catch (error) {
    logger.error('Feature check failed', {
      tenantId,
      featureKey,
      error: (error as Error).message,
    });
    return false;
  }
}

export function clearFeatureCache(): void {
  featureCache.clear();
  cacheTimestamps.clear();
}

export const requireFeature = (featureKey: string): RequestHandler => {
  return async (req, res, next) => {
    try {
      const tenantId = req.tenant_id || process.env.DEFAULT_TENANT_ID || 'default';
      const enabled = await isFeatureEnabled(tenantId, featureKey);

      if (!enabled) {
        return next(new ForbiddenError(`Feature "${featureKey}" is not available for this tenant`));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

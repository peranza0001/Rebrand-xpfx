// RBAC (Role-Based Access Control) middleware for protecting admin and sensitive routes
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  sessionId?: string;
}

/**
 * Middleware to check if user has a specific role.
 * Usage: app.use('/api/admin', requireRole('admin'))
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.userRole;
    
    if (!userRole) {
      logger.warn({ path: req.path }, '[RBAC] User has no role');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(userRole)) {
      logger.warn(
        { path: req.path, userRole, allowedRoles },
        '[RBAC] User does not have required role'
      );
      return res.status(403).json({ 
        error: 'Forbidden',
        message: `This endpoint requires one of these roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Middleware to check if user is admin.
 * Usage: app.use('/api/admin', requireAdmin())
 */
export function requireAdminRole() {
  return requireRole(['admin', 'superadmin']);
}

/**
 * Middleware to check if user is moderator or admin.
 * Usage: app.use('/api/moderate', requireModeratorRole())
 */
export function requireModeratorRole() {
  return requireRole(['moderator', 'admin', 'superadmin']);
}

/**
 * Middleware to check if user is the resource owner or admin.
 */
export function requireResourceOwnerOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userRole = req.userRole;
  const userId = req.userId;
  const resourceUserId = req.params.userId; // Assumes route param is userId

  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Allow if user is admin/superadmin
  if (userRole && ['admin', 'superadmin'].includes(userRole)) {
    return next();
  }

  // Allow if user is accessing their own resource
  if (userId === resourceUserId) {
    return next();
  }

  logger.warn(
    { path: req.path, userId, resourceUserId, userRole },
    '[RBAC] User does not have access to this resource'
  );
  return res.status(403).json({ error: 'Forbidden' });
}

/**
 * Get role display name for logging/display
 */
export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    'user': 'Regular User',
    'merchant': 'Merchant',
    'moderator': 'Moderator',
    'admin': 'Administrator',
    'superadmin': 'Super Administrator',
  };
  return roleMap[role] || role;
}

/**
 * Check if role has permission for action
 */
export function hasPermission(role: string, action: string): boolean {
  const permissions: Record<string, string[]> = {
    'superadmin': ['*'], // All permissions
    'admin': [
      'read:users',
      'write:users',
      'delete:users',
      'read:transactions',
      'read:support_tickets',
      'respond:support_tickets',
      'view:analytics',
      'manage:admin_users',
      'manage:kyc',
      'manage:disputes',
    ],
    'moderator': [
      'read:users',
      'read:transactions',
      'read:support_tickets',
      'respond:support_tickets',
      'manage:disputes',
    ],
    'merchant': [
      'read:own_user',
      'write:own_user',
      'read:own_transactions',
      'manage:merchant_listings',
    ],
    'user': [
      'read:own_user',
      'write:own_user',
      'read:own_transactions',
    ],
  };

  const rolePerms = permissions[role] || [];
  if (rolePerms.includes('*')) return true;
  return rolePerms.includes(action);
}

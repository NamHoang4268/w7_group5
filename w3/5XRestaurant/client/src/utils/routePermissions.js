// Route Permissions Configuration
// Maps each route to the roles that can access it

export const routePermissions = {
    // Products - ADMIN only
    '/dashboard/category': ['ADMIN'],
    '/dashboard/sub-category': ['ADMIN'],
    '/dashboard/product': ['ADMIN'],

    // Restaurant Management
    '/dashboard/table': ['ADMIN'],
    '/dashboard/table-orders': ['ADMIN', 'WAITER'],
    '/dashboard/booking': ['ADMIN', 'WAITER'],
    '/dashboard/bill': ['ADMIN', 'WAITER', 'CASHIER'],
    '/dashboard/report': ['ADMIN'],

    // Reports & Vouchers
    '/dashboard/voucher': ['ADMIN'],

    // Employee Features
    '/dashboard/employee-dashboard': ['WAITER', 'CHEF', 'CASHIER'],
    '/dashboard/my-shifts': ['WAITER', 'CHEF', 'CASHIER'],
    '/dashboard/my-performance': ['WAITER', 'CHEF', 'CASHIER'],

    // Personal - USER only
    '/dashboard/address': ['USER'],
    '/dashboard/my-orders': ['USER'],

    // Profile (all users)
    '/dashboard/profile': ['ADMIN', 'WAITER', 'CHEF', 'CASHIER', 'USER'],

    // Dashboard home
    '/dashboard': ['ADMIN', 'WAITER', 'CHEF', 'CASHIER', 'USER'],
};

/**
 * Returns the home path for a given role after login.
 */
export function getRoleHomePath(role) {
    switch (role) {
        case 'ADMIN':   return '/dashboard';
        case 'CHEF':    return '/dashboard/chef-board';
        case 'WAITER':  return '/dashboard/waiter-board';
        case 'CASHIER': return '/dashboard/cashier-board';
        default:        return '/'; // USER, TABLE, guest
    }
}

// Helper function to check if user has permission for a route
export const hasRoutePermission = (userRole, pathname) => {
    // Check exact match first
    if (routePermissions[pathname]) {
        return routePermissions[pathname].includes(userRole);
    }

    // Check if pathname starts with any configured route (for nested routes)
    for (const [route, roles] of Object.entries(routePermissions)) {
        if (pathname.startsWith(route) && route !== '/dashboard') {
            return roles.includes(userRole);
        }
    }

    // Default: allow if ADMIN, otherwise deny
    return userRole === 'ADMIN';
};

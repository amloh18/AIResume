const fs = require('fs');
const path = require('path');

// List of admin API routes to temporarily disable during build
const adminRoutes = [
  'src/app/api/admin/email-campaigns',
  'src/app/api/admin/discount-codes',
  'src/app/api/admin/testimonials',
  'src/app/api/admin/promotional-offers',
  'src/app/api/admin/pricing-plans',
  'src/app/api/admin/templates',
  'src/app/api/admin/plans',
  'src/app/api/admin/users',
  'src/app/api/admin/ai-analytics',
  'src/app/api/admin/charts',
  'src/app/api/admin/kpis',
  'src/app/api/admin/activity',
  'src/app/api/admin/check-role',
  'src/app/api/admin/check-user-role',
  'src/app/api/admin/cv-journey-kpis',
  'src/app/api/admin/email',
  'src/app/api/admin/email-templates',
  'src/app/api/admin/make-admin',
  'src/app/api/admin/refresh-session',
  'src/app/api/admin/system-health'
];

function disableAdminRoutes() {
  console.log('🔧 Disabling admin API routes during build...');
  
  adminRoutes.forEach(route => {
    const routePath = path.join(process.cwd(), route);
    const backupPath = routePath + '.disabled';
    
    if (fs.existsSync(routePath)) {
      if (fs.existsSync(backupPath)) {
        // Already disabled
        return;
      }
      
      // Rename the route directory to disable it
      fs.renameSync(routePath, backupPath);
      console.log(`✅ Disabled ${route}`);
    }
  });
}

function enableAdminRoutes() {
  console.log('🔧 Re-enabling admin API routes after build...');
  
  adminRoutes.forEach(route => {
    const routePath = path.join(process.cwd(), route);
    const backupPath = routePath + '.disabled';
    
    if (fs.existsSync(backupPath)) {
      // Restore the route directory
      fs.renameSync(backupPath, routePath);
      console.log(`✅ Re-enabled ${route}`);
    }
  });
}

// Check command line arguments
const command = process.argv[2];

if (command === 'disable') {
  disableAdminRoutes();
} else if (command === 'enable') {
  enableAdminRoutes();
} else {
  console.log('Usage: node scripts/disable-admin-routes.js [disable|enable]');
  process.exit(1);
}

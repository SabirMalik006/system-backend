const User = require('../models/User');
const Role = require('../models/Role');

const seedDatabase = async () => {
  try {
    // Create roles if not exists
    const roles = ['super_admin', 'admin', 'inventory_manager', 'hr_manager', 'finance', 'viewer', 'employee'];
    
    for (const roleName of roles) {
      const roleExists = await Role.findOne({ name: roleName });
      if (!roleExists) {
        const roleData = Role.getPermissionsByRole(roleName);
        await Role.create({
          name: roleName,
          ...roleData
        });
        console.log(`✅ Created role: ${roleName}`);
      }
    }
    
    // Create super admin if not exists
    const superAdmin = await User.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      const roleData = Role.getPermissionsByRole('super_admin');
      await User.create({
        name: 'Super Admin',
        email: 'superadmin@system.com',
        password: 'SuperAdmin@123',
        role: 'super_admin',
        permissions: roleData.permissions,
        isActive: true
      });
      console.log('✅ Created Super Admin: superadmin@system.com / SuperAdmin@123');
    }
    
    console.log('🎉 Database seeded successfully');
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

module.exports = seedDatabase;
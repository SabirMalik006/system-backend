const User = require('../models/User');
const Role = require('../models/Role');

const getAccessibleModulesByRole = (role) => {
  if (role === 'super_admin' || role === 'dwece' || role === 'charge_head' || role === 'cmes' || role === 'ages_ges') return ['ims', 'hrms', 'finance', 'dashboard'];
  if (role && role.startsWith('ims_')) return ['ims', 'dashboard'];
  if (role && role.startsWith('hr_')) return ['hrms', 'dashboard'];
  if (role === 'finance') return ['finance', 'dashboard'];
  if (role === 'employee') return ['hrms', 'dashboard'];
  return ['dashboard'];
};

const ensureRole = async (roleName) => {
  const roleExists = await Role.findOne({ name: roleName });
  if (roleExists) return { role: roleExists, created: false };

  const roleData = Role.getPermissionsByRole(roleName);
  const role = await Role.create({
    name: roleName,
    ...roleData
  });

  return { role, created: true };
};

const ensureUser = async ({ name, email, password, role }) => {
  const roleData = Role.getPermissionsByRole(role);
  const existing = await User.findOne({ email });

  if (!existing) {
    return await User.create({
      name,
      email,
      password,
      role,
      permissions: roleData.permissions || [],
      accessibleModules: getAccessibleModulesByRole(role),
      isActive: true
    });
  }

  existing.name = name;
  existing.role = role;
  existing.permissions = roleData.permissions || [];
  existing.accessibleModules = getAccessibleModulesByRole(role);
  existing.isActive = true;

  const passwordOk = await existing.comparePassword(password);
  if (!passwordOk) {
    existing.password = password;
  }

  return await existing.save();
};

const seedDatabase = async () => {
  try {
    // Create roles if not exists
    const roles = ['super_admin', 'dwece', 'charge_head', 'cmes', 'ages_ges', 'ims_manager', 'ims_viewer', 'hr_manager', 'hr_viewer', 'finance'];
    
    for (const roleName of roles) {
      try {
        const { created } = await ensureRole(roleName);
        if (created) console.log(`✅ Created role: ${roleName}`);
      } catch (err) {
        console.error(`Seeding error (role: ${roleName}):`, err);
      }
    }
    
    await ensureUser({
      name: 'DWECE',
      email: 'dwece@system.com',
      password: 'Dwece@123',
      role: 'dwece'
    });
    console.log('✅ Demo user ready: dwece@system.com / Dwece@123');

    await ensureUser({
      name: 'IMS Viewer',
      email: 'ims_viewer@system.com',
      password: 'Viewer@123',
      role: 'ims_viewer'
    });
    console.log('✅ Demo user ready: ims_viewer@system.com / Viewer@123');

    await ensureUser({
      name: 'IMS Manager',
      email: 'ims_manager@system.com',
      password: 'Manager@123',
      role: 'ims_manager'
    });
    console.log('✅ Demo user ready: ims_manager@system.com / Manager@123');

    await ensureUser({
      name: 'Charge Head',
      email: 'chargehead@system.com',
      password: 'Charge@123',
      role: 'charge_head'
    });
    console.log('✅ Demo user ready: chargehead@system.com / Charge@123');

    await ensureUser({
      name: 'CMES User',
      email: 'cmes@system.com',
      password: 'Cmes@123',
      role: 'cmes'
    });
    console.log('✅ Demo user ready: cmes@system.com / Cmes@123');

    await ensureUser({
      name: "AGE'S/GE'S User",
      email: 'agesges@system.com',
      password: 'AgesGes@123',
      role: 'ages_ges'
    });
    console.log("✅ Demo user ready: agesges@system.com / AgesGes@123");
    
    console.log('🎉 Database seeded successfully');
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

module.exports = seedDatabase;

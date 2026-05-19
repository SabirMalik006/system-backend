// backend/seed.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import Models
const User = require('./models/User');
const Role = require('./models/Role');

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected for Seeding'))
  .catch(err => {
    console.error('❌ MongoDB Error:', err);
    process.exit(1);
  });

// Role Permissions Data
const rolesData = {
  super_admin: {
    level: 1,
    permissions: [{ module: 'all', actions: ['manage'] }],
    description: 'Full system access with all permissions'
  },
  admin: {
    level: 2,
    permissions: [
      { module: 'users', actions: ['create', 'read', 'update'] },
      { module: 'inventory', actions: ['create', 'read', 'update', 'delete'] },
      { module: 'hrms', actions: ['create', 'read', 'update'] },
      { module: 'reports', actions: ['read', 'create'] }
    ],
    description: 'Administrative access with user management'
  },
  inventory_manager: {
    level: 3,
    permissions: [
      { module: 'inventory', actions: ['create', 'read', 'update'] },
      { module: 'reports', actions: ['read'] }
    ],
    description: 'Complete inventory management'
  },
  hr_manager: {
    level: 3,
    permissions: [
      { module: 'hrms', actions: ['create', 'read', 'update'] },
      { module: 'attendance', actions: ['read', 'update'] },
      { module: 'employees', actions: ['read', 'update'] }
    ],
    description: 'Human resources management'
  },
  finance: {
    level: 4,
    permissions: [
      { module: 'finance', actions: ['read', 'update'] },
      { module: 'reports', actions: ['read', 'create'] }
    ],
    description: 'Financial operations access'
  },
  viewer: {
    level: 5,
    permissions: [
      { module: 'inventory', actions: ['read'] },
      { module: 'reports', actions: ['read'] }
    ],
    description: 'Read-only access to system'
  },
  employee: {
    level: 6,
    permissions: [
      { module: 'profile', actions: ['read', 'update'] },
      { module: 'attendance', actions: ['create', 'read'] }
    ],
    description: 'Basic employee access'
  }
};

// User Data with credentials
const usersData = [
  {
    name: 'Super Admin',
    email: 'superadmin@system.com',
    password: 'SuperAdmin@123',
    role: 'super_admin',
    isActive: true
  },
  {
    name: 'Admin User',
    email: 'admin@system.com',
    password: 'Admin@123',
    role: 'admin',
    isActive: true
  },
  {
    name: 'Inventory Manager',
    email: 'inventory@system.com',
    password: 'Inventory@123',
    role: 'inventory_manager',
    isActive: true
  },
  {
    name: 'HR Manager',
    email: 'hr@system.com',
    password: 'HR@123',
    role: 'hr_manager',
    isActive: true
  },
  {
    name: 'Finance Manager',
    email: 'finance@system.com',
    password: 'Finance@123',
    role: 'finance',
    isActive: true
  },
  {
    name: 'Viewer User',
    email: 'viewer@system.com',
    password: 'Viewer@123',
    role: 'viewer',
    isActive: true
  },
  {
    name: 'Employee User',
    email: 'employee@system.com',
    password: 'Employee@123',
    role: 'employee',
    isActive: true
  }
];

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Clear existing data (optional - remove if you want to keep existing data)
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Role.deleteMany({});
    console.log('✅ Cleared existing data\n');

    // Insert Roles
    console.log('📝 Creating roles...');
    const roles = {};
    for (const [roleName, roleData] of Object.entries(rolesData)) {
      const role = new Role({
        name: roleName,
        level: roleData.level,
        permissions: roleData.permissions,
        description: roleData.description
      });
      await role.save();
      roles[roleName] = role;
      console.log(`  ✓ Created role: ${roleName} (Level ${roleData.level})`);
    }
    console.log('✅ All roles created successfully\n');

    // Insert Users
    console.log('👤 Creating users...');
    for (const userData of usersData) {
      // Get role permissions
      const rolePermissions = rolesData[userData.role].permissions;
      
      const user = new User({
        name: userData.name,
        email: userData.email,
        password: userData.password, // Model will hash this in pre-save
        role: userData.role,
        permissions: rolePermissions,
        isActive: userData.isActive,
        lastLogin: null
      });
      
      await user.save();
      console.log(`  ✓ Created user: ${userData.email} (${userData.role})`);
      console.log(`    Password: ${userData.password}`);
    }
    console.log('✅ All users created successfully\n');

    // Display summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log('📊 Summary:');
    console.log(`  • Roles created: ${Object.keys(rolesData).length}`);
    console.log(`  • Users created: ${usersData.length}\n`);
    
    console.log('🔑 Login Credentials:');
    console.log('───────────────────────────────────────────────────────');
    usersData.forEach(user => {
      console.log(`  ${user.role.toUpperCase()}:`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Password: ${user.password}`);
      console.log('');
    });
    console.log('───────────────────────────────────────────────────────\n');
    
    console.log('💡 You can now login using any of these credentials!');
    console.log('🚀 Start your server and test login at http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the seed function
seedDatabase();
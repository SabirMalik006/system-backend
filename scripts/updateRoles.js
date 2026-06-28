const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
require('dotenv').config();

const updateRolesAndUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // First, drop the old users (or update them)
    await User.deleteMany({});
    console.log('Old users cleared');

    // Create new users with correct roles
    const users = await User.create([
      {
        name: 'DWECE',
        email: 'dwece@system.com',
        password: 'Dwece@123',
        role: 'dwece',
        isActive: true
      },
      {
        name: 'IMS Manager',
        email: 'ims_manager@system.com',
        password: 'Manager@123',
        role: 'ims_manager',
        isActive: true,
        employeeId: 'IMS001',
        department: 'Inventory',
        designation: 'Stock Manager'
      },
      {
        name: 'IMS Viewer',
        email: 'ims_viewer@system.com',
        password: 'Viewer@123',
        role: 'ims_viewer',
        isActive: true,
        employeeId: 'IMS002',
        department: 'Inventory',
        designation: 'Stock Viewer'
      },
      {
        name: 'HR Manager',
        email: 'hr_manager@system.com',
        password: 'HR@123',
        role: 'hr_manager',
        isActive: true,
        employeeId: 'HR001',
        department: 'Human Resources',
        designation: 'HR Manager'
      },
      {
        name: 'HR Viewer',
        email: 'hr_viewer@system.com',
        password: 'HRView@123',
        role: 'hr_viewer',
        isActive: true,
        employeeId: 'HR002',
        department: 'Human Resources',
        designation: 'HR Assistant'
      },
      {
        name: 'Finance User',
        email: 'finance@system.com',
        password: 'Finance@123',
        role: 'finance',
        isActive: true,
        employeeId: 'FIN001',
        department: 'Finance',
        designation: 'Accountant'
      },
      {
        name: 'Employee',
        email: 'employee@system.com',
        password: 'Employee@123',
        role: 'employee',
        isActive: true,
        employeeId: 'EMP001',
        department: 'Operations',
        designation: 'Staff'
      }
    ]);

    console.log('\n✅ Users created successfully!');
    console.log('\n📝 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('| Role            | Email                          | Password      |');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('| DWECE           | dwece@system.com               | Dwece@123     |');
    console.log('| IMS Manager     | ims_manager@system.com         | Manager@123   |');
    console.log('| IMS Viewer      | ims_viewer@system.com          | Viewer@123    |');
    console.log('| HR Manager      | hr_manager@system.com          | HR@123        |');
    console.log('| HR Viewer       | hr_viewer@system.com           | HRView@123    |');
    console.log('| Finance         | finance@system.com             | Finance@123   |');
    console.log('| Employee        | employee@system.com            | Employee@123  |');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateRolesAndUsers();
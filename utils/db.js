const User = require('../models/User');
const Role = require('../models/Role');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

const getAccessibleModulesByRole = (role) => {
  if (role === 'super_admin' || role === 'dwece' || role === 'charge_head' || role === 'cmes' || role === 'ages_ges') return ['ims', 'hrms', 'finance', 'dashboard'];
  if (role && role.startsWith('ims_')) return ['ims', 'dashboard'];
  if (role && role.startsWith('hr_')) return ['hrms', 'dashboard'];
  if (role === 'finance') return ['finance', 'dashboard'];
  if (role === 'employee' || role === 'tradesman') return ['hrms', 'dashboard'];
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

const sampleEmployees = [
  { firstName: 'Ahmed', lastName: 'Khan', employeeId: 'EMP-001', email: 'ahmed@system.com', designation: 'Electrician', department: 'Electrical', unit: 'CMES COMCOAST', employmentType: 'Permanent', employmentStatus: 'Active', joiningDate: '2022-03-15' },
  { firstName: 'Sarfaraz', lastName: 'Ali', employeeId: 'EMP-002', email: 'sarfaraz@system.com', designation: 'Mechanic', department: 'Mechanical', unit: 'CMES COMKAR', employmentType: 'Permanent', employmentStatus: 'Active', joiningDate: '2021-06-01' },
  { firstName: 'Bilal', lastName: 'Hussain', employeeId: 'EMP-003', email: 'bilal@system.com', designation: 'Welder', department: 'Fabrication', unit: 'CMES COMLOG', employmentType: 'Contract', employmentStatus: 'Active', joiningDate: '2023-01-10' },
  { firstName: 'Mohsin', lastName: 'Raza', employeeId: 'EMP-004', email: 'mohsin@system.com', designation: 'Supervisor', department: 'Electrical', unit: 'CME COMPAK', employmentType: 'Permanent', employmentStatus: 'Active', joiningDate: '2020-09-20' },
  { firstName: 'Sajid', lastName: 'Mehmood', employeeId: 'EMP-005', email: 'sajid@system.com', designation: 'Technician', department: 'Mechanical', unit: 'CMES ORMARA', employmentType: 'Permanent', employmentStatus: 'Active', joiningDate: '2022-11-05' },
  { firstName: 'Umair', lastName: 'Akram', employeeId: 'EMP-006', email: 'umair@system.com', designation: 'Fitter', department: 'Mechanical', unit: 'CMES COMCOAST', employmentType: 'Contract', employmentStatus: 'Active', joiningDate: '2023-06-15' },
  { firstName: 'Irfan', lastName: 'Ahmed', employeeId: 'EMP-007', email: 'irfan@system.com', designation: 'Engineer', department: 'Electrical', unit: 'CME ISLD / LHR', employmentType: 'Permanent', employmentStatus: 'On Leave', joiningDate: '2021-12-01' },
  { firstName: 'Naveed', lastName: 'Khan', employeeId: 'EMP-008', email: 'naveed@system.com', designation: 'Foreman', department: 'Fabrication', unit: 'CMES COMCOAST', employmentType: 'Permanent', employmentStatus: 'Active', joiningDate: '2020-04-10' },
  { firstName: 'Rehan', lastName: 'Tariq', employeeId: 'EMP-009', email: 'rehan@system.com', designation: 'Helper', department: 'Mechanical', unit: 'CMES COMLOG', employmentType: 'Temporary', employmentStatus: 'Active', joiningDate: '2024-02-20' },
  { firstName: 'Zubair', lastName: 'Siddiqui', employeeId: 'EMP-010', email: 'zubair@system.com', designation: 'Electrician', department: 'Electrical', unit: 'CMES COMLOG', employmentType: 'Contract', employmentStatus: 'Active', joiningDate: '2023-08-14' },
];

const seedSampleData = async () => {
  const empCount = await Employee.countDocuments();
  if (empCount > 0) return;

  const created = await Employee.insertMany(sampleEmployees);
  console.log(`✅ Seeded ${created.length} sample employees`);

  const today = new Date();
  const attRecords = [];
  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOffset);
    if (d.getDay() === 6) continue;
    const dateStr = d.toISOString().split('T')[0];
    const isFriday = d.getDay() === 5;
    for (const emp of created) {
      const statusRoll = Math.random();
      let status = 'Present';
      let clockIn = '07:30';
      let clockOut = '16:00';
      let workHours = '8.5';
      if (isFriday) {
        status = 'Present';
        clockIn = '07:15';
        clockOut = '12:30';
        workHours = '5.25';
      } else if (statusRoll < 0.7) {
        status = 'Present';
        clockIn = `${String(6 + Math.floor(Math.random() * 2)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        clockOut = `${String(14 + Math.floor(Math.random() * 3)).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
        const ci = clockIn.split(':').map(Number);
        const co = clockOut.split(':').map(Number);
        workHours = ((co[0] + co[1]/60) - (ci[0] + ci[1]/60)).toFixed(1);
      } else if (statusRoll < 0.85) {
        status = 'Late';
        clockIn = '08:45';
        clockOut = '17:00';
        workHours = '8.25';
      } else if (statusRoll < 0.95) {
        status = 'Absent';
        clockIn = '';
        clockOut = '';
        workHours = '0';
      } else {
        status = 'On Leave';
        clockIn = '';
        clockOut = '';
        workHours = '0';
      }
      attRecords.push({
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeId: emp.employeeId,
        email: emp.email,
        designation: emp.designation,
        department: emp.department,
        unit: emp.unit,
        shift: 'Morning',
        clockIn, clockOut, workHours,
        date: dateStr,
        status,
        type: 'Full-time',
        initials: `${emp.firstName[0]}${emp.lastName[0]}`,
      });
    }
  }
  await Attendance.insertMany(attRecords);
  console.log(`✅ Seeded ${attRecords.length} sample attendance records`);

  const leaveRecords = [
    { employeeName: 'Irfan Ahmed', employeeId: 'EMP-007', type: 'Annual', startDate: '2026-06-10', endDate: '2026-06-14', durationDays: '5', reason: 'Annual family visit', status: 'Approved', initials: 'IA', workflow: [{ level: 'L1: Supervisor', status: 'APPROVED', date: '2026-06-08', note: 'Approved' }, { level: 'L2: Dept Head', status: 'APPROVED', date: '2026-06-09', note: 'Approved' }] },
    { employeeName: 'Ahmed Khan', employeeId: 'EMP-001', type: 'Sick', startDate: '2026-06-20', endDate: '2026-06-21', durationDays: '2', reason: 'Medical appointment', status: 'Pending', urgency: 'Normal', initials: 'AK' },
    { employeeName: 'Sarfaraz Ali', employeeId: 'EMP-002', type: 'Casual', startDate: '2026-07-01', endDate: '2026-07-02', durationDays: '2', reason: 'Personal work', status: 'Pending', initials: 'SA' },
    { employeeName: 'Umair Akram', employeeId: 'EMP-006', type: 'Annual', startDate: '2026-07-15', endDate: '2026-07-19', durationDays: '5', reason: 'Family event', status: 'Approved', initials: 'UA', workflow: [{ level: 'L1: Supervisor', status: 'APPROVED', date: '2026-07-12', note: 'Approved' }, { level: 'L2: Dept Head', status: 'PENDING', date: '', note: 'Waiting...' }] },
    { employeeName: 'Naveed Khan', employeeId: 'EMP-008', type: 'Sick', startDate: '2026-06-25', endDate: '2026-06-25', durationDays: '1', reason: 'Fever', status: 'Rejected', initials: 'NK' },
  ];
  await Leave.insertMany(leaveRecords);
  console.log(`✅ Seeded ${leaveRecords.length} sample leave records`);
};

const seedDatabase = async () => {
  try {
    // Create roles if not exists
    const roles = ['super_admin', 'dwece', 'charge_head', 'cmes', 'ages_ges', 'ims_manager', 'ims_viewer', 'hr_manager', 'hr_viewer', 'finance', 'tradesman'];
    
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

    await ensureUser({
      name: 'Tradesman',
      email: 'tradesman@system.com',
      password: 'Tradesman@123',
      role: 'tradesman'
    });
    console.log('✅ Demo user ready: tradesman@system.com / Tradesman@123');

    await seedSampleData();
    
    console.log('🎉 Database seeded successfully');
  } catch (error) {
    console.error('Seeding error:', error);
  }
};

module.exports = seedDatabase;

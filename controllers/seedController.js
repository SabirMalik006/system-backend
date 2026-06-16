const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');

const employees = [
  { name: 'Subhan Mehmood', id: 'EMP-0142', designation: 'Plumber', dept: 'Maintenance (Plumbing)', unit: 'CMES Comkar', initials: 'SM' },
  { name: 'Khalid Azhar', id: 'EMP-0145', designation: 'Electrician', dept: 'Maintenance (Electrical)', unit: 'CMES Compak', initials: 'KA' },
  { name: 'Salar Khan', id: 'EMP-0842', designation: 'Senior Electrician', dept: 'Operations (Welding)', unit: 'CMES Compak', initials: 'SK' },
  { name: 'Adnan Bashir', id: 'EMP-0158', designation: 'Carpenter', dept: 'Maintenance (Carpentry)', unit: 'CMES Omori', initials: 'AB' },
  { name: 'Shakeel Sajid', id: 'EMP-0182', designation: 'Painter', dept: 'Maintenance (Painting)', unit: 'CMES Comkar', initials: 'SS' },
  { name: 'Ahmed Raza', id: 'EMP-0174', designation: 'Welder', dept: 'Operations (Welding)', unit: 'CMES Comkar', initials: 'AR' },
  { name: 'Faisal Iqbal', id: 'EMP-0210', designation: 'Pipefitter', dept: 'Operations (Scaffolding)', unit: 'CMES Compak', initials: 'FI' },
  { name: 'Umer Hassan', id: 'EMP-9042', designation: 'UI/UX Designer', dept: 'Operations (Rigging)', unit: 'CMES Comkar', initials: 'UH' },
  { name: 'Ali Hassan', id: 'EMP-3129', designation: 'Electrician', dept: 'Maintenance (Electrical)', unit: 'CMES Omori', initials: 'AH' },
  { name: 'Ahmed Daniyal', id: 'EMP-2041', designation: 'Security Guard', dept: 'Security', unit: 'CMES Comkar', initials: 'AD' },
];

const shifts = ['Morning', 'General', 'Night'];
const statuses = ['Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Late', 'Absent', 'On Leave'];
const types = ['Full-time', 'Contract'];

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function getClockIn(shift) {
  if (shift === 'Morning') {
    const late = Math.random() > 0.85;
    const min = late ? 7 + Math.floor(Math.random() * 30) : 7 + Math.floor(Math.random() * 15);
    return `${min < 10 ? '0' : ''}${Math.floor(min / 60) + 7}:${String(min % 60).padStart(2, '0')}`;
  }
  if (shift === 'General') return `${8 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
  return `21:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`;
}

function getClockOut(clockIn) {
  const [h, m] = clockIn.split(':').map(Number);
  const totalStart = h * 60 + m;
  const totalEnd = totalStart + 480 + Math.floor(Math.random() * 60);
  const eh = Math.floor(totalEnd / 60);
  const em = totalEnd % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

exports.seedAttendance = async (req, res) => {
  try {
    await Attendance.deleteMany({});

    const today = new Date();
    const records = [];

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const d = new Date(today);
      d.setDate(d.getDate() - dayOffset);
      if (d.getDay() === 0) continue;
      const dateStr = d.toISOString().split('T')[0];

      employees.forEach(emp => {
        const shift = randomItem(shifts);
        const status = dayOffset === 0 ? randomItem(statuses) : randomItem(['Present', 'Present', 'Present', 'Present', 'Present', 'Late', 'Absent']);
        const clockIn = status !== 'Absent' && status !== 'On Leave' ? getClockIn(shift) : '';
        const clockOut = clockIn ? getClockOut(clockIn) : '';
        const workHrs = clockIn && clockOut ? (() => {
          const [cih, cim] = clockIn.split(':').map(Number);
          const [coh, com] = clockOut.split(':').map(Number);
          return ((coh * 60 + com) - (cih * 60 + cim)) / 60;
        })().toFixed(1) : '';

        records.push({
          employeeName: emp.name,
          employeeId: emp.id,
          email: `${emp.name.toLowerCase().replace(/\s+/g, '.')}@hrms.com`,
          designation: emp.designation,
          department: emp.dept,
          unit: emp.unit,
          shift,
          clockIn,
          clockOut,
          workHours: workHrs,
          date: dateStr,
          status,
          type: randomItem(types),
          joinedDate: `${Math.floor(Math.random() * 28) + 1} ${['Jan', 'Feb', 'Mar', 'Apr', 'May'][Math.floor(Math.random() * 5)]} ${2020 + Math.floor(Math.random() * 5)}`,
          initials: emp.initials,
        });
      });
    }

    await Attendance.insertMany(records);
    res.json({ success: true, message: `Seeded ${records.length} attendance records` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.seedLeaves = async (req, res) => {
  try {
    await Leave.deleteMany({});

    const leaveTypes = ['Annual', 'Sick', 'Casual'];
    const statuses = ['Pending', 'Approved', 'Approved', 'Rejected'];
    const leaves = employees.slice(0, 8).map((emp, i) => {
      const type = randomItem(leaveTypes);
      const days = Math.floor(Math.random() * 5) + 1;
      const startD = new Date();
      startD.setDate(startD.getDate() - Math.floor(Math.random() * 60));
      const endD = new Date(startD);
      endD.setDate(endD.getDate() + days);
      const status = randomItem(statuses);
      return {
        employeeName: emp.name,
        employeeId: emp.id,
        designation: emp.designation,
        department: emp.dept,
        initials: emp.initials,
        type,
        durationDays: `${days} Day${days > 1 ? 's' : ''}`,
        startDate: startD.toISOString().split('T')[0],
        endDate: endD.toISOString().split('T')[0],
        reason: type === 'Annual' ? 'Annual leave request' : type === 'Sick' ? 'Medical leave' : 'Personal reasons',
        status,
        urgency: status === 'Pending' && Math.random() > 0.7 ? 'URGENT' : 'Normal',
        level: 'L1 (Manager)',
        workflow: [
          { level: 'L1: Supervisor', approver: 'Ahsan Khan', status: status === 'Rejected' ? 'REJECTED' : 'APPROVED', date: new Date(startD.getTime() - 86400000).toISOString(), note: '"Reviewed and approved."' },
          { level: 'L2: Dept Head', approver: 'Jawad khattak', status: status === 'Pending' ? 'PENDING' : status === 'Approved' ? 'APPROVED' : 'PENDING', date: status === 'Pending' ? null : new Date().toISOString(), note: status === 'Pending' ? 'Waiting for action...' : '"Approved."' },
          { level: 'L3: HR Administrator', approver: '', status: '', date: null, note: null },
        ],
      };
    });

    await Leave.insertMany(leaves);
    res.json({ success: true, message: `Seeded ${leaves.length} leave records` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const Attendance = require('../../models/Attendance');
const Employee = require('../../models/Employee');

exports.createAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.create({ ...req.body, createdBy: req.user.id });
    res.status(201).json({ success: true, data: attendance });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status, shift, department, date } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (shift && shift !== 'All') filter.shift = shift;
    if (department && department !== 'All') filter.department = department;
    if (date) filter.date = date;
    // No default date filter — show all records
    if (search) {
      filter.$or = [
        { employeeName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await Attendance.countDocuments(filter);
    const records = await Attendance.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: records,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAttendanceById = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getKPIStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const totalEmployees = await Employee.countDocuments({ employmentStatus: 'Active' });
    const todayRecords = await Attendance.find({ date: today });
    const presentToday = todayRecords.filter(r => r.status === 'Present').length;
    const lateToday = todayRecords.filter(r => r.status === 'Late').length;
    const absentToday = todayRecords.filter(r => r.status === 'Absent').length;
    const onLeaveToday = todayRecords.filter(r => r.status === 'On Leave').length;

    const totalWorkHrs = todayRecords.reduce((sum, r) => {
      const hrs = parseFloat(r.workHours) || 0;
      return sum + hrs;
    }, 0);
    const avgWorkHrs = todayRecords.length ? (totalWorkHrs / todayRecords.length) : 0;

    const allWithHours = await Attendance.find({ workHours: { $ne: '' }, date: today });
    const totalRegHrs = allWithHours.reduce((sum, r) => sum + (parseFloat(r.workHours) || 0), 0);
    const otHrs = allWithHours.length > 0 ? Math.round((totalRegHrs / allWithHours.length - 7) * 10) / 10 : 0;

    const attendanceRate = totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        lateToday,
        absentToday,
        onLeaveToday,
        attendanceRate,
        avgWorkHrs: avgWorkHrs.toFixed(1),
        overtimeHrs: otHrs > 0 ? otHrs.toFixed(1) : '0',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMonthlyTrend = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month) : (new Date().getMonth() + 1);
    const y = year || new Date().getFullYear();
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;

    const records = await Attendance.find({ date: { $regex: `^${monthStr}` } });

    const daysInMonth = new Date(y, m, 0).getDate();
    const trend = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${monthStr}-${String(d).padStart(2, '0')}`;
      const dayRecords = records.filter(r => r.date === dayStr);
      trend.push({
        day: d,
        present: dayRecords.filter(r => r.status === 'Present').length,
        late: dayRecords.filter(r => r.status === 'Late').length,
        absent: dayRecords.filter(r => r.status === 'Absent').length,
        leave: dayRecords.filter(r => r.status === 'On Leave').length,
      });
    }

    res.json({ success: true, data: trend });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTodayStatus = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await Attendance.find({ date: today });
    const counts = { Present: 0, Late: 0, Absent: 0, 'On Leave': 0, Holiday: 0 };
    records.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

    const total = records.length || 1;
    const rate = Math.round((counts.Present / total) * 100);

    res.json({ success: true, data: { statuses: counts, attendanceRate: rate, date: today } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getShiftOverview = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await Attendance.find({ date: today });
    const shifts = { Morning: 0, General: 0, Night: 0 };
    records.forEach(r => { if (shifts[r.shift] !== undefined) shifts[r.shift]++; });

    const allWithHours = await Attendance.find({ workHours: { $ne: '' }, date: today });
    const totalOvertimeMins = allWithHours.reduce((sum, r) => {
      const hrs = parseFloat(r.workHours) || 0;
      return sum + Math.max(0, (hrs - 8) * 60);
    }, 0);
    const totalLateMins = records.filter(r => r.status === 'Late').reduce((sum, r) => {
      if (r.clockIn) {
        const parts = r.clockIn.split(':');
        const mins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        return sum + Math.max(0, mins - 7 * 60);
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      data: {
        shifts,
        overtimeHrs: Math.round(totalOvertimeMins / 60),
        lateMinutes: Math.round(totalLateMins),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getClockInDistribution = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await Attendance.find({ date: today, clockIn: { $ne: '' } });
    const buckets = {};
    for (let h = 0; h < 24; h++) {
      const label = h < 12 ? `${h === 0 ? 12 : h}am` : `${h === 12 ? 12 : h - 12}pm`;
      buckets[label] = 0;
    }
    records.forEach(r => {
      if (r.clockIn) {
        const hour = parseInt(r.clockIn.split(':')[0]);
        const label = hour < 12 ? `${hour === 0 ? 12 : hour}am` : `${hour === 12 ? 12 : hour - 12}pm`;
        if (buckets[label] !== undefined) buckets[label]++;
      }
    });

    const data = Object.entries(buckets).map(([hour, count]) => ({ hour, count }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getHeatmap = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month ? parseInt(month) : (new Date().getMonth() + 1);
    const y = year || new Date().getFullYear();
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;
    const records = await Attendance.find({ date: { $regex: `^${monthStr}` } });
    const daysInMonth = new Date(y, m, 0).getDate();

    const dailyRates = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${monthStr}-${String(d).padStart(2, '0')}`;
      const dayRecs = records.filter(r => r.date === dayStr);
      const total = dayRecs.length || 1;
      const present = dayRecs.filter(r => r.status === 'Present').length;
      dailyRates.push(Math.round((present / total) * 100));
    }

    const weeks = [];
    let week = [];
    const firstDay = new Date(y, m - 1, 1).getDay();
    for (let i = 0; i < firstDay; i++) week.push(0);
    dailyRates.forEach(rate => {
      const val = rate >= 80 ? 2 : rate >= 50 ? 1 : 0;
      week.push(val);
      if (week.length === 7) { weeks.push(week); week = []; }
    });
    if (week.length) { while (week.length < 7) week.push(0); weeks.push(week); }

    res.json({ success: true, data: { weeks, month: m, year: y } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getRecentActivity = async (req, res) => {
  try {
    const records = await Attendance.find().sort({ createdAt: -1 }).limit(10);
    const activities = records.map(r => {
      const clockInTime = r.clockIn || '--';
      const statusText = r.status === 'Late' ? ` (${r.status})` : r.status === 'Present' ? '' : ` · ${r.status}`;
      return {
        name: `${r.employeeName} clocked in — ${r.shift} Shift${statusText}`,
        meta: `${clockInTime} · ${r.designation} · ${r.unit} · ${r.status === 'Late' ? 'Late' : 'On Time'}`,
        dotColor: r.status === 'Late' ? 'bg-blue-800' : r.status === 'Present' ? 'bg-blue-600' : 'bg-blue-200',
      };
    });
    res.json({ success: true, data: activities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getDeptAttendanceRate = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await Attendance.find({ date: today });
    const deptData = {};
    records.forEach(r => {
      if (!r.department) return;
      if (!deptData[r.department]) deptData[r.department] = { total: 0, present: 0 };
      deptData[r.department].total++;
      if (r.status === 'Present') deptData[r.department].present++;
    });

    const allDepts = [
      'Maintenance (Electrical)', 'Operations (Welding)', 'Maintenance (Plumbing)',
      'Maintenance (Carpentry)', 'Maintenance (Painting)', 'Operations (Scaffolding)',
      'Operations (Rigging)', 'Security',
    ];

    const depts = allDepts.map(label => {
      const d = deptData[label] || { total: 0, present: 0 };
      return { label, pct: d.total ? Math.round((d.present / d.total) * 100) : 0 };
    });

    res.json({ success: true, data: depts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getWorkingHoursAnalysis = async (req, res) => {
  try {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const data = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = days[d.getDay()];
      const records = await Attendance.find({ date: dateStr, clockIn: { $ne: '' } });
      if (records.length > 0) {
        const totalHrs = records.reduce((sum, r) => sum + (parseFloat(r.workHours) || 0), 0);
        const avg = totalHrs / records.length;
        data.push({
          day: dayLabel,
          regular: Math.min(8, Math.round(avg * 10) / 10),
          overtime: Math.max(0, Math.round((avg - 8) * 10) / 10),
        });
      } else {
        data.push({ day: dayLabel, regular: 0, overtime: 0 });
      }
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const lateRecords = await Attendance.find({ status: 'Late' }).sort({ date: -1 }).limit(5);
    const approvals = lateRecords.map(r => {
      const initials = r.employeeName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      let lateMin = '';
      if (r.clockIn) {
        const parts = r.clockIn.split(':');
        const mins = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        const shiftStart = r.shift === 'Morning' ? 7 * 60 : r.shift === 'General' ? 9 * 60 : 22 * 60;
        lateMin = `${Math.max(0, mins - shiftStart)} min`;
      }
      return {
        initials,
        name: r.employeeName,
        meta: `Late Mark · ${r.date} · ${lateMin} · ${r.designation}`,
      };
    });
    res.json({ success: true, data: approvals });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.exportAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {};
    if (date) filter.date = date;
    const records = await Attendance.find(filter).sort({ date: -1 });
    const headers = 'AttendanceID,EmployeeName,EmployeeID,Designation,Department,Unit,Shift,ClockIn,ClockOut,WorkHours,Date,Status,Type';
    const csv = records.map(r =>
      `${r.attendanceId},"${r.employeeName}",${r.employeeId},"${r.designation}","${r.department}","${r.unit}",${r.shift},${r.clockIn},${r.clockOut},${r.workHours},${r.date},${r.status},${r.type}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
    res.send(headers + '\n' + csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.bulkCreateAttendance = async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: 'No records provided' });
    }
    const created = await Attendance.insertMany(
      records.map(r => ({ ...r, createdBy: req.user.id }))
    );
    res.status(201).json({ success: true, data: created, count: created.length });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

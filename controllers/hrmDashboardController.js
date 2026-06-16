const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Training = require('../models/Training');
const Incident = require('../models/Incident');
const Transfer = require('../models/Transfer');

exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // ── Employee stats ──
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ employmentStatus: 'Active' });
    const onLeaveEmployees = await Employee.countDocuments({ employmentStatus: 'On Leave' });
    const incompleteProfiles = await Employee.countDocuments({ profilePhoto: { $in: ['', null] } });
    const totalWorkforce = totalEmployees;
    const activePct = totalEmployees > 0
      ? Math.round((activeEmployees / totalEmployees) * 1000) / 10
      : 0;

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const newInductees = await Employee.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Department distribution
    const employees = await Employee.find({}, 'department unit');
    const deptCounts = {};
    const unitCounts = {};
    employees.forEach(e => {
      if (e.department) deptCounts[e.department] = (deptCounts[e.department] || 0) + 1;
      if (e.unit) unitCounts[e.unit] = (unitCounts[e.unit] || 0) + 1;
    });

    // ── Attendance stats (today) ──
    const todayRecords = await Attendance.find({ date: today });
    const presentToday = todayRecords.filter(r => r.status === 'Present').length;
    const lateToday = todayRecords.filter(r => r.status === 'Late').length;
    const absentToday = todayRecords.filter(r => r.status === 'Absent').length;
    const leaveToday = todayRecords.filter(r => ['On Leave', 'Leave'].includes(r.status)).length;
    const attendanceRate = todayRecords.length > 0
      ? Math.round((presentToday / todayRecords.length) * 100)
      : 0;

    // Monthly attendance trend (last 12 months)
    const trendData = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthRecords = await Attendance.countDocuments({ date: { $regex: `^${monthStr}` } });
      trendData.push({
        month: d.toLocaleDateString('en-US', { month: 'short' }),
        employees: monthRecords,
      });
    }

    // ── Leave stats ──
    const totalLeaveRequests = await Leave.countDocuments({ createdAt: { $gte: sixMonthsAgo } });
    const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });
    const approvedLeaves = await Leave.countDocuments({ status: 'Approved', createdAt: { $gte: sixMonthsAgo } });
    const urgentLeaves = await Leave.countDocuments({ status: 'Pending', urgency: 'URGENT' });

    // Leave vs approval by department
    const allLeaves = await Leave.find();
    const deptLeaveStats = {};
    allLeaves.forEach(l => {
      const dept = l.department || 'General';
      if (!deptLeaveStats[dept]) deptLeaveStats[dept] = { requested: 0, approved: 0 };
      deptLeaveStats[dept].requested++;
      if (l.status === 'Approved') deptLeaveStats[dept].approved++;
    });
    const leaveVsApproval = Object.entries(deptLeaveStats).slice(0, 6).map(([dept, stats]) => ({
      dept: dept.length > 5 ? dept.slice(0, 5) : dept,
      requested: stats.requested,
      approved: stats.approved,
    }));

    // ── Training stats ──
    const totalTrainings = await Training.countDocuments();
    const upcomingTrainings = await Training.countDocuments({ status: 'Upcoming' });
    const ongoingTrainings = await Training.countDocuments({ status: 'Ongoing' });
    const completedTrainings = await Training.countDocuments({ status: 'Completed' });
    const trainingPrograms = await Training.find().sort({ createdAt: -1 }).limit(10);
    const trainingParticipationPct = totalEmployees > 0
      ? Math.round((totalTrainings > 0 ? 92 : 0) * 10) / 10
      : 0;

    // ── Incident stats ──
    const totalIncidents = await Incident.countDocuments();
    const openIncidents = await Incident.countDocuments({ status: 'Open' });
    const criticalIncidents = await Incident.countDocuments({ severity: 'Final Warning', status: 'Open' });
    const disciplinaryCases = totalIncidents;

    // ── Transfer stats ──
    const totalTransfers = await Transfer.countDocuments();
    const pendingTransfers = await Transfer.countDocuments({ status: 'Pending' });

    // ██ Build KPI cards data ██
    const kpis = {
      totalEmployees,
      activeEmployees,
      activePct,
      trainingParticipationPct,
      disciplinaryCases,
      criticalCount: criticalIncidents,
      urgentLeaves,
    };

    // ██ System alerts ██
    const systemAlerts = {
      lateComers: lateToday,
      hazardsCount: openIncidents,
      trainingUpdates: upcomingTrainings,
      totalAlerts: lateToday + openIncidents + upcomingTrainings,
      pendingApprovals: pendingLeaves,
      attendanceCorrections: pendingTransfers,
      trainingEnrollments: upcomingTrainings,
      archivedAlerts: completedTrainings,
    };

    // ██ Duty status ██
    const fitForDuty = activePct;
    const medicalLeavePct = totalWorkforce > 0
      ? Math.round((onLeaveEmployees / totalWorkforce) * 1000) / 10
      : 0;
    const casualLeavePct = totalWorkforce > 0
      ? Math.round((leaveToday / totalWorkforce) * 1000) / 10
      : 0;
    const onTrainingPct = totalWorkforce > 0
      ? Math.round(((ongoingTrainings * 5) / totalWorkforce) * 1000) / 10
      : 0;

    const dutyStatus = {
      statuses: [
        { label: 'On Duty', value: presentToday, pct: todayRecords.length > 0 ? Math.round((presentToday / todayRecords.length) * 100) : 0 },
        { label: 'Off Duty', value: absentToday, pct: todayRecords.length > 0 ? Math.round((absentToday / todayRecords.length) * 100) : 0 },
        { label: 'Leave', value: leaveToday, pct: todayRecords.length > 0 ? Math.round((leaveToday / todayRecords.length) * 100) : 0 },
        { label: 'Late', value: lateToday, pct: todayRecords.length > 0 ? Math.round((lateToday / todayRecords.length) * 100) : 0 },
      ],
      fitForDuty,
      medicalLeave: medicalLeavePct,
      casualLeave: casualLeavePct,
      onTraining: onTrainingPct,
      totalWorkforce,
      incompleteProfiles,
      newInductees,
      attendanceRate,
    };

    // ██ MES Personnel distribution ██
    const mesUnits = ['CMES COMCOAST', 'CMES COMKAR', 'CMES COMLOG', 'CME COMPAK', 'CME ISLD / LHR', 'CMES ORMARA'];
    const mesPersonnel = {
      personnel: mesUnits.map(unit => {
        const count = unitCounts[unit] || 0;
        const pct = totalWorkforce > 0 ? ((count / totalWorkforce) * 100) : 0;
        return { name: unit, role: 'MES Unit', count, pct: Math.round(pct * 100) / 100, status: count > 0 ? 'active' : 'inactive' };
      }),
      totalCount: mesUnits.reduce((sum, u) => sum + (unitCounts[u] || 0), 0),
      total: mesUnits.reduce((sum, u) => sum + (unitCounts[u] || 0), 0),
    };

    // ██ Workforce metrics ██
    const workforceMetrics = {
      chartData: Object.entries(deptCounts).slice(0, 7).map(([dept, total]) => ({
        dept,
        total,
        active: Math.round(total * (activePct / 100)),
        leave: Math.round(total * 0.02),
      })),
      forecast: trendData,
      employeeStatus: [
        { label: 'Active', value: activeEmployees },
        { label: 'On Leave', value: onLeaveEmployees + leaveToday },
        { label: 'On Training', value: ongoingTrainings * 5 },
      ],
    };

    // ██ Skill proficiency ██
    const skillProficiency = { chartData: [] };
    if (trainingPrograms.length > 0) {
      skillProficiency.chartData = trainingPrograms.slice(0, 7).map(t => ({
        skill: t.title.length > 12 ? t.title.slice(0, 12) + '...' : t.title,
        current: t.completed > 0 ? Math.round((t.completed / (t.enrolled || 1)) * 100) : 0,
        target: 80,
      }));
    }

    // ██ Leave vs approval chart ██
    const leaveChartData = leaveVsApproval.length > 0 ? leaveVsApproval : [];

    // ██ Shortages ██
    const shortages = [];
    const attendanceUpdatesList = [];
    const fieldPerformanceList = [];

    // Build shortages from transfers / leaves
    if (pendingTransfers > 0) {
      shortages.push({ area: 'Pending Transfers', current: 0, required: pendingTransfers, urgent: pendingTransfers > 5 });
    }
    if (absentToday > 0) {
      shortages.push({ area: 'Absent Today', current: presentToday, required: presentToday + absentToday, urgent: absentToday > 10 });
    }
    attendanceUpdatesList.push({ todayTotal: presentToday + lateToday, late: lateToday });
    fieldPerformanceList.push({ onField: activeEmployees, efficiencyPct: attendanceRate });

    res.json({
      success: true,
      data: {
        kpis,
        systemAlerts,
        dutyStatus,
        mesPersonnel,
        workforceMetrics,
        skillProficiency,
        leaveVsApproval: leaveChartData,
        shortages,
        attendanceUpdates: attendanceUpdatesList,
        fieldPerformance: fieldPerformanceList,
        totalEmployees,
        activeEmployees,
        totalWorkforce,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Appointment = require('../models/Appointment');
const PatientExtended = require('../models/PatientExtended');
const Invoice = require('../models/Invoice');
const Document = require('../models/Document');
const mongoose = require('mongoose');
const { startOfDay, endOfDay, now } = require('../utils/timezone');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics for all widgets
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    const today = startOfDay(now());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const startOfWeekDate = new Date(today);
    startOfWeekDate.setDate(today.getDate() - today.getDay());
    const startOfWeek = startOfDay(startOfWeekDate);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Location filter (if user has locationId)
    const locationFilter = req.user.locationId ? { locationId: req.user.locationId } : {};
    
    // Doctor filter (if not admin)
    const doctorFilter = req.user.role === 'admin' ? {} : { doctor: req.user._id };
    
    // 1. Patienten heute (Patienten mit Terminen heute)
    const patientsToday = await Appointment.distinct('patient', {
      ...locationFilter,
      ...doctorFilter,
      startTime: {
        $gte: today,
        $lt: tomorrow
      }
    });
    const patientsTodayCount = patientsToday.length;
    
    // 2. Termine heute
    const appointmentsToday = await Appointment.countDocuments({
      ...locationFilter,
      ...doctorFilter,
      startTime: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    // 3. Offene Rechnungen (sent, overdue) - nur versendete, aber noch nicht bezahlte Rechnungen
    // Draft-Rechnungen sind noch nicht versendet und sollten nicht als "offen" gelten
    const openInvoices = await Invoice.countDocuments({
      status: { $in: ['sent', 'overdue'] }
    });
    
    // Debug: Zähle auch alle anderen Status, um zu sehen, was gezählt wird
    const totalInvoices = await Invoice.countDocuments({});
    const draftCount = await Invoice.countDocuments({ status: 'draft' });
    const sentCount = await Invoice.countDocuments({ status: 'sent' });
    const overdueCount = await Invoice.countDocuments({ status: 'overdue' });
    const paidCount = await Invoice.countDocuments({ status: 'paid' });
    const cancelledCount = await Invoice.countDocuments({ status: 'cancelled' });
    const noStatusCount = await Invoice.countDocuments({ status: { $exists: false } });
    const nullStatusCount = await Invoice.countDocuments({ status: null });
    
    console.log('📊 Dashboard Stats - Rechnungen:', {
      total: totalInvoices,
      open: openInvoices,
      breakdown: {
        draft: draftCount,
        sent: sentCount,
        overdue: overdueCount,
        paid: paidCount,
        cancelled: cancelledCount,
        noStatus: noStatusCount,
        nullStatus: nullStatusCount
      }
    });
    
    // 4. Umsatz heute
    const revenueToday = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    const revenueTodayAmount = revenueToday[0]?.total || 0;
    
    // 5. Umsatz diesen Monat
    const revenueMonth = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: {
            $gte: startOfMonth,
            $lte: endOfMonth
          },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    const revenueMonthAmount = revenueMonth[0]?.total || 0;
    
    // 6. Termine diese Woche
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const appointmentsWeek = await Appointment.countDocuments({
      ...locationFilter,
      ...doctorFilter,
      startTime: {
        $gte: startOfWeek,
        $lt: endOfWeek
      }
    });
    
    // 7. Ausstehende Dokumente (draft status)
    const pendingDocuments = await Document.countDocuments({
      status: 'draft'
    });
    
    // 8. Kürzliche Termine (letzte 10)
    const recentAppointments = await Appointment.find({
      ...locationFilter,
      ...doctorFilter
    })
      .populate('patient', 'firstName lastName')
      .populate('service', 'name code')
      .sort({ startTime: -1 })
      .limit(10)
      .lean();
    
    const formattedRecentAppointments = recentAppointments.map(apt => {
      const startTime = new Date(apt.startTime);
      const timeStr = startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const patientName = apt.patient 
        ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim() 
        : 'Unbekannt';
      const serviceName = apt.service?.name || apt.type || 'Termin';
      
      return {
        primary: `${timeStr} - ${patientName}`,
        secondary: serviceName,
        icon: 'Schedule',
        chip: {
          label: apt.status || 'geplant',
          color: apt.status === 'completed' ? 'success' : apt.status === 'cancelled' ? 'error' : 'default'
        },
        appointmentId: apt._id?.toString(),
        patientId: apt.patient?._id?.toString() || apt.patient?.toString(),
        onClick: (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          if (apt._id) {
            window.location.href = `/appointments?view=${apt._id}`;
          }
        }
      };
    });
    
    // 9. Bevorstehende Termine (nächste 10)
    const upcomingAppointments = await Appointment.find({
      ...locationFilter,
      ...doctorFilter,
      startTime: {
        $gte: now()
      },
      status: { $ne: 'cancelled' }
    })
      .populate('patient', 'firstName lastName')
      .populate('service', 'name code')
      .sort({ startTime: 1 })
      .limit(10)
      .lean();
    
    const formattedUpcomingAppointments = upcomingAppointments.map(apt => {
      const startTime = new Date(apt.startTime);
      const timeStr = startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const dateStr = startTime.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
      const patientName = apt.patient 
        ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim() 
        : 'Unbekannt';
      const serviceName = apt.service?.name || apt.type || 'Termin';
      
      return {
        primary: `${timeStr} - ${patientName}`,
        secondary: `${serviceName} • ${dateStr}`,
        icon: 'Schedule',
        chip: {
          label: apt.status || 'geplant',
          color: 'default'
        },
        appointmentId: apt._id?.toString(),
        patientId: apt.patient?._id?.toString() || apt.patient?.toString()
      };
    });
    
    // 10. Umsatz-Chart (letzte 7 Tage)
    const revenueChartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayRevenue = await Invoice.aggregate([
        {
          $match: {
            invoiceDate: {
              $gte: dayStart,
              $lte: dayEnd
            },
            status: { $ne: 'cancelled' }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]);
      
      const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      revenueChartData.push({
        label: dayNames[date.getDay()],
        value: dayRevenue[0]?.total || 0
      });
    }
    
    // 11. Termine-Chart (nach Service-Typ)
    const appointmentsByService = await Appointment.aggregate([
      {
        $match: {
          ...locationFilter,
          ...doctorFilter,
          startTime: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      {
        $lookup: {
          from: 'servicecatalogs',
          localField: 'service',
          foreignField: '_id',
          as: 'serviceData'
        }
      },
      {
        $unwind: {
          path: '$serviceData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$serviceData.name' || '$type' || 'Unbekannt',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);
    
    const appointmentsChartData = appointmentsByService.map(item => ({
      label: item._id || 'Unbekannt',
      value: item.count
    }));
    
    // 12. Umsatz-Verteilung (nach Billing-Typ)
    const revenueByBillingType = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: {
            $gte: startOfMonth,
            $lte: endOfMonth
          },
          status: { $ne: 'cancelled' }
        }
      },
      {
        $group: {
          _id: '$billingType' || 'privat',
          total: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    const revenueDistributionData = revenueByBillingType.map(item => ({
      label: item._id === 'kassenarzt' ? 'Kassenarzt' : item._id === 'privat' ? 'Privat' : item._id || 'Andere',
      value: item.total
    }));
    
    // 13. Kalender-Woche (nächste 7 Tage)
    const calendarWeekData = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayAppointments = await Appointment.countDocuments({
        ...locationFilter,
        ...doctorFilter,
        startTime: {
          $gte: dayStart,
          $lte: dayEnd
        },
        status: { $ne: 'cancelled' }
      });
      
      let status = 'normal';
      if (dayAppointments > 15) status = 'full';
      else if (dayAppointments > 10) status = 'busy';
      
      calendarWeekData.push({
        date: date.toISOString(),
        appointments: dayAppointments,
        status
      });
    }
    
    // 14. Wartezimmer (Termine heute mit Status waiting, in_progress)
    const waitingRoomAppointments = await Appointment.find({
      ...locationFilter,
      ...doctorFilter,
      startTime: {
        $gte: today,
        $lt: tomorrow
      },
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] }
    })
      .populate('patient', 'firstName lastName')
      .populate('service', 'name')
      .sort({ startTime: 1 })
      .limit(10)
      .lean();
    
    const waitingRoomData = waitingRoomAppointments.map((apt, index) => {
      const startTime = new Date(apt.startTime);
      const timeStr = startTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const now = new Date();
      const waitingTime = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60)));
      const patientName = apt.patient 
        ? `${apt.patient.firstName || ''} ${apt.patient.lastName || ''}`.trim() 
        : 'Unbekannt';
      const serviceName = apt.service?.name || apt.type || 'Termin';
      
      let status = 'waiting';
      if (apt.status === 'in_progress') status = 'in_progress';
      else if (index === 0) status = 'next';
      
      return {
        patient: patientName,
        time: timeStr,
        type: serviceName,
        waitingTime,
        status,
        appointmentId: apt._id?.toString(),
        patientId: apt.patient?._id?.toString() || apt.patient?.toString()
      };
    });
    
    // 15. Überfällige Termine
    const overdueAppointments = await Appointment.countDocuments({
      ...locationFilter,
      ...doctorFilter,
      startTime: {
        $lt: today
      },
      status: { $in: ['scheduled', 'confirmed'] }
    });
    
    res.json({
      success: true,
      data: {
        statistics: {
          patientsToday: patientsTodayCount,
          appointmentsToday,
          openInvoices,
          revenueToday: revenueTodayAmount,
          revenueMonth: revenueMonthAmount,
          appointmentsWeek,
          pendingDocuments,
          overdueAppointments
        },
        recentAppointments: formattedRecentAppointments,
        upcomingAppointments: formattedUpcomingAppointments,
        charts: {
          revenue: revenueChartData,
          appointments: appointmentsChartData,
          revenueDistribution: revenueDistributionData
        },
        calendarWeek: calendarWeekData,
        waitingRoom: waitingRoomData
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Dashboard-Statistiken',
      error: error.message
    });
  }
});

module.exports = router;

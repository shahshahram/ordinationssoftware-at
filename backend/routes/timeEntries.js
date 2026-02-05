const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const StaffProfile = require('../models/StaffProfile');
const TimeEntry = require('../models/TimeEntry');
const Absence = require('../models/Absence');
const { getAustrianHoliday } = require('../utils/austrianHolidays');

const getStaffProfileForUser = async (userId) => {
  const profile = await StaffProfile.findOne({ userId }).lean();
  if (!profile) return null;
  return profile;
};

const canManageEntry = async (user, entryStaffId) => {
  const profile = await getStaffProfileForUser(user._id);
  if (profile && profile._id && entryStaffId && profile._id.toString() === entryStaffId.toString()) return true;
  if (user.role && ['admin', 'super_admin'].includes(user.role)) return true;
  return false;
};

// GET /status – aktueller Zeiterfassungs-Status des eingeloggten Users
router.get('/status', auth, async (req, res) => {
  try {
    const profile = await getStaffProfileForUser(req.user._id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'Kein Personalprofil vorhanden. Zeiterfassung nur mit Personalprofil möglich.',
      });
    }
    const entry = await TimeEntry.findOne({ staffId: profile._id, end: null }).lean();
    res.json({
      success: true,
      data: {
        active: !!entry,
        entry: entry || null,
      },
    });
  } catch (error) {
    console.error('TimeEntry status error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Zeiterfassungs-Status',
      error: error.message,
    });
  }
});

// POST /start – Arbeitszeit oder Pause starten (Auto-Stop des laufenden Eintrags)
router.post('/start', auth, async (req, res) => {
  try {
    const profile = await getStaffProfileForUser(req.user._id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'Kein Personalprofil vorhanden. Zeiterfassung nur mit Personalprofil möglich.',
      });
    }
    const type = req.body.type === 'break' ? 'break' : 'work';
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : undefined;

    const activeEntry = await TimeEntry.findOne({ staffId: profile._id, end: null });
    if (activeEntry) {
      activeEntry.end = new Date();
      await activeEntry.save();
    }

    const newEntry = new TimeEntry({
      staffId: profile._id,
      start: new Date(),
      end: null,
      type,
      note: note || undefined,
    });
    await newEntry.save();

    res.status(201).json({
      success: true,
      data: newEntry,
    });
  } catch (error) {
    console.error('TimeEntry start error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Starten der Zeiterfassung',
      error: error.message,
    });
  }
});

// POST /stop – laufenden Eintrag beenden
router.post('/stop', auth, async (req, res) => {
  try {
    const profile = await getStaffProfileForUser(req.user._id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'Kein Personalprofil vorhanden. Zeiterfassung nur mit Personalprofil möglich.',
      });
    }
    const entry = await TimeEntry.findOne({ staffId: profile._id, end: null });
    if (!entry) {
      return res.status(400).json({
        success: false,
        message: 'Kein aktiver Zeiterfassungs-Eintrag vorhanden.',
      });
    }
    entry.end = new Date();
    await entry.save();
    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('TimeEntry stop error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Beenden der Zeiterfassung',
      error: error.message,
    });
  }
});

// GET /history – letzte Zeiteinträge des eingeloggten Users
router.get('/history', auth, async (req, res) => {
  try {
    const profile = await getStaffProfileForUser(req.user._id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'Kein Personalprofil vorhanden. Zeiterfassung nur mit Personalprofil möglich.',
      });
    }
    const entries = await TimeEntry.find({ staffId: profile._id })
      .sort({ start: -1 })
      .limit(50)
      .lean();
    res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error('TimeEntry history error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Zeiterfassung-Historie',
      error: error.message,
    });
  }
});

// GET /report – monatliche Stundenabrechnung (Timesheet)
router.get('/report', auth, async (req, res) => {
  try {
    const profile = await getStaffProfileForUser(req.user._id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'Kein Personalprofil vorhanden. Report nur mit Personalprofil möglich.',
      });
    }
    const monthParam = req.query.month;
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return res.status(400).json({
        success: false,
        message: 'Parameter month (YYYY-MM) ist erforderlich.',
      });
    }
    const [yearStr, monthStr] = monthParam.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (month < 1 || month > 12) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Monat.',
      });
    }
    let staffId = profile._id;
    if (req.query.staffId) {
      if (req.query.staffId !== String(profile._id)) {
        return res.status(403).json({
          success: false,
          message: 'Nur das eigene Personalprofil kann abgefragt werden.',
        });
      }
      staffId = profile._id;
    }

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const lastDay = endOfMonth.getDate();
    const now = new Date();

    const entriesInMonth = await TimeEntry.find({
      staffId,
      start: { $lt: endOfMonth },
      $or: [{ end: null }, { end: { $gt: startOfMonth } }],
    })
      .sort({ start: 1 })
      .lean();

    const absences = await Absence.find({
      staffId,
      status: 'approved',
      startsAt: { $lte: endOfMonth },
      endsAt: { $gte: startOfMonth },
    }).lean();

    const staffProfile = await StaffProfile.findById(staffId).lean();
    const weeklyHours = staffProfile?.weeklyHours ?? 40;
    const targetPerWeekday = weeklyHours / 5;

    const days = [];
    for (let day = 1; day <= lastDay; day++) {
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      const dayOfWeek = date.getDay();

      let actualHours = 0;
      const dayEntries = [];
      for (const entry of entriesInMonth) {
        const startMs = new Date(entry.start).getTime();
        const endMs = entry.end ? new Date(entry.end).getTime() : Math.min(now.getTime(), dayEnd.getTime());
        const effStart = Math.max(startMs, dayStart.getTime());
        const effEnd = Math.min(endMs, dayEnd.getTime());
        if (effEnd > effStart) {
          const durationMs = effEnd - effStart;
          if (entry.type === 'work') {
            actualHours += durationMs / (1000 * 60 * 60);
          }
          dayEntries.push({
            ...entry,
            start: entry.start,
            end: entry.end,
          });
        }
      }

      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holiday = getAustrianHoliday(date);
      const isHoliday = !!holiday;
      const targetHours = isWeekend || isHoliday ? 0 : targetPerWeekday;

      let absenceType = null;
      for (const a of absences) {
        const aStart = new Date(a.startsAt).getTime();
        const aEnd = new Date(a.endsAt).getTime();
        if (aStart <= dayEnd.getTime() && aEnd >= dayStart.getTime()) {
          absenceType = a.reason || null;
          break;
        }
      }

      const balance = absenceType != null ? 0 : actualHours - targetHours;

      days.push({
        date: `${year}-${monthStr.padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        actual: Math.round(actualHours * 100) / 100,
        target: Math.round(targetHours * 100) / 100,
        balance: Math.round(balance * 100) / 100,
        absence: absenceType,
        holiday: holiday ? holiday.name : null,
        entries: dayEntries,
      });
    }

    const totalActual = days.reduce((s, d) => s + d.actual, 0);
    const totalTarget = days.reduce((s, d) => s + d.target, 0);
    const totalBalance = days.reduce((s, d) => s + d.balance, 0);

    res.json({
      success: true,
      data: {
        days,
        summary: {
          totalActual: Math.round(totalActual * 100) / 100,
          totalTarget: Math.round(totalTarget * 100) / 100,
          totalBalance: Math.round(totalBalance * 100) / 100,
        },
      },
    });
  } catch (error) {
    console.error('TimeEntry report error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Reports',
      error: error.message,
    });
  }
});

// POST / – manuellen Zeiteintrag erstellen
router.post('/', auth, async (req, res) => {
  try {
    const profile = await getStaffProfileForUser(req.user._id);
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'Kein Personalprofil vorhanden. Zeiterfassung nur mit Personalprofil möglich.',
      });
    }
    const { date, start, end, type, note } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !start || !/^\d{1,2}:\d{2}$/.test(start)) {
      return res.status(400).json({
        success: false,
        message: 'date (YYYY-MM-DD) und start (HH:mm) sind erforderlich.',
      });
    }
    const startDate = new Date(date + 'T' + start + ':00');
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Ungültiges date/start.' });
    }
    let endDate = null;
    if (end != null && end !== '') {
      if (!/^\d{1,2}:\d{2}$/.test(end)) {
        return res.status(400).json({ success: false, message: 'end muss HH:mm sein.' });
      }
      endDate = new Date(date + 'T' + end + ':00');
      if (isNaN(endDate.getTime()) || endDate.getTime() <= startDate.getTime()) {
        return res.status(400).json({ success: false, message: 'end muss nach start liegen.' });
      }
    }
    const entryType = type === 'break' ? 'break' : 'work';
    const entryNote = typeof note === 'string' ? note.trim() : undefined;
    const newEntry = new TimeEntry({
      staffId: profile._id,
      start: startDate,
      end: endDate,
      type: entryType,
      note: entryNote || undefined,
    });
    await newEntry.save();
    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error('TimeEntry create error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Zeiteintrags',
      error: error.message,
    });
  }
});

// PUT /:id – Zeiteintrag aktualisieren
router.put('/:id', auth, async (req, res) => {
  try {
    const entry = await TimeEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Zeiteintrag nicht gefunden.' });
    }
    const allowed = await canManageEntry(req.user, entry.staffId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung, diesen Eintrag zu bearbeiten.',
      });
    }
    const { start, end, type, note } = req.body;
    if (start != null) entry.start = new Date(start);
    if (end !== undefined) entry.end = end == null || end === '' ? null : new Date(end);
    if (type === 'break' || type === 'work') entry.type = type;
    if (note !== undefined) entry.note = typeof note === 'string' ? note.trim() || undefined : undefined;
    if (isNaN(entry.start.getTime())) {
      return res.status(400).json({ success: false, message: 'Ungültiges start.' });
    }
    if (entry.end != null && (isNaN(entry.end.getTime()) || entry.end.getTime() <= entry.start.getTime())) {
      return res.status(400).json({ success: false, message: 'end muss nach start liegen.' });
    }
    await entry.save();
    res.json({ success: true, data: entry });
  } catch (error) {
    console.error('TimeEntry update error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Zeiteintrags',
      error: error.message,
    });
  }
});

// DELETE /:id – Zeiteintrag löschen
router.delete('/:id', auth, async (req, res) => {
  try {
    const entry = await TimeEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Zeiteintrag nicht gefunden.' });
    }
    const allowed = await canManageEntry(req.user, entry.staffId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'Keine Berechtigung, diesen Eintrag zu löschen.',
      });
    }
    await TimeEntry.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Zeiteintrag gelöscht.' });
  } catch (error) {
    console.error('TimeEntry delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Zeiteintrags',
      error: error.message,
    });
  }
});

module.exports = router;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  useTheme,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBackIos as ArrowBackIosIcon,
  ArrowForwardIos as ArrowForwardIosIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  ViewDay as ViewDayIcon,
  CalendarViewMonth as ViewMonthIcon,
  Event as EventIcon,
  HelpOutline as HelpOutlineIcon,
} from '@mui/icons-material';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchAppointments, createAppointment, updateAppointment, deleteAppointment } from '../store/slices/appointmentSlice';
import { fetchStaffProfiles } from '../store/slices/staffSlice';
import { fetchRooms } from '../store/slices/roomSlice';
import GradientDialogTitle from '../components/GradientDialogTitle';
import api from '../utils/api';
import { Warning } from '@mui/icons-material';
import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  staffId: string;
  staffName: string;
  roomId?: string;
  roomName?: string;
  type: string;
  status: string;
  patientId?: string;
  color: string;
}

interface NewEventState {
  title: string;
  start: string;
  end: string;
  staffId: string;
  roomId: string;
  type: string;
  status: string;
  patientId: string;
}

  const Calendar: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const _theme = useTheme();
    const { appointments, loading, error } = useAppSelector((state) => state.appointments);
    const { staffProfiles } = useAppSelector((state) => state.staff);
    const { rooms } = useAppSelector((state) => state.rooms);
    const { marginTopValue } = useGlobalNavigationOffset();

    // State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
    const [openEventDialog, setOpenEventDialog] = useState(false);
  const [newEvent, setNewEvent] = useState<NewEventState>({
    title: '',
    start: '',
    end: '',
    staffId: '',
    roomId: '',
    type: 'konsultation',
    status: 'confirmed',
    patientId: '',
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [timeBlocks, setTimeBlocks] = useState<any[]>([]);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [helpTab, setHelpTab] = useState(0);

  // Load TimeBlocks
  const loadTimeBlocks = async () => {
    try {
      let startDate: Date;
      let endDate: Date;
      
      if (viewMode === 'week') {
        startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      } else if (viewMode === 'month') {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      }
      
      const response = await api.get('/time-blocks', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'blocked'
      });
      
      if (response.success && response.data) {
        const blocks = Array.isArray(response.data) ? response.data : (response.data as any).data || [];
        setTimeBlocks(blocks);
      }
    } catch (error: any) {
      console.error('Fehler beim Laden der TimeBlocks:', error);
    }
  };

  useEffect(() => {
    dispatch(fetchAppointments());
    dispatch(fetchStaffProfiles());
    dispatch(fetchRooms());
    loadTimeBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTimeBlocks bewusst ausgelassen
  }, [dispatch]);

  useEffect(() => {
    loadTimeBlocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTimeBlocks bewusst ausgelassen
  }, [currentDate, viewMode]);

  const handleDateChange = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'prev') {
      if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
      else setCurrentDate(addDays(currentDate, -1));
    } else if (direction === 'next') {
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
      else setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(new Date());
    }
  };

  const handleViewModeChange = (mode: 'day' | 'week' | 'month') => {
    setViewMode(mode);
  };

  const handleOpenNewEventDialog = (date?: Date, hour?: number) => {
    const start = date ? new Date(new Date(date).setHours(hour || 8, 0, 0, 0)) : new Date();
    
    // Navigate to appointments page with prefilled date and time
    const dateStr = format(start, 'yyyy-MM-dd');
    const timeStr = format(start, 'HH:mm');
    navigate(`/appointments?openDialog=true&date=${dateStr}&time=${timeStr}`);
  };

  const handleOpenEditEventDialog = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setNewEvent({
      title: event.title,
      start: event.start.toISOString().substring(0, 16),
      end: event.end.toISOString().substring(0, 16),
      staffId: event.staffId,
      roomId: event.roomId || '',
      type: event.type,
      status: event.status,
      patientId: event.patientId || '', // Fetch patient ID for existing event
    });
    setOpenEventDialog(true);
  };

  const handleCloseEventDialog = () => {
    setOpenEventDialog(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.start || !newEvent.end || !newEvent.staffId) {
      alert('Bitte füllen Sie alle erforderlichen Felder aus.');
      return;
    }

    const eventData = {
      title: newEvent.title,
      startTime: new Date(newEvent.start).toISOString(),
      endTime: new Date(newEvent.end).toISOString(),
      doctor: newEvent.staffId,
      room: newEvent.roomId || undefined,
      patient: newEvent.patientId || undefined,
      type: newEvent.type,
      status: newEvent.status,
    };

    if (selectedEvent) {
      dispatch(updateAppointment({ id: selectedEvent.id, ...eventData }));
    } else {
      dispatch(createAppointment(eventData));
    }
    handleCloseEventDialog();
  };

  const handleDeleteEvent = () => {
    if (selectedEvent) {
      dispatch(deleteAppointment(selectedEvent.id));
      handleCloseEventDialog();
    }
  };

  const getEventsForCurrentView = () => {
    let startDate: Date;
    let endDate: Date;

    if (viewMode === 'month') {
      startDate = startOfWeek(startOfMonth(currentDate), { locale: de, weekStartsOn: 1 });
      endDate = endOfWeek(endOfMonth(currentDate), { locale: de, weekStartsOn: 1 });
    } else if (viewMode === 'week') {
      startDate = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
      endDate = endOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
    } else {
      startDate = currentDate;
      endDate = addDays(currentDate, 1);
    }

    const filteredAppointments = (Array.isArray(appointments) ? appointments : [])
      .filter(appointment => {
        const apptStart = new Date(appointment.startTime);
        const apptEnd = new Date(appointment.endTime);
        
        // Erweiterte Filterlogik - weniger restriktiv
        const isInRange = (
          (apptStart >= startDate && apptStart < endDate) || 
          (apptEnd > startDate && apptEnd <= endDate) ||
          (apptStart <= startDate && apptEnd >= endDate) // Termin überspannt den Zeitraum
        );
        
        return isInRange;
      });

    return filteredAppointments.map(appointment => {
      const assignedUsers = (appointment as any).assigned_users || [];
      let staffName = 'Unbekannt';
      
      if (assignedUsers.length > 0) {
        staffName = assignedUsers.map((u: any) => {
          if (u.firstName && u.lastName) {
            return `${u.firstName} ${u.lastName}`;
          } else if (u.first_name && u.last_name) {
            return `${u.first_name} ${u.last_name}`;
          } else if (u.display_name) {
            return u.display_name;
          }
          return u.email || 'Unbekannt';
        }).join(', ');
      } else {
        // Fallback: Suche nach Staff über doctor ID
        const doctorId = typeof appointment.doctor === 'string' ? appointment.doctor : (appointment.doctor as any)?._id;
        const staff = staffProfiles.find((s: any) => 
          s.user_id?.toString() === doctorId || 
          s.userId?.toString() === doctorId ||
          s._id?.toString() === doctorId ||
          s.userId?._id?.toString() === doctorId
        );
        staffName = staff?.display_name || staff?.first_name + ' ' + staff?.last_name || 'Unbekannt';
      }

      // Service-Farbe falls vorhanden
      const serviceColor = (appointment as any).service?.color_hex;
      const doctorId = typeof appointment.doctor === 'string' ? appointment.doctor : (appointment.doctor as any)?._id;
      const staff = staffProfiles.find((s: any) => 
        s.user_id?.toString() === doctorId || 
        s.userId?.toString() === doctorId ||
        s._id?.toString() === doctorId ||
        s.userId?._id?.toString() === doctorId
      );
      const staffColor_hex = staff?.color_hex;
      const eventColor = serviceColor || staffColor_hex || '#9CA3AF';
      
      // Get patient name - prioritize appointment.patient over appointment.title
      let patientName = 'Termin';
      const patient = (appointment as any).patient;
        
        if (patient) {
          const firstName = patient.firstName || patient.first_name;
          const lastName = patient.lastName || patient.last_name;
          
          if (firstName && lastName) {
            patientName = `${firstName} ${lastName}`;
          } else if (firstName) {
            patientName = firstName;
          }
        }
        
        if (patientName === 'Termin') {
          // Entferne HTML-Tags aus title falls vorhanden
          const titleText = appointment.title || 'Termin';
          patientName = titleText.replace(/<[^>]*>/g, '');
        }
        
        const roomName = rooms.find((r: any) => r._id === appointment.room)?.name;
        
        // Konvertiere doctor zu string für staffId
        const staffIdString = typeof appointment.doctor === 'string' 
          ? appointment.doctor 
          : (appointment.doctor as any)?._id || '';
        
        return {
          id: appointment._id,
          title: patientName,
          start: new Date(appointment.startTime),
          end: new Date(appointment.endTime),
          staffId: staffIdString,
          staffName: staffName,
          roomId: appointment.room,
          roomName: roomName,
          type: appointment.type,
          status: appointment.status,
          color: eventColor,
          tooltipText: `${patientName}\n${format(new Date(appointment.startTime), 'HH:mm')} - ${format(new Date(appointment.endTime), 'HH:mm')}\nPersonal: ${staffName || 'Unbekannt'}${roomName ? `\nRaum: ${roomName}` : ''}\nStatus: ${appointment.status}`
        };
      });
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForCurrentView().filter(event => isSameDay(event.start, currentDate));
    const dayTimeBlocks = timeBlocks.filter((block: any) => {
      const blockDate = new Date(block.startTime);
      return isSameDay(blockDate, currentDate);
    });

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }} />
          <Box sx={{ flexGrow: 1, textAlign: 'center', py: 1, fontWeight: 'bold' }}>
            {format(currentDate, 'EEEE, dd. MMMM yyyy', { locale: de })}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid #e0e0e0' }}>
            {hours.map(hour => (
              <Box key={hour} sx={{ height: '60px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 1, pt: 0.5, borderBottom: '1px dashed #e0e0e0' }}>
                <Typography variant="caption">{`${hour}:00`}</Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            {hours.map(hour => (
              <Box key={hour} sx={{ height: '60px', borderBottom: '1px dashed #e0e0e0' }} onClick={() => handleOpenNewEventDialog(currentDate, hour)} />
            ))}
            {/* Group events by time slots and render overlapping ones side-by-side */}
            {(() => {
              // Group events by their time slot
              const groupedEvents: { [key: string]: typeof dayEvents } = {};
              
              dayEvents.forEach(event => {
                const timeKey = `${format(event.start, 'yyyy-MM-dd-HH-mm')}`;
                if (!groupedEvents[timeKey]) {
                  groupedEvents[timeKey] = [];
                }
                groupedEvents[timeKey].push(event);
              });
              
              // Render events and time blocks
              const eventElements = Object.entries(groupedEvents).flatMap(([_timeKey, eventsAtTime]) => {
                const baseEvent = eventsAtTime[0];
                const startHour = baseEvent.start.getHours();
                const startMinute = baseEvent.start.getMinutes();
                const _endHour = baseEvent.end.getHours();
                const _endMinute = baseEvent.end.getMinutes();

                const top = (startHour * 60 + startMinute) / 60 * 60;
                const durationMinutes = (baseEvent.end.getTime() - baseEvent.start.getTime()) / (1000 * 60);
                const height = durationMinutes / 60 * 60;
                
                return eventsAtTime.map((event, index) => {
                  // Stack multiple events vertically
                  const isStacked = eventsAtTime.length > 1;
                  const stackedHeight = isStacked ? height / eventsAtTime.length : height;
                  const stackedTop = isStacked ? top + (index * stackedHeight) : top;
                  
                  const tooltipText = (event as any).tooltipText || `${event.title}\n${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}\nPersonal: ${event.staffName || 'Unbekannt'}${event.roomName ? `\nRaum: ${event.roomName}` : ''}\nStatus: ${event.status}`;
                  
                  // Mindesthöhe deutlich erhöht für Tagesansicht - mindestens 80px
                  const minHeightForDay = Math.max(stackedHeight, 80);
                  const actualHeight = Math.max(stackedHeight, minHeightForDay);
                  
                  // Für sehr kurze Termine: kompakte Darstellung mit Titel und Zeit in einer Zeile
                  const isVeryShort = stackedHeight < 50;
                  
                  return (
                    <Box
                      key={event.id}
                      onMouseEnter={(e) => {
                        setTooltip({ text: tooltipText, x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onMouseMove={(e) => {
                        setTooltip({ text: tooltipText, x: e.clientX + 10, y: e.clientY - 10 });
                      }}
                      sx={{
                        position: 'absolute',
                        top: `${stackedTop}px`,
                        left: '4px',
                        right: '4px',
                        width: 'calc(100% - 8px)',
                        height: `${actualHeight}px`,
                        minHeight: `${minHeightForDay}px`,
                        backgroundColor: event.color || '#1976d2',
                        color: 'white',
                        borderRadius: '8px',
                        p: isVeryShort ? 1 : 1.5,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '2px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: isVeryShort ? 'row' : 'column',
                        alignItems: isVeryShort ? 'center' : 'flex-start',
                        justifyContent: isVeryShort ? 'space-between' : 'flex-start',
                        gap: isVeryShort ? 1 : 0,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.02)',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                          zIndex: 10,
                          overflow: 'visible',
                        }
                      }}
                      onClick={() => handleOpenEditEventDialog(event)}
                    >
                      {isVeryShort ? (
                        // Kompakte Darstellung für sehr kurze Termine
                        <>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.875rem',
                              lineHeight: 1.2,
                              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              minWidth: 0
                            }}
                          >
                            {event.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.75rem',
                              opacity: 0.95,
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                              fontWeight: '600',
                              flexShrink: 0,
                              ml: 1
                            }}
                          >
                            {`${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`}
                          </Typography>
                        </>
                      ) : (
                        // Normale Darstellung für längere Termine
                        <>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              lineHeight: 1.3,
                              mb: 0.5,
                              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            {event.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            display="block"
                            sx={{ 
                              fontSize: '0.8rem',
                              opacity: 0.95,
                              mb: 0.5,
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                              fontWeight: '600',
                              flexShrink: 0
                            }}
                          >
                            {`${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`}
                          </Typography>
                          {event.staffName && actualHeight >= 100 && (
                            <Typography 
                              variant="caption" 
                              display="block"
                              sx={{ 
                                fontSize: '0.75rem',
                                opacity: 0.9,
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                            >
                              👤 {event.staffName}
                            </Typography>
                          )}
                          {event.roomName && actualHeight >= 120 && (
                            <Typography 
                              variant="caption" 
                              display="block"
                              sx={{ 
                                fontSize: '0.75rem',
                                opacity: 0.9,
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flexShrink: 0
                              }}
                            >
                              🏥 {event.roomName}
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                  );
                });
              });
              
              // Render TimeBlocks
              const timeBlockElements = dayTimeBlocks.map((block: any) => {
                const blockStart = new Date(block.startTime);
                const blockEnd = new Date(block.endTime);
                const startHour = blockStart.getHours();
                const startMinute = blockStart.getMinutes();
                const _endHour = blockEnd.getHours();
                const _endMinute = blockEnd.getMinutes();
                
                const top = (startHour * 60 + startMinute) / 60 * 60;
                const durationMinutes = (blockEnd.getTime() - blockStart.getTime()) / (1000 * 60);
                const height = Math.max((durationMinutes / 60 * 60), 80);
                
                return (
                  <Box
                    key={block._id}
                    sx={{
                      position: 'absolute',
                      top: `${top}px`,
                      left: '4px',
                      right: '4px',
                      width: 'calc(100% - 8px)',
                      height: `${height}px`,
                      minHeight: '80px',
                      backgroundColor: 'rgba(244, 67, 54, 0.7)',
                      color: 'white',
                      borderRadius: '8px',
                      p: 1.5,
                      overflow: 'hidden',
                      border: '2px solid #f44336',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                      zIndex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      gap: 0.5
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Warning sx={{ fontSize: '1.2rem' }} />
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Gesperrt
                      </Typography>
                    </Box>
                    {block.reason && (
                      <Typography variant="caption" sx={{ fontSize: '0.8rem', opacity: 0.95 }}>
                        {block.reason}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.9 }}>
                      {format(blockStart, 'HH:mm')} - {format(blockEnd, 'HH:mm')}
                    </Typography>
                  </Box>
                );
              });
              
              return [...eventElements, ...timeBlockElements];
            })()}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderWeekView = () => {
    const startWeek = startOfWeek(currentDate, { locale: de, weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(startWeek, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const weekEvents = getEventsForCurrentView();

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }} />
          {days.map(day => (
            <Box key={day.toISOString()} sx={{ flexGrow: 1, textAlign: 'center', py: 1, fontWeight: 'bold', borderRight: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" display="block">{format(day, 'EEE', { locale: de })}</Typography>
              <Typography variant="body2">{format(day, 'dd.MM.', { locale: de })}</Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexGrow: 1 }}>
          <Box sx={{ width: '60px', flexShrink: 0, borderRight: '1px solid #e0e0e0' }}>
            {hours.map(hour => (
              <Box key={hour} sx={{ height: '60px', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', pr: 1, pt: 0.5, borderBottom: '1px dashed #e0e0e0' }}>
                <Typography variant="caption">{`${hour}:00`}</Typography>
              </Box>
            ))}
          </Box>
          {days.map(day => {
            const dayEvents = weekEvents.filter(event => isSameDay(event.start, day));
            const dayTimeBlocks = timeBlocks.filter((block: any) => {
              const blockDate = new Date(block.startTime);
              return isSameDay(blockDate, day);
            });
            
            // Group events by their time slot
            const groupedEvents: { [key: string]: typeof dayEvents } = {};
            
            dayEvents.forEach(event => {
              const timeKey = `${format(event.start, 'yyyy-MM-dd-HH-mm')}`;
              if (!groupedEvents[timeKey]) {
                groupedEvents[timeKey] = [];
              }
              groupedEvents[timeKey].push(event);
            });
            
            return (
              <Box key={day.toISOString()} sx={{ flexGrow: 1, position: 'relative', borderRight: '1px solid', borderColor: 'divider' }}>
                {hours.map(hour => (
                  <Box key={hour} sx={{ height: '60px', borderBottom: '1px dashed #e0e0e0' }} onClick={() => handleOpenNewEventDialog(day, hour)} />
                ))}
                {/* TimeBlocks */}
                {dayTimeBlocks.map((block: any) => {
                  const blockStart = new Date(block.startTime);
                  const blockEnd = new Date(block.endTime);
                  const startHour = blockStart.getHours();
                  const startMinute = blockStart.getMinutes();
                  const durationMinutes = (blockEnd.getTime() - blockStart.getTime()) / (1000 * 60);
                  
                  const top = (startHour * 60 + startMinute) / 60 * 60;
                  const height = Math.max((durationMinutes / 60 * 60), 70);
                  
                  return (
                    <Box
                      key={block._id}
                      sx={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: '2px',
                        right: '2px',
                        height: `${height}px`,
                        minHeight: '70px',
                        backgroundColor: 'rgba(244, 67, 54, 0.7)',
                        color: 'white',
                        borderRadius: '6px',
                        p: 1.5,
                        overflow: 'hidden',
                        border: '2px solid #f44336',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                        zIndex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        gap: 0.5
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Warning sx={{ fontSize: '1rem' }} />
                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                          Gesperrt
                        </Typography>
                      </Box>
                      {block.reason && (
                        <Typography variant="caption" sx={{ fontSize: '0.75rem', opacity: 0.95 }}>
                          {block.reason}
                        </Typography>
                      )}
                      <Typography variant="caption" sx={{ fontSize: '0.7rem', opacity: 0.9 }}>
                        {format(blockStart, 'HH:mm')} - {format(blockEnd, 'HH:mm')}
                      </Typography>
                    </Box>
                  );
                })}
                {Object.entries(groupedEvents).flatMap(([_timeKey, eventsAtTime]) => {
                  const baseEvent = eventsAtTime[0];
                  const startHour = baseEvent.start.getHours();
                  const startMinute = baseEvent.start.getMinutes();
                  const durationMinutes = (baseEvent.end.getTime() - baseEvent.start.getTime()) / (1000 * 60);

                  const top = (startHour * 60 + startMinute) / 60 * 60;
                  const height = durationMinutes / 60 * 60;
                  
                  return eventsAtTime.map((event, index) => {
                    const isStacked = eventsAtTime.length > 1;
                    const stackedHeight = isStacked ? height / eventsAtTime.length : height;
                    const stackedTop = isStacked ? top + (index * stackedHeight) : top;
                    // Mindesthöhe deutlich erhöht für bessere Lesbarkeit
                    const minHeight = Math.max(stackedHeight, 70);
                    // Berechne die tatsächliche Höhe mit Mindesthöhe
                    const actualHeight = Math.max(stackedHeight, minHeight);

                    const tooltipText = (event as any).tooltipText || `${event.title}\n${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}\nPersonal: ${event.staffName || 'Unbekannt'}${event.roomName ? `\nRaum: ${event.roomName}` : ''}\nStatus: ${event.status}`;
                    
                    return (
                      <Box
                        key={event.id}
                        onMouseEnter={(e) => {
                          setTooltip({ text: tooltipText, x: e.clientX, y: e.clientY });
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onMouseMove={(e) => {
                          setTooltip({ text: tooltipText, x: e.clientX + 10, y: e.clientY - 10 });
                        }}
                        sx={{
                          position: 'absolute',
                          top: `${stackedTop}px`,
                          left: '2px',
                          right: '2px',
                          height: `${actualHeight}px`,
                          minHeight: `${minHeight}px`,
                          backgroundColor: event.color || '#1976d2',
                          color: 'white',
                          borderRadius: '6px',
                          p: 1.5,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '2px solid rgba(255,255,255,0.4)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          zIndex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-start',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.03)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            zIndex: 10,
                            overflow: 'visible',
                          }
                        }}
                        onClick={() => handleOpenEditEventDialog(event)}
                      >
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                            lineHeight: 1.3,
                            mb: 0.5,
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          {event.title}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          display="block"
                          sx={{ 
                            fontSize: '0.75rem',
                            opacity: 0.95,
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            fontWeight: '600',
                            mb: 0.25,
                            flexShrink: 0
                          }}
                        >
                          {`${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}`}
                        </Typography>
                        {event.staffName && actualHeight >= 60 && (
                          <Typography 
                            variant="caption" 
                            display="block"
                            sx={{ 
                              fontSize: '0.7rem',
                              opacity: 0.9,
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            👤 {event.staffName}
                          </Typography>
                        )}
                        {event.roomName && actualHeight >= 80 && (
                          <Typography 
                            variant="caption" 
                            display="block"
                            sx={{ 
                              fontSize: '0.7rem',
                              opacity: 0.9,
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            🏥 {event.roomName}
                          </Typography>
                        )}
                      </Box>
                    );
                  });
                })}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderMonthView = () => {
    const startMonth = startOfMonth(currentDate);
    const endMonth = endOfMonth(currentDate);
    const startDate = startOfWeek(startMonth, { locale: de, weekStartsOn: 1 });
    const endDate = endOfWeek(endMonth, { locale: de, weekStartsOn: 1 });

    const days = [];
    let day = startDate;

    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }

    const monthEvents = getEventsForCurrentView();

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', border: '1px solid #e0e0e0', height: '100%', overflowY: 'auto' }}>
        {Array.from({ length: 7 }, (_, i) => (
          <Box key={i} sx={{ textAlign: 'center', p: 1, fontWeight: 'bold', borderBottom: '1px solid #e0e0e0', borderRight: '1px solid #e0e0e0', '&:last-child': { borderRight: 'none' } }}>
            {format(addDays(startOfWeek(new Date(), { locale: de, weekStartsOn: 1 }), i), 'EEE', { locale: de })}
          </Box>
        ))}
        {days.map((dayItem, index) => {
          const dayEvents = monthEvents.filter(event => isSameDay(event.start, dayItem));
          return (
            <Box
              key={index}
              sx={{
                borderRight: '1px solid',
                borderBottom: '1px solid',
                borderColor: 'divider',
                minHeight: '100px',
                p: 0.5,
                backgroundColor: isSameMonth(dayItem, currentDate) ? 'background.paper' : 'action.hover',
                opacity: isSameMonth(dayItem, currentDate) ? 1 : 0.7,
                cursor: 'pointer',
                '&:nth-of-type(7n)': { borderRight: 'none' },
              }}
              onClick={() => handleOpenNewEventDialog(dayItem)}
            >
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: isSameDay(dayItem, new Date()) ? 'primary.main' : 'text.primary' }}>
                {format(dayItem, 'd', { locale: de })}
              </Typography>
              {dayEvents.map(event => {
                const tooltipText = `${event.title}\n${format(event.start, 'HH:mm')} - ${format(event.end, 'HH:mm')}\nPersonal: ${event.staffName || 'Unbekannt'}${event.roomName ? `\nRaum: ${event.roomName}` : ''}\nStatus: ${event.status}`;
                return (
                  <Box
                    key={event.id}
                    onMouseEnter={(e) => {
                      console.log('MouseEnter event detected:', event.id);
                      setTooltip({ text: tooltipText, x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    onMouseMove={(e) => {
                      setTooltip({ text: tooltipText, x: e.clientX + 10, y: e.clientY - 10 });
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditEventDialog(event);
                    }}
                    sx={{
                      backgroundColor: event.color || '#1976d2',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      padding: '4px 6px',
                      marginBottom: '3px',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      cursor: 'pointer',
                      display: 'block',
                      width: '100%',
                      border: '1px solid rgba(255,255,255,0.3)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        zIndex: 10,
                      }
                    }}
                  >
                    {`${format(event.start, 'HH:mm')} ${event.title}`}
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Fehler beim Laden der Termine: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3, 
      height: 'calc(100vh - 64px - 48px)', 
      display: 'flex', 
      flexDirection: 'column',
      mt: marginTopValue !== '0px' ? marginTopValue : 0,
      transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>Terminkalender</Typography>
        <Tooltip title="Hilfe & Leitfaden">
          <IconButton
            onClick={() => setHelpDialogOpen(true)}
            color="primary"
            size="small"
          >
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <IconButton onClick={() => handleDateChange('prev')}>
            <ArrowBackIosIcon />
          </IconButton>
          <IconButton onClick={() => handleDateChange('next')}>
            <ArrowForwardIosIcon />
          </IconButton>
          <Button onClick={() => handleDateChange('today')} variant="outlined" sx={{ ml: 1 }}>
            <TodayIcon sx={{ mr: 1 }} /> Heute
          </Button>
        </Box>
        <Typography variant="h5" sx={{ mx: 2 }}>
          {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: de })}
          {viewMode === 'week' && `KW ${format(currentDate, 'w', { locale: de })} ${format(currentDate, 'yyyy', { locale: de })}`}
          {viewMode === 'day' && format(currentDate, 'dd. MMMM yyyy', { locale: de })}
        </Typography>
        <Box>
          <Button onClick={() => handleViewModeChange('day')} variant={viewMode === 'day' ? 'contained' : 'outlined'} sx={{ mr: 1 }}>
            <ViewDayIcon sx={{ mr: 1 }} /> Tag
          </Button>
          <Button onClick={() => handleViewModeChange('week')} variant={viewMode === 'week' ? 'contained' : 'outlined'} sx={{ mr: 1 }}>
            <ViewWeekIcon sx={{ mr: 1 }} /> Woche
          </Button>
          <Button onClick={() => handleViewModeChange('month')} variant={viewMode === 'month' ? 'contained' : 'outlined'}>
            <ViewMonthIcon sx={{ mr: 1 }} /> Monat
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden', bgcolor: 'background.paper' }}>
        {viewMode === 'day' && renderDayView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'month' && renderMonthView()}
      </Box>

      <Dialog 
        open={openEventDialog} 
        onClose={handleCloseEventDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          }
        }}
      >
        <GradientDialogTitle
          isEdit={!!selectedEvent}
          title={selectedEvent ? 'Termin bearbeiten' : 'Neuen Termin erstellen'}
          icon={<EventIcon />}
          gradientColors={{ from: '#06b6d4', to: '#0891b2' }}
        />
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 400 }}>
            <TextField
              label="Titel"
              fullWidth
              value={newEvent.title}
              onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Startzeit"
                type="datetime-local"
                fullWidth
                value={newEvent.start}
                onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <TextField
                label="Endzeit"
                type="datetime-local"
                fullWidth
                value={newEvent.end}
                onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>
            <TextField
              label="Mitarbeiter"
              select
              fullWidth
              value={newEvent.staffId}
              onChange={(e) => setNewEvent({ ...newEvent, staffId: e.target.value })}
            >
              {staffProfiles.map((staff: any) => (
                <MenuItem key={staff._id} value={staff.user_id}>
                  {staff.display_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Raum"
              select
              fullWidth
              value={newEvent.roomId}
              onChange={(e) => setNewEvent({ ...newEvent, roomId: e.target.value })}
            >
              <MenuItem value="">Kein Raum</MenuItem>
              {(Array.isArray(rooms) ? rooms : []).map((room: any) => (
                <MenuItem key={room._id} value={room._id}>
                  {room.name}
                </MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Termin-Typ"
                select
                fullWidth
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
              >
                {['konsultation', 'untersuchung', 'operation', 'nachsorge', 'beratung', 'gruppentermin', 'impfung', 'vorsorge', 'labor', 'sonstiges'].map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Status"
                select
                fullWidth
                value={newEvent.status}
                onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
              >
                {['confirmed', 'pending', 'cancelled', 'completed', 'no-show'].map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <TextField
              label="Patienten-ID (optional)"
              fullWidth
              value={newEvent.patientId}
              onChange={(e) => setNewEvent({ ...newEvent, patientId: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {selectedEvent && (
            <Button onClick={handleDeleteEvent} color="error">
              Löschen
            </Button>
          )}
          <Button onClick={handleCloseEventDialog}>Abbrechen</Button>
          <Button onClick={handleSaveEvent} variant="contained" color="primary">
            {selectedEvent ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Custom Tooltip */}
      {tooltip && (
        <Box
          sx={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            whiteSpace: 'pre-line',
            zIndex: 10000,
            pointerEvents: 'none',
            maxWidth: '250px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {tooltip.text}
        </Box>
      )}

      {/* Hilfe & Leitfaden Dialog */}
      <Dialog
        open={helpDialogOpen}
        onClose={() => setHelpDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { minHeight: '600px' }
        }}
      >
        <GradientDialogTitle 
          title="Hilfe & Leitfaden: Terminkalender"
          onClose={() => setHelpDialogOpen(false)}
        />
        <DialogContent>
          <Tabs 
            value={helpTab} 
            onChange={(_, v) => setHelpTab(v)} 
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Übersicht" />
            <Tab label="Ansichten" />
            <Tab label="Termin erstellen" />
            <Tab label="Navigation" />
            <Tab label="Best Practices" />
          </Tabs>

          {helpTab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Terminkalender
                </Typography>
                <Typography variant="body1" paragraph>
                  Der Terminkalender bietet eine visuelle Übersicht über alle Termine in verschiedenen 
                  Ansichten (Tag, Woche, Monat).
                </Typography>
              </Box>

              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Hauptfunktionen
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📅 <strong>Kalenderansichten:</strong> Tag, Woche, Monat</li>
                  <li>➕ <strong>Termin erstellen:</strong> Neue Termine direkt im Kalender anlegen</li>
                  <li>✏️ <strong>Termin bearbeiten:</strong> Bestehende Termine ändern</li>
                  <li>🗑️ <strong>Termin löschen:</strong> Termine entfernen</li>
                  <li>👤 <strong>Mitarbeiter:</strong> Termine nach Mitarbeitern filtern</li>
                  <li>🏥 <strong>Räume:</strong> Termine nach Räumen anzeigen</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Kalenderansichten
                </Typography>
                <Typography variant="body2" paragraph>
                  Der Kalender bietet drei verschiedene Ansichten:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Tagesansicht
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📅 Zeigt alle Termine eines Tages</li>
                  <li>⏰ Stundenweise Darstellung</li>
                  <li>✅ Ideal für detaillierte Tagesplanung</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Wochenansicht
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📅 Zeigt alle Termine einer Woche</li>
                  <li>📊 Übersichtliche Wochenplanung</li>
                  <li>✅ Standardansicht</li>
                </Box>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Monatsansicht
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>📅 Zeigt alle Termine eines Monats</li>
                  <li>📊 Monatliche Übersicht</li>
                  <li>✅ Ideal für langfristige Planung</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 2 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Termin erstellen
                </Typography>
                <Typography variant="body2" paragraph>
                  So erstellen Sie einen neuen Termin im Kalender:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Schritt-für-Schritt Anleitung
                </Typography>
                <Box component="ol" sx={{ pl: 3, mb: 2 }}>
                  <li>Klicken Sie auf einen freien Zeitbereich im Kalender</li>
                  <li>Der Termin-Dialog öffnet sich</li>
                  <li>Geben Sie die Termindetails ein:
                    <Box component="ul" sx={{ pl: 3, mt: 1 }}>
                      <li><strong>Titel:</strong> Terminbezeichnung</li>
                      <li><strong>Startzeit:</strong> Beginn des Termins</li>
                      <li><strong>Endzeit:</strong> Ende des Termins</li>
                      <li><strong>Mitarbeiter:</strong> Zugewiesener Mitarbeiter</li>
                      <li><strong>Raum:</strong> Zugewiesener Raum</li>
                      <li><strong>Typ:</strong> Termintyp (z.B. Konsultation)</li>
                      <li><strong>Status:</strong> Terminstatus</li>
                    </Box>
                  </li>
                  <li>Klicken Sie auf "Erstellen"</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Navigation
                </Typography>
                <Typography variant="body2" paragraph>
                  So navigieren Sie im Kalender:
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Navigation
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>⬅️ <strong>Zurück:</strong> Vorherige Periode (Tag/Woche/Monat)</li>
                  <li>➡️ <strong>Vor:</strong> Nächste Periode (Tag/Woche/Monat)</li>
                  <li>📅 <strong>Heute:</strong> Zurück zum aktuellen Tag</li>
                  <li>🔄 <strong>Ansicht wechseln:</strong> Zwischen Tag, Woche und Monat wechseln</li>
                </Box>
              </Box>
            </Box>
          )}

          {helpTab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="h6" gutterBottom color="primary">
                  Best Practices
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                  Terminplanung
                </Typography>
                <Box component="ul" sx={{ pl: 3, mb: 2 }}>
                  <li>✅ Nutzen Sie die passende Ansicht für Ihre Planung</li>
                  <li>✅ Berücksichtigen Sie Pufferzeiten</li>
                  <li>✅ Überprüfen Sie Raum- und Mitarbeiterverfügbarkeit</li>
                  <li>✅ Aktualisieren Sie Termine regelmäßig</li>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHelpDialogOpen(false)} variant="contained">
            Schließen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;
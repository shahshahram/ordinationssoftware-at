import { useState, useCallback, useMemo } from 'react';

interface TimeSlot {
  day: Date;
  time: string;
}

interface UseTimeSlotSelectionReturn {
  isSelecting: boolean;
  selectionStart: TimeSlot | null;
  selectionEnd: TimeSlot | null;
  startSelection: (day: Date, time: string) => void;
  updateSelection: (day: Date, time: string) => void;
  endSelection: () => void;
  clearSelection: () => void;
  isSlotInSelection: (day: Date, time: string) => boolean;
  getSelectionRange: () => { start: Date; end: Date } | null;
}

export const useTimeSlotSelection = (): UseTimeSlotSelectionReturn => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<TimeSlot | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<TimeSlot | null>(null);

  const startSelection = useCallback((day: Date, time: string) => {
    setIsSelecting(true);
    const slot: TimeSlot = { day: new Date(day), time };
    setSelectionStart(slot);
    setSelectionEnd(slot);
  }, []);

  const updateSelection = useCallback((day: Date, time: string) => {
    if (!isSelecting) return;
    setSelectionEnd({ day: new Date(day), time });
  }, [isSelecting]);

  const endSelection = useCallback(() => {
    setIsSelecting(false);
  }, []);

  const clearSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  const isSlotInSelection = useCallback((day: Date, time: string): boolean => {
    if (!selectionStart || !selectionEnd) return false;

    const slotTime = new Date(day);
    const [hour, minute] = time.split(':').map(Number);
    slotTime.setHours(hour, minute, 0, 0);

    const start = new Date(selectionStart.day);
    const [startHour, startMin] = selectionStart.time.split(':').map(Number);
    start.setHours(startHour, startMin, 0, 0);

    const end = new Date(selectionEnd.day);
    const [endHour, endMin] = selectionEnd.time.split(':').map(Number);
    end.setHours(endHour, endMin, 0, 0);

    // Normalisiere Start/End (kann rückwärts sein)
    const actualStart = start <= end ? start : end;
    const actualEnd = start <= end ? end : start;

    return slotTime >= actualStart && slotTime <= actualEnd;
  }, [selectionStart, selectionEnd]);

  const getSelectionRange = useCallback((): { start: Date; end: Date } | null => {
    if (!selectionStart || !selectionEnd) return null;

    const start = new Date(selectionStart.day);
    const [startHour, startMin] = selectionStart.time.split(':').map(Number);
    start.setHours(startHour, startMin, 0, 0);

    const end = new Date(selectionEnd.day);
    const [endHour, endMin] = selectionEnd.time.split(':').map(Number);
    end.setHours(endHour, endMin, 0, 0);

    // Normalisiere Start/End (kann rückwärts sein)
    const actualStart = start <= end ? start : end;
    const actualEnd = start <= end ? end : start;

    // End-Zeit auf Ende des Slots setzen (z.B. 10:00 -> 10:15 wenn 15min Slots)
    const slotDuration = 15; // Minuten pro Slot
    const endWithDuration = new Date(actualEnd);
    endWithDuration.setMinutes(endWithDuration.getMinutes() + slotDuration);

    return { start: actualStart, end: endWithDuration };
  }, [selectionStart, selectionEnd]);

  return {
    isSelecting,
    selectionStart,
    selectionEnd,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    isSlotInSelection,
    getSelectionRange
  };
};




import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import patientReducer from './slices/patientSlice';
import appointmentReducer from './slices/appointmentSlice';
import billingReducer from './slices/billingSlice';
import documentReducer from './slices/documentSlice';
import staffReducer from './slices/staffSlice';
import roomReducer from './slices/roomSlice';
import locationReducer from './slices/locationSlice';
import locationWeeklyScheduleReducer from './slices/locationWeeklyScheduleSlice';
import weeklyScheduleReducer from './slices/weeklyScheduleSlice';
import icd10Reducer from './slices/icd10Slice';
import diagnosisReducer from './slices/diagnosisSlice';
import icd10PersonalListsReducer from './slices/icd10PersonalListsSlice';
import slotReservationReducer from './slices/slotReservationSlice';
import documentTemplateReducer from './slices/documentTemplateSlice';
import checkinReducer from './slices/checkinSlice';
import uiReducer from './slices/uiSlice';
import dekursReducer from './slices/dekursSlice';
import dashboardWidgetsReducer from './slices/dashboardWidgetsSlice';
import internalMessagesReducer from './slices/internalMessagesSlice';
import tasksReducer from './slices/tasksSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    patients: patientReducer,
    appointments: appointmentReducer,
    billing: billingReducer,
    documents: documentReducer,
    staff: staffReducer,
    rooms: roomReducer,
    locations: locationReducer,
    locationWeeklySchedules: locationWeeklyScheduleReducer,
    weeklySchedules: weeklyScheduleReducer,
    icd10: icd10Reducer,
    diagnoses: diagnosisReducer,
    icd10PersonalLists: icd10PersonalListsReducer,
    slotReservations: slotReservationReducer,
    documentTemplates: documentTemplateReducer,
    checkin: checkinReducer,
    ui: uiReducer,
    dekurs: dekursReducer,
    dashboardWidgets: dashboardWidgetsReducer,
    internalMessages: internalMessagesReducer,
    tasks: tasksReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

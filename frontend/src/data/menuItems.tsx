import React from 'react';
import {
  Dashboard,
  People,
  CalendarToday,
  Receipt,
  Description,
  HealthAndSafety,
  Person,
  Assessment,
  Security,
  Groups,
  Settings,
  Extension,
  LocationOn,
  Dashboard as DashboardIcon,
  CalendarMonth,
  MedicalServices,
  BookOnline,
  Search,
  PersonAdd,
  Login,
  Warning,
  Category as CategoryIcon,
  Storage,
  Build,
  Article,
  Assignment,
  Mail,
  ChatBubbleOutline,
  Schedule,
  CreditCard,
  AccessTime,
  PendingActions,
  Cloud,
  Image,
  Science,
  CloudDownload,
} from '@mui/icons-material';

export interface MenuItem {
  text: string;
  icon: React.ReactElement;
  path: string;
  subItems?: MenuItem[];
}

export const menuItems: MenuItem[] = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { 
    text: 'Patienten', 
    icon: <People />, 
    path: '/patients',
    subItems: [
      { text: 'Patientenliste', icon: <People />, path: '/patients' },
      { text: 'Temporäre Patienten', icon: <Warning />, path: '/temporary-patients' },
      { text: 'Hinweisliste', icon: <Warning />, path: '/patients-hints' },
      { text: 'Patientenaufnahme', icon: <PersonAdd />, path: '/patient-admission' },
      { text: 'Self-Check-In', icon: <Login />, path: '/self-checkin' },
      { text: 'Demo & Test', icon: <Search />, path: '/patient-admission-demo' },
      { text: 'Adressbuch', icon: <Person />, path: '/address-book' },
    ]
  },
  { 
    text: 'Termine', 
    icon: <CalendarToday />, 
    path: '/appointments',
    subItems: [
      { text: 'Terminverwaltung', icon: <CalendarToday />, path: '/appointments' },
      { text: 'Online-Buchungen', icon: <BookOnline />, path: '/online-bookings' },
      { text: 'Terminkalender', icon: <CalendarToday />, path: '/demo-calendar' },
      { text: 'Dienstkalender', icon: <CalendarToday />, path: '/service-demo-calendar' },
      { text: 'Verfügbarkeiten', icon: <Schedule />, path: '/availability' },
      { text: 'Warteliste', icon: <PendingActions />, path: '/waiting-list' },
    ]
  },
  {
    text: 'Mitarbeiterplanung',
    icon: <Groups />,
    path: '/staff-planning',
    subItems: [
      { text: 'Mitarbeiterplanung', icon: <DashboardIcon />, path: '/staff-planning' },
      { text: 'Personal', icon: <Groups />, path: '/staff' },
      { text: 'Arbeitszeiten', icon: <Schedule />, path: '/work-shifts' },
      { text: 'Zeiterfassung', icon: <AccessTime />, path: '/timesheet' },
      { text: 'Abwesenheiten', icon: <PendingActions />, path: '/absences' },
      { text: 'Verfügbarkeiten', icon: <Schedule />, path: '/availability' },
      { text: 'Online-Buchungen', icon: <BookOnline />, path: '/online-bookings' },
    ]
  },
  { 
    text: 'Abrechnung', 
    icon: <Receipt />, 
    path: '/billing',
    subItems: [
      { text: 'Rechnungen', icon: <Receipt />, path: '/billing' },
      { text: 'Erstattungen', icon: <Receipt />, path: '/reimbursements' },
      { text: 'Abrechnungsberichte', icon: <Assessment />, path: '/billing-reports' },
      { text: 'Journal', icon: <Article />, path: '/journal' },
      { text: 'Registrierkassen-Verwaltung', icon: <Receipt />, path: '/cash-register' },
    ]
  },
  { 
    text: 'Dokumente', 
    icon: <Description />, 
    path: '/documents',
    subItems: [
      { text: 'Dokumente', icon: <Description />, path: '/documents' },
      { text: 'Briefvorlagen', icon: <Description />, path: '/letter-templates' },
      // { text: 'Template Management', icon: <Description />, path: '/template-management' }, // Ausgeblendet
      { text: 'Dokument-Templates (Admin)', icon: <Build />, path: '/document-templates' },
      { text: 'Dekurs-Vorlagen (Admin)', icon: <Assignment />, path: '/dekurs-vorlagen' },
      { text: 'XDS Dokumente', icon: <Storage />, path: '/xds-documents' },
    ]
  },
  { 
    text: 'ELGA', 
    icon: <HealthAndSafety />, 
    path: '/elga',
    subItems: [
      { text: 'ELGA Übersicht', icon: <HealthAndSafety />, path: '/elga' },
      { text: 'Valuesets', icon: <CategoryIcon />, path: '/elga-valuesets' },
      { text: 'E-Card Validierung', icon: <CreditCard />, path: '/ecard-validation' },
    ]
  },
  { text: 'Interne Nachrichten', icon: <Mail />, path: '/internal-messages' },
  { text: 'Chat', icon: <ChatBubbleOutline />, path: '/chat' },
  { 
    text: 'Einstellungen', 
    icon: <Settings />, 
    path: '/settings',
    subItems: [
      { text: 'Allgemeine Einstellungen', icon: <Settings />, path: '/settings' },
      { text: 'Update-Monitoring', icon: <CloudDownload />, path: '/update-monitoring' },
      { 
        text: 'Standorte', 
        icon: <LocationOn />, 
        path: '/locations',
        subItems: [
          { text: 'Standortverwaltung', icon: <LocationOn />, path: '/locations' },
          { text: 'Standort-Dashboard', icon: <DashboardIcon />, path: '/location-dashboard' },
          { text: 'Standort-Kalender', icon: <CalendarMonth />, path: '/location-calendar' },
          { text: 'Ordinationszeiten', icon: <AccessTime />, path: '/clinic-hours' },
          { text: 'Medizinische Fachrichtungen', icon: <MedicalServices />, path: '/medical-specialties' },
        ]
      },
      { 
        text: 'Benutzer', 
        icon: <Person />, 
        path: '/users',
        subItems: [
          { text: 'Benutzer', icon: <Person />, path: '/users' },
          { text: 'Personal', icon: <Groups />, path: '/staff' },
        ]
      },
      { 
        text: 'Leistungen', 
        icon: <MedicalServices />, 
        path: '/service-catalog',
        subItems: [
          { text: 'Leistungskatalog', icon: <MedicalServices />, path: '/service-catalog' },
          { text: 'Service-Kategorien', icon: <CategoryIcon />, path: '/service-categories' },
          { text: 'Service-Code-Mapping', icon: <Storage />, path: '/service-code-mapping' },
          { text: 'Buchungen', icon: <BookOnline />, path: '/service-bookings' },
          { text: 'Ressourcen', icon: <Receipt />, path: '/resources' },
        ]
      },
      { 
        text: 'Medikamente', 
        icon: <MedicalServices />, 
        path: '/medication-import',
        subItems: [
          { text: 'Katalog Import', icon: <MedicalServices />, path: '/medication-import' },
        ]
      },
      { 
        text: 'AbrechnungKonfig', 
        icon: <Receipt />, 
        path: '/billing-config',
        subItems: [
          { text: 'Tarifverwaltung', icon: <Receipt />, path: '/tariff-management' },
          { text: 'Versicherungsverwaltung', icon: <HealthAndSafety />, path: '/insurance-providers' },
          { text: 'Kassa Teststrecke', icon: <Build />, path: '/kassa-test' },
          { text: 'ELDA Teststrecke', icon: <Build />, path: '/elda-test' },
          { text: 'WAHonline Teststrecke', icon: <Build />, path: '/wahonline-test' },
        ]
      },
      { 
        text: 'ICD-10', 
        icon: <Search />, 
        path: '/icd10-demo',
        subItems: [
          { text: 'ICD-10 Demo', icon: <Search />, path: '/icd10-demo' },
          { text: 'Katalog-Management', icon: <Settings />, path: '/icd10-catalog-management' },
        ]
      },
      { text: 'RBAC Management', icon: <Security />, path: '/rbac-management' },
      { text: 'RBAC Discovery', icon: <Extension />, path: '/rbac-discovery' },
      { text: 'Berichte', icon: <Assessment />, path: '/reports' },
      { text: 'Sicherheit', icon: <Security />, path: '/security' },
      { text: 'Integrations-Status', icon: <Settings />, path: '/integration-status' },
      { 
        text: 'DICOM & PACS', 
        icon: <Image />, 
        path: '/dicom-providers',
        subItems: [
          { text: 'DICOM-Provider', icon: <Cloud />, path: '/dicom-providers' },
          { text: 'Teststrecke', icon: <Build />, path: '/dicom-test' },
        ]
      },
      { 
        text: 'Labor & Schnittstellen', 
        icon: <Science />, 
        path: '/labor-providers',
        subItems: [
          { text: 'Labor-Provider', icon: <Science />, path: '/labor-providers' },
          { text: 'Teststrecke', icon: <Build />, path: '/labor-test' },
        ]
      },
    ]
  },
];

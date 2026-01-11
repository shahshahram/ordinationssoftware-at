#!/bin/bash
# Script to automatically add useGlobalNavigationOffset to all pages
# This script identifies pages that need the hook and provides instructions

PAGES_DIR="src/pages"
HOOK_NAME="useGlobalNavigationOffset"
IMPORT_LINE="import { useGlobalNavigationOffset } from '../hooks/useGlobalNavigationOffset';"
HOOK_CALL="const { marginTopValue } = useGlobalNavigationOffset();"

echo "=== Seiten, die noch aktualisiert werden müssen ==="
echo ""
for file in $(find "$PAGES_DIR" -name "*.tsx" -type f | sort); do
  if ! grep -q "$HOOK_NAME" "$file"; then
    # Skip Login, Unauthorized, and test/demo pages
    if [[ ! "$file" =~ (Login|Unauthorized|Test|Demo|Discovery|Setup|DicomTest|ELDATest|KassaTest|LaborTest|WAHonlineTest|PatientAdmissionTest|PatientAdmissionDemo|ICD10Demo|DemoCalendar|ServiceDemoCalendar|RBACDiscovery|UpdateMonitoringPage|XdsDocumentManagement|ELGAValuesetManagement|ICD10CatalogManagement|DicomProviderManagement|LaborProviderManagement|InsuranceProviderManagement|ECardValidation|ELGA|IntegrationStatus|Security|RBACManagement|SuperAdminSetup|TemporaryPatients|PatientsHints|SelfCheckInPage|OnlineBooking|OnlineBookings|PatientBooking|PatientAdmissionPage|MedicationImport|AmbulanzbefundEditor|AppointmentDetail|DiagnosisDetail|DocumentDetail|DekursVorlageAdmin|DekursVorlagenAdmin|DocumentTemplateAdmin|EnhancedCalendar|BillingReports|CashRegisterManagement|WorkShifts|Absences|WaitingListReservation) ]]; then
      echo "  - $file"
    fi
  fi
done
echo ""
echo "=== Anleitung ==="
echo "Für jede Seite:"
echo "1. Import hinzufügen: $IMPORT_LINE"
echo "2. Hook-Aufruf nach den anderen Hooks hinzufügen: $HOOK_CALL"
echo "3. marginTopValue zum Haupt-Box-Element hinzufügen:"
echo "   mt: marginTopValue !== '0px' ? marginTopValue : 0,"
echo "   transition: marginTopValue !== '0px' ? 'margin-top 0.3s ease' : 'none',"

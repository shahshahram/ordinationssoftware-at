# Stripe-Konfiguration (Optional)

## Status: Deaktiviert

Stripe ist aktuell **deaktiviert** und die Abrechnung funktioniert ohne automatische Zahlungsabwicklung.

## Wie funktioniert es ohne Stripe?

- ✅ **Kassenarzt-Abrechnung**: Funktioniert normal (direkt an Kasse)
- ✅ **Wahlarzt-Abrechnung**: Rechnung wird erstellt, Zahlung muss manuell erfolgen
- ✅ **Privatarzt-Abrechnung**: Rechnung wird erstellt, Zahlung muss manuell erfolgen

## Stripe später aktivieren

### 1. Stripe-Konto erstellen
- https://stripe.com/ (kostenlos)
- Dashboard: https://dashboard.stripe.com/

### 2. API-Keys erhalten
- Test-Keys: https://dashboard.stripe.com/test/apikeys
- Live-Keys: https://dashboard.stripe.com/apikeys
- Webhook Secret: https://dashboard.stripe.com/test/webhooks

### 3. In `.env` Datei eintragen

Öffnen Sie `/Users/alitahamtaniomran/ordinationssoftware-at/backend/.env` und fügen Sie hinzu:

```bash
# Stripe Payment Gateway (Optional)
STRIPE_SECRET_KEY=sk_test_...  # Ihr Stripe Secret Key
STRIPE_WEBHOOK_SECRET=whsec_...  # Ihr Stripe Webhook Secret (optional)
```

### 4. Backend-Server neu starten

```bash
cd /Users/alitahamtaniomran/ordinationssoftware-at/backend
lsof -ti:5001 | xargs kill -9 2>/dev/null
npm start
```

### 5. Verifikation

Nach dem Neustart wird Stripe automatisch aktiviert, wenn `STRIPE_SECRET_KEY` gesetzt ist.

## Was ändert sich mit Stripe?

- ✅ **Automatische Zahlungsabwicklung** per Kreditkarte
- ✅ **Sofortige Zahlungseingänge** für Wahlarzt- und Privatarzt-Abrechnungen
- ✅ **Weniger manuelle Arbeit** bei der Zahlungsabwicklung

## Deaktivieren

Um Stripe wieder zu deaktivieren, entfernen Sie einfach die Zeilen aus der `.env` Datei oder setzen Sie `STRIPE_SECRET_KEY=` (leer).

---

**Hinweis**: Die Abrechnung funktioniert auch ohne Stripe. Stripe ist nur für die automatische Online-Zahlungsabwicklung nötig.


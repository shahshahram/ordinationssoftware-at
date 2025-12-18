# IP-Adresse für SIT-Registrierung - Anleitung

## Was ist die IP-Adresse?

Die **IP-Adresse** ist die eindeutige Adresse, von der aus Ihre Arztsoftware auf die SIT-Plattform der ÖGK zugreift.

## Welche IP-Adresse muss ich angeben?

Die IP-Adresse hängt davon ab, **wo Ihre Arztsoftware läuft**:

### 1. Lokale Entwicklung (localhost)

Wenn Sie die Software **nur lokal auf Ihrem Computer** testen:

⚠️ **Problem**: `localhost` oder `127.0.0.1` funktioniert **nicht** für externe Zugriffe!

**Lösung**: Sie müssen die **öffentliche IP-Adresse** Ihres Internetanschlusses angeben.

**So finden Sie Ihre öffentliche IP-Adresse:**
- Öffnen Sie: https://www.whatismyip.com/
- Oder: https://ifconfig.me/
- Die angezeigte IP-Adresse ist Ihre öffentliche IP-Adresse

**Wichtig**: 
- Diese IP kann sich ändern (dynamische IP)
- Bei jedem Router-Neustart kann sich die IP ändern
- Für Produktion: Statische IP-Adresse empfohlen

### 2. Server (Dedizierter Server / VPS)

Wenn Ihre Software auf einem **Server** läuft:

**So finden Sie die Server-IP:**
```bash
# Auf dem Server ausführen:
curl ifconfig.me
# oder
curl ipinfo.io/ip
```

**Oder in der Server-Verwaltung:**
- Bei Hosting-Providern (z.B. Hetzner, AWS, Azure) finden Sie die IP in der Server-Übersicht
- Bei Cloud-Providern: In der Instanz-Übersicht

### 3. Cloud-Hosting (AWS, Azure, Google Cloud)

Wenn Ihre Software in der **Cloud** läuft:

**AWS:**
- Elastic IP-Adresse (empfohlen für statische IP)
- Oder Public IP der EC2-Instanz

**Azure:**
- Public IP-Adresse der VM
- Oder Load Balancer IP

**Google Cloud:**
- External IP der VM-Instanz

### 4. Docker / Container

Wenn Ihre Software in **Docker-Containern** läuft:

- Die IP-Adresse ist die des **Host-Systems** (nicht die Container-IP)
- Verwenden Sie die öffentliche IP des Servers, auf dem Docker läuft

## Beispiel-Szenarien

### Szenario 1: Lokale Entwicklung

**Ihre Situation:**
- Software läuft auf Ihrem Laptop/PC
- Sie testen lokal mit `npm start`
- Backend läuft auf `localhost:5001`

**Was angeben:**
- Ihre **öffentliche IP-Adresse** (von whatismyip.com)
- Beispiel: `185.123.45.67`

**Hinweis**: 
- Wenn sich Ihre IP ändert, müssen Sie ASWH informieren
- Für Tests kann das funktionieren, für Produktion nicht empfohlen

### Szenario 2: Server im Büro

**Ihre Situation:**
- Server steht in Ihrer Ordination
- Server hat eine feste IP-Adresse vom Internet-Provider

**Was angeben:**
- Die **öffentliche IP-Adresse** des Servers
- Beispiel: `192.168.1.100` (lokal) → `185.123.45.67` (öffentlich)

**So finden Sie die öffentliche IP:**
```bash
# Auf dem Server:
curl ifconfig.me
```

### Szenario 3: Cloud-Server (Hetzner, AWS, etc.)

**Ihre Situation:**
- Server läuft bei einem Hosting-Provider
- Server hat eine öffentliche IP-Adresse

**Was angeben:**
- Die **öffentliche IP-Adresse** des Servers
- Diese finden Sie im Provider-Dashboard

**Beispiel Hetzner:**
- Im Hetzner Cloud Panel → Server → IP-Adressen

**Beispiel AWS:**
- EC2 Dashboard → Instanz → Public IPv4 address

## Mehrere IP-Adressen

Wenn Sie **mehrere Server** haben (z.B. Test-Server + Produktions-Server):

**Im Formular angeben:**
- Alle IP-Adressen, von denen aus Zugriffe erfolgen sollen
- Beispiel: `185.123.45.67, 185.123.45.68`

## Wichtige Hinweise

### ⚠️ Statische vs. Dynamische IP

**Dynamische IP** (ändert sich):
- Bei jedem Router-Neustart kann sich die IP ändern
- Muss bei ASWH aktualisiert werden, wenn sie sich ändert
- Für Tests OK, für Produktion nicht empfohlen

**Statische IP** (bleibt gleich):
- Empfohlen für Produktion
- Kann beim Internet-Provider beantragt werden
- Zusätzliche Kosten möglich

### ⚠️ Firewall / Router

Wenn Ihre Software hinter einem **Router** läuft:

1. **Port-Forwarding** einrichten (falls nötig)
2. **Firewall-Regeln** prüfen
3. **Öffentliche IP** des Routers angeben (nicht die lokale IP)

### ⚠️ VPN / Tunnel

Wenn Sie über **VPN** oder **Tunnel** zugreifen:

- Die IP-Adresse des **VPN-Endpunkts** angeben
- Nicht die lokale IP-Adresse

## So finden Sie Ihre IP-Adresse - Schritt für Schritt

### Option 1: Online-Tool (Einfachste Methode)

1. Öffnen Sie: https://www.whatismyip.com/
2. Die angezeigte IP-Adresse kopieren
3. Diese im Formular angeben

### Option 2: Terminal/Command Line

**Windows:**
```cmd
curl ifconfig.me
```

**Mac/Linux:**
```bash
curl ifconfig.me
# oder
curl ipinfo.io/ip
```

### Option 3: Server-Verwaltung

- Bei Hosting-Providern: Im Dashboard nachsehen
- Bei Cloud-Providern: In der Instanz-Übersicht

## Beispiel-Formularausfüllung

**Zugangsdaten - IP-Adresse(n)***:
```
185.123.45.67
```

**Oder mehrere IPs:**
```
185.123.45.67, 185.123.45.68
```

## Nach der Registrierung

Nachdem ASWH die IP-Adresse(n) freigeschaltet hat:

1. ✅ Ihre Software kann auf die SIT-Plattform zugreifen
2. ✅ Verbindungstest sollte funktionieren
3. ⚠️ Wenn sich die IP ändert, müssen Sie ASWH informieren

## Häufige Fragen

**F: Was ist, wenn ich keine feste IP habe?**
A: Für Tests können Sie Ihre aktuelle öffentliche IP angeben. Bei Änderung müssen Sie ASWH informieren.

**F: Kann ich mehrere IPs angeben?**
A: Ja, mehrere IP-Adressen können angegeben werden (kommagetrennt).

**F: Was ist, wenn meine IP sich ändert?**
A: Sie müssen ASWH kontaktieren und die neue IP-Adresse mitteilen.

**F: Brauche ich Port-Forwarding?**
A: Normalerweise nicht, da die Software **ausgehende** Verbindungen zur SIT-Plattform herstellt.

## Zusammenfassung

**Für lokale Entwicklung:**
- Öffentliche IP-Adresse von https://whatismyip.com/ angeben

**Für Server:**
- Öffentliche IP-Adresse des Servers angeben

**Für Cloud:**
- Public IP der Instanz/VM angeben

**Wichtig**: Geben Sie die **öffentliche IP-Adresse** an, nicht die lokale (192.168.x.x oder 127.0.0.1)!





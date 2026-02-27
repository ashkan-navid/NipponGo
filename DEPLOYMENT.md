# NipponGo PWA - Docker Deployment

## Voraussetzungen

- Docker und Docker Compose auf dem Server
- Git zum Klonen des Repositories
- Port 3000 offen (oder Reverse Proxy)

---

## Schnellstart

```bash
# 1. Repository auf den Server klonen
git clone <your-repo-url> nippon-go
cd nippon-go

# 2. Container bauen und starten
docker-compose up -d --build

# 3. Logs prüfen
docker-compose logs -f
```

Die App läuft nun auf `http://<server-ip>:3000`

---

## Oracle Cloud Spezifisch

### Firewall-Regeln

```bash
# Port 3000 in der Oracle Cloud Security List öffnen
# VCN > Security Lists > Ingress Rules > Add Rule:
# - Source: 0.0.0.0/0
# - Protocol: TCP
# - Destination Port: 3000
```

### iptables (falls benötigt)

```bash
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

---

## Mit HTTPS (Empfohlen)

### Option 1: Caddy Reverse Proxy

```bash
# Caddyfile erstellen
echo 'nippon-go.example.com {
  reverse_proxy localhost:3000
}' > Caddyfile

# Caddy starten
docker run -d --name caddy \
  --network host \
  -v $(pwd)/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy:2
```

### Option 2: docker-compose mit Traefik

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  nippon-go:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nippon.rule=Host(`nippon-go.example.com`)"
      - "traefik.http.routers.nippon.tls.certresolver=letsencrypt"
    networks:
      - web

networks:
  web:
    external: true
```

---

## Befehle

| Aktion | Befehl |
|--------|--------|
| Status prüfen | `docker-compose ps` |
| Logs anzeigen | `docker-compose logs -f` |
| Neustarten | `docker-compose restart` |
| Stoppen | `docker-compose down` |
| Update deployen | `git pull && docker-compose up -d --build` |
| Datenbank Backup | `docker cp nippon-go-pwa:/app/data/japan-travel.db ./backup.db` |

---

## Persistenz

Die SQLite-Datenbank wird im Docker Volume `japan-travel-data` gespeichert:

```bash
# Volume-Speicherort finden
docker volume inspect japan-travel-data

# Backup erstellen
docker run --rm -v japan-travel-data:/data -v $(pwd):/backup alpine \
  cp /data/japan-travel.db /backup/backup-$(date +%Y%m%d).db
```

---

## Troubleshooting

### Container startet nicht

```bash
# Detaillierte Logs
docker-compose logs --tail=50

# In den Container schauen
docker exec -it nippon-go-pwa sh
```

### Port bereits belegt

```bash
# Anderen Port in docker-compose.yml verwenden
ports:
  - "8080:3000"
```

### Datenbank-Fehler

```bash
# Volume löschen und neu starten (ACHTUNG: Daten gehen verloren!)
docker-compose down -v
docker-compose up -d --build
```

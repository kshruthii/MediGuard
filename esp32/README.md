# SafeDose ESP32 hardware link

ESP32 DevKit V1 + DS18B20 + tilt switch -> Wi-Fi -> existing Express backend
(`POST /api/sensor-data`) -> AWS RDS MySQL -> React dashboard ("Live Hardware" panel).

## Wiring
| Part | ESP32 pin |
|---|---|
| DS18B20 DATA (usually yellow/white) | D4 (GPIO4) |
| DS18B20 VCC (red) | 3V3 |
| DS18B20 GND (black) | GND |
| 4.7 kΩ resistor | between DS18B20 DATA and 3V3 |
| Tilt switch leg 1 | D27 (GPIO27) |
| Tilt switch leg 2 | GND |

## Arduino setup
1. Arduino IDE 2.x -> Boards Manager -> install **esp32 by Espressif Systems**. Board: **ESP32 Dev Module**.
2. Library Manager -> install **OneWire** (Paul Stoffregen) and **DallasTemperature** (Miles Burton).
   (WiFi and HTTPClient come with the ESP32 package.)
3. Open `esp32/safedose_esp32/safedose_esp32.ino` (keep `config.h` in the same folder).
4. Edit `config.h`: `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_URL` (computer's LAN IP, see below).

## Finding the computer's LAN IP (never use localhost on the ESP32)
- Windows: `ipconfig` -> "IPv4 Address" of the Wi-Fi adapter (e.g. 192.168.1.42)
- macOS: `ipconfig getifaddr en0`    - Linux: `hostname -I`
- `BACKEND_URL` becomes `http://192.168.1.42:3000/api/sensor-data`
- The computer and ESP32 must be on the same network, and the ESP32 only supports 2.4 GHz.
- Windows: allow Node.js through the firewall on **Private** networks (or run, as admin:
  `New-NetFirewallRule -DisplayName "SafeDose backend" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -Profile Private`).

## Run & test
1. `node server.js` in the project root (expect "Connected to AWS RDS MySQL!"). Do NOT run `simulator.js` at the same time.
2. `cd dashboard && npm run dev`, open the URL Vite prints, log in.
3. Upload the sketch, open Serial Monitor at **115200 baud**. Expect:
   `[WiFi] Connected. IP ...`, `[TEMP] 24.56 C ...`, `[HTTP] OK -> 200 {"message":"Sensor data saved successfully",...}`
4. Dashboard "Live Hardware · ESP32" panel: temperature, bottle state, last update, "Receiving data".
5. Tilt the bottle: Serial prints `Bottle OPENED`, one `BOTTLE_OPENED` row appears in `bottle_events`;
   return it upright and wait 3 s for `CLOSED`.
6. Verify in MySQL: `SELECT * FROM sensor_data WHERE device_id='SD001-ESP32' ORDER BY id DESC LIMIT 5;`

Connectivity check without the ESP32 (from the same LAN, e.g. a phone browser): open `http://<LAN-IP>:3000/`
-> "SafeDose backend is running!".

## Behaviour notes
- Readings are sent every 10 s (`SEND_INTERVAL_MS`). Dashboard marks the ESP32 offline after 30 s of silence
  (`HARDWARE_ONLINE_SECONDS` in the backend `.env`).
- One opening = one event: the bottle is "open" from the first stable tilt until it has been at rest for 3 s.
  Rattling in between does not create extra events.
- `bottleOpen:true` is sent only in the single opening-event POST; routine readings carry `bottleOpen:false`
  plus `bottleState` ("OPEN"/"CLOSED") for the live state.
- The ESP32 never sends `doseTaken`. An opening is a bottle-access event, not proof of consumption.
- If the DS18B20 can't be read, the ESP32 reports `sensorFault` instead of inventing a temperature.
- Optional hardening: set the same `DEVICE_API_KEY` in the backend `.env` and `config.h`.

## Troubleshooting
**DS18B20**
- `-127` / "No DS18B20 found": DATA not on D4, missing 4.7 kΩ pull-up (DATA<->3V3), loose VCC/GND, or wires swapped.
  Waterproof probes: red=VCC, black=GND, yellow/white=DATA (check your probe's datasheet).
- `85.00`: power-on default; usually a weak/unstable supply or bad contact. Firmware ignores it.
- Works then drops out: use short, firm jumper connections; re-seat the probe wires.

**Wi-Fi / API**
- Stuck on "Connecting": wrong SSID/password, 5 GHz-only network, or campus/enterprise (WPA2-Enterprise/captive portal) Wi-Fi.
  Use a phone hotspot (2.4 GHz) for the demo.
- `[HTTP] Request error: connection refused / -1`: wrong LAN IP, backend not running, firewall blocking port 3000,
  or router "client isolation". Test `http://<LAN-IP>:3000/` from a phone on the same Wi-Fi.
- HTTP 400: payload had no valid temperature (check Serial). HTTP 401: `DEVICE_API_KEY` mismatch. HTTP 500: backend
  can't write to RDS; check the backend console and the RDS security group (your public IP changes with the network!).
- Config halt message: you still have a placeholder or localhost in `config.h`.

**Tilt switch**
- Event fires when upright / not when tilted: set `TILT_ACTIVE_LEVEL` to `HIGH` in `config.h`.
- Never triggers: check one leg on D27 and the other on GND; try a multimeter continuity test while tilting.
- Triggers on small knocks: raise `TILT_DEBOUNCE_MS`. Closes too early/late: adjust `TILT_CLOSE_SETTLE_MS`.

**Dashboard not updating**
- Panel says "Waiting for ESP32": backend hasn't received a POST since it started; check Serial for `[HTTP] OK`.
- Offline badge: no POST for 30 s (Wi-Fi/backend problem). Check `http://localhost:3000/api/device-status`.
- Chart/KPI cards show the newest row from ANY device, so don't run `simulator.js` together with the ESP32.
- Dashboard polls every 5 s; wait one cycle. If you serve `dashboard/dist`, rebuild it with `npm run build`.

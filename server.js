require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const app = express();

const PORT = process.env.PORT || 3000;
const MIN_TEMPERATURE = 20.0;
const MAX_TEMPERATURE = 30.0;

// Default demo users
const DEFAULT_USERS = [
    { id: 1, name: "Shruthi", email: "shruthi@safedose.com", password: "password123", role: "patient" },
    { id: 2, name: "Dr. Caregiver", email: "caregiver@safedose.com", password: "care456", role: "caregiver" }
];

// Fallback in-memory dataset (matches db/seed-data.sql) for offline testing or before RDS is provisioned
const sampleDates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return d.toISOString().split("T")[0];
});

const mockDoseHistory = [
    { id: 1, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[0], taken_time: `${sampleDates[0]} 09:05:00`, status: "TAKEN" },
    { id: 2, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[1], taken_time: `${sampleDates[1]} 09:02:00`, status: "TAKEN" },
    { id: 3, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[2], taken_time: null, status: "MISSED" },
    { id: 4, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[3], taken_time: `${sampleDates[3]} 09:08:00`, status: "TAKEN" },
    { id: 5, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[4], taken_time: null, status: "SAFETY_BLOCKED" },
    { id: 6, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[5], taken_time: `${sampleDates[5]} 09:01:00`, status: "TAKEN" },
    { id: 7, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[6], taken_time: `${sampleDates[6]} 09:04:00`, status: "TAKEN" },
    { id: 8, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[7], taken_time: `${sampleDates[7]} 09:03:00`, status: "TAKEN" },
    { id: 9, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[8], taken_time: `${sampleDates[8]} 09:01:00`, status: "TAKEN" },
    { id: 10, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[9], taken_time: `${sampleDates[9]} 09:07:00`, status: "TAKEN" },
    { id: 11, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[10], taken_time: null, status: "MISSED" },
    { id: 12, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[11], taken_time: `${sampleDates[11]} 09:01:00`, status: "TAKEN" },
    { id: 13, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[12], taken_time: `${sampleDates[12]} 09:00:00`, status: "TAKEN" },
    { id: 14, medication_id: 1, medication_name: "Amoxicillin 500mg", scheduled_time: "09:00:00", scheduled_date: sampleDates[13], taken_time: null, status: "PENDING" }
];

let mockSensorData = [
    { id: 1, device_id: "SD001", temperature: 24.8, bottle_open: 0, temperature_status: "SAFE", created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, device_id: "SD001", temperature: 25.2, bottle_open: 0, temperature_status: "SAFE", created_at: new Date(Date.now() - 2700000).toISOString() },
    { id: 3, device_id: "SD001", temperature: 25.8, bottle_open: 1, temperature_status: "SAFE", created_at: new Date(Date.now() - 1800000).toISOString() },
    { id: 4, device_id: "SD001", temperature: 26.3, bottle_open: 0, temperature_status: "SAFE", created_at: new Date(Date.now() - 900000).toISOString() },
    { id: 5, device_id: "SD001", temperature: 24.9, bottle_open: 0, temperature_status: "SAFE", created_at: new Date().toISOString() }
];

let mockAlerts = [
    { id: 1, device_id: "SD001", alert_type: "TEMPERATURE", message: "Temperature is outside the configured safe range", created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 2, device_id: "SD001", alert_type: "MISSED_DOSE", message: "Scheduled medication dose was missed", created_at: new Date(Date.now() - 43200000).toISOString() }
];

let mockBottleEvents = [
    { id: 1, device_id: "SD001", event_type: "BOTTLE_OPENED", created_at: new Date(Date.now() - 1800000).toISOString() }
];

// --- AWS RDS connection -------------------------------------------------
let dbConnected = false;
let db = null;

if (process.env.DB_HOST) {
    db = mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "safedose",
        ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined
    });

    db.connect((err) => {
        if (err) {
            console.log("Database connection failed:", err.message);
            console.log("ℹ️ Operating in fallback in-memory mode for smooth demonstration.");
            dbConnected = false;
        } else {
            console.log("Connected to AWS RDS MySQL!");
            dbConnected = true;

            // Ensure users table exists
            const createUsersSql = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('patient', 'caregiver') NOT NULL DEFAULT 'patient',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            `;
            db.query(createUsersSql, (tableErr) => {
                if (!tableErr) {
                    // Seed demo user if none exists
                    db.query("SELECT COUNT(*) AS cnt FROM users", (cntErr, cntRes) => {
                        if (!cntErr && cntRes[0].cnt === 0) {
                            db.query("INSERT INTO users (name, email, password, role) VALUES ('Shruthi', 'shruthi@safedose.com', 'password123', 'patient'), ('Dr. Caregiver', 'caregiver@safedose.com', 'care456', 'caregiver')");
                        }
                    });
                }
            });
        }
    });
} else {
    console.log("ℹ️ No DB_HOST set in .env. Operating in fallback in-memory mode with sample dataset.");
}

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("SafeDose backend is running!");
});

// --- Auth Endpoint ------------------------------------------------------
app.post("/api/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    if (dbConnected && db) {
        const sql = `SELECT id, name, email, role FROM users WHERE email = ? AND password = ?`;
        db.query(sql, [email, password], (err, results) => {
            if (err || results.length === 0) {
                // Check fallback users
                const found = DEFAULT_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
                if (found) {
                    const { password: _, ...userObj } = found;
                    return res.json({ message: "Login successful", user: userObj });
                }
                return res.status(401).json({ message: "Invalid email or password" });
            }
            return res.json({ message: "Login successful", user: results[0] });
        });
    } else {
        const found = DEFAULT_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (found) {
            const { password: _, ...userObj } = found;
            return res.json({ message: "Login successful", user: userObj });
        }
        return res.status(401).json({ message: "Invalid email or password" });
    }
});

// --- Hardware link tracking (real ESP32 vs simulator) -------------------
// The ESP32 firmware and simulator.js both POST to /api/sensor-data and tag each
// request with a "source". We remember the last request per source IN MEMORY (using the
// server's own clock) so the dashboard can show whether the real ESP32 is alive without
// any schema change and without depending on the ESP32's clock or MySQL timezones.
const HARDWARE_ONLINE_SECONDS = Number(process.env.HARDWARE_ONLINE_SECONDS) || 30;
const DEVICE_API_KEY = process.env.DEVICE_API_KEY || ""; // optional shared key (x-device-key header)
const hardwareStatus = {}; // { esp32: {...}, simulator: {...} }

function parseTemperature(value) {
    const n = typeof value === "number" ? value
        : (typeof value === "string" && value.trim() !== "" ? Number(value) : NaN);
    // DS18B20 operating range is -55..125 °C; anything else is a sensor/transport error.
    return Number.isFinite(n) && n >= -55 && n <= 125 ? n : null;
}

function updateHardwareStatus(req, { source, deviceId, temperature, bottleOpened, bottleClosed, sensorFault }) {
    const body = req.body || {};
    const prev = hardwareStatus[source] || {};
    const now = Date.now();

    let bottleState = prev.bottleState || "UNKNOWN";
    if (body.bottleState === "OPEN" || body.bottleState === "CLOSED") {
        bottleState = body.bottleState;
    } else if (bottleClosed) {
        bottleState = "CLOSED";
    } else {
        bottleState = bottleOpened ? "OPEN" : "CLOSED"; // simulator-style payloads
    }

    hardwareStatus[source] = {
        source,
        deviceId,
        lastSeenMs: now,
        temperature: temperature !== null ? temperature : (prev.temperature ?? null),
        temperatureAtMs: temperature !== null ? now : (prev.temperatureAtMs ?? null),
        sensorFault: !!sensorFault && temperature === null,
        bottleState,
        lastOpenedMs: bottleOpened ? now : (prev.lastOpenedMs ?? null),
        lastClosedMs: bottleClosed ? now : (prev.lastClosedMs ?? null),
        rssi: Number.isFinite(body.rssi) ? body.rssi : (prev.rssi ?? null),
        firmware: typeof body.firmware === "string" ? body.firmware.slice(0, 20) : (prev.firmware ?? null),
        ip: req.ip
    };
}

function recordBottleEvent(deviceId, eventType) {
    if (dbConnected && db) {
        db.query(`INSERT INTO bottle_events (device_id, event_type) VALUES (?, ?)`, [deviceId, eventType]);
    } else {
        mockBottleEvents.unshift({
            id: mockBottleEvents.length + 1,
            device_id: deviceId,
            event_type: eventType,
            created_at: new Date().toISOString()
        });
    }
}

// --- Ingest endpoint (used by the ESP32 / simulator.js) ----------------
// Payload (all sources):  { deviceId, temperature, bottleOpen, doseTaken? }
// Extra optional fields sent by the ESP32 firmware:
//   source: "esp32" | "simulator"   bottleState: "OPEN" | "CLOSED"   bottleClosed: true
//   sensorFault: true (DS18B20 unreadable, no temperature)   rssi, firmware
// bottleOpen === true means "an opening event just happened" (one POST per opening).
// The ESP32 never sends doseTaken: an opening is an access event, not proof a dose was taken.
app.post("/api/sensor-data", (req, res) => {
    if (DEVICE_API_KEY && req.get("x-device-key") !== DEVICE_API_KEY) {
        return res.status(401).json({ message: "Invalid or missing device key" });
    }

    const data = req.body || {};
    const deviceId = data.deviceId || "SD001";
    const source = data.source === "esp32" || data.source === "simulator" ? data.source : "unknown";
    const temperature = parseTemperature(data.temperature);
    const hasTemperature = temperature !== null;
    const bottleOpened = data.bottleOpen === true;
    const bottleClosed = data.bottleClosed === true;
    const sensorFault = data.sensorFault === true;

    if (!hasTemperature && !bottleOpened && !bottleClosed && !sensorFault) {
        return res.status(400).json({ message: "A valid numeric temperature (-55 to 125 °C) is required" });
    }

    updateHardwareStatus(req, { source, deviceId, temperature: hasTemperature ? temperature : null, bottleOpened, bottleClosed, sensorFault });

    let temperatureStatus = null;
    if (hasTemperature) {
        if (temperature < MIN_TEMPERATURE || temperature > MAX_TEMPERATURE) {
            temperatureStatus = "UNSAFE";
            console.log("⚠️ WARNING: Temperature is outside the safe range!");
        } else {
            temperatureStatus = "SAFE";
            console.log("✅ Temperature is within the safe range.");
        }
    }

    // Record alert if UNSAFE
    if (temperatureStatus === "UNSAFE") {
        const alertMessage = `Temperature ${temperature}°C is outside safe range (20°C - 30°C)`;
        if (dbConnected && db) {
            const alertSql = `INSERT INTO alerts (device_id, alert_type, message) VALUES (?, ?, ?)`;
            db.query(alertSql, [deviceId, "TEMPERATURE", alertMessage]);
        } else {
            mockAlerts.unshift({
                id: mockAlerts.length + 1,
                device_id: deviceId,
                alert_type: "TEMPERATURE",
                message: alertMessage,
                created_at: new Date().toISOString()
            });
        }
    }

    // Record bottle opening / closing events (bottle_events.event_type is a free VARCHAR)
    //if (bottleOpened) recordBottleEvent(deviceId, "BOTTLE_OPENED");
    //if (bottleClosed) recordBottleEvent(deviceId, "BOTTLE_CLOSED");
    
/*if (bottleOpened) {
    recordBottleEvent(deviceId, "BOTTLE_OPENED");

    const alertMessage = "Medicine bottle was opened";
    if (dbConnected && db) {
        const alertSql = `INSERT INTO alerts (device_id, alert_type, message) VALUES (?, ?, ?)`;
        db.query(alertSql, [deviceId, "BOTTLE_OPENED", alertMessage], (err) => {
            if (err) console.error("Failed to save bottle-open alert:", err.message);
        });
    } else {
        mockAlerts.unshift({
            id: Date.now(),
            alert_type: "BOTTLE_OPENED",
            message: alertMessage,
            created_at: new Date().toISOString()
        });
    }
}*/

if (bottleOpened) {
    recordBottleEvent(deviceId, "BOTTLE_OPENED");

    const alertMessage = "Medicine bottle was opened";

    if (dbConnected && db) {
        const alertSql = `INSERT INTO alerts (device_id, alert_type, message) VALUES (?, ?, ?)`;

        db.query(alertSql, [deviceId, "BOTTLE_OPENED", alertMessage], (err, result) => {
            if (err) {
                console.error("Failed to save bottle-open alert:", err.message);
            } else {
                console.log("Bottle-open alert saved to database. ID:", result.insertId);
            }
        });
    } else {
        mockAlerts.unshift({
            id: Date.now(),
            device_id: deviceId,
            alert_type: "BOTTLE_OPENED",
            message: alertMessage,
            created_at: new Date().toISOString()
        });

        console.log("Bottle-open alert saved to mock alerts.");
    }
}


if (bottleClosed) recordBottleEvent(deviceId, "BOTTLE_CLOSED");


    // Record dose taken (simulator only; the ESP32 never sends this)
    if (data.doseTaken === true) {
        if (dbConnected && db) {
            const medicationSql = `SELECT id, scheduled_time FROM medications WHERE id = 1`;
            db.query(medicationSql, (err, results) => {
                if (!err && results.length > 0) {
                    const medication = results[0];
                    const checkSql = `SELECT id FROM dose_events WHERE medication_id = ? AND scheduled_date = CURDATE() AND status = 'TAKEN'`;
                    db.query(checkSql, [medication.id], (checkErr, checkRes) => {
                        if (!checkErr && checkRes.length === 0) {
                            const doseSql = `INSERT INTO dose_events (medication_id, scheduled_time, scheduled_date, taken_time, status) VALUES (?, ?, CURDATE(), NOW(), 'TAKEN')`;
                            db.query(doseSql, [medication.id, medication.scheduled_time]);
                        }
                    });
                }
            });
        } else {
            const todayStr = new Date().toISOString().split("T")[0];
            const todayDose = mockDoseHistory.find(d => d.scheduled_date === todayStr);
            if (todayDose) {
                todayDose.status = "TAKEN";
                todayDose.taken_time = new Date().toISOString();
            }
        }
    }

    // Event or fault report without a usable temperature: nothing to store in sensor_data
    if (!hasTemperature) {
        return res.json({ message: sensorFault ? "Sensor fault noted" : "Bottle event recorded (no temperature stored)" });
    }

    // Save sensor data
    if (dbConnected && db) {
        const sql = `INSERT INTO sensor_data (device_id, temperature, bottle_open, temperature_status) VALUES (?, ?, ?, ?)`;
        const values = [deviceId, temperature, bottleOpened ? 1 : 0, temperatureStatus];

        db.query(sql, values, (err, result) => {
            if (err) {
                return res.status(500).json({ message: "Failed to save sensor data" });
            }
            res.json({ message: "Sensor data saved successfully", id: result.insertId });
        });
    } else {
        const newRecord = {
            id: mockSensorData.length + 1,
            device_id: deviceId,
            temperature: temperature,
            bottle_open: bottleOpened ? 1 : 0,
            temperature_status: temperatureStatus,
            created_at: new Date().toISOString()
        };
        mockSensorData.push(newRecord);
        res.json({ message: "Sensor data saved successfully (in-memory mode)", id: newRecord.id });
    }
});

// --- Read endpoints (used by the dashboard) -----------------------------

app.get("/api/latest-sensor-data", (req, res) => {
    if (dbConnected && db) {
        const sql = `SELECT * FROM sensor_data ORDER BY id DESC LIMIT 1`;
        db.query(sql, (err, results) => {
            if (err || results.length === 0) {
                return res.json(mockSensorData[mockSensorData.length - 1]);
            }
            res.json(results[0]);
        });
    } else {
        res.json(mockSensorData[mockSensorData.length - 1] || null);
    }
});

app.get("/api/temperature-history", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 500);
    if (dbConnected && db) {
        const sql = `SELECT temperature, temperature_status, created_at FROM sensor_data ORDER BY id DESC LIMIT ?`;
        db.query(sql, [limit], (err, results) => {
            if (err || results.length === 0) {
                return res.json(mockSensorData.slice(-limit));
            }
            res.json(results.reverse());
        });
    } else {
        res.json(mockSensorData.slice(-limit));
    }
});

app.get("/api/bottle-status", (req, res) => {
    if (dbConnected && db) {
        const sql = `SELECT event_type, created_at FROM bottle_events ORDER BY id DESC LIMIT 1`;
        db.query(sql, (err, results) => {
            if (err || results.length === 0) {
                return res.json(mockBottleEvents[0] || { event_type: "UNKNOWN" });
            }
            res.json(results[0]);
        });
    } else {
        res.json(mockBottleEvents[0] || { event_type: "UNKNOWN" });
    }
});

app.get("/api/dose-status", (req, res) => {
    if (dbConnected && db) {
        const sql = `
            SELECT status, taken_time, scheduled_time
            FROM dose_events
            WHERE medication_id = 1 AND scheduled_date = CURDATE()
            ORDER BY id DESC LIMIT 1
        `;
        db.query(sql, (err, results) => {
            if (err || results.length === 0) {
                const todayStr = new Date().toISOString().split("T")[0];
                const found = mockDoseHistory.find(d => d.scheduled_date === todayStr);
                return res.json(found || { status: "PENDING" });
            }
            res.json(results[0]);
        });
    } else {
        const todayStr = new Date().toISOString().split("T")[0];
        const found = mockDoseHistory.find(d => d.scheduled_date === todayStr);
        res.json(found || { status: "PENDING" });
    }
});

app.get("/api/dose-history", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 14, 100);
    if (dbConnected && db) {
        const sql = `
            SELECT d.id, d.scheduled_time, d.scheduled_date, d.taken_time, d.status, m.name as medication_name
            FROM dose_events d
            LEFT JOIN medications m ON d.medication_id = m.id
            ORDER BY d.scheduled_date DESC, d.scheduled_time DESC
            LIMIT ?
        `;
        db.query(sql, [limit], (err, results) => {
            if (err || results.length === 0) {
                return res.json(mockDoseHistory.slice(-limit).reverse());
            }
            res.json(results);
        });
    } else {
        res.json(mockDoseHistory.slice(-limit).reverse());
    }
});

// --- Medication Safety State (IEEE Formula: Exposure Severity Score) ---
// Exposure Severity Score = Temperature Deviation * Exposure Duration * Severity Factor
app.get("/api/medication-safety", (req, res) => {
    const handleCalculation = (readings) => {
        if (!readings || readings.length === 0) {
            return res.json({
                state: "SAFE",
                score: 0.0,
                unsafeReadings: 0,
                totalReadings: 0,
                message: "No sensor readings recorded yet. Normal storage conditions assumed.",
                minTemp: MIN_TEMPERATURE,
                maxTemp: MAX_TEMPERATURE,
                currentTemp: null
            });
        }

        let totalExposureScore = 0.0;
        let unsafeCount = 0;
        const currentTemp = Number(readings[readings.length - 1].temperature);

        readings.forEach((r) => {
            const temp = Number(r.temperature);
            if (temp < MIN_TEMPERATURE) {
                const deviation = MIN_TEMPERATURE - temp;
                totalExposureScore += deviation * 0.5 * 1.0; // 30 min interval = 0.5 hr
                unsafeCount++;
            } else if (temp > MAX_TEMPERATURE) {
                const deviation = temp - MAX_TEMPERATURE;
                const severityFactor = temp > 35.0 ? 2.5 : 1.2;
                totalExposureScore += deviation * 0.5 * severityFactor;
                unsafeCount++;
            }
        });

        const scoreFormatted = Number(totalExposureScore.toFixed(1));
        let state = "SAFE";
        let message = "Storage conditions optimal (20°C – 30°C). Medication potency is fully preserved.";

        if (scoreFormatted >= 20.0 || currentTemp > 35.0) {
            state = "QUARANTINED";
            message = "CRITICAL: Excessive temperature excursion detected! Medication may be spoiled/denatured. Access locked for safety.";
        } else if (scoreFormatted >= 5.0 || unsafeCount >= 2 || currentTemp < MIN_TEMPERATURE || currentTemp > MAX_TEMPERATURE) {
            state = "WARNING";
            message = "WARNING: Moderate temperature excursion detected. Medication safety monitored. Check cooling immediately.";
        }

        res.json({
            state,
            score: scoreFormatted,
            unsafeReadings: unsafeCount,
            totalReadings: readings.length,
            message,
            minTemp: MIN_TEMPERATURE,
            maxTemp: MAX_TEMPERATURE,
            currentTemp
        });
    };

    if (dbConnected && db) {
        const sql = `SELECT temperature, temperature_status, created_at FROM sensor_data ORDER BY id DESC LIMIT 50`;
        db.query(sql, (err, results) => {
            if (err || results.length === 0) {
                return handleCalculation(mockSensorData);
            }
            handleCalculation(results.reverse());
        });
    } else {
        handleCalculation(mockSensorData);
    }
});


app.get("/api/alerts", (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

    if (dbConnected && db) {
        const sql = `SELECT id, device_id, alert_type, message, timestamp AS created_at FROM alerts ORDER BY id DESC LIMIT ?`;

        db.query(sql, [limit], (err, results) => {
            if (err) {
                console.error("Alerts database query failed:", err.message);
                return res.status(500).json({ error: "Failed to fetch alerts" });
            }

            console.log("Alerts fetched from MySQL:", results.length);
            return res.json(results);
        });
    } else {
        return res.json(mockAlerts.slice(0, limit));
    }
});


// --- Hardware status (used by the dashboard's "Live Hardware" panel) ----
app.get("/api/device-status", (req, res) => {
    const now = Date.now();
    const iso = (ms) => (ms ? new Date(ms).toISOString() : null);

    const describe = (s) => {
        if (!s) return null;
        const ageSeconds = Math.max(0, Math.round((now - s.lastSeenMs) / 1000));
        return {
            source: s.source,
            deviceId: s.deviceId,
            online: ageSeconds <= HARDWARE_ONLINE_SECONDS,
            ageSeconds,
            lastSeenAt: iso(s.lastSeenMs),
            temperature: s.temperature,
            temperatureAt: iso(s.temperatureAtMs),
            sensorFault: s.sensorFault,
            bottleState: s.bottleState,
            lastOpenedAt: iso(s.lastOpenedMs),
            lastClosedAt: iso(s.lastClosedMs),
            rssi: s.rssi,
            firmware: s.firmware,
            ip: s.ip
        };
    };

    res.json({
        onlineWindowSeconds: HARDWARE_ONLINE_SECONDS,
        serverTime: iso(now),
        esp32: describe(hardwareStatus.esp32),
        simulator: describe(hardwareStatus.simulator)
    });
});

// --- Missed-dose checker -------------------------------------------------
function checkMissedDoses() {
    if (!dbConnected || !db) return;
    const sql = `SELECT id, scheduled_time FROM medications`;
    db.query(sql, (err, medications) => {
        if (err || !medications) return;

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        medications.forEach((medication) => {
            const scheduledTime = medication.scheduled_time;
            const [hours, minutes] = scheduledTime.split(":");
            const scheduledMinutes = Number(hours) * 60 + Number(minutes);

            if (currentMinutes >= scheduledMinutes + 10) {
                const checkSql = `
                    SELECT id FROM dose_events
                    WHERE medication_id = ? AND status IN ('TAKEN', 'MISSED') AND scheduled_date = CURDATE()
                `;
                db.query(checkSql, [medication.id], (checkErr, results) => {
                    if (checkErr || results.length > 0) return;

                    const doseSql = `
                        INSERT INTO dose_events
                        (medication_id, scheduled_time, scheduled_date, taken_time, status)
                        VALUES (?, ?, CURDATE(), NULL, 'MISSED')
                    `;
                    db.query(doseSql, [medication.id, scheduledTime]);

                    const alertSql = `
                        INSERT INTO alerts (device_id, alert_type, message)
                        VALUES (?, ?, ?)
                    `;
                    db.query(alertSql, ["SD001", "MISSED_DOSE", "Scheduled medication dose was missed"]);
                });
            }
        });
    });
}

checkMissedDoses();
setInterval(checkMissedDoses, 10000);

app.listen(PORT, () => {
    console.log(`SafeDose server running on http://localhost:${PORT}`);
});

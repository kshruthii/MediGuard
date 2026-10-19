-- SafeDose / MediGuard schema
-- Run this once against your AWS RDS MySQL database before seeding or starting server.js

CREATE TABLE IF NOT EXISTS medications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  scheduled_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS sensor_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  temperature DECIMAL(5,2) NOT NULL,
  bottle_open BOOLEAN NOT NULL DEFAULT FALSE,
  temperature_status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sensor_created (created_at)
);

CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  message VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alerts_created (created_at)
);

CREATE TABLE IF NOT EXISTS bottle_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_bottle_created (created_at)
);

CREATE TABLE IF NOT EXISTS dose_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medication_id INT NOT NULL,
  scheduled_time TIME NOT NULL,
  scheduled_date DATE NOT NULL,
  taken_time DATETIME NULL,
  status VARCHAR(20) NOT NULL,
  FOREIGN KEY (medication_id) REFERENCES medications(id),
  INDEX idx_dose_date (scheduled_date)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('patient', 'caregiver') NOT NULL DEFAULT 'patient',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

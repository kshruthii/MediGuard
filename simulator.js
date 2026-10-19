// --- TEST DATA SOURCE ------------------------------------------------
// This script SIMULATES a device. Real hardware = the ESP32 firmware in esp32/.
// Do not run both at once, or simulated and real readings will interleave.
// Optional overrides:  SAFEDOSE_API_URL=http://localhost:3000/api/sensor-data
//                      DEVICE_API_KEY=<same value as in the backend .env, if you set one>
const API_URL = process.env.SAFEDOSE_API_URL || "http://localhost:3000/api/sensor-data";
const HEADERS = { "Content-Type": "application/json" };
if (process.env.DEVICE_API_KEY) HEADERS["x-device-key"] = process.env.DEVICE_API_KEY;

/*const temperature = Number((Math.random() * 5 + 3).toFixed(2));
const bottleOpen = true;

const sensorData = {
    deviceId: "SD001",
    temperature: temperature,
    bottleOpen: bottleOpen
};

fetch("http://localhost:3000/api/sensor-data", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify(sensorData)
})
.then(response => response.json())
.then(data => {
    console.log("Backend response:");
    console.log(data);
})
.catch(error => {
    console.log("Error:", error);
});*/

function sendSensorData() {
    const temperature = Number((Math.random() * 16 + 17).toFixed(2));
    const bottleOpen = Math.random() < 0.3;
    //const doseTaken = bottleOpen;
    const doseTaken = bottleOpen && Math.random() < 0.8;

    const sensorData = {
    deviceId: "SD001",
    source: "simulator",
    temperature: temperature,
    bottleOpen: bottleOpen,
    doseTaken: doseTaken
};

    console.log("Sending sensor data:", sensorData);

    fetch(API_URL, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify(sensorData)
    })
    .then(response => response.json())
    .then(data => {
        console.log("Backend response:", data);
    })
    .catch(error => {
        console.log("Error:", error);
    });
}

sendSensorData();

setInterval(sendSensorData, 5000);
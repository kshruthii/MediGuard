# SafeDose — AWS RDS Setup

This gets your existing Node.js backend and React dashboard talking to a MySQL
database hosted on AWS instead of localhost, and seeds it with a sample
dataset so the dashboard has something to show during your demo.

## 1. Create an AWS account
1. Go to https://aws.amazon.com and click **Create an AWS account**.
2. You'll need an email, a password, and a card for verification (the RDS
   Free Tier instance used here costs $0 as long as you stay within the
   Free Tier limits — 750 hours/month of a `db.t3.micro`, 20 GB storage).
3. Once signed in, set your **region** in the top-right corner (pick
   `ap-south-1 (Mumbai)` if you're in India — lower latency, and it's what
   the `.env.example` host name assumes).

## 2. Launch a MySQL RDS instance
1. Search for **RDS** in the AWS Console search bar and open it.
2. Click **Create database**.
3. Choose:
   - Engine type: **MySQL**
   - Templates: **Free tier**
   - DB instance identifier: `safedose-db`
   - Master username: `admin`
   - Master password: set one and save it somewhere safe — you'll need it
     for `.env`.
4. Under **Connectivity**:
   - Public access: **Yes** (needed so your laptop can reach it directly;
     for a real product you'd keep this off and put the app in the same
     VPC, but for a class demo this is the simplest path).
   - VPC security group: **Create new** — name it `safedose-sg`.
5. Under **Additional configuration**, set **Initial database name** to
   `safedose`. This saves you a manual `CREATE DATABASE` step.
6. Click **Create database**. It takes 5–10 minutes to become "Available".

## 3. Open the port to your laptop
1. Once the instance is available, click into it and note the
   **Endpoint** (looks like `safedose-db.xxxxxxxxxx.ap-south-1.rds.amazonaws.com`).
2. Click the security group link (`safedose-sg`) → **Edit inbound rules**.
3. Add a rule: Type **MySQL/Aurora**, Source **My IP** (AWS will fill in
   your current public IP). This is safer than opening it to `0.0.0.0/0`.
   If your IP changes (new Wi-Fi, mobile hotspot), you'll need to update
   this rule.

## 4. Configure the backend
1. In the `SafeDose` folder:
   ```bash
   npm install
   cp .env.example .env
   ```
2. Edit `.env` with the endpoint and password from step 2:
   ```
   DB_HOST=safedose-db.xxxxxxxxxx.ap-south-1.rds.amazonaws.com
   DB_PORT=3306
   DB_USER=admin
   DB_PASSWORD=your-master-password
   DB_NAME=safedose
   DB_SSL=false
   ```

## 5. Create the tables and load sample data
You need a MySQL client. Either:
- **MySQL Workbench** (GUI, easiest for a first-time setup), or
- the `mysql` CLI if you have it installed.

Using the CLI, from the `SafeDose` folder:
```bash
mysql -h <your-endpoint> -u admin -p safedose < db/schema.sql
mysql -h <your-endpoint> -u admin -p safedose < db/seed-data.sql
```
Each command will prompt for the master password.

`db/seed-data.sql` inserts sample users, 48 hours of realistic sensor readings (a couple
of temperature excursions so you can show the UNSAFE state and an alert),
bottle-open events, and a 14-day dose history with a mix of TAKEN, MISSED,
SAFETY_BLOCKED, and PENDING doses.

### Demo Login Credentials
| Role | Email | Password |
|---|---|---|
| Patient | `shruthi@safedose.com` | `password123` |
| Caregiver | `caregiver@safedose.com` | `care456` |

## 6. Run everything
```bash
# Terminal 1 — backend
node server.js
# should print: Connected to AWS RDS MySQL!

# Terminal 2 — dashboard
cd dashboard
npm install
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`). The dashboard
polls the backend every 5 seconds, so the seeded data should appear
immediately and any new events from `simulator.js` or the real ESP32 will
show up within a few seconds.

## 7. (Optional) Feed it live data instead of / alongside the seed data
`simulator.js` posts randomized readings to `/api/sensor-data` every 5
seconds — run `node simulator.js` in a third terminal to see the dashboard
update live, or point your ESP32's HTTP client at
`http://<your-laptop-IP>:3000/api/sensor-data` on the same network.

## 8. (Optional) Real ESP32 hardware
The ESP32 firmware, wiring, LAN-IP instructions and troubleshooting are in `esp32/README.md`.
`simulator.js` remains available as a test-data source; don't run it at the same time as the ESP32.

## Notes for your report / demo
- The database now lives on AWS RDS (MySQL) rather than local MySQL — this
  is the "cloud" component satisfying the "store temperature, access, dose,
  and alert history in the cloud" objective in your report.
- The backend (`server.js`) and dashboard still run on your laptop; only
  the data store is remote. That's the right split for coursework — the
  DB is what actually needs to persist and be reachable independent of
  your machine.
- `.env` is gitignored — never commit real AWS credentials to a repo.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const db = require('./db/db');
const { nextCaseId } = require('./caseId');
const { INCIDENT_STAGES, INCIDENT_LABELS, MISSING_STAGES, MISSING_LABELS } = require('./constants');

const now = Date.now();
const hoursAgo = h => new Date(now - h * 3600 * 1000).toISOString();
const todayStr = () => new Date().toISOString().slice(0, 10);
function stageTimeline(labels, uptoIndex, startHours) {
  const tl = [];
  const step = Math.max(startHours / Math.max(uptoIndex, 1), 0.4);
  for (let i = 0; i <= uptoIndex; i++) tl.push({ t: hoursAgo(startHours - i * step), text: labels[i] });
  return tl;
}

console.log('Seeding Railzo demo data...');

// --- demo admin account ---
const existingAdmin = db.prepare('SELECT id FROM users WHERE badge = ?').get('RPF-0001');
if (!existingAdmin) {
  db.prepare(`INSERT INTO users (id, name, badge, station, photo, role, password_hash, created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uuid(), 'Demo Admin', 'RPF-0001', 'Patna Jn.', '', 'Admin', bcrypt.hashSync('demo1234', 10), new Date().toISOString());
  console.log('Created demo login -> badge: RPF-0001  password: demo1234');
} else {
  console.log('Demo admin account already exists (badge RPF-0001)');
}

// --- officers ---
const demoOfficers = [
  { name: 'Ravi Kumar Singh', rank: 'Sub Inspector', badge: 'RPF-2291', station: 'Patna Jn.', phone: '9835510001', email: 'r.singh@rpf.gov.in', availability: 'On duty' },
  { name: 'Anita Verma', rank: 'Constable', badge: 'RPF-3187', station: 'Patna Jn.', phone: '9835510002', email: 'a.verma@rpf.gov.in', availability: 'On duty' },
  { name: 'Suresh Yadav', rank: 'Inspector', badge: 'RPF-1042', station: 'Danapur', phone: '9835510003', email: 's.yadav@rpf.gov.in', availability: 'On leave' },
  { name: 'Priya Kumari', rank: 'Constable', badge: 'RPF-3299', station: 'Rajendra Nagar T.', phone: '9835510004', email: 'p.kumari@rpf.gov.in', availability: 'Off duty' },
  { name: 'Manoj Tiwari', rank: 'Head Constable', badge: 'RPF-2765', station: 'Gaya Jn.', phone: '9835510005', email: 'm.tiwari@rpf.gov.in', availability: 'On duty' }
];
const insOfficer = db.prepare(`INSERT INTO officers (id, name, rank, badge, station, phone, email, availability, created_by) VALUES (?,?,?,?,?,?,?,?,?)`);
demoOfficers.forEach(o => insOfficer.run(uuid(), o.name, o.rank, o.badge, o.station, o.phone, o.email, o.availability, 'seed'));

// --- incidents ---
const incData = [
  { type: 'Theft', priority: 'High', station: 'Patna Jn.', platform: '2', train: '12393', desc: 'Passenger reported a wallet stolen near the general compartment.', statusIdx: 2, hours: 4, reporter: 'Anita Verma' },
  { type: 'Suspicious Bag', priority: 'Critical', station: 'Danapur', platform: '1', train: '', desc: 'Unattended bag reported near the enquiry counter, since cleared by the bomb squad.', statusIdx: 3, hours: 7, reporter: 'Suresh Yadav' },
  { type: 'Passenger Assistance', priority: 'Low', station: 'Patna Jn.', platform: '5', train: '', desc: 'Elderly passenger needed wheelchair assistance to the platform.', statusIdx: 4, hours: 10, reporter: 'Ravi Kumar Singh' },
  { type: 'Women Safety', priority: 'High', station: 'Rajendra Nagar T.', platform: '3', train: '15277', desc: 'Passenger reported harassment by a co-passenger in the sleeper coach.', statusIdx: 1, hours: 2, reporter: 'Priya Kumari' },
  { type: 'Trespassing', priority: 'Medium', station: 'Gaya Jn.', platform: '', train: '', desc: 'Persons found crossing tracks near the yard during shunting.', statusIdx: 0, hours: 1, reporter: 'Manoj Tiwari' },
  { type: 'Lost Property', priority: 'Low', station: 'Patna Jn.', platform: '4', train: '12310', desc: 'Mobile phone found in AC coach, awaiting claim.', statusIdx: 4, hours: 20, reporter: 'Anita Verma' }
];
const insIncident = db.prepare(`INSERT INTO incidents (id, case_id, type, priority, status, station, platform, train, coach, gd_entry, fir, gps, reporter, assigned, description, remarks, photo, timeline, created_at, assigned_at, resolved_at, closed_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
incData.forEach(d => {
  const caseId = nextCaseId('TRK');
  const status = INCIDENT_STAGES[d.statusIdx];
  insIncident.run(uuid(), caseId, d.type, d.priority, status, d.station, d.platform, d.train, '', '', '', '',
    d.reporter, d.statusIdx >= 1 ? demoOfficers[0].name : '', d.desc, '', '',
    JSON.stringify(stageTimeline(INCIDENT_LABELS, d.statusIdx, d.hours)),
    hoursAgo(d.hours), '', '', '', 'seed');
});

// --- missing persons ---
const mpData = [
  { name: 'Aarav Kumar', ageGender: '8 / M', station: 'Patna Jn.', platform: '1', guardian: 'Suman Kumar', phone: '9876500001', statusIdx: 0, hours: 0.5 },
  { name: 'Priyanka Devi', ageGender: '34 / F', station: 'Danapur', platform: '2', train: '12393', guardian: 'Ramesh Devi', phone: '9876500002', statusIdx: 2, hours: 5 },
  { name: 'Rohit Sharma', ageGender: '11 / M', station: 'Gaya Jn.', platform: '3', guardian: 'Vinod Sharma', phone: '9876500003', statusIdx: 5, hours: 14 },
  { name: 'Sita Kumari', ageGender: '6 / F', station: 'Patna Jn.', platform: '4', guardian: 'Anil Kumar', phone: '9876500004', statusIdx: 8, hours: 30 }
];
const insMissing = db.prepare(`INSERT INTO missing_persons (id, case_id, name, photos, age_gender, priority, guardian_name, guardian_phone, address, clothing, marks, station, platform, train, coach, gd_entry, fir, reporter, assigned, remarks, status, timeline, created_at, found_at, closed_by, handed_over_at, closed_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
mpData.forEach(d => {
  const caseId = nextCaseId('TRK');
  const status = MISSING_STAGES[d.statusIdx];
  const foundAt = d.statusIdx >= 5 ? hoursAgo(d.hours * 0.4) : '';
  const closedBy = d.statusIdx >= 5 ? demoOfficers[0].name : '';
  const ageNum = parseInt((d.ageGender.match(/\d+/) || [])[0], 10);
  const priority = !isNaN(ageNum) && ageNum < 10 ? 'Critical' : 'High';
  insMissing.run(uuid(), caseId, d.name, '[]', d.ageGender, priority, d.guardian, d.phone, '', 'Blue school uniform', '',
    d.station, d.platform, d.train || '', '', '', '', demoOfficers[1].name, '', '', status,
    JSON.stringify(stageTimeline(MISSING_LABELS, d.statusIdx, d.hours)),
    hoursAgo(d.hours), foundAt, closedBy, '', '', 'seed');
});

// --- patrols ---
const patData = [
  { name: 'Platform 1-3 sweep', officer: 'Anita Verma', area: 'Patna Jn. platforms 1-3', shift: '06:00–14:00', status: 'completed' },
  { name: 'Parking & FOB watch', officer: 'Manoj Tiwari', area: 'Gaya Jn. foot overbridge', shift: '14:00–22:00', status: 'active' },
  { name: 'Yard perimeter check', officer: 'Suresh Yadav', area: 'Danapur yard', shift: '22:00–06:00', status: 'scheduled' },
  { name: 'Ticketless travel check', officer: 'Priya Kumari', area: 'Rajendra Nagar T. concourse', shift: '08:00–16:00', status: 'completed' }
];
const insPatrol = db.prepare(`INSERT INTO patrols (id, name, officer, area, shift, gps, status, date, started_at, completed_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
patData.forEach(p => insPatrol.run(uuid(), p.name, p.officer, p.area, p.shift, '', p.status, todayStr(),
  p.status !== 'scheduled' ? hoursAgo(3) : '', p.status === 'completed' ? hoursAgo(1) : '', 'seed'));

// --- duties ---
const dutyData = [
  { name: 'Ravi Kumar Singh', rank: 'Sub Inspector', badge: 'RPF-2291', type: 'Station duty', post: 'Patna Jn. main gate', shift: '06:00–14:00' },
  { name: 'Anita Verma', rank: 'Constable', badge: 'RPF-3187', type: 'Ticket / passenger assistance', post: 'Patna Jn. PF 1', shift: '06:00–14:00' },
  { name: 'Manoj Tiwari', rank: 'Head Constable', badge: 'RPF-2765', type: 'Patrolling', post: 'Gaya Jn.', shift: '14:00–22:00' },
  { name: 'Priya Kumari', rank: 'Constable', badge: 'RPF-3299', type: 'Anti-human trafficking (AHT) check', post: 'Rajendra Nagar T.', shift: '08:00–16:00' },
  { name: 'Suresh Yadav', rank: 'Inspector', badge: 'RPF-1042', type: 'Train escort / scouting', post: '12393 Rajgir Express', shift: '10:00–18:00' },
  { name: 'Deepak Ranjan', rank: 'Constable', badge: 'RPF-3410', type: 'VIP / security bandobast', post: 'Patna Jn. VIP lounge', shift: '09:00–17:00' }
];
const insDuty = db.prepare(`INSERT INTO duties (id, name, rank, badge, supervisor, type, label, post, shift, attendance, date, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
dutyData.forEach(d => insDuty.run(uuid(), d.name, d.rank, d.badge, 'Ravi Kumar Singh', d.type, '', d.post, d.shift, 'Present', todayStr(), 'seed'));

// --- lost & found ---
const lfData = [
  { category: 'Wallet', desc: 'Black leather wallet with ID cards', location: 'Patna Jn. PF 2', foundBy: 'Anita Verma', status: 'stored' },
  { category: 'Phone', desc: 'Samsung phone, blue cover', location: 'Patna Jn. PF 4', foundBy: 'Ravi Kumar Singh', status: 'claimed' },
  { category: 'Documents', desc: 'Aadhaar card and train tickets in envelope', location: 'Danapur', foundBy: 'Suresh Yadav', status: 'returned' },
  { category: 'Luggage', desc: 'Grey trolley bag, unclaimed', location: 'Gaya Jn.', foundBy: 'Manoj Tiwari', status: 'collected' }
];
const insLf = db.prepare(`INSERT INTO lostfound (id, category, description, location, found_by, status, claimant_name, claimant_phone, created_at, returned_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
lfData.forEach(it => insLf.run(uuid(), it.category, it.desc, it.location, it.foundBy, it.status,
  (it.status === 'claimed' || it.status === 'returned') ? 'Rakesh Prasad' : '',
  (it.status === 'claimed' || it.status === 'returned') ? '9876511111' : '',
  hoursAgo(12), it.status === 'returned' ? hoursAgo(2) : '', 'seed'));

// --- a couple of log + notification entries ---
db.prepare('INSERT INTO logs (id, type, description, by_name, at) VALUES (?,?,?,?,?)')
  .run(uuid(), 'Auto', 'Demo dataset loaded for presentation walkthrough', 'System', new Date().toISOString());
db.prepare('INSERT INTO notifications (id, text, category, read, at) VALUES (?,?,?,0,?)')
  .run(uuid(), 'Sample dataset loaded — dashboard now reflects demo cases', 'info', new Date().toISOString());

console.log('Seed complete.');

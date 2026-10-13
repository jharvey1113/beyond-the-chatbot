/**
 * THE TIERED ALERT SYSTEM
 * From "Beyond the Chatbot" by James Harvey (Chapter 15)
 *
 * Sheet tab named "Attendance", headers in row 1:
 *   A: Student Name | B: Parent Email | C: Counselor Email | D: Absence Rate (%)
 *   E: Last Alert Tier | F: Last Alert Date   (leave E and F blank; the script fills them)
 *
 *   Tier 1 (5% - 7.9%)  -> Parent
 *   Tier 2 (8% - 9.9%)  -> Parent + Counselor
 *   Tier 3 (10%+)       -> Parent + Counselor + You
 *
 * Every email is recorded on an "Intervention Log" tab.
 * KEEP TEST_MODE = true until you have read every test email.
 */

const TEST_MODE = true;          // true = ALL emails go only to you, marked [TEST]
const MY_NAME = 'Your Name';     // <-- Change this
const SHEET_NAME = 'Attendance';
const LOG_NAME = 'Intervention Log';
const RESEND_DAYS = 7;           // Don't repeat the same tier to the same family within this many days

// Edit the wording here. {student}, {rate}, and {me} fill in automatically.
const MESSAGES = {
  1: {
    subject: 'Checking in on {student}',
    body: 'Hello,\n\nWe noticed {student} has missed a few days recently, and we wanted to check in. ' +
          'Is everything okay? If something is getting in the way, we would love to help.\n\n' +
          'Just reply to this email anytime.\n\nThank you,\n{me}'
  },
  2: {
    subject: "We're concerned about {student}'s attendance",
    body: 'Hello,\n\n{student} has now been absent {rate}% of the time. We are concerned and want to ' +
          "work with you on a plan. {student}'s counselor is copied on this email and will reach out soon.\n\n" +
          'Thank you,\n{me}'
  },
  3: {
    subject: 'Attendance alert for {student}',
    body: "Hello,\n\n{student}'s absences have reached {rate}%, which is considered chronic absence. " +
          'We would like to set up a time this week to talk about how we can support {student}. ' +
          'Please reply with a time that works for you.\n\nThank you,\n{me}'
  }
};

// Adds an "Attendance Tools" menu to the sheet
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Attendance Tools')
    .addItem('Run Tiered Alerts', 'runTieredAlerts')
    .addToUi();
}

// Run this ONE time (after testing) to check attendance every Monday at 7 AM
function createWeeklyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'runTieredAlerts') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('runTieredAlerts')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .create();
}

function runTieredAlerts() {
  const me = Session.getEffectiveUser().getEmail();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Could not find a tab named "' + SHEET_NAME + '".');
  const log = ss.getSheetByName(LOG_NAME) || createLog_(ss);

  // 1. GET DATA
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const formats = sheet.getRange(2, 4, lastRow - 1, 1).getNumberFormats();

  const now = new Date();
  const counts = { 1: 0, 2: 0, 3: 0 };
  const skipped = [];

  // 2. LOOP through every student
  data.forEach(function (row, i) {
    const student = String(row[0]).trim();
    if (!student) return;

    // Read the absence rate (works whether it's typed as 7, 7%, or a % formatted cell)
    let rate = parseFloat(String(row[3]).replace('%', ''));
    if (isNaN(rate)) { skipped.push(student + ' (no absence rate)'); return; }
    if (formats[i][0].indexOf('%') !== -1) rate = rate * 100;

    // 3. CHECK the condition
    const tier = getTier_(rate);
    if (tier === 0) return;

    const lastTier = Number(row[4]);
    const lastDate = row[5] instanceof Date ? row[5] : null;
    const daysSince = lastDate ? (now - lastDate) / 86400000 : Infinity;
    if (lastTier === tier && daysSince < RESEND_DAYS) return;   // Already contacted recently

    const to = [String(row[1]).trim()];                 // Parent
    if (tier >= 2) to.push(String(row[2]).trim());      // + Counselor
    if (tier === 3) to.push(me);                        // + You

    // Fail-safe: if any address is missing, leave this student for a human
    if (to.some(function (e) { return !isEmail_(e); })) {
      skipped.push(student + ' (missing or invalid email)');
      return;
    }

    // 4. DO SOMETHING: send, stamp, and log
    const fill = function (text) {
      return text.replace(/{student}/g, student).replace(/{rate}/g, rate.toFixed(1)).replace(/{me}/g, MY_NAME);
    };
    let body = fill(MESSAGES[tier].body);
    if (TEST_MODE) body = '*** TEST MODE: this would have gone to ' + to.join(', ') + ' ***\n\n' + body;

    MailApp.sendEmail({
      to: TEST_MODE ? me : to.join(','),
      subject: (TEST_MODE ? '[TEST] ' : '') + fill(MESSAGES[tier].subject),
      body: body
    });

    if (!TEST_MODE) sheet.getRange(i + 2, 5, 1, 2).setValues([[tier, now]]);
    log.appendRow([now, student, 'Tier ' + tier, rate.toFixed(1) + '%', to.join(', '), TEST_MODE ? 'TEST' : 'SENT']);
    counts[tier]++;
  });

  // Summary email to you
  MailApp.sendEmail(me,
    'Tiered Alert Summary' + (TEST_MODE ? ' [TEST]' : ''),
    'Tier 1: ' + counts[1] + '\nTier 2: ' + counts[2] + '\nTier 3: ' + counts[3] +
    '\n\nSkipped (handle these by hand):\n' + (skipped.length ? skipped.join('\n') : 'None'));
}

function getTier_(rate) {
  if (rate >= 10) return 3;
  if (rate >= 8) return 2;
  if (rate >= 5) return 1;
  return 0;
}

function createLog_(ss) {
  const log = ss.insertSheet(LOG_NAME);
  log.appendRow(['Date', 'Student', 'Tier', 'Absence Rate', 'Sent To', 'Status']);
  log.setFrozenRows(1);
  return log;
}

function isEmail_(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

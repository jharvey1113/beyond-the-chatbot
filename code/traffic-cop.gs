/**
 * THE EMAIL TRAFFIC COP
 * From "Beyond the Chatbot" by James Harvey (Chapter 14)
 *
 * Routes student and parent emails to the right teacher automatically,
 * so nothing sits in the office inbox waiting for someone to forward it.
 *
 * Setup:
 *   1. In Gmail, create a label named "To Process" and a filter that applies it
 *      to incoming mail sent to your office address.
 *   2. In a Google Sheet, make a tab named "Roster" with headers in row 1:
 *        A: Student Name | B: Student Email | C: Parent Email(s) | D: Teacher Email
 *      Column C can hold more than one address, separated by commas.
 *
 * What happens to each email:
 *   - Sender is on the roster   -> forwarded to that student's teacher, labeled "Routed", archived
 *   - Sender is NOT on the roster, or matches students with different teachers
 *                               -> labeled "Needs Review" and left in the inbox for a person
 *   Nothing is ever deleted. Every decision is written to a "Routing Log" tab.
 *
 * KEEP TEST_MODE = true until you have checked the Routing Log.
 */

const TEST_MODE = true;              // true = every forward goes only to you, marked [TEST]
const ROSTER_TAB = 'Roster';
const LOG_TAB = 'Routing Log';
const INCOMING_LABEL = 'To Process';
const ROUTED_LABEL = 'Routed';
const REVIEW_LABEL = 'Needs Review';

// Adds a "Traffic Cop" menu to the sheet
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Traffic Cop')
    .addItem('Route emails now', 'routeEmails')
    .addToUi();
}

// Run this ONE time (after testing) to check for new email every 10 minutes
function createTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'routeEmails') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('routeEmails').timeBased().everyMinutes(10).create();
}

function routeEmails() {
  const me = Session.getEffectiveUser().getEmail().toLowerCase();
  const incoming = GmailApp.getUserLabelByName(INCOMING_LABEL);
  if (!incoming) throw new Error('Create a Gmail label named "' + INCOMING_LABEL + '" first.');
  const routed = getOrCreateLabel_(ROUTED_LABEL);
  const review = getOrCreateLabel_(REVIEW_LABEL);

  // 1. GET DATA: the live roster, turned into an email -> student lookup
  const lookup = buildLookup_();
  const log = getLog_();

  // 2. LOOP through every waiting email thread
  incoming.getThreads(0, 50).forEach(function (thread) {
    // Find the newest message in the thread that someone else sent
    const messages = thread.getMessages();
    let msg = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (senderEmail_(messages[i].getFrom()) !== me) { msg = messages[i]; break; }
    }
    if (!msg) { thread.removeLabel(incoming); return; }

    const from = senderEmail_(msg.getFrom());
    const matches = lookup[from] || [];
    const teachers = unique_(matches.map(function (m) { return m.teacher; }).filter(isEmail_));

    // 3. CHECK: exactly one teacher? Route it. Anything else? A person decides.
    if (teachers.length === 1) {
      const students = unique_(matches.map(function (m) { return m.student; })).join(', ');
      // 4. DO SOMETHING: forward, label, file away, log
      msg.forward(TEST_MODE ? me : teachers[0], {
        subject: (TEST_MODE ? '[TEST] ' : '') + '[' + students + '] ' + msg.getSubject()
      });
      thread.addLabel(routed);
      thread.removeLabel(incoming);
      if (!TEST_MODE) thread.moveToArchive();
      log.appendRow([new Date(), from, students, teachers[0], msg.getSubject(), TEST_MODE ? 'TEST (sent to me)' : 'ROUTED']);
    } else {
      // Fail-safe: unknown sender (or students with different teachers) stays in the inbox
      thread.addLabel(review);
      thread.removeLabel(incoming);
      const why = teachers.length === 0 ? 'NEEDS REVIEW (not on roster)' : 'NEEDS REVIEW (more than one teacher)';
      log.appendRow([new Date(), from, '', teachers.join(', '), msg.getSubject(), why]);
    }
  });
}

// Builds { "email@address": [ {student, teacher}, ... ] } from the Roster tab
function buildLookup_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ROSTER_TAB);
  if (!sheet) throw new Error('Could not find a tab named "' + ROSTER_TAB + '".');
  const lookup = {};
  sheet.getDataRange().getValues().slice(1).forEach(function (r) {
    const entry = { student: String(r[0]).trim(), teacher: String(r[3]).trim().toLowerCase() };
    if (!entry.student) return;
    [String(r[1])].concat(String(r[2]).split(/[,;\s]+/)).forEach(function (e) {
      e = e.trim().toLowerCase();
      if (!isEmail_(e)) return;
      (lookup[e] = lookup[e] || []).push(entry);
    });
  });
  return lookup;
}

// Pulls the address out of "Name <email@address>"
function senderEmail_(from) {
  const m = String(from).match(/<([^>]+)>/);
  return (m ? m[1] : String(from)).trim().toLowerCase();
}

function getOrCreateLabel_(name) {
  return GmailApp.getUserLabelByName(name) || GmailApp.createLabel(name);
}

function getLog_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let log = ss.getSheetByName(LOG_TAB);
  if (!log) {
    log = ss.insertSheet(LOG_TAB);
    log.appendRow(['Date', 'From', 'Student', 'Teacher', 'Subject', 'Result']);
    log.setFrozenRows(1);
  }
  return log;
}

function unique_(list) {
  return list.filter(function (v, i) { return v && list.indexOf(v) === i; });
}

function isEmail_(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

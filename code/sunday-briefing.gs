/**
 * THE SUNDAY NIGHT BRIEFING
 * From "Beyond the Chatbot" by James Harvey (Chapter 14)
 *
 * Every Sunday at 6 PM, emails your team next week's events (Mon-Fri),
 * grouped by day, from one shared Google Calendar.
 *
 * Setup:
 *   - A shared Google Calendar (name it below)
 *   - A sheet tab named "Recipients" with email addresses in column A
 *
 * Run sendTestToMe first. When it looks right, run createSundayTrigger ONCE.
 */

const CALENDAR_NAME = 'Office Master';   // <-- Your shared calendar's exact name
const RECIPIENTS_TAB = 'Recipients';

// Sends the digest to everyone on the Recipients tab (the trigger runs this)
function sendWeeklyDigest() {
  sendDigest_(getRecipients_());
}

// Sends the digest ONLY to you, so you can check it first
function sendTestToMe() {
  sendDigest_([Session.getEffectiveUser().getEmail()]);
}

// Run this ONE time to schedule the digest for every Sunday at 6 PM
function createSundayTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'sendWeeklyDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendWeeklyDigest')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(18)
    .create();
}

function sendDigest_(recipients) {
  if (recipients.length === 0) {
    throw new Error('No email addresses found in column A of "' + RECIPIENTS_TAB + '".');
  }
  const calendars = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (calendars.length === 0) {
    throw new Error('Could not find a calendar named "' + CALENDAR_NAME + '".');
  }
  const cal = calendars[0];
  const tz = cal.getTimeZone();

  // Find the upcoming Monday
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  const daysUntilMonday = (8 - monday.getDay()) % 7 || 7;
  monday.setDate(monday.getDate() + daysUntilMonday);

  // Build the email one day at a time
  let html = '<div style="font-family:Arial,sans-serif;max-width:600px;font-size:15px">' +
    '<h2 style="margin:0 0 8px">Week of ' + Utilities.formatDate(monday, tz, 'MMMM d') + '</h2>';

  for (let d = 0; d < 5; d++) {
    const start = new Date(monday);
    start.setDate(monday.getDate() + d);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    const events = cal.getEvents(start, end);

    html += '<h3 style="margin:18px 0 6px;padding-bottom:4px;border-bottom:1px solid #ddd">' +
      Utilities.formatDate(start, tz, 'EEEE, MMM d') + '</h3>';

    if (events.length === 0) {
      html += '<p style="color:#777;margin:4px 0">Nothing scheduled.</p>';
      continue;
    }
    html += '<ul style="padding-left:18px;margin:4px 0">';
    events.forEach(function (e) {
      const time = e.isAllDayEvent() ? 'All day' : Utilities.formatDate(e.getStartTime(), tz, 'h:mm a');
      const where = e.getLocation() ? ' <span style="color:#777">(' + clean_(e.getLocation()) + ')</span>' : '';
      html += '<li style="margin:4px 0"><b>' + time + '</b> &nbsp;' + clean_(e.getTitle()) + where + '</li>';
    });
    html += '</ul>';
  }
  html += '</div>';

  MailApp.sendEmail({
    to: recipients.join(','),
    subject: 'Weekly Calendar Digest: ' + Utilities.formatDate(monday, tz, 'MMM d'),
    htmlBody: html
  });
}

// Reads email addresses from column A of the Recipients tab
function getRecipients_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RECIPIENTS_TAB);
  if (!sheet || sheet.getLastRow() < 1) return [];
  return sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (e) { return e.indexOf('@') > 0; });
}

// Keeps event titles from breaking the email layout
function clean_(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

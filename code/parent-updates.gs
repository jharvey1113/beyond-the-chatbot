/**
 * ONE-CLICK PARENT UPDATES
 * From "Beyond the Chatbot" by James Harvey (Chapter 7)
 *
 * Sheet tab named "Student Roster", headers in row 1:
 *   A: Student Name | B: Parent Name | C: Parent Email | D: Notes | E: Last Contact Date
 *
 * Type a note in column D for each student you want to update,
 * then use the menu: Parent Tools > Send Updates.
 */

const SHEET_NAME = 'Student Roster';
const MY_NAME = 'Your Name';   // <-- Change this to your name

// Adds a "Parent Tools" menu to the sheet every time it opens
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Parent Tools')
    .addItem('Send Updates', 'sendParentUpdates')
    .addToUi();
}

function sendParentUpdates() {
  const ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    ui.alert('Could not find a tab named "' + SHEET_NAME + '".');
    return;
  }

  // 1. GET DATA: grab every row below the headers
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('No students found.');
    return;
  }
  const data = sheet.getRange(2, 1, lastRow - 1, 5).getValues();

  // 2. LOOP + 3. CHECK: only rows that have BOTH a note and a parent email
  const ready = [];
  data.forEach(function (row, i) {
    const email = String(row[2]).trim();
    const notes = String(row[3]).trim();
    if (email && notes) ready.push(i);
  });
  if (ready.length === 0) {
    ui.alert('No rows have both a Note and a Parent Email.');
    return;
  }

  // Safety check: ask before anything goes out
  const answer = ui.alert('Send ' + ready.length + ' parent update(s)?', ui.ButtonSet.YES_NO);
  if (answer !== ui.Button.YES) return;

  // 4. DO SOMETHING: send each email and stamp the date
  ready.forEach(function (i) {
    const student = data[i][0];
    const parent = data[i][1];
    const email = String(data[i][2]).trim();
    const notes = data[i][3];

    const subject = 'Update on ' + student;
    const body =
      'Dear ' + parent + ',\n\n' +
      'I wanted to give you a quick update on ' + student + "'s progress.\n\n" +
      notes + '\n\n' +
      'Please let me know if you have any questions.\n\n' +
      'Best,\n' + MY_NAME;

    MailApp.sendEmail(email, subject, body);
    sheet.getRange(i + 2, 5).setValue(new Date());   // Column E: Last Contact Date
  });

  ui.alert('Done! Sent ' + ready.length + ' update(s).');
}

# Beyond the Chatbot: Starter Builds

Companion page for the DLAC 2026 book study **Beyond the Chatbot: Stop Talking About AI. Start Building Something.** by James Harvey.

Each build pairs working Google Apps Script starter code with a coaching prompt. Paste both into ChatGPT, Gemini, Copilot, or Claude, and the AI walks you through building it step by step.

| Build | Who it's for | Code |
|---|---|---|
| The Pocket Expert (portable AI skill for Gemini Skills, ChatGPT Plugins, Copilot, or Claude) | Anyone | No code |
| One-Click Parent Updates | Teachers, SPED | [`code/parent-updates.gs`](code/parent-updates.gs) |
| The Sunday Night Briefing | Office staff, dept. leads | [`code/sunday-briefing.gs`](code/sunday-briefing.gs) |
| The Tiered Alert System | Administrators, counselors | [`code/tiered-alerts.gs`](code/tiered-alerts.gs) |

**Always test with fake data and your own email first.** Check your district's data privacy and FERPA policies before using real student information.

To edit the page: change `_head.html`, `_mid.html`, `_tail.html`, or the files in `code/`, then run `python build.py` to regenerate `index.html`.

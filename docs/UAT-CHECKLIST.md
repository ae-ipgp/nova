# User acceptance checklist (run on the real deployment)

Everything below passed in automated tests against in-memory fakes, **not** against real Google
or Supabase. Run this list once after deploying, before publishing the address. Mark each
line with the date and initials. Blueprint acceptance tests are cited (AT-xx).

## 0. Deployment sanity
- [ ] `/exec` URL opens in a private window (not signed in to Google) and shows `"ok":true` and `"schemaVersion":3`.
- [ ] Site opens on the Vercel URL; browser console shows **no** red errors (CSP in force).
- [ ] `npm run check` passed on the commit that was deployed.

## 1. Sign-in and roles (AT-02, AT-12)
- [ ] SUAK signs in with DELIMa and reaches the workspace.
- [ ] A Gmail account is refused. An unregistered DELIMa account sees "Akaun belum didaftarkan".
- [ ] SUAK registers a member; the member signs in and sees no Pengurusan.
- [ ] SUAK suspends the member; their next click shows "Akaun tidak aktif" (AT-12).
- [ ] SUAK cannot suspend or demote the only active SUAK.

## 2. Reference numbers and letters (AT-03, AT-04, AT-05)
- [ ] **Before** a series exists, approving a request fails with "Siri ... belum ditetapkan".
- [ ] SUAK saves a series (format confirmed by the institution); preview shows the expected number.
- [ ] A member submits a request and gets a temporary `PRM-…` ID, no official number.
- [ ] A member and a Secretariat user cannot approve (AT-02).
- [ ] SUAK approves → exactly one number is issued; the register shows it; the sequence advanced.
- [ ] Two SUAK browser tabs approve two different requests at the same moment → two different numbers (AT-04).
- [ ] Rejecting needs a written reason, issues nothing, the applicant sees the reason (AT-05).
- [ ] Voiding keeps the number in the register as "Dibatalkan"; the next request gets the next number.
- [ ] A request with a document type produces a PDF. **Open the PDF and check:** A4 page, nothing cut
      off, the reference number and date are right, no unapproved wording, the DEMO banner shows for
      sample types only. If the page is Letter-sized or the layout breaks, report it before go-live.
- [ ] `/semak` confirms a real number as "sah", a voided one as "dibatalkan", and a made-up one as not found.

## 3. Meetings and attendance (AT-06, AT-07)
- [ ] Create a meeting; every active member is invited; a member sees it, an outsider does not.
- [ ] Record attendance; an "excused" entry needs a private reason; members never see others' reasons.
- [ ] Verify (SUAK, or Secretariat after being granted "Sahkan kehadiran").
- [ ] Editing a verified record needs permission and a reason, and appears in the audit log (AT-06).
- [ ] Publish the meeting; `/kehadiran` shows counts only (aggregate); no names or reasons (AT-07).
- [ ] An unpublished meeting's data is not returned to a signed-out visitor.
- [ ] Minutes: draft → submitted → SUAK approves; members see only the approved version.

## 4. NoMe email (AT-08, AT-09)
- [ ] Secretariat without delegation cannot open NoMe; with "Sediakan NoMe" can draft but not send.
- [ ] Preview matches the intended text, subject and recipient count (AT-08).
- [ ] Send to a small test group (2–3 real addresses). Each person gets **one** copy; check the Inbox
      (not Spam) and that Reply goes to the Reply-To address.
- [ ] Check the remaining daily quota shown before sending matches `MailApp` expectations.
- [ ] Force a failure (include a deliberately wrong address); the notice shows "separa", retry sends
      only to the failed one and nobody gets a duplicate (AT-09).
- [ ] Schedule a notice for ~20 minutes ahead; it is sent once by the 15-minute trigger.

## 5. Templat, e-OPR, e-Arkib (AT-10, AT-11)
- [ ] Upload a PDF template; a member can download it; archived ones disappear for members.
- [ ] Public template appears on `/templat` only when SUAK marks it Awam; an internal one never does.
- [ ] Build an OPR on a phone: reload mid-way and the draft is restored; add 4 photos (they shrink).
- [ ] Export the draft PDF and the approved PDF (AT-10): **exactly one A4 page, nothing clipped**, photos
      sharp, text readable, in all three styles (Korporat, Editorial, Infografik). If photos are missing
      in the PDF, report it (HTML→PDF image support differs by Google account).
- [ ] After approval the OPR is in e-Arkib with metadata and cannot be edited.
- [ ] A private archive file is refused for a member and for a signed-out visitor (AT-11).
- [ ] Publishing makes a separate public copy; withdrawing it removes it from `/arkib`.

## 6. Settings, audit, maintenance
- [ ] Tetapan saves; contacts show in the site footer; privacy page shows "Belum ditetapkan" until text is set.
- [ ] Maintenance mode: a member's save is refused with the message; SUAK still works; the banner shows.
- [ ] Log audit lists the actions above with who/when.

## 7. Session rollover and recovery (AT-13, AT-14)
- [ ] Create the next session and activate it; the old session becomes archived and its records stay readable (AT-13).
- [ ] Make a copy of both spreadsheets and the Drive folder; open the copies and confirm the data is readable (AT-14).
- [ ] Walk through the ADR-0002 ownership handover on paper with the person who will take over.

## 8. Phone and accessibility spot-checks
- [ ] On a phone: login, dashboard, e-Surat request, attendance view, OPR wizard all usable without sideways scrolling.
- [ ] Keyboard only: tab through the login page and open/close a dialog; focus is visible.
- [ ] "Install app" works on Android Chrome; after a deploy, reopening the app shows the new version.

## 9. Themes, language, search, brand, visibility (HiPER-parity layer)
- [ ] Appearance menu (palette icon): Mutiara, Lazuardi, Zamrud and Automatik all load without a white flash on reload;
      Automatik follows the device's light/dark setting.
- [ ] Switch to English: menus, forms, buttons, errors from the server and dates are English; PDFs, letters and e-mails stay Malay.
      Ask a bilingual member to read the English text.
- [ ] Ctrl+K (or `/`) finds a page, a letter, a meeting and a document you may see; a member never sees records they cannot open.
      Signed out, `/` search shows only published public items.
- [ ] Tetapan → Jenama: upload a logo and a favicon; both appear after a reload (browser tab shows the new favicon).
      "Pulihkan lalai" restores NO.VA's own.
- [ ] Tetapan → Keterlihatan halaman: set *Arkib Awam* to Akan datang (public sees the notice), *Templat* in the workspace to
      Disembunyikan (a member cannot open it; SUAK still can, with a banner).
- [ ] Submit a reference-number request: SUAK receives an e-mail. Approve it: the applicant receives one.
      Switch the kind off in *Pilihan e-mel* and confirm it stops. An access-changed notice still arrives.
- [ ] Assign a follow-up action due in 3 days; the owner gets the daily reminder (run `sendReminders` once by hand to test).
- [ ] Run `backupToDrive` once; a dated folder appears in Drive. Tetapan → *Muat turun sandaran* downloads a ZIP that opens.
- [ ] Turn the Wi-Fi off after loading the public site: the outage notice appears with the Secretariat's contacts.
- [ ] Rejecting a request offers the canned replies from Tetapan.
- [ ] Start a new announcement, reload the page: the unsaved draft is restored; "Buang draf" clears it.

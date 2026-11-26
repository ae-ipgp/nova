# NoVA release-candidate report

**Status:** all eight modules, the public portal, the notice board, letter/certificate PDFs and the
mascot slots are built, plus the **HiPER-parity layer** (themes, dark mode, English, search, admin-managed logo/favicon, page visibility, system e-mails, daily reminders, monthly backup). **Verified:** 434 automated tests (gateway + interface), type-check, lint (0 warnings),
production build, an end-to-end browser run of 17 screens under the production Content-Security-Policy,
and a Chromium measurement of the one-page report layout. **Not verified:** anything that needs the real
Google, Supabase or DELIMa accounts. Do [`UAT-CHECKLIST.md`](UAT-CHECKLIST.md) before publishing.

Architecture: ADR-0001 (Sheets + Drive + Apps Script), ADR-0002 (DELIMa sign-in and ownership).
Schema version **5**.

## NoVA rename and editable content (latest)

Schema version **5**. Requested by the owner: rename to **NoVA (Notion of Virtual Assistance)**, new logos (nav, favicon, footer), new wording (hero, principles, login, page descriptions), `Mengenai JPP` → **Organisasi**, a footer with both phone numbers (call + WhatsApp), visitor counter and JPP portal link, login page with the home header/footer, the workspace using the home header, Google photo and full name, a card-style redesign, and **admin-editable content** on every public page.

| Area | Built |
|---|---|
| Rename + wording | NO.VA → NoVA in code, e-mails, PDFs and docs; all requested wording changes in Malay and English ("The Secretary's Office"). |
| Editable content | `site_content` sheet; `<Cms>`, `<CmsLink>`, `<CmsImage>`, `<CmsFile>`, lists; SUAK-only "Suntingan" mode; hide, reset to original, versioned photos. Covers the home page, page headers, Organisasi, login, footer lines and the dashboard heading. |
| Organisasi | Organisation chart (photo + PDF), active leadership (existing consent rules), work progress and leadership legacies (SUAK-entered lists; nothing invented). |
| Footer | New logo, italic tagline, two phone numbers with call/WhatsApp, bold first address line, visitor counter (one per browser session, no personal data), JPP portal link (set in Tetapan). |
| Identity | Google name and photo read from the sign-in token; CSP allows Google image hosts. |
| Redesign | Rounded cards, soft shadows, navy curved rail, light dashboard with mascot and action tiles, solid popovers. |

**Not covered by editable content:** the workspace's working screens (forms, tables, buttons inside modules) keep fixed wording; only their dashboard heading is editable. Contacts, phone numbers and links are edited in Tetapan. Two mascot poses (waving, hand on chest) are in; the rest still fall back to icons.

## HiPER-parity layer (added after the first release candidate)

Requested: make the workspace feel like HiPER and add search, dark mode, English, themes and an admin-changeable logo/favicon.
Source: the HiPER blueprint attached for NoVA (sections 17B and the "build from start" list).

| Area | Built |
|---|---|
| Workspace shell | Floating glass navigation pill, round module rail (desktop), bottom dock + menu sheet (phone), hero greeting, update/install banner, outage notice with cached contacts. |
| Themes + dark mode | **Mutiara** (light, default), **Lazuardi** (dark), **Zamrud** (emerald light), **Automatik** (follows the device). Tokens only (`tokens.css` + `themes.css`); no-flash boot script; WCAG AA contrast tests for every text/surface pair. |
| Bilingual | Malay (source) and English. `t('Malay')` + dictionaries in `src/i18n/en/`; language remounts screens; gateway errors are translated on the client; dates follow the language. **Letters, certificates, e-mails and PDFs stay Malay** (institutional wording). Announcements can carry an English version. |
| Search | Ctrl/Cmd+K (or `/`) palette in the workspace and the public site. Workspace search is filtered by role *in the gateway* (`search.global`); public search returns only published rows (`public.search`). |
| Brand | SUAK can change the **logo**, **favicon** and two brand colours in Tetapan → Jenama (reset to default any time). Images are shrunk in the browser, stored in Drive, cached by version. |
| Page visibility | Each public page and workspace module can be Diterbitkan / Akan datang / Dikunci / Disembunyikan. Enforced by the gateway for everyone except SUAK. |
| System e-mails | Request submitted/decided, OPR submitted/decided, action assigned + reminders (3 days before, on the day, weekly when overdue). Best-effort, never block the action, quota reserve of 25, each person can switch kinds off (**Pilihan e-mel**); security notices cannot be switched off. |
| Backup | Monthly copy of every sheet to Drive (keeps 12) and an on-demand ZIP download (Tetapan → Sandaran data). |
| Small things | Canned replies on reject/void, unsaved-draft restore on forms, optional feedback sounds (off by default), service-worker version stamp per build, update banner and install prompt. |

Mailing-list headers and a separate sender domain (HiPER §17B) were **not** added: NoMe still sends from the owner's DELIMa mailbox (decision 6 below).

## What changed in the first release candidate

| Area | Built |
|---|---|
| M01 Dashboard + **Papan Notis** | Role-aware KPIs, next meeting, my open actions, board, quick actions, activity feed. Board for members; SUAK publishes public notices to Pengumuman. *(Papan Notis is an agreed extension, NTB-01.)* |
| M02 e-Surat + **letters/certificates** | Requests with temporary IDs, SUAK-only approval that issues one unique number under the lock, reject with reason, void (kept, never reused), register + CSV, correspondence register, **PDF letters and certificates from templates SUAK controls** (LTR-11), public authenticity check `/semak` (LTR-12). |
| M03 e-Mesyuarat | Meetings, invitations with frozen snapshots, attendance with delegated verification, audited corrections, exemptions, rate with explicit denominator, agenda, versioned minutes with SUAK approval, actions with owners, attendance summary + CSV. |
| M04 NoMe | Composer, recipient selection (all/role/bureau/saved group/individual), preview, delegated prepare/send, confirm-count guard, quota check, one escaped copy per person, per-recipient retry, scheduling, delivery report. |
| M05 Templat | Catalogue, categories, upload with versions, access level, archive, download; public templates. |
| M06 e-OPR | 8-step wizard, local autosave, photo shrinking, live A4 preview identical to the PDF, 3 styles, versions, review (approve/revise), final PDF filed in e-Arkib. |
| M07 e-Arkib | Search + filters, private by default, member/staff visibility, public publication as a **separate copy**, archive instead of delete, metadata CSV. |
| M08 Pengurusan | Users, roles, **delegated areas**, membership + public-listing opt-in, sessions, **reference series**, **document types**, recipient groups, **Tetapan**, **audit viewer**, maintenance mode. |
| Public portal | Landing with live data, Mengenai (leaders who opted in), Kehadiran (aggregate by default), Pengumuman, Templat, Arkib, Semak Keaslian, Privasi (shows "Belum ditetapkan" until SUAK sets text), footer contacts, maintenance banner. |
| Mascot | "Nuri": 19 pose slots + 8 expressions, static PNG, graceful fallback, FAQ help bubble (prepared answers, no AI). Images to be added: [`MASCOT.md`](MASCOT.md). |
| Publish readiness | CSP and security headers, PWA (manifest, service worker that never caches gateway data), icons, link-preview image, robots.txt, lazy-loaded workspace (public bundle 124 kB gzip). |

## Problems found and fixed during this work

- **One-page OPR did not fit.** Measured in Chromium: the first limits overflowed to a second page in 8 of 9 style/photo combinations. Limits were recalibrated (4,000 characters; 2,500 with photos); all 15 combinations now fit with ≥ 13% headroom.
- **Strict CSP blocked the inlined font** (found only by the production-build browser run). Fonts are no longer inlined.
- Members lost sight of minutes while an amendment was drafted; they now keep seeing the last approved version.
- A letter template builder had added a fixed motto and closing phrases; removed. The system now adds only the reference, date, recipient, subject, body, signatory and verification line.
- Sheets text escaping is now reversed on read, so it can't show stray apostrophes.

## Requirement status (Blueprint §07 + agreed extensions)

P0 all implemented unless listed below. "Partial" = works but narrower than the wording.

| ID | Status | Note |
|---|---|---|
| DASH-01 | Partial | One dashboard that adapts to the role, not four separate dashboards. |
| DASH-05 | Partial | Counts, not trend statistics. |
| ARC-08 | Partial | Metadata CSV export exists; no one-click year-end ZIP package or guided handover wizard. |
| ADM-03 | Partial | Positions and bureaus are free text (no managed list). |
| ADM-08 | Partial | CSV exports on registers, attendance, audit and archive; no combined data export. |
| TPL-07 | Not built (P2) | Smart Document Generator from form fields. Letter/certificate generation covers the main need. |
| LTR-10 | Done | CSV export of the register. |
| NTB-01, LTR-11, LTR-12 | Done | Extensions agreed with the product owner. |

## Acceptance tests (Blueprint §16)

| AT | Automated evidence (fakes) | Still needs real-account check |
|---|---|---|
| 01 public pages | `public portal leakage` | yes |
| 02 member cannot approve | `authorisation matrix`, `only SUAK can approve` | yes |
| 03 SUAK issues one number | `issues one unique, configured number` | yes |
| 04 concurrent approvals | lock + skip-taken-number tests | **yes, with two real tabs** |
| 05 rejected: reason, no number | `rejection needs a written reason` | yes |
| 06 edit after verify | `correcting verified attendance` | yes |
| 07 unpublished data private | `public attendance privacy` | yes |
| 08 NoMe preview | preview tests | yes |
| 09 provider failure | `records failures … retries only the failed` | **yes, real MailApp** |
| 10 OPR PDF | Chromium one-page measurement | **yes, real Apps Script PDF** |
| 11 private archive file | `private documents are invisible` | yes |
| 12 revoked role | `removes access on the next request` | yes |
| 13 archived session readable | session tests | yes |
| 14 backup restore | not testable here | yes |

## Decisions still open (Blueprint §16) and how the build handles them

1. **Reference format / file classification:** no format is built in. Numbers cannot be issued until SUAK saves a series. Placeholder shown only as a preview.
2. **Letters needing extra approval:** not modelled; SUAK approves every request.
3. **Positions, bureaus, members:** free text per member, set by SUAK.
4. **Attendance calculation:** setting `late_counts_as_present` (default on); late is always shown separately; exempted and unrecorded are outside the denominator.
5. **Public attendance fields:** default is statistics only. "Named" mode (names and status) is a setting and needs a privacy review first. Public leaders appear only when the member consents and SUAK ticks the box.
6. **Sender domain for email:** NoMe sends from the owner's DELIMa mailbox via Google; the display name and Reply-To are settings.
7. **Approved letter templates:** only CONTOH samples exist; SUAK must replace them. Saving a type removes the CONTOH banner.
8. **Retention and deletion:** none hard-coded; records are archived, not deleted. No automatic anonymisation yet.
9. **Domain and hosting accounts:** open.
10. **SUAK handover and recovery:** ADR-0002 procedure; one recovery holder still to be named.

## Known limitations and risks

- **Apps Script behaviours assumed from documentation, to confirm in UAT:** HTML→PDF page size (A4 vs Letter) and inline-photo support; `MailApp` display-name/Reply-To; base64 download size for large files.
- **Limits:** files ≤ 5 MB; NoMe ≤ 150 recipients per notice (writes run one at a time under one lock); mail quota per day is Google's (≈ 1,500 for a Workspace account) and is checked before sending; lists are capped (300–500 newest) and every request re-reads sheets, so expect ~1–2 s per action. Plan a new workbook per session if the audit log grows large.
- **No rate limiting on the gateway** and no brute-force protection beyond Google/Supabase's own.
- **English covers the interface only.** Documents, e-mails and PDFs are Malay by design; the English wording of the interface was written by the build, not by a translator: have a bilingual member read it before announcing it.
- **Public downloads go through the gateway** as base64 (not direct Drive links), which is safer but slower for big files.
- **Service worker caches only the app's own files.** After a release, users may need to reload once.
- **Realtime updates:** none; screens refresh on action or reload.
- **Mascot images:** not yet added; slots fall back to the logo and icons.
- **Supabase free tier:** confirm after a week that the daily keep-alive prevents pausing.

/**
 * Apps Script entry points. build.mjs exposes these as top-level functions
 * (doGet, doPost, setupSpreadsheet, installTriggers, keepAlive).
 *
 * The web app is deployed "Execute as: Me" (the organisation's Google account)
 * so Sheets and Drive stay private to that account; no user is ever given
 * direct access to the spreadsheets or folders.
 */
import { DRIVE_FOLDERS, SCHEMA_VERSION, SHEETS, type Workbook } from '@shared/schema'
import { createSupabaseVerifier, type TokenVerifier } from './auth'
import { bootstrap as runBootstrap } from './bootstrap'
import { getProp, PROP, setProp, type PropKey } from './config'
import { pingSupabase } from './keep-alive'
import { liveServices } from './live-services'
import { processScheduledNotices } from './actions/notices'
import { withLock } from './lock'
import { handleRequest, type GatewayDeps } from './router'
import { ensureSheets, type SetupResult } from './setup'
import { createSheetsIO } from './sheets-io'
import { TableStore } from './store'

type TextOutput = GoogleAppsScript.Content.TextOutput

function json(value: unknown): TextOutput {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)
}

function bytesToBase64(bytes: GoogleAppsScript.Byte[]): string {
  return Utilities.base64Encode(bytes)
}

function liveVerifier(): TokenVerifier | null {
  const supabaseUrl = getProp(PROP.supabaseUrl)
  const anonKey = getProp(PROP.supabaseAnonKey)
  if (!supabaseUrl || !anonKey) return null
  return createSupabaseVerifier({
    supabaseUrl,
    anonKey,
    httpGet: (url, headers) => {
      const res = UrlFetchApp.fetch(url, { method: 'get', headers, muteHttpExceptions: true })
      return { code: res.getResponseCode(), body: res.getContentText() }
    },
    cache: CacheService.getScriptCache(),
    nowMs: () => Date.now(),
    decodeBase64Url: (input) => {
      const padded = input + '='.repeat((4 - (input.length % 4)) % 4)
      return Utilities.newBlob(Utilities.base64DecodeWebSafe(padded)).getDataAsString()
    },
    hash: (input) => bytesToBase64(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8)),
  })
}

function liveDeps(): GatewayDeps {
  return {
    now: () => new Date(),
    uuid: () => Utilities.getUuid(),
    openStore: () => new TableStore(createSheetsIO()),
    lock: LockService.getScriptLock(),
    services: liveServices,
    verifier: liveVerifier,
    schemaVersion: () => {
      const v = getProp(PROP.schemaVersion)
      return v ? Number(v) : null
    },
    configured: () => Boolean(getProp(PROP.dataSpreadsheetId) && getProp(PROP.auditSpreadsheetId)),
  }
}

export function doPost(e: GoogleAppsScript.Events.DoPost): TextOutput {
  return json(handleRequest(e?.postData?.contents ?? '', liveDeps()))
}

export function doGet(): TextOutput {
  return json(handleRequest(JSON.stringify({ action: 'system.health', payload: {} }), liveDeps()))
}

// ---------------------------------------------------------------------------
// One-time / repeatable setup (run from the Apps Script editor by the owner)
// ---------------------------------------------------------------------------

function ensureFolder(parent: GoogleAppsScript.Drive.Folder, name: string): GoogleAppsScript.Drive.Folder {
  const it = parent.getFoldersByName(name)
  return it.hasNext() ? it.next() : parent.createFolder(name)
}

function ensureRootFolder(): GoogleAppsScript.Drive.Folder {
  const id = getProp(PROP.driveRootFolderId)
  if (id) return DriveApp.getFolderById(id)
  const folder = DriveApp.createFolder('NO.VA')
  setProp(PROP.driveRootFolderId, folder.getId())
  return folder
}

function ensureWorkbook(
  key: PropKey,
  title: string,
  root: GoogleAppsScript.Drive.Folder,
): { ss: GoogleAppsScript.Spreadsheet.Spreadsheet; fresh: boolean } {
  const id = getProp(key)
  if (id) return { ss: SpreadsheetApp.openById(id), fresh: false }
  const ss = SpreadsheetApp.create(title)
  DriveApp.getFileById(ss.getId()).moveTo(root)
  setProp(key, ss.getId())
  return { ss, fresh: true }
}

function setupWorkbook(key: PropKey, title: string, workbook: Workbook, root: GoogleAppsScript.Drive.Folder): SetupResult {
  const { ss, fresh } = ensureWorkbook(key, title, root)
  const placeholder = fresh ? ss.getSheets()[0] : null
  const result = ensureSheets(ss, SHEETS.filter((s) => s.workbook === workbook))
  // Remove the default empty tab of a newly created spreadsheet.
  if (placeholder && ss.getSheets().length > 1) ss.deleteSheet(placeholder)
  return result
}

/**
 * Creates (or upgrades) the NO.VA Drive folder, both spreadsheets and every
 * tab/column in shared/schema.ts. Safe to run repeatedly; never deletes data.
 */
export function setupSpreadsheet(): void {
  const root = ensureRootFolder()
  for (const name of Object.values(DRIVE_FOLDERS)) ensureFolder(root, name)

  const data = setupWorkbook(PROP.dataSpreadsheetId, 'NO.VA — Data', 'data', root)
  const audit = setupWorkbook(PROP.auditSpreadsheetId, 'NO.VA — Audit', 'audit', root)
  setProp(PROP.schemaVersion, String(SCHEMA_VERSION))

  console.log(JSON.stringify({ schemaVersion: SCHEMA_VERSION, data, audit }, null, 2))
}

/**
 * First-run data: role catalogue, first SUAK and a DEMO session. Run once from
 * the editor after setupSpreadsheet, with Script Properties BOOTSTRAP_SUAK_EMAIL
 * (a @moe-dl.edu.my address) and optionally BOOTSTRAP_SUAK_NAME set.
 */
export function bootstrap(): void {
  const suakEmail = getProp(PROP.bootstrapSuakEmail)
  if (!suakEmail) throw new Error('Set Script Property BOOTSTRAP_SUAK_EMAIL first.')
  const result = withLock(LockService.getScriptLock(), () =>
    runBootstrap(new TableStore(createSheetsIO()), {
      suakEmail,
      suakName: getProp(PROP.bootstrapSuakName) ?? '',
      now: new Date(),
      uuid: () => Utilities.getUuid(),
    }),
  )
  console.log(JSON.stringify(result))
}

export function keepAlive(): void {
  const url = getProp(PROP.supabaseUrl)
  const key = getProp(PROP.supabaseAnonKey)
  if (!url || !key) {
    console.warn('keepAlive skipped: SUPABASE_URL / SUPABASE_ANON_KEY not set')
    return
  }
  const code = pingSupabase((u, o) => UrlFetchApp.fetch(u, o), url, key)
  if (code >= 400) console.error(`Supabase health check returned HTTP ${code}`)
}

/** Sends notices whose scheduled time has arrived. Runs from a time-driven trigger. */
export function sendScheduledNotices(): void {
  const sent = withLock(LockService.getScriptLock(), () => processScheduledNotices(new TableStore(createSheetsIO()), liveServices, new Date(), () => Utilities.getUuid()), 30_000)
  if (sent) console.log(`Scheduled notices sent: ${sent}`)
}

/** Installs the time-driven triggers (daily Supabase keep-alive, 15-minute notice scheduler). Idempotent. */
export function installTriggers(): void {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (['keepAlive', 'sendScheduledNotices'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t)
  }
  ScriptApp.newTrigger('keepAlive').timeBased().everyDays(1).atHour(3).create()
  ScriptApp.newTrigger('sendScheduledNotices').timeBased().everyMinutes(15).create()
}

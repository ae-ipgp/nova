/**
 * Apps Script entry points. build.mjs exposes these as top-level functions
 * (doGet, doPost, setupSpreadsheet, installTriggers, keepAlive).
 *
 * The web app is deployed "Execute as: Me" (the organisation's Google account)
 * so Sheets and Drive stay private to that account; no user is ever given
 * direct access to the spreadsheets or folders.
 */
import { DRIVE_FOLDERS, SCHEMA_VERSION, SHEETS, type Workbook } from '@shared/schema'
import { getProp, PROP, setProp, type PropKey } from './config'
import { pingSupabase } from './keep-alive'
import { handleRequest, type RequestContext } from './router'
import { ensureSheets, type SetupResult } from './setup'

type TextOutput = GoogleAppsScript.Content.TextOutput

function json(value: unknown): TextOutput {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)
}

const liveContext: RequestContext = {
  now: () => new Date(),
  schemaVersion: () => {
    const v = getProp(PROP.schemaVersion)
    return v ? Number(v) : null
  },
  configured: () => Boolean(getProp(PROP.dataSpreadsheetId) && getProp(PROP.auditSpreadsheetId)),
}

export function doPost(e: GoogleAppsScript.Events.DoPost): TextOutput {
  return json(handleRequest(e?.postData?.contents ?? '', liveContext))
}

export function doGet(): TextOutput {
  return json(handleRequest(JSON.stringify({ action: 'system.health', payload: {} }), liveContext))
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

/** Installs the daily keep-alive trigger. Idempotent. */
export function installTriggers(): void {
  for (const t of ScriptApp.getProjectTriggers()) {
    if (t.getHandlerFunction() === 'keepAlive') ScriptApp.deleteTrigger(t)
  }
  ScriptApp.newTrigger('keepAlive').timeBased().everyDays(1).atHour(3).create()
}

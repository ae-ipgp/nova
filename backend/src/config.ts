/** Script Properties keys. Secrets live ONLY here, never in the sheets or the web app. */
export const PROP = {
  dataSpreadsheetId: 'SPREADSHEET_DATA_ID',
  auditSpreadsheetId: 'SPREADSHEET_AUDIT_ID',
  driveRootFolderId: 'DRIVE_ROOT_FOLDER_ID',
  schemaVersion: 'SCHEMA_VERSION',
  supabaseUrl: 'SUPABASE_URL',
  supabaseAnonKey: 'SUPABASE_ANON_KEY',
  /** Read by bootstrap() only: DELIMa email and name of the first SUAK. */
  bootstrapSuakEmail: 'BOOTSTRAP_SUAK_EMAIL',
  bootstrapSuakName: 'BOOTSTRAP_SUAK_NAME',
} as const

export type PropKey = (typeof PROP)[keyof typeof PROP]

export function getProp(key: PropKey): string | null {
  return PropertiesService.getScriptProperties().getProperty(key)
}

export function setProp(key: PropKey, value: string): void {
  PropertiesService.getScriptProperties().setProperty(key, value)
}

import { getSheetDef, type SheetName, type Workbook } from '@shared/schema'
import { getProp, PROP } from './config'
import { toCell, type SheetIO } from './store'

/** SheetIO over SpreadsheetApp. One instance per request. */
export function createSheetsIO(): SheetIO {
  const books = new Map<Workbook, GoogleAppsScript.Spreadsheet.Spreadsheet>()

  const sheet = (name: SheetName): GoogleAppsScript.Spreadsheet.Sheet => {
    const workbook = getSheetDef(name).workbook
    let ss = books.get(workbook)
    if (!ss) {
      const id = getProp(workbook === 'data' ? PROP.dataSpreadsheetId : PROP.auditSpreadsheetId)
      if (!id) throw new Error('Spreadsheets not configured. Run setupSpreadsheet.')
      ss = SpreadsheetApp.openById(id)
      books.set(workbook, ss)
    }
    const tab = ss.getSheetByName(name)
    if (!tab) throw new Error(`Sheet ${name} missing. Run setupSpreadsheet.`)
    return tab
  }

  // Plain-text format stops Sheets converting dates/numbers (e.g. dropping leading zeros).
  const writeRow = (tab: GoogleAppsScript.Spreadsheet.Sheet, row: number, values: string[]) =>
    tab.getRange(row, 1, 1, values.length).setNumberFormat('@').setValues([values.map(toCell)])

  return {
    read: (name) => sheet(name).getDataRange().getValues(),
    append: (name, values) => {
      const tab = sheet(name)
      writeRow(tab, tab.getLastRow() + 1, values)
    },
    write: (name, rowNumber, values) => writeRow(sheet(name), rowNumber, values),
  }
}

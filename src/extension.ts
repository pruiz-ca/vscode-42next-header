import { basename } from 'path'
import vscode = require('vscode')
import { Delimiter, defaultDelimiters, validateDelimiterOverrides } from './delimiters'
import {
  extractHeader, getHeaderInfo, renderHeader,
  shebangLineCount, supportsLanguage, HeaderInfo, HEADER_LINE_COUNT,
} from './header'

const CONFIG_SECTION = '42header'

const getUser = (): string => {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION)
  return cfg.get<string>('username') || process.env['USER'] || 'marvin'
}

const getMail = (): string => {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION)
  return cfg.get<string>('email') || `${getUser()}@student.42.fr`
}

// Reads and validates delimiter overrides from settings.
// warn=true shows a message for malformed entries. Only used at activation
// and on config change so the user is not spammed on every save.
const readDelimiterOverrides = (warn: boolean): Record<string, Delimiter> => {
  const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION)
  const raw = cfg.get<Record<string, unknown>>('languageDelimiters') ?? {}
  const { valid, invalid } = validateDelimiterOverrides(raw)

  if (warn && invalid.length > 0)
    vscode.window.showWarningMessage(
      `42header: Invalid delimiter config for: ${invalid.join(', ')}. ` +
      `Each entry must be ["left", "right"].`,
    )

  return valid
}

const buildHeaderInfo = (document: vscode.TextDocument, existing?: HeaderInfo): HeaderInfo => {
  const user = getUser()
  const mail = getMail()
  return {
    createdAt: new Date(),
    createdBy: user,
    ...existing,
    filename:  basename(document.fileName),
    author:    `${user} <${mail}>`,
    updatedBy: user,
    updatedAt: new Date(),
  }
}

const headerRange = (startLine = 0) =>
  new vscode.Range(startLine, 0, startLine + HEADER_LINE_COUNT, 0)

const insertHeaderHandler = () => {
  const editor = vscode.window.activeTextEditor
  if (!editor) return

  const { document } = editor
  const overrides = readDelimiterOverrides(false)

  if (!supportsLanguage(document.languageId, overrides)) {
    vscode.window.showInformationMessage(
      `42header: No comment delimiter for language '${document.languageId}'. ` +
      `Add one in settings under '42header.languageDelimiters'.`,
    )
    return
  }

  editor.edit(edit => {
    const text = document.getText()
    const existing = extractHeader(text)
    const info = buildHeaderInfo(document, existing ? getHeaderInfo(existing) : undefined)
    const rendered = renderHeader(document.languageId, info, overrides)

    if (existing)
      edit.replace(headerRange(shebangLineCount(text)), rendered)
    else
      edit.insert(new vscode.Position(shebangLineCount(text), 0), rendered)
  })
}

// URIs where we triggered a post-formatter fix-save. Used to skip our own
// save events so we don't loop.
const fixSaveInProgress = new Set<string>()

const startSaveWatcher = (subscriptions: vscode.Disposable[]) => {
  // BEFORE formatter: update header. Handles the common case where formatters
  // leave line-comment headers untouched (e.g. rustfmt + `// ` delimiters).
  vscode.workspace.onWillSaveTextDocument(event => {
    const uri = event.document.uri.toString()
    if (fixSaveInProgress.has(uri)) return

    const { document } = event
    const text = document.getText()
    const overrides = readDelimiterOverrides(false)
    const existing = extractHeader(text)
    if (!supportsLanguage(document.languageId, overrides) || !existing) return

    const info = buildHeaderInfo(document, getHeaderInfo(existing))
    event.waitUntil(
      Promise.resolve([
        vscode.TextEdit.replace(
          headerRange(shebangLineCount(text)),
          renderHeader(document.languageId, info, overrides),
        ),
      ]),
    )
  }, null, subscriptions)

  // AFTER formatter: if the formatter changed the header delimiter, re-apply
  // our version and save without formatting to avoid triggering it again.
  vscode.workspace.onDidSaveTextDocument(async document => {
    const uri = document.uri.toString()

    if (fixSaveInProgress.has(uri)) {
      fixSaveInProgress.delete(uri)
      return
    }

    const text = document.getText()
    const overrides = readDelimiterOverrides(false)
    const existing = extractHeader(text)
    if (!supportsLanguage(document.languageId, overrides) || !existing) return

    const delimiter = overrides[document.languageId] ?? defaultDelimiters[document.languageId]
    if (!delimiter) return

    // If the header already starts with the expected left delimiter, the
    // formatter left it alone. Nothing to do.
    if (existing.startsWith(delimiter[0])) return

    const info = buildHeaderInfo(document, getHeaderInfo(existing))
    const edit = new vscode.WorkspaceEdit()
    edit.replace(document.uri, headerRange(shebangLineCount(text)),
      renderHeader(document.languageId, info, overrides))

    if (await vscode.workspace.applyEdit(edit)) {
      fixSaveInProgress.add(uri)
      await vscode.commands.executeCommand('workbench.action.files.saveWithoutFormatting')
    }
  }, null, subscriptions)
}

export const activate = (context: vscode.ExtensionContext) => {
  readDelimiterOverrides(true)

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand('42header.insertHeader', insertHeaderHandler),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(`${CONFIG_SECTION}.languageDelimiters`))
        readDelimiterOverrides(true)
    }),
  )

  startSaveWatcher(context.subscriptions)
}

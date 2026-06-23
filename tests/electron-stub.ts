class Tray {}
const Menu = { buildFromTemplate: () => ({}) }
const nativeImage = { createEmpty: () => ({ setTemplateImage: () => {} }) }
const app = { getAppPath: () => '', getPath: () => '', on: () => {}, quit: () => {} }
class BrowserWindow {
  static getAllWindows = (): unknown[] => []
  static getFocusedWindow = (): unknown => null
}
const dialog = { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) }
const ipcMain = { handle: () => {} }
const ipcRenderer = { invoke: async () => undefined, on: () => {}, removeListener: () => {} }
const contextBridge = { exposeInMainWorld: () => {} }
const shell = { openExternal: async () => {} }
const nativeTheme = { themeSource: 'dark' }

export {
  Tray,
  Menu,
  nativeImage,
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  ipcRenderer,
  contextBridge,
  shell,
  nativeTheme
}
export default {
  Tray,
  Menu,
  nativeImage,
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  ipcRenderer,
  contextBridge,
  shell,
  nativeTheme
}

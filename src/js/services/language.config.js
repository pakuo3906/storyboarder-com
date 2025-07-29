const path = require('path')
const { app } = process && process.type == 'renderer'
  ? require('@electron/remote')
  : require('electron')

const SettingsService = require('../windows/shot-generator/SettingsService')

const userDataPath = app.getPath('userData')
const settings = new SettingsService(
  path.join(userDataPath, 'locales', 'language-settings.json')
)

// Initialize default language settings if not exists
const initializeDefaultSettings = () => {
  const defaultSettings = {
    builtInLanguages: [
      { fileName: 'en-US', displayName: 'English' },
      { fileName: 'ru-RU', displayName: 'Русский' },
      { fileName: 'zh-CN', displayName: '中文' },
      { fileName: 'ja-JP', displayName: '日本語' }
    ],
    customLanguages: [],
    selectedLanguage: 'en-US',
    defaultLanguage: 'en-US'
  }

  // Set default values if they don't exist
  if (!settings.getSettingByKey('builtInLanguages')) {
    settings.setSettingByKey('builtInLanguages', defaultSettings.builtInLanguages)
  }
  if (!settings.getSettingByKey('customLanguages')) {
    settings.setSettingByKey('customLanguages', defaultSettings.customLanguages)
  }
  if (!settings.getSettingByKey('selectedLanguage')) {
    settings.setSettingByKey('selectedLanguage', defaultSettings.selectedLanguage)
  }
  if (!settings.getSettingByKey('defaultLanguage')) {
    settings.setSettingByKey('defaultLanguage', defaultSettings.defaultLanguage)
  }

  // Add Japanese language if it doesn't exist in builtInLanguages
  const builtInLanguages = settings.getSettingByKey('builtInLanguages')
  const hasJaJP = builtInLanguages.some(lang => lang.fileName === 'ja-JP')
  if (!hasJaJP) {
    builtInLanguages.push({ fileName: 'ja-JP', displayName: '日本語' })
    settings.setSettingByKey('builtInLanguages', builtInLanguages)
  }
}

// Initialize settings on load
initializeDefaultSettings()

module.exports = { 
    settings
}
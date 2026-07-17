export const portalLanguages = ['en', 'zh-Hant', 'zh-Hans'] as const;

export type PortalLanguage = typeof portalLanguages[number];

export const portalLanguageOptions: ReadonlyArray<readonly [PortalLanguage, string]> = [
  ['en', 'English'],
  ['zh-Hant', '繁體中文'],
  ['zh-Hans', '简体中文'],
];

export const portalGeneralSettingsStorageKey = 'currenc-general-settings';
export const portalGeneralSettingsChangedEvent = 'currenc-general-settings-change';

const messages = {
  en: {
    workspace: 'Workspace', development: 'Development', settings: 'Settings',
    dashboard: 'Dashboard', ownership: 'Ownership', internalFloat: 'Internal Float', shortInterest: 'Short Interest',
    lendingPressure: 'Lending Pressure', socialSentiment: 'Social Sentiment', secFilings: 'SEC Filings', reportArchive: 'Report Archive',
    general: 'General', userProfile: 'User Profile', companyManagement: 'Company Management', alertRules: 'Alert Rules', deliverySettings: 'Delivery Settings',
    squeezeReadiness: 'Squeeze Readiness', dtcReportUpload: 'DTC Report Upload', priceScenarios: 'Price Scenarios', rolePermissions: 'Role & Permissions',
    billingPlan: 'Billing & Plan', notifications: 'Notifications', securityPolicy: 'Security Policy', connectors: 'Connectors', dataSources: 'Data Sources', overview: 'Overview',
    dataAsOf: 'Data as of', lastUpdate: 'Last Update', latestFiling: 'Latest filing', usMarketClose: 'US Market Close',
    noData: 'No data available', noImportFiles: 'No import data files found',
    language: 'Language', languageDescription: 'Choose the language used across the portal.', portalLanguage: 'Portal language',
    theme: 'Theme', themeDescription: 'Control the portal appearance on this device.', portalTheme: 'Portal theme',
    light: 'Light', dark: 'Dark', system: 'System', dateTime: 'Date & Time', dateTimeDescription: 'Display dates and update times in your preferred time zone.',
    automaticChanges: 'Changes are applied automatically and stored on this device.',
    backendPortal: 'Backend Portal', openBackendPortal: 'Open {ticker} Backend Portal', newDataAvailable: 'New data available',
    companyAccess: 'Company access', companyNameUnavailable: 'Company name unavailable', manageCompanyAccess: 'Manage company access', viewer: 'Viewer',
    signedIn: 'Signed in', demoViewer: 'Demo Viewer', irAdmin: 'IR Admin', exitDemo: 'Exit demo', signOut: 'Sign out',
    keepSidebarExpanded: 'Keep sidebar expanded', useCompactSidebar: 'Use compact hover sidebar', quickActions: 'Quick actions',
    switchToLight: 'Switch to light mode', switchToDark: 'Switch to dark mode', primaryNavigation: 'Primary navigation', settingsNavigation: 'Settings navigation',
  },
  'zh-Hant': {
    workspace: '工作區', development: '開發中', settings: '設定',
    dashboard: '儀表板', ownership: '股權結構', internalFloat: '內部流通股', shortInterest: '空頭倉位',
    lendingPressure: '借貸壓力', socialSentiment: '社交媒體情緒', secFilings: 'SEC 文件', reportArchive: '報告存檔',
    general: '一般設定', userProfile: '用戶資料', companyManagement: '公司管理', alertRules: '提醒規則', deliverySettings: '發送設定',
    squeezeReadiness: '軋空準備度', dtcReportUpload: 'DTC 報告上載', priceScenarios: '價格情景', rolePermissions: '角色與權限',
    billingPlan: '帳單與方案', notifications: '通知', securityPolicy: '安全政策', connectors: '連接器', dataSources: '數據來源', overview: '總覽',
    dataAsOf: '資料截至', lastUpdate: '最後更新', latestFiling: '最新申報', usMarketClose: '美國市場收市',
    noData: '暫無資料', noImportFiles: '未找到匯入資料',
    language: '語言', languageDescription: '選擇整個入口網站使用的語言。', portalLanguage: '入口網站語言',
    theme: '主題', themeDescription: '控制此裝置上的入口網站外觀。', portalTheme: '入口網站主題',
    light: '淺色', dark: '深色', system: '跟隨系統', dateTime: '日期與時間', dateTimeDescription: '以您偏好的時區顯示日期及更新時間。',
    automaticChanges: '變更會自動套用並儲存在此裝置上。',
    backendPortal: '後台入口', openBackendPortal: '開啟 {ticker} 後台入口', newDataAvailable: '有新資料',
    companyAccess: '公司存取權', companyNameUnavailable: '未有公司名稱', manageCompanyAccess: '管理公司存取權', viewer: '檢視者',
    signedIn: '已登入', demoViewer: '示範檢視者', irAdmin: '投資者關係管理員', exitDemo: '離開示範', signOut: '登出',
    keepSidebarExpanded: '保持側邊欄展開', useCompactSidebar: '使用精簡懸浮側邊欄', quickActions: '快速操作',
    switchToLight: '切換至淺色模式', switchToDark: '切換至深色模式', primaryNavigation: '主要導覽', settingsNavigation: '設定導覽',
  },
  'zh-Hans': {
    workspace: '工作区', development: '开发中', settings: '设置',
    dashboard: '仪表板', ownership: '股权结构', internalFloat: '内部流通股', shortInterest: '空头仓位',
    lendingPressure: '借贷压力', socialSentiment: '社交媒体情绪', secFilings: 'SEC 文件', reportArchive: '报告存档',
    general: '常规设置', userProfile: '用户资料', companyManagement: '公司管理', alertRules: '提醒规则', deliverySettings: '发送设置',
    squeezeReadiness: '轧空准备度', dtcReportUpload: 'DTC 报告上传', priceScenarios: '价格情景', rolePermissions: '角色与权限',
    billingPlan: '账单与方案', notifications: '通知', securityPolicy: '安全政策', connectors: '连接器', dataSources: '数据来源', overview: '总览',
    dataAsOf: '数据截至', lastUpdate: '最后更新', latestFiling: '最新申报', usMarketClose: '美国市场收盘',
    noData: '暂无数据', noImportFiles: '未找到导入数据',
    language: '语言', languageDescription: '选择整个平台使用的语言。', portalLanguage: '平台语言',
    theme: '主题', themeDescription: '控制此设备上的平台外观。', portalTheme: '平台主题',
    light: '浅色', dark: '深色', system: '跟随系统', dateTime: '日期与时间', dateTimeDescription: '以您偏好的时区显示日期及更新时间。',
    automaticChanges: '更改会自动应用并存储在此设备上。',
    backendPortal: '后台入口', openBackendPortal: '打开 {ticker} 后台入口', newDataAvailable: '有新数据',
    companyAccess: '公司访问权限', companyNameUnavailable: '暂无公司名称', manageCompanyAccess: '管理公司访问权限', viewer: '查看者',
    signedIn: '已登录', demoViewer: '演示查看者', irAdmin: '投资者关系管理员', exitDemo: '退出演示', signOut: '退出登录',
    keepSidebarExpanded: '保持侧边栏展开', useCompactSidebar: '使用精简悬浮侧边栏', quickActions: '快捷操作',
    switchToLight: '切换至浅色模式', switchToDark: '切换至深色模式', primaryNavigation: '主导航', settingsNavigation: '设置导航',
  },
} as const;

export type PortalMessageKey = keyof typeof messages.en;

export function normalizePortalLanguage(value: unknown): PortalLanguage {
  return portalLanguages.includes(value as PortalLanguage) ? value as PortalLanguage : 'en';
}

export function portalLocale(language: PortalLanguage) {
  if (language === 'zh-Hant') return 'zh-HK';
  if (language === 'zh-Hans') return 'zh-CN';
  return 'en-US';
}

export function portalMessage(language: PortalLanguage, key: PortalMessageKey, values: Record<string, string | number> = {}) {
  const template: string = messages[language][key] ?? messages.en[key];
  return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}

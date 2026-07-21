import type { PortalLanguage } from './portal-i18n';

const zhHant: Record<string, string> = {
  // Shared actions and states
  'Overview': '總覽', 'Executive Summary': '執行摘要', 'Trend Analysis': '趨勢分析', 'Development Data': '開發資料',
  'Search': '搜尋', 'Filter': '篩選', 'All': '全部', 'Previous': '上一頁', 'Next': '下一頁', 'First': '首頁', 'Last': '末頁',
  'Newest': '最新', 'Oldest': '最舊', 'Cancel': '取消', 'Save': '儲存', 'Send': '發送', 'Edit': '編輯', 'Review': '檢閱',
  'Download': '下載', 'Upload': '上載', 'Publish': '發佈', 'Actions': '操作', 'Action': '操作', 'Access': '存取權',
  'Loading page data': '正在載入頁面資料', 'Checking secure session': '正在檢查安全工作階段', 'No data': '暫無資料',
  'No chart data available': '暫無圖表資料', 'No prior update': '沒有先前更新', 'No messages': '沒有訊息', 'Pending': '待處理',
  'Source:': '來源：', 'Author:': '作者：', 'Date': '日期', 'Ticker': '股票代碼', 'Category': '類別', 'Notes': '備註',
  'Status': '狀態', 'Role': '角色', 'Account': '帳戶', 'Governance': '管治', 'Policy': '政策', 'Professional': '專業版',
  'Reset Defaults': '重設預設值', 'Rows per page': '每頁列數', 'Page number': '頁碼', 'Open source': '開啟來源',
  'Start Monitoring': '開始監察', 'Start Exploring': '開始探索', 'Skip tour': '略過導覽', 'Back to Internal Float': '返回內部流通股',

  // Operations portal shell
  'Operations Portal': '後台入口', 'Operations Workspace': '後台工作區', 'Data Operations': '資料操作', 'Administration': '管理',
  'Market Data': '市場資料', 'Ownership Data': '股權資料', 'Social Data Upload': '社交資料上載',
  'Notification Routing': '通知路由', 'Team Access': '團隊存取權', 'Load ticker workspace': '載入股票代碼工作區',
  'Company ticker': '公司股票代碼', 'Open operations profile': '開啟後台個人資料', 'Sign out': '登出', 'Team Member': '團隊成員',
  'Maintain daily market and broker inputs.': '維護每日市場及經紀商輸入。',
  'Create and correct SEC filing records.': '建立及修正 SEC 申報記錄。',
  'Manage strategic and management holdings.': '管理策略及管理層持股。',
  'Upload operations-managed social datasets.': '上載由營運團隊管理的社交資料集。',
  'Map notification hotkeys to portal platforms.': '將通知快捷鍵對應至入口平台。',
  'Invite users and review workspace access.': '邀請用戶並檢閱工作區存取權。',

  // Dashboard
  'Market Overview': '市場總覽', 'Current Price': '現時股價', 'Today’s Reports': '今日報告', "Today's Reports": '今日報告',
  'Market Defense Checklist': '市場防禦清單', 'Squeeze Readiness': '軋空準備度', 'Squeeze Score': '軋空評分',
  'Scenario Drivers': '情景驅動因素', 'Peer Comparison': '同業比較', 'Dashboard API Tables': '儀表板 API 資料表',
  'Dashboard data unavailable': '儀表板資料暫時無法使用', 'Market data multi-series chart': '市場資料多序列圖表',
  'Borrow market KPIs': '借貸市場關鍵指標', 'Current and historical records returned by the centralized APIs. No local or S3 JSON fallback is used.': '由集中式 API 傳回的現時及歷史記錄。不使用本機或 S3 JSON 後備資料。',
  'Live API payloads only. No local or S3 JSON fallback is used.': '只使用即時 API 資料。不使用本機或 S3 JSON 後備資料。',

  // Ownership
  'Institutional Ownership': '機構持股', 'Institutional Owners': '機構股東', 'Institutional Shares Long': '機構長倉股數',
  'Institutional Value': '機構持股價值', 'Ownership Structure': '股權結構', 'Ownership & Internal Float Breakdown': '股權及內部流通股分佈',
  'Public Float': '公眾流通股', 'Official Float': '官方流通股', 'Insiders': '內部人士', 'Institutions': '機構', 'Others': '其他',
  'Ownership %': '持股比例', 'Ownership Change': '持股變動', 'Shares Held (x1000)': '持有股數（千股）',
  'Shares Change': '股數變動', 'Shares Change %': '股數變動百分比', 'File Date': '申報日期', 'Effective Date': '生效日期',
  'Form': '表格', 'Investor': '投資者', 'Activist Filings': '積極投資者申報', 'Search ownership records': '搜尋持股記錄',
  'Search activist filings': '搜尋積極投資者申報', 'All form types': '所有表格類型',
  'Institutional ownership filings are generally updated quarterly as new 13F and major-holder records become available.': '機構持股申報一般按季更新，並在新的 13F 及主要股東記錄可用時加入。',
  'Schedule 13D / 13G style activist or major-holder filings': 'Schedule 13D／13G 類積極投資者或主要股東申報',
  'Green rows indicate new positions': '綠色列表示新持倉', 'Red rows indicate closed positions': '紅色列表示已平倉持倉',
  'Ownership data unavailable': '股權資料暫時無法使用', 'Institutional Ownership API Tables': '機構持股 API 資料表',
  'Institutional ownership datasets': '機構持股資料集', 'Ownership table pagination': '持股資料表分頁',

  // Internal Float
  'Issued Share': '已發行股份', 'Issued Share vs Real Tradable Float': '已發行股份與實際可交易流通股',
  'Issued Share → Real Tradable Float': '已發行股份 → 實際可交易流通股', 'Real Tradable Float': '實際可交易流通股',
  'Estimated Tradable Float': '估算可交易流通股', 'Management / Strategic Holdings': '管理層／策略持股',
  'Tokenized Shares': '代幣化股份', 'Collateralized Shares': '抵押股份', 'Traditional Custody Breakdown': '傳統託管分佈',
  'Internal Float': '內部流通股',
  'Key float figures and the current reduction from internal share assumptions.': '主要流通股數據，以及內部股份假設帶來的現時扣減。',
  'Shows each deduction from issued shares used to estimate the real tradable float.': '顯示由已發行股份中扣除的每個項目，以估算實際可交易流通股。',
  'Visual breakdown of issued shares, real tradable float, and internal float assumptions.': '已發行股份、實際可交易流通股及內部流通股假設的視覺分佈。',
  'Internal deduction assumptions used to estimate real tradable float.': '用於估算實際可交易流通股的內部扣減假設。',
  'Suggested changes': '建議變更', 'Suggested management and strategic holdings': '建議的管理層及策略持股',
  'Review Related Holdings': '檢閱相關持股', 'Review management holdings inputs': '檢閱管理層持股輸入',
  'Tokenized Shares & Providers': '代幣化股份及供應商', 'Tokenized Chain Allocation': '代幣化鏈分配', 'Tokenization Providers': '代幣化供應商',
  'Collateralized Shares & DeFi Exposure': '抵押股份及 DeFi 風險承擔', 'Collateralized Shares by Chain': '按鏈劃分的抵押股份',
  'DeFi Protocol Exposure': 'DeFi 協議風險承擔', 'Protocol': '協議', 'Provider': '供應商', 'Chain': '區塊鏈',
  'Float Impact': '對流通股的影響', 'Float Reduction': '流通股扣減', 'Outstanding Impact': '尚未處理的影響',
  'Deducted Holdings': '已扣減持股', 'Internal float activity log': '內部流通股活動記錄', 'Activity Log': '活動記錄',
  'Permanent audit history for saved workspace input changes.': '已儲存工作區輸入變更的永久審計記錄。',
  'No strategic holders added yet.': '尚未加入策略股東。', 'No tokenized share rows added yet.': '尚未加入代幣化股份列。',
  'No collateralized share rows added yet.': '尚未加入抵押股份列。', 'Sample': '範例', 'Internal Float API Data': '內部流通股 API 資料',
  'Internal Float data unavailable': '內部流通股資料暫時無法使用', 'New to Internal Float?': '初次使用內部流通股頁面？',
  'Take a guided tour of the page and learn what to review, update, and monitor.': '進行頁面導覽，了解需要檢閱、更新及監察的內容。',

  // DTC upload
  'Upload DTC Position Report': '上載 DTC 持倉報告', 'Drop your DTC report here': '將 DTC 報告拖放到此處',
  'or click to choose a file': '或按一下選擇檔案', 'Click or drop another file to replace it': '按一下或拖放另一個檔案以取代',
  'PDF, CSV, XLS, or XLSX · maximum 25 MB': 'PDF、CSV、XLS 或 XLSX · 上限 25 MB',
  'Submit one authorized DTC report.': '提交一份已獲授權的 DTC 報告。', 'What happens next': '後續流程',
  'Our team verifies the report structure.': '我們的團隊會核實報告結構。', 'Positions are normalized by custodian.': '持倉會按託管機構標準化。',
  'The custody breakdown is updated.': '託管分佈會隨之更新。', 'Processing fee': '處理費用', 'per uploaded report': '每份上載報告',
  'Prototype · no charge today': '原型版本 · 今天不會收費',

  // Short interest
  'Short Interest Overview': '空頭倉位總覽', 'Short Interest Score': '空頭倉位評分', 'Key Short Metrics': '主要空頭指標',
  'Short Interest %': '空頭倉位比例', 'Short Interest Shares': '空頭倉位股數', 'Days to Cover': '回補天數',
  'Borrow Fee': '借貸費率', 'Utilization': '使用率', 'Shortable Shares': '可供借出股份',
  'Short Interest Movement': '空頭倉位走勢', 'Short Volume Trend': '沽空成交量趨勢', 'Borrow Fee Trend': '借貸費率趨勢',
  'Shortable Shares Trend': '可供借出股份趨勢', 'Fails-to-Deliver Trend': '未能交收趨勢', 'Short Interest Trend': '空頭倉位趨勢',
  'Bi-weekly · 14-day reporting cadence': '每兩週 · 14 天申報週期', 'Short Volume & Fails-to-Deliver': '沽空成交量及未能交收',
  'Short Volume': '沽空成交量', 'Fails-to-Deliver': '未能交收', 'FTD Shares': '未能交收股數', 'Volume': '成交量',
  'Market Data Tables': '市場資料表', 'Short Interest API Data': '空頭倉位 API 資料', 'AI Analysis': 'AI 分析',
  'AI-assisted interpretation. Review underlying data before making decisions.': 'AI 輔助解讀。作出決定前請檢閱基礎資料。',
  'Executive view of short exposure, borrow pressure, available inventory, and squeeze-risk inputs.': '空頭風險、借貸壓力、可用股份及軋空風險因素的管理層總覽。',
  'Daily market trends are grouped in the 2×2 view. Reported short interest appears separately below because it updates bi-weekly.': '每日市場趨勢以 2×2 顯示。由於空頭倉位每兩週更新，因此在下方獨立顯示。',
  'Daily reported short, long, and venue-level short volume.': '每日申報的沽空、長倉及各交易場所沽空成交量。',
  'Settlement failures, closing deadlines, price, and notional value.': '交收失敗、平倉期限、價格及名義價值。',
  'From': '由', 'To': '至', 'Clear': '清除', 'Filter records by date range': '按日期範圍篩選記錄',
  'vs 2 weeks ago': '與兩週前比較', 'Short interest data unavailable': '空頭倉位資料暫時無法使用',
  'No short-volume API records available.': '暫無沽空成交量 API 記錄。', 'No FTD API records available.': '暫無未能交收 API 記錄。',

  // Lending pressure
  'Lending Pressure Overview': '借貸壓力總覽', 'Lending Pressure Score': '借貸壓力評分', 'Lending Market Snapshot': '借貸市場快照',
  'Average Duration': '平均期限', 'Lending Market Movement': '借貸市場走勢', 'Utilization Trend': '使用率趨勢',
  'Lending Pressure API Table': '借貸壓力 API 資料表', 'Recent borrow availability, utilization, and borrow-fee trends.': '近期可借股份、使用率及借貸費率趨勢。',
  'Executive view of share availability, borrowing conditions, inventory utilization, and lending pressure.': '股份供應、借貸狀況、庫存使用率及借貸壓力的管理層總覽。',
  'This page reads lending pressure inputs from Market Data APIs only. No consolidated lending-pressure JSON fallback is used.': '此頁只讀取市場資料 API 的借貸壓力輸入，不使用整合借貸壓力 JSON 後備資料。',
  'Lending pressure data unavailable': '借貸壓力資料暫時無法使用',

  // Social sentiment
  'Social Sentiment Overview': '社交媒體情緒總覽', 'Overall Sentiment': '整體情緒', 'Platform Breakdown': '平台分佈',
  'Sentiment Distribution': '情緒分佈', 'Sentiment Timeline & Social Feed': '情緒時間線及社交動態',
  'Bullish': '看好', 'Neutral': '中性', 'Bearish': '看淡', 'Mentions': '提及次數', 'Sentiment': '情緒',
  'Platform filter': '平台篩選', 'Search social posts': '搜尋社交帖文', 'Search posts...': '搜尋帖文…',
  'Sort feed': '動態排序', 'Highest Engagement': '互動最高', 'Highest Followers': '追蹤者最多', 'Highest Likes': '讚好最多',
  'Feed filters': '動態篩選', 'Narrative timeframe': '敘事時間範圍', 'No data available for this platform.': '此平台暫無資料。',
  'No social posts match the selected filters.': '沒有社交帖文符合所選篩選條件。',

  // SEC filings
  'SEC Filings': 'SEC 文件', 'Search filings': '搜尋文件', 'All Records': '所有記錄', 'Add New Record': '新增記錄',
  'SEC Filings API Table': 'SEC 文件 API 資料表', 'SEC filings unavailable': 'SEC 文件暫時無法使用',
  'No filings match the current filters.': '沒有文件符合目前篩選條件。',
  'Records loaded from /manual-input/sec-filings. No local JSON fallback is used.': '記錄由 /manual-input/sec-filings 載入。不使用本機 JSON 後備資料。',

  // Reports
  'Report History': '報告歷史', 'History Archive': '歷史存檔', 'Latest Report': '最新報告', 'Reports Available': '可用報告',
  'Post-Market': '收市後', 'Pre-Market': '開市前', 'Midday': '中午', 'COMING SOON': '即將推出', 'View PDF': '查看 PDF', 'Search report archive': '搜尋報告存檔',
  'Search reports by title, time, or date': '按標題、時間或日期搜尋報告', 'Filter report type': '篩選報告類型',
  'Filter by report window': '按報告時段篩選', 'No reports match the current search.': '沒有報告符合目前搜尋。',
  'No reports match the selected range.': '沒有報告符合所選範圍。', 'Report approval can require IR Admin review before executive delivery.': '報告可要求投資者關係管理員在發送給管理層前進行審批。',

  // Account and settings pages
  'Edit Profile Settings': '編輯個人資料設定', 'Full Name': '全名', 'Email Address': '電郵地址', 'Phone Number': '電話號碼',
  'Nickname': '暱稱', 'Biography': '個人簡介', 'Write something about yourself...': '撰寫您的個人簡介…',
  'Account Metadata': '帳戶元資料', 'Profile Created At': '個人資料建立時間', 'Profile Sync Status': '個人資料同步狀態',
  'User Unique ID (Sub)': '用戶唯一識別碼（Sub）', 'Company Access': '公司存取權', 'Workspace Portfolio': '工作區組合',
  'Open the issuer workspaces assigned to your account.': '開啟已指派給您帳戶的發行人工作區。',
  'No company access is assigned to this profile.': '此個人資料尚未獲指派公司存取權。',
  'Define your own risk limits. Alerts will appear on the dashboard when live values cross your configured thresholds.': '設定您的風險限額。當即時數值超過所設門檻時，提醒會顯示於儀表板。',
  'Threshold': '門檻', 'Severity': '嚴重程度', 'Save Alert Settings': '儲存提醒設定', 'No alerts triggered': '沒有觸發提醒',
  'You are all clear. Alerts will appear here when a configured threshold is breached.': '目前一切正常。當所設門檻被突破時，提醒會顯示於此。',
  'Preference center': '偏好設定中心', 'Invoice email': '發票電郵', 'Invoice routing': '發票傳送', 'Recipient and schedule controls are unavailable until a centralized delivery-settings API is connected. No local recipient data is used.': '在連接集中式發送設定 API 前，收件人及排程控制暫不可用。不使用本機收件人資料。',
  'Delivery API required': '需要發送 API', 'Current setting': '目前設定',

  // Shared notices and tools
  'Important information about market data, AI-assisted analysis, proprietary scores, alerts, and reports.': '有關市場資料、AI 輔助分析、專有評分、提醒及報告的重要資訊。',
  'Legal & Compliance': '法律及合規', 'Disclaimers': '免責聲明', 'Legal and methodology links': '法律及方法連結',
  'Monitor Expert': '監察專家', 'Open monitor expert chat': '開啟監察專家對話', 'Close monitor expert chat': '關閉監察專家對話',
  'Ask about short pressure, float, sentiment, or response priorities': '查詢空頭壓力、流通股、情緒或應對優先次序',
  'Notification inbox': '通知收件箱', 'Inbox': '收件箱',
  "You're all caught up. New portal messages will appear here.": '您已查看所有訊息。新的入口網站訊息會顯示於此。',

  // Additional labels shared by page-specific controls
  'Available': '可用', 'Total': '總計', 'Shares': '股數', 'Share Price': '股價', 'Impact': '影響', 'Event': '事件',
  'Process': '流程', 'Audience': '受眾', 'Channel': '渠道', 'Operator': '操作員', 'Retention': '保留期',
  'Close chat': '關閉對話', 'Close welcome guide': '關閉歡迎導覽', 'Search…': '搜尋…',
  'Search records': '搜尋記錄', 'Search table': '搜尋資料表',
  'No records returned by this API.': '此 API 沒有傳回記錄。', 'No payload returned by this API.': '此 API 沒有傳回資料。',
  'This API returned an empty object.': '此 API 傳回了空物件。', 'Trend metrics': '趨勢指標',
  'Overview comparison period': '總覽比較期間', 'Chart series toggles': '圖表序列切換',
  'Scenario engine estimates where the stock could trade if market pressure, catalysts, and positioning change.': '情景引擎估算在市場壓力、催化因素及倉位改變時的潛在股價。',

  // Ownership and internal-float controls
  'Activist filings pagination': '積極投資者申報分頁', 'Holder': '持有人', 'Holder name': '持有人名稱',
  'Select holding target': '選擇持股對象', 'Add internal context for this holder...': '為此持有人加入內部背景資料…',
  'Create a new Management / Strategic holding': '建立新的管理層／策略持股',
  'Management strategic holdings impact summary': '管理層及策略持股影響摘要',
  'Tokenized shares impact summary': '代幣化股份影響摘要', 'Collateralized shares impact summary': '抵押股份影響摘要',
  'Tokenized Impact': '代幣化影響', 'Shares pledged into DeFi lending protocols as collateral.': '抵押至 DeFi 借貸協議的股份。',
  'Manual tokenized share assumptions grouped by blockchain and provider.': '按區塊鏈及供應商分組的手動代幣化股份假設。',
  'Manual inputs are used until these values can be auto-detected from production data sources.': '在可從正式資料來源自動偵測前，這些數值會使用手動輸入。',
  'Saved record changes will appear here after you update an input section.': '更新輸入區塊後，已儲存的記錄變更會顯示在此。',
  'No saved changes yet': '尚未儲存任何變更',

  // Upload workflow
  'Managed DTC report processing': '由專人處理 DTC 報告', 'File validation and intake review': '檔案驗證及收件檢閱',
  'Custodian and broker normalization': '託管機構及經紀標準化',
  'Upload your report and our operations team will normalize the positions for this workspace.': '上載報告後，營運團隊會為此工作區標準化持倉。',
  'Submit one report for normalization and entry into the Traditional Custody Breakdown.': '提交一份報告，以便標準化並加入傳統託管分佈。',
  'I confirm this report is authorized for processing and understand the service fee is $100 per uploaded report.': '我確認此報告已獲授權處理，並了解每份上載報告的服務費為 100 美元。',

  // Chart, table, and report controls
  'Short History': '空頭歷史', 'Short Percent of Exchange': '交易所沽空比例', 'Short Percent of Total': '總沽空比例',
  'Short volume display mode': '沽空成交量顯示模式',
  'Short interest shares, float percentage, and days to cover trend': '空頭倉位股數、流通股比例及回補天數趨勢',
  'AI-assisted market intelligence. Not investment advice. Market data may be delayed or incomplete.': 'AI 輔助市場情報，不構成投資建議。市場資料可能延遲或不完整。',
  'Institutional ownership and insider activity are based on regulatory filings and may not reflect current real-time holdings.': '機構持股及內部人活動來自監管申報文件，可能無法反映目前的實時持倉。',
  'Short Interest Score interpretation ranges': '空頭倉位評分解讀範圍', 'Short-interest trend data unavailable.': '空頭倉位趨勢資料暫時無法使用。',
  'Borrow Utilization & Duration History': '借貸使用率及期限歷史', 'Cross-Metric Trend Overview': '跨指標趨勢總覽',
  'Global Lending Pool Analysis': '全球借貸庫分析', 'Lending Pressure Score interpretation ranges': '借貸壓力評分解讀範圍',
  'Sentiment filter': '情緒篩選', 'Sentiment and squeeze trend chart': '情緒及軋空趨勢圖表', 'SEC filings pagination': 'SEC 文件分頁',
  'Approval Flow': '審批流程', 'Archive retention policy': '存檔保留政策', 'report archive policy': '報告存檔政策',

  // Account, billing, and legal pages
  'Account Controls': '帳戶控制', 'Companies, billing, and account settings.': '公司、帳單及帳戶設定。',
  'Current plan': '目前方案', 'Seats': '席位數', 'Seat and role management': '席位及角色管理',
  'Notifications': '通知', 'Notification routing': '通知傳送', 'Monthly usage export': '每月用量匯出',
  'External Advisors': '外部顧問', 'Covered Companies': '涵蓋公司', 'Access model': '存取模式', 'Access since': '獲得存取權日期',
  'Advisor access can be limited to selected company workspaces and report categories.': '顧問存取權可限制於指定公司工作區及報告類別。',
  'Currenc Intelligence provides market intelligence, monitoring, and reporting tools for corporate governance and investor relations workflows. The platform does not provide investment, trading, legal, or financial advice.': 'Currenc Intelligence 為企業管治及投資者關係工作流程提供市場情報、監察及報告工具。平台不提供投資、交易、法律或財務建議。',

  // Dashboard metrics, charts, alerts, and notices
  'Price': '價格', 'Trade Volume': '交易量', 'Shortable shares': '可供借出股份', 'Utilization %': '使用率',
  'Average Duration (Days)': '平均期限（天）', 'Average Duration (D)': '平均期限（天）',
  'Initial Margin': '初始保證金', 'Maintenance Margin': '維持保證金',
  'Borrow cost trend': '借貸成本趨勢', 'Opening margin requirement': '開倉保證金要求',
  'Ongoing margin requirement': '持續保證金要求', 'Shortable share supply': '可供借出股份供應',
  'Lending pool utilization': '借貸庫使用率', 'Average holding duration': '平均持倉期限',
  'Short interest coverage': '空頭倉位回補期',
  'Current annualized cost to borrow shares. Higher borrow fees can indicate tighter lending supply or stronger short-side demand.': '目前借入股份的年化成本。較高借貸費率可能表示可借供應趨緊或空方需求增強。',
  'Initial margin is the upfront collateral requirement to open or support a position. Requirements can differ by platform, so this view reflects market broker inputs collected from major platforms.': '初始保證金是開立或支持倉位所需的預先抵押。要求可因平台而異，此處顯示由主要平台收集的市場經紀輸入。',
  'Maintenance margin is the ongoing collateral level required to keep a position open. Requirements can vary across broker platforms and may change with volatility or risk controls.': '維持保證金是保持倉位所需的持續抵押水平。要求可因經紀平台而異，並可隨波動率或風險控制變動。',
  'Number of shares currently available to borrow for shorting. Lower availability can signal tighter lendable supply.': '目前可供借入沽空的股份數量。可用量較低可能表示可借供應趨緊。',
  'Percentage of lendable inventory currently being used. Higher utilization means more of the borrowable share pool is already committed.': '目前已使用的可借庫存比例。使用率越高，表示已被佔用的可借股份越多。',
  'Average duration shows the estimated average number of days positions remain open. A longer duration can indicate slower turnover or more persistent positioning.': '平均期限顯示倉位保持開啟的估計平均天數。期限較長可能表示週轉較慢或倉位更持續。',
  'Estimated number of trading days it would take short sellers to cover current short interest based on average trading volume.': '根據平均交易量，估算空方回補目前空頭倉位所需的交易日數。',
  'Alert Center': '提醒中心', 'Configure Alerts': '設定提醒', 'Alert Disclaimer': '提醒免責聲明',
  'Critical': '嚴重', 'High': '高', 'Medium': '中', 'Low': '低',
  'Dashboard insights may include AI-assisted summaries, proprietary scores, and delayed market data.': '儀表板洞察可能包含 AI 輔助摘要、專有評分及延遲的市場資料。',

  // Ownership charts and tables
  'Strategic Entities': '策略實體', 'Shares (x1000)': '股數（千股）', 'Shares Changed (%)': '股數變動（%）',
  'Value (x1000)': '價值（千美元）', 'Value Changed (%)': '價值變動（%）',
  'Red rows indicate closed positions.': '紅色列表示已平倉持倉。', 'Green rows indicate new positions.': '綠色列表示新持倉。',
  'Avg Portfolio Allocation': '平均投資組合配置', 'Institutional Holding %': '機構持股比例', 'Institutional Short Concentration': '機構空頭集中度',
  'Institutional shares held as a percentage of issued shares, provided by the centralized ownership-current API.': '機構持有股份佔已發行股份的比例，由集中式 ownership-current API 提供。',
  'Breakdown of issued shares into institutions, strategic entities, and public float.': '已發行股份在機構、策略實體及公眾流通股之間的分佈。',
  'Details update based on the selected ownership segment.': '詳細資料會根據所選持股分類更新。',
  'Total active institutional shares reported long, excluding closed positions and non-share options records.': '已申報的活躍機構長倉總股數，不包括已平倉持倉及非股份期權記錄。',
  'Count of active institutional holders with reported shares greater than zero.': '已申報股數大於零的活躍機構持有人數量。',
  'Total reported institutional holding value, displayed in thousands of USD.': '已申報機構持股總價值，以千美元顯示。',
  'Average active portfolio allocation percentage across institutional ownership records.': '機構持股記錄中的平均活躍投資組合配置比例。',
  'Total issued shares used as the base for ownership and public float calculations.': '用作持股及公眾流通股計算基準的已發行股份總數。',

  // Market trend explanatory text
  'Borrow-pressure view focused on whether short sellers can still find shares to borrow and whether borrowing is becoming difficult or expensive.': '借貸壓力視圖，重點顯示空方是否仍能找到可借股份，以及借貸是否變得困難或昂貴。',
  'Cost to borrow shows how expensive it is for short sellers to maintain or open short positions.': '借貸成本顯示空方維持或開立空頭倉位的費用。',
  'Shortable shares indicate how many shares may still be available for borrowing. Lower inventory can increase borrow pressure.': '可供借出股份表示可能仍可借入的股份數量。庫存較低可能增加借貸壓力。',
  'Trend of shares available to borrow. Declining availability can indicate tightening borrow supply.': '可借股份趨勢。可用量下降可能表示借貸供應趨緊。',
  'Utilization is currently mapped to the availability percentage in the consolidated lending file.': '目前使用率對應整合借貸檔案中的可用比例。',
  'Borrow fee trend shows whether short sellers are paying more to maintain or open short positions.': '借貸費率趨勢顯示空方為維持或開立空頭倉位是否支付更高費用。',
  'Daily reported short-sale volume across trading venues. This is trading activity, not outstanding short interest.': '各交易場所每日申報的沽空成交量。這是交易活動，並非未平空頭倉位。',
  'Daily fails-to-deliver shares. Higher values can indicate increasing settlement pressure.': '每日未能交收股數。數值較高可能表示交收壓力增加。',
  'Reported short-interest shares sampled on a 14-day cadence, matching the bi-weekly data update schedule.': '按 14 天週期取樣的已申報空頭倉位股數，與每兩週資料更新排程一致。',

  // Remaining static interface and development labels
  'Account portal': '帳戶入口', 'Authenticated centralized APIs': '已驗證的集中式 API', 'Best for': '最適合',
  'Borrow market multi-series chart': '借貸市場多序列圖表', 'Breadcrumb': '頁面路徑', 'Compliance Note': '合規備註',
  'Close edit modal and discard unsaved changes': '關閉編輯視窗並捨棄未儲存變更', 'Close guided tour': '關閉導覽',
  'Close suggestion modal': '關閉建議視窗', 'Currenc Intelligence home': 'Currenc Intelligence 首頁',
  'Demo': '示範', 'Dev mode': '開發模式', 'Toggle development mode': '切換開發模式',
  'Each tab shows one uncombined API response.': '每個分頁顯示一個未合併的 API 回應。',
  'Editable collateralized share rows': '可編輯抵押股份列', 'Editable management and strategic holders': '可編輯管理層及策略持有人',
  'Editable tokenized share rows': '可編輯代幣化股份列', 'Enter NASDAQ / NYSE ticker': '輸入 NASDAQ／NYSE 股票代碼',
  'Enter shares': '輸入股數', 'Future Controls': '未來控制', 'Imported data tables': '已匯入資料表',
  'Interactive demonstration': '互動示範', 'Internal Float page guide': '內部流通股頁面導覽',
  'Live Product Demo': '即時產品示範', 'Option / Gamma': '期權／Gamma', 'Ownership structure chart': '持股結構圖表',
  'Placeholder': '預留位', 'Portal time zone': '入口網站時區', 'Premium Data Roadmap': '進階資料路線圖',
  'Provider name': '供應商名稱', 'Real Short Position Model': '真實空頭倉位模型', 'Runtime source': '運行時來源',
  'Tracked connections': '已追蹤連線', 'View on chart': '在圖表上查看', 'Welcome to Currenc Intelligence': '歡迎使用 Currenc Intelligence',
  'Workspace data entry': '工作區資料輸入', 'Workspace policy': '工作區政策', 'Workspace roles': '工作區角色',
  'All names and values on this page are fictional. You can edit the data, but changes remain in this browser session and are never saved.': '此頁的所有名稱及數值均為虛構。您可編輯資料，但變更只保留於此瀏覽器工作階段，不會儲存。',
  'Future modeling for synthetic exposure, OTC exposure, and non-public borrow concentration.': '未來將建模分析合成風險承擔、場外交易風險承擔及非公開借貸集中度。',
  'Future premium provider required. Institutional short positions are generally not fully public.': '需要未來的進階資料供應商。機構空頭倉位通常並非完全公開。',
  'Issued share - institutions - internal float': '已發行股份 − 機構持股 − 內部流通股',
  'Next history page': '下一頁歷史記錄', 'Previous history page': '上一頁歷史記錄',
  'Operations entered these changes for company review. Apply them to the correct Management / Strategic record or discard the suggestion.': '營運團隊已輸入這些變更供公司檢閱。請將其套用至正確的管理層／策略記錄，或捨棄建議。',
  'Placeholder tables for future API data. Each table shows 7 records per page for readability.': '為未來 API 資料預留的資料表。為便於閱讀，每個資料表每頁顯示 7 筆記錄。',
  'Potential future sources include EquiLend, DataLend, Hazeltree, and S&P Global Securities Finance.': '未來潛在資料來源包括 EquiLend、DataLend、Hazeltree 及 S&P Global Securities Finance。',
  'Redirecting to sign in if authentication is required.': '如需身份驗證，正在轉往登入頁面。',
  'SSO, audit logs, and granular field permissions will be added later.': '單一登入、審計記錄及細緻欄位權限將於稍後加入。',
  'The market data API does not include chartable values for the selected metrics.': '市場資料 API 不包含所選指標的可繪圖數值。',
  'This development module is awaiting an API data source. Legacy JSON data has been removed.': '此開發模組正等待 API 資料來源。舊版 JSON 資料已移除。',
  'Tokenized shares saved': '代幣化股份已儲存', 'Traditional custody chart update': '傳統託管圖表更新',
};

const operationsZhHant: Record<string, string> = {
  // Shared operations actions, states, and data surfaces
  'Manual Input': '手動輸入', 'Manual Input V2': '手動輸入 V2', 'Preview': '預覽', 'Recent Records': '最近記錄',
  'Log': '記錄', 'Save Activity': '儲存活動', 'Save Record': '儲存記錄', 'Saving...': '儲存中…', 'Deleting...': '刪除中…',
  'Delete': '刪除', 'Remove': '移除', 'Open': '開啟', 'Refresh': '重新整理', 'Ready': '就緒', 'Collecting': '收集中',
  'Complete': '完整', 'Missing': '缺少', 'Not available': '不可用', 'Unknown': '未知', 'Not registered': '未註冊',
  'Registered': '已註冊', 'Unassigned': '未指派', 'Tools': '工具', 'Destinations': '目的地', 'Updated': '更新時間',
  'API source': 'API 來源', 'API managed': '由 API 管理', 'API Gateway': 'API 閘道', 'Backend API': '後台 API',
  'Current records': '目前記錄', 'Last upload': '上次上載', 'No API records available.': '暫無 API 記錄。',
  'Development Data': '開發資料', 'Endpoint': '端點', 'Source': '來源', 'State': '狀態', 'Record Count': '記錄數量',
  'Updated At': '更新時間', 'Payload': '資料內容', 'Empty string': '空字串',
  'Dev mode': '開發模式', 'Toggle development mode': '切換開發模式', 'User Portal': '用戶入口',
  'Switch to light mode': '切換至淺色模式', 'Switch to dark mode': '切換至深色模式',
  'Operations portal navigation': '後台入口導覽', 'Breadcrumb': '導覽路徑',

  // Market Data
  'Daily Market Inputs': '每日市場輸入', 'Cancel Edit': '取消編輯', 'Edit Record': '編輯記錄', 'Trade Date': '交易日期',
  'Issued Share': '已發行股份', 'Short Score': '空頭評分', 'Primary lending data': '主要借貸資料',
  'Secondary lending data': '次要借貸資料', 'Utilization %': '使用率 %', 'Average Duration (Days)': '平均期限（日）',
  'IBKR Shortable Shares': 'IBKR 可借股份', 'IBKR Initial Margin %': 'IBKR 初始保證金 %',
  'IBKR Maintenance Margin %': 'IBKR 維持保證金 %', 'Futu Shortable Shares': '富途可借股份',
  'Futu Initial Margin %': '富途初始保證金 %', 'Futu Maintenance Margin %': '富途維持保證金 %',
  'Market closed - input available': '市場已收市－可輸入資料', 'Input opens after market close': '收市後開放輸入',
  'No regular US market session': '沒有美國正常交易時段',
  'This trade date is closed and values may be entered or updated.': '此交易日已收市，可輸入或更新數值。',
  'Weekends and US market holidays cannot receive daily market inputs.': '週末及美國市場假期不可輸入每日市場資料。',
  'A record already exists for this trade date. Click Edit Record to make changes.': '此交易日已有記錄。請按「編輯記錄」進行變更。',
  'Enter the required values to prepare this trade date.': '輸入所需數值以準備此交易日。',
  'Publication Readiness is complete. Saving will publish the consolidated data to the user portal.': '發佈準備已完成。儲存後會將整合資料發佈至用戶入口。',
  'Complete every Publication Readiness requirement before saving.': '儲存前請完成所有發佈準備要求。',
  'Publishing...': '發佈中…', 'Save Inputs & Publish': '儲存輸入並發佈', 'Publication Readiness': '發佈準備',
  'Select a trade date': '選擇交易日期', 'Frontend currently displays': '前端目前顯示',
  'No complete date available': '暫無完整日期',
  'The vendor record and every required manual input are present. Save Inputs & Publish to update the user portal and its Last Update time.': '供應商記錄及所有必要手動輸入均已齊備。儲存並發佈以更新用戶入口及其最後更新時間。',
  'The user portal remains on the latest earlier complete date until every required vendor and exact-date manual value is available.': '在所有必要供應商及指定日期手動數值齊備前，用戶入口會繼續顯示上一個完整日期。',
  'Input Output': '輸入輸出', 'Trade date': '交易日期', 'Categories': '類別', 'No values entered': '尚未輸入數值',
  'Issued share': '已發行股份', 'Utilization': '使用率', 'Shortable shares': '可借股份', 'Initial margin': '初始保證金',
  'Maintenance margin': '維持保證金', 'Average duration': '平均期限', 'Short score': '空頭評分',
  'Saved Daily Inputs': '已儲存的每日輸入', 'IBKR Shares': 'IBKR 股份', 'Futu Shares': '富途股份',
  'IBKR Initial': 'IBKR 初始保證金', 'Futu Initial': '富途初始保證金', 'IBKR Maint.': 'IBKR 維持保證金',
  'Futu Maint.': '富途維持保證金', 'Avg Duration': '平均期限', 'Score': '評分',
  'Loading Manual Input V2 records...': '正在載入手動輸入 V2 記錄…',
  'No Manual Input V2 records found for this ticker.': '此股票代碼沒有手動輸入 V2 記錄。',
  'Borrow Fee': '借貸費率', 'Chart Exchange Shortable Shares': '圖表交易所可借股份', 'Days to Cover': '回補天數',
  'Manual Input Data': '手動輸入資料',
  'Manual Input V2 API Responses': '手動輸入 V2 API 回應',
  'Exact authenticated endpoints and response state used by this page. No local JSON fallback is used here.': '此頁使用的確切已驗證端點及回應狀態。不使用本機 JSON 後備資料。',
  'Market Data Intake is available only to operations users.': '市場資料輸入只供後台操作員使用。',
  'Unable to load Manual Input V2 records.': '無法載入手動輸入 V2 記錄。',
  'Unable to verify operations access.': '無法驗證後台操作權限。', 'Unable to save Manual Input V2 records.': '無法儲存手動輸入 V2 記錄。',
  'Unable to delete Manual Input V2 records.': '無法刪除手動輸入 V2 記錄。',

  // SEC filings
  'SEC Filing Record': 'SEC 申報記錄', 'Company': '公司', 'Form type': '表格類型', 'Form description': '表格說明',
  'Filing date': '申報日期', 'Reporting date': '報告日期', 'Act': '法案', 'Film number(s)': '影片編號',
  'File number': '文件編號', 'Accession number': '存取編號', 'Filings URL': '申報網址', 'Internal notes': '內部備註',
  'Ready to save': '可以儲存', 'Required: form type, description, filing date, accession number, URL': '必填：表格類型、說明、申報日期、存取編號、網址',
  'Record Output': '記錄輸出', 'Description': '說明', 'Accession': '存取編號', 'Saved SEC Filings': '已儲存的 SEC 申報',
  'Search records': '搜尋記錄', 'Search form, description, date, accession, URL, notes': '搜尋表格、說明、日期、存取編號、網址或備註',
  'No records shown': '沒有顯示記錄', 'No SEC filing records match the current search.': '沒有 SEC 申報記錄符合目前搜尋。',
  'SEC filing records pagination': 'SEC 申報記錄分頁', 'No save activity yet.': '尚無儲存活動。',
  'SEC Filing API Response': 'SEC 申報 API 回應',
  'Raw response metadata for the authenticated filing endpoint used by this page.': '此頁已驗證申報端點的原始回應中繼資料。',
  'Unable to load SEC filing records.': '無法載入 SEC 申報記錄。', 'Record saved through the backend API.': '記錄已透過後台 API 儲存。',
  'Unable to save SEC filing record.': '無法儲存 SEC 申報記錄。', 'Unable to delete record without accession number or ID.': '缺少存取編號或 ID，無法刪除記錄。',
  'Unable to delete SEC filing record.': '無法刪除 SEC 申報記錄。',

  // Notification routing
  'Operator control': '操作員控制', 'Add notification hotkey': '新增通知快捷鍵', 'Hotkey binding': '快捷鍵綁定',
  'Platform': '平台', 'Save hotkey': '儲存快捷鍵', 'Notification map': '通知對應', 'Loading hotkey mappings...': '正在載入快捷鍵對應…',
  'No hotkeys configured': '尚未設定快捷鍵', 'Hotkey': '快捷鍵', 'Created by': '建立者', 'Created': '建立時間',
  'Notification Hotkey API Response': '通知快捷鍵 API 回應',
  'Raw mapping envelope returned by the operations hotkey route for the active ticker.': '後台快捷鍵路由為目前股票代碼傳回的原始對應資料。',
  'Unable to load notification hotkeys.': '無法載入通知快捷鍵。', 'Unable to save the hotkey mapping.': '無法儲存快捷鍵對應。',
  'Unable to delete the hotkey mapping.': '無法刪除快捷鍵對應。',

  // Social uploads
  'Batch Upload': '批次上載', 'Drop CSV files here': '將 CSV 檔案拖放到此處',
  'Use this workspace for the Stocktwits CSV. Reddit, X, Facebook, and LinkedIn are loaded through the automated social-data API.': '此工作區用於 Stocktwits CSV。Reddit、X、Facebook 及 LinkedIn 由自動社交資料 API 載入。',
  'Uploading...': '上載中…', 'Choose CSV': '選擇 CSV', 'Unknown author': '未知作者', 'No text provided.': '沒有提供文字。',
  'Unclassified': '未分類', 'Social Data API Responses': '社交資料 API 回應',
  'Current per-platform GET /social-data payloads and the Stocktwits POST /social-data upload state.': '各平台目前的 GET /social-data 資料及 Stocktwits POST /social-data 上載狀態。',
  'Centralized Social Data API': '集中式社交資料 API',
  'Automated social feed': '自動社交動態',
  'CSV with message ID, timestamp, author, content, and sentiment fields': '包含訊息 ID、時間、作者、內容及情緒欄位的 CSV',
  'Not uploaded': '尚未上載',
  'Unable to load current social data.': '無法載入目前社交資料。', 'Attach at least one CSV before uploading.': '上載前請附加至少一個 CSV。',
  'Upload failed.': '上載失敗。',

  // User access
  'Restricted': '受限制', 'Operator access required': '需要操作員權限', 'New Access': '新增存取權', 'Invite User': '邀請用戶',
  'Email address': '電郵地址', 'Company ticker': '公司股票代碼', 'Sending...': '正在發送…', 'Send Invitation': '發送邀請',
  'Access History': '存取權歷史', 'Invitations': '邀請', 'Search email or ticker...': '搜尋電郵或股票代碼…',
  'Search invitations': '搜尋邀請', 'All statuses': '所有狀態', 'All tickers': '所有股票代碼', 'Newest first': '最新優先',
  'Oldest first': '最舊優先', 'Email': '電郵', 'Invited': '邀請時間', 'Registration': '註冊', 'Account Status': '帳戶狀態',
  'Assigned Tickers': '已指派股票代碼', 'No invitations match the selected filters.': '沒有邀請符合所選篩選條件。',
  'Invitation history pagination': '邀請歷史分頁', 'Ticker Invitation API Response': '股票代碼邀請 API 回應',
  'Operator-only invitation records returned by the access API.': '存取 API 傳回的操作員專用邀請記錄。',
  'User Access is available only to operations users.': '用戶存取權只供後台操作員使用。', 'Unable to load user invitations.': '無法載入用戶邀請。',
  'Unable to create invitation.': '無法建立邀請。',

  // Ownership input and records
  'Select an existing holder': '選擇現有持有人', '+ New Holder': '+ 新持有人',
  'Choose from the current strategic holder list or create a new holder.': '從目前策略持有人清單中選擇，或建立新持有人。',
  'Effective Date': '生效日期', 'Holder identity': '持有人身分', 'Prior total shares': '先前總股數',
  'New Holder / Entity Name': '新持有人／實體名稱', 'Initial Total Shares': '初始總股數', 'Latest Total Shares': '最新總股數',
  'Enter the total shown in the filing': '輸入申報文件所示總數',
  'Use the total shares held from the latest filing, not the reported increase or reduction.': '使用最新申報文件中的持股總數，而非申報的增加或減少數量。',
  'Calculated difference': '計算差額', 'Enter a valid total to calculate the change.': '輸入有效總數以計算變動。',
  'Increase — latest total is above the prior holding.': '增加－最新總數高於先前持股。',
  'Decrease — latest total is below the prior holding.': '減少－最新總數低於先前持股。',
  'No change — latest total matches the prior holding.': '沒有變動－最新總數與先前持股相同。',
  'Record destinations': '記錄目的地', 'Show on Ownership page': '顯示於股權頁面',
  'Included in Strategic Entities and the Public Float calculation.': '納入策略實體及公眾流通股計算。',
  'Show in Suggested Changes': '顯示於建議變更', 'Requires company review inside Internal Float.': '需要在內部流通股中由公司檢閱。',
  'Apply to Management / Strategic': '套用至管理層／策略持股', 'For initial historical setup or approved direct changes.': '用於初始歷史設定或已批准的直接變更。',
  'Save Latest Total': '儲存最新總數', 'Awaiting latest total': '等待最新總數', 'no destination selected': '未選擇目的地',
  'Holder': '持有人', 'Entry': '輸入類型', 'New holder': '新持有人', 'Existing holder update': '更新現有持有人',
  'Prior Total': '先前總數', 'Latest Total': '最新總數', 'Suggested Delta': '建議差額', 'Not applicable': '不適用',
  'Awaiting input': '等待輸入', 'Ownership': '股權', 'Suggestion': '建議', 'Management / Strategic': '管理層／策略持股',
  'Visible': '顯示', 'Hidden': '隱藏', 'Direct apply': '直接套用', 'No direct apply': '不直接套用',
  'Management Holdings API Response': '管理層持股 API 回應',
  'Raw authenticated response used to populate the ownership operations workspace.': '用於填入股權操作工作區的原始已驗證回應。',
  'Management Holdings Records': '管理層持股記錄', 'Management holding destinations': '管理層持股目的地',
  'Strategic Entities': '策略實體', 'Suggested Changes': '建議變更',
  'Records included in the Ownership page Strategic Entities section.': '包含於股權頁面「策略實體」區段的記錄。',
  'Pending records shown in Internal Float for company review.': '顯示於內部流通股、等待公司檢閱的記錄。',
  'Current Management / Strategic holdings shown in Internal Float.': '內部流通股目前顯示的管理層／策略持股。',
  'Calculated Change': '計算變動', 'Reported Total': '申報總數', 'Current holding': '目前持股', 'Legacy record': '舊版記錄',
  'Workspace': '工作區', 'Internal Float': '內部流通股', 'Management': '管理層', 'No records in this section.': '此區段沒有記錄。',
  'Copy to Strategic Entities': '複製至策略實體', 'Copy to Suggested Changes': '複製至建議變更',
  'Copy to Management / Strategic': '複製至管理層／策略持股', 'Record latest total for holder': '記錄持有人的最新總數',
  'Workspace row is read-only here': '此處的工作區資料列為唯讀',
  'Record Latest 13/F Holding': '記錄最新 13/F 持股',
  'Select the holder and enter the latest total shares reported. The change is calculated automatically.': '選擇持有人並輸入最新申報總股數，系統會自動計算變動。',
  'Unable to load records.': '無法載入記錄。', 'Record deleted.': '記錄已刪除。', 'Unable to delete record.': '無法刪除記錄。',
  'Unable to copy record.': '無法複製記錄。', 'Select at least one destination for this record.': '請為此記錄選擇至少一個目的地。',
  'Traditional Custody Breakdown': '傳統託管分佈', 'Pending for implementation': '等待實作',
  'Planned Operations workspace for maintaining broker and custodian positions shown on the Internal Float page.': '規劃中的後台工作區，用於維護內部流通股頁面所顯示的經紀商及託管機構持倉。',
  'UI preview only': '僅供介面預覽', 'Backend storage and publishing are not connected yet. The rows below are sample data and cannot be edited.': '後台儲存及發佈尚未連接。以下資料列為範例資料，無法編輯。',
  'Broker / Custodian': '經紀商／託管機構', 'Shares': '股份', 'Sample broker or custodian name': '範例經紀商或託管機構名稱',
  'Add Custodian': '新增託管機構', 'Publish Custody Data': '發佈託管資料',

  // Operations login
  'Backend data workspace': '後台資料工作區',
  'Prototype login for operations team workflows. Real authentication can be connected after the data-entry flow is approved.': '供營運團隊工作流程使用的原型登入。資料輸入流程獲批准後可連接正式驗證。',
  'Password': '密碼', 'Enter Operations Portal': '進入後台入口',
};

const allZhHant: Record<string, string> = { ...operationsZhHant, ...zhHant };

const simplifiedPhrases: Array<[string, string]> = [
  ['資料', '数据'], ['資訊', '信息'], ['入口網站', '平台'], ['用戶', '用户'], ['電郵', '邮箱'], ['檔案', '文件'],
  ['匯入', '导入'], ['上載', '上传'], ['下載', '下载'], ['儲存', '保存'], ['發佈', '发布'], ['搜尋', '搜索'],
  ['篩選', '筛选'], ['檢閱', '审核'], ['檢視', '查看'], ['傳回', '返回'], ['託管', '托管'], ['發送', '发送'],
  ['工作階段', '会话'], ['工作區', '工作区'], ['個人資料', '个人资料'], ['暫無', '暂无'], ['尚未', '尚未'],
  ['長倉', '多头仓位'], ['空頭', '空头'], ['持倉', '持仓'], ['股權', '股权'], ['股份', '股份'], ['流通股', '流通股'],
  ['借貸', '借贷'], ['費率', '费率'], ['軋空', '逼空'], ['沽空', '卖空'], ['申報', '申报'], ['機構', '机构'],
  ['市場', '市场'], ['現時', '当前'], ['總覽', '总览'], ['趨勢', '趋势'], ['類別', '类别'], ['備註', '备注'],
  ['設定', '设置'], ['提醒', '提醒'], ['連接器', '连接器'], ['傳統', '传统'], ['區塊鏈', '区块链'], ['代幣化', '代币化'],
  ['週', '周'], ['與', '与'], ['這', '这'], ['為', '为'], ['會', '会'], ['將', '将'], ['於', '于'], ['並', '并'],
];

const simplifiedCharacters: Record<string, string> = {
  '儀': '仪', '錶': '表', '執': '执', '團': '团', '隊': '队', '證': '证', '錄': '录', '歷': '历', '識': '识', '總': '总',
  '號': '号', '碼': '码', '狀': '状', '態': '态', '嚴': '严', '顯': '显', '開': '开', '關': '关', '閉': '闭',
  '導': '导', '覽': '览', '構': '构', '價': '价', '較': '较', '動': '动', '變': '变', '劃': '划', '佈': '布',
  '餘': '余', '舊': '旧', '頁': '页', '筆': '笔', '統': '统', '專': '专', '業': '业', '標': '标', '題': '题',
  '審': '审', '批': '批', '擬': '拟', '斷': '断', '擔': '担', '險': '险', '實': '实', '際': '际', '內': '内',
  '層': '层', '納': '纳', '啟': '启', '處': '处', '時': '时', '間': '间', '線': '线', '則': '则', '觸': '触',
  '從': '从', '獲': '获', '屬': '属', '暱': '昵', '稱': '称', '簡': '简', '紹': '绍', '賬': '账', '帳': '账',
  '權': '权', '結': '结', '圖': '图', '體': '体', '歸': '归', '類': '类', '門': '门', '檻': '槛', '階': '阶',
  '異': '异', '常': '常', '應': '应', '對': '对', '優': '优', '級': '级', '選': '选', '擇': '择', '寫': '写',
  '載': '载', '傳': '传', '回': '回', '後': '后', '備': '备', '無': '无', '與': '与', '倉': '仓', '頭': '头',
  '數': '数', '值': '值', '範': '范', '圍': '围', '鏈': '链', '供': '供', '商': '商',
  '聲': '声', '歡': '欢', '迎': '迎', '經': '经', '紀': '纪', '準': '准', '驗': '验', '確': '确',
  '費': '费', '務': '务', '給': '给', '涵': '涵', '蓋': '盖', '顧': '顾', '策': '策', '略': '略',
  '軟': '软', '軋': '轧', '沽': '卖', '積': '积', '極': '极', '發': '发', '編': '编',
};

const simplifiedCharactersExtra: Record<string, string> = {
  '個': '个', '兩': '两', '們': '们', '來': '来', '這': '这', '還': '还', '僅': '仅', '讓': '让',
  '觀': '观', '預': '预', '計': '计', '據': '据', '評': '评', '輔': '辅', '遲': '迟', '紅': '红', '綠': '绿',
  '額': '额', '減': '减', '頻': '频', '滿': '满', '壓': '压', '緊': '紧', '維': '维', '續': '续',
  '問': '问', '聯': '联', '絡': '络', '員': '员', '責': '责', '條': '条', '項': '项', '組': '组',
  '調': '调', '買': '买', '閱': '阅', '報': '报', '記': '记', '連': '连', '區': '区', '塊': '块',
  '協': '协', '議': '议', '庫': '库', '響': '响', '擁': '拥', '護': '护', '趨': '趋', '勢': '势',
  '篩': '筛', '暫': '暂', '瀏': '浏', '虛': '虚', '更': '更', '廣': '广', '儘': '尽', '盡': '尽',
  '邏': '逻', '輯': '辑', '駁': '驳', '風': '风', '財': '财', '進': '进', '註': '注', '檔': '档',
  '萬': '万', '億': '亿', '鎮': '镇', '獲': '获', '舊': '旧', '開': '开', '關': '关', '轉': '转',
};

function toSimplified(value: string) {
  let result = value;
  simplifiedPhrases.forEach(([traditional, simplified]) => {
    result = result.replaceAll(traditional, simplified);
  });
  return Array.from(result).map(character => simplifiedCharacters[character] ?? simplifiedCharactersExtra[character] ?? character).join('');
}

function normalizedTranslationKey(value: string) {
  return value
    .normalize('NFKC')
    .replaceAll('’', "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?。！？]+$/, '')
    .toLowerCase();
}

const normalizedZhHant = new Map<string, string>();
Object.entries(allZhHant).forEach(([source, translated]) => {
  const key = normalizedTranslationKey(source);
  if (!normalizedZhHant.has(key)) normalizedZhHant.set(key, translated);
});

const monthNumbers: Record<string, number> = {
  Jan: 1, January: 1, Feb: 2, February: 2, Mar: 3, March: 3, Apr: 4, April: 4,
  May: 5, Jun: 6, June: 6, Jul: 7, July: 7, Aug: 8, August: 8, Sep: 9, Sept: 9,
  September: 9, Oct: 10, October: 10, Nov: 11, November: 11, Dec: 12, December: 12,
};

const chineseWeekdays: Record<string, string> = {
  Sun: '週日', Sunday: '星期日', Mon: '週一', Monday: '星期一', Tue: '週二', Tuesday: '星期二',
  Wed: '週三', Wednesday: '星期三', Thu: '週四', Thursday: '星期四', Fri: '週五', Friday: '星期五',
  Sat: '週六', Saturday: '星期六',
};

function translateEnglishDate(value: string, chartText: boolean) {
  const fullDate = value.match(/^(?:(Sun(?:day)?|Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?),?\s+)?([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})$/);
  if (fullDate) {
    const [, weekday, monthName, day, year] = fullDate;
    const month = monthNumbers[monthName];
    if (month) return chartText
      ? `${month}/${Number(day)}`
      : `${year}年${month}月${Number(day)}日${weekday ? `（${chineseWeekdays[weekday]}）` : ''}`;
  }
  const dayMonthYear = value.match(/^(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})$/);
  if (dayMonthYear) {
    const [, day, monthName, year] = dayMonthYear;
    const month = monthNumbers[monthName];
    if (month) return chartText ? `${month}/${Number(day)}` : `${year}年${month}月${Number(day)}日`;
  }
  if (chartText) {
    const numericDate = value.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (numericDate) return `${Number(numericDate[1])}/${Number(numericDate[2])}`;
    const chartMonth = value.match(/^([A-Z][a-z]+)\s+['’]?(\d{2})$/);
    if (chartMonth && monthNumbers[chartMonth[1]]) return `${monthNumbers[chartMonth[1]]}/${chartMonth[2]}`;
  }
  return '';
}

const dynamicPatterns: Array<[RegExp, string]> = [
  [/^Page (\d+) of (\d+)$/, '第 $1 頁，共 $2 頁'],
  [/^(\d+) records$/, '$1 筆記錄'],
  [/^(\d+) dates$/, '$1 個日期'],
  [/^(\d+) mapped$/, '已對應 $1 個'],
  [/^(\d+)\s*\/\s*(\d+) records$/, '$1／$2 筆記錄'],
  [/^(\d+)-(\d+) shown$/, '顯示第 $1 至 $2 筆'],
  [/^Sample preview · ([\d,]+) shares$/, '範例預覽 · $1 股'],
  [/^(.+) hotkeys$/, '$1 快捷鍵'],
  [/^No notification hotkeys are currently mapped to (.+)\.$/, '目前沒有通知快捷鍵對應至 $1。'],
  [/^Upload (\d+)$/, '上載 $1'],
  [/^Available in (.+) at 4:00 PM New York time\.$/, '將於 $1 後開放（紐約時間下午 4:00）。'],
  [/^Open actions for (.+)$/, '開啟 $1 的操作'],
  [/^Sample shares held by (.+)$/, '$1 持有的範例股份'],
  [/^User Portal · (.+)$/, '用戶入口 · $1'],
  [/^Open (.+) user portal$/, '開啟 $1 用戶入口'],
  [/^(.+) development data$/, '$1 開發資料'],
  [/^Deleted (.+) · (.+)\.$/, '已刪除 $1 · $2。'],
  [/^Saved (.+) for (.+) under (.+)\.$/, '已為 $2 儲存 $1，平台為 $3。'],
  [/^Deleted (.+) from (.+)\.$/, '已從 $2 刪除 $1。'],
  [/^Invitation created for (.+) with access to (.+)\.$/, '已為 $1 建立邀請，可存取 $2。'],
  [/^Uploaded ([\d,]+) Stocktwits records\.$/, '已上載 $1 筆 Stocktwits 記錄。'],
  [/^(.+) saved as a (.+)\. Current total: ([\d,]+) shares\.$/, '$1 已儲存為$2。目前總數：$3 股。'],
  [/^Record copied to (.+)\.$/, '記錄已複製至 $1。'],
  [/^([+-]?[\d,]+) suggested delta$/, '建議差額 $1'],
  [/^([+-]?[\d,.]+) shares$/, '$1 股'],
  [/^(\d+) reports$/, '$1 份報告'],
  [/^(\d+) feeds in selected timeframe$/, '所選時段內有 $1 則動態'],
  [/^Load more$/, '載入更多'],
];

export function translatePortalPageText(language: PortalLanguage, source: string, chartText = false) {
  if (language === 'en') return source;
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  const core = source.slice(leading.length, source.length - trailing.length);
  if (!core) return source;
  let translated = allZhHant[core] ?? normalizedZhHant.get(normalizedTranslationKey(core));
  if (!translated) {
    for (const [pattern, replacement] of dynamicPatterns) {
      if (pattern.test(core)) {
        translated = core.replace(pattern, replacement);
        break;
      }
    }
  }
  if (!translated) translated = translateEnglishDate(core, chartText);
  if (!translated) return source;
  return `${leading}${language === 'zh-Hans' ? toSimplified(translated) : translated}${trailing}`;
}

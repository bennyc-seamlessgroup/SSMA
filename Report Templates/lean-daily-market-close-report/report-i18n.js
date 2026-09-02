(function exposeReportI18n(global) {
  const translations = {
    'zh-Hant': {
      'Post-Market Intelligence': '後市情報', 'Daily Market Close Report': '每日市場收市報告',
      'A concise view of short positioning, lending conditions, social sentiment, and recent regulatory filings.': '沽空持倉、借貸狀況、社交情緒及近期監管申報的精要概覽。',
      'Current posture': '目前狀況', Company: '公司', 'Report date': '報告日期', 'Short positioning': '沽空持倉', 'Lending conditions': '借貸狀況', 'Social sentiment': '社交情緒', 'SEC filings': 'SEC 申報',
      'Daily Snapshot': '每日快照', 'Key Closing Signals': '主要收市訊號', 'Daily trading snapshot': '每日交易快照', 'As of': '截至', Open: '開市價', High: '最高價', Low: '最低價', Close: '收市價', 'Trade Volume': '成交量',
      'Short Interest %': '沽空權益百分比', 'Borrow Fee': '借貸費率', 'Initial Margin': '初始保證金', 'Maintenance Margin': '維持保證金', 'Shortable Shares': '可供借出股份', Utilization: '使用率', 'Average Duration': '平均期限', 'Days to Cover': '回補天數',
      'Short Interest Score': '沽空評分', Risk: '風險', Unavailable: '無法取得', 'vs yesterday': '與前一日比較', 'AI Analysis': 'AI 分析', Daily: '每日',
      'AI-assisted interpretation. Review the underlying market data before making decisions.': 'AI 輔助解讀。作出決定前，請檢閱相關市場資料。', 'AI analysis is not available for this report date.': '此報告日期沒有可用的 AI 分析。',
      'Seven-Day Trends': '七日趨勢', 'Short and Lending Movement': '沽空及借貸變動', 'Market Perception': '市場觀感', 'Seven-Day Social Sentiment and Recent Filings': '七日社交情緒及近期申報', 'Social Sentiment and Recent Filings': '社交情緒及近期申報', 'Sentiment observation period': '情緒觀察期',
      '7-Day Overall Sentiment': '七日整體情緒', 'Overall Sentiment': '整體情緒', mentions: '則提及', 'Sentiment Distribution': '情緒分佈', 'Platform Breakdown': '平台分佈', 'Latest SEC Filings': '最新 SEC 申報', Bullish: '看好', Neutral: '中性', Bearish: '看淡', Mentions: '提及', 'No data': '無資料',
      'Previous 7 Days': '過去七日', Window: '時段', 'vs previous 7 days': '與之前七日比較', 'vs previous trading day': '與前一交易日比較', 'Overall sentiment': '整體情緒', 'Sentiment distribution': '情緒分佈', 'Platform breakdown': '平台分佈', unavailable: '無法取得', 'This dated report does not contain this sentiment breakdown.': '此指定日期報告不包含這項情緒明細。',
      'No filing records are available for this report.': '此報告沒有可用的申報記錄。', Date: '日期', Form: '表格', Filing: '申報', 'Short Volume Trend': '沽空成交量趨勢', 'Latest seven available trading days': '最近七個可用交易日', 'Borrow Fee Trend': '借貸費率趨勢', 'Daily borrow cost': '每日借貸成本',
      'Shortable Shares Trend': '可供借出股份趨勢', 'Available lending inventory': '可用借貸庫存', 'Fails-to-Deliver Trend': '交收失敗趨勢', 'Utilization Trend': '使用率趨勢', 'Lending pool utilization': '借貸池使用率', 'Days to Cover Trend': '回補天數趨勢', 'Short interest relative to volume': '沽空權益相對成交量',
      Low: '低', Moderate: '中等', High: '高', Extreme: '極高', 'Pressure is relatively contained.': '壓力相對受控。', 'Pressure is developing.': '壓力正在形成。', 'Elevated squeeze sensitivity.': '軋空敏感度偏高。', 'Severe pressure warrants review.': '嚴重壓力需要檢視。',
      'Elevated short-side pressure may increase squeeze sensitivity. Management should monitor borrow conditions, available inventory, and covering activity closely.': '沽空壓力偏高可能增加軋空敏感度。管理層應密切監察借貸狀況、可用庫存及回補活動。', 'Moderate Lending Pressure': '中等借貸壓力',
      'For informational purposes only. Not investment advice. Market data may be delayed or incomplete.': '僅供參考，並非投資建議。市場資料可能延遲或不完整。', 'SEC correspondence letter': 'SEC 往來函件', 'Notification of late filing': '延遲申報通知',
    },
    'zh-Hans': {
      'Post-Market Intelligence': '盘后情报', 'Daily Market Close Report': '每日市场收盘报告',
      'A concise view of short positioning, lending conditions, social sentiment, and recent regulatory filings.': '做空持仓、借贷状况、社交情绪及近期监管申报的精要概览。',
      'Current posture': '目前状况', Company: '公司', 'Report date': '报告日期', 'Short positioning': '做空持仓', 'Lending conditions': '借贷状况', 'Social sentiment': '社交情绪', 'SEC filings': 'SEC 申报',
      'Daily Snapshot': '每日快照', 'Key Closing Signals': '主要收盘信号', 'Daily trading snapshot': '每日交易快照', 'As of': '截至', Open: '开盘价', High: '最高价', Low: '最低价', Close: '收盘价', 'Trade Volume': '成交量',
      'Short Interest %': '做空权益百分比', 'Borrow Fee': '借贷费率', 'Initial Margin': '初始保证金', 'Maintenance Margin': '维持保证金', 'Shortable Shares': '可借股份', Utilization: '使用率', 'Average Duration': '平均期限', 'Days to Cover': '回补天数',
      'Short Interest Score': '做空评分', Risk: '风险', Unavailable: '无法获取', 'vs yesterday': '与前一日比较', 'AI Analysis': 'AI 分析', Daily: '每日',
      'AI-assisted interpretation. Review the underlying market data before making decisions.': 'AI 辅助解读。作出决定前，请审阅相关市场数据。', 'AI analysis is not available for this report date.': '此报告日期没有可用的 AI 分析。',
      'Seven-Day Trends': '七日趋势', 'Short and Lending Movement': '做空及借贷变动', 'Market Perception': '市场观感', 'Seven-Day Social Sentiment and Recent Filings': '七日社交情绪及近期申报', 'Social Sentiment and Recent Filings': '社交情绪及近期申报', 'Sentiment observation period': '情绪观察期',
      '7-Day Overall Sentiment': '七日整体情绪', 'Overall Sentiment': '整体情绪', mentions: '则提及', 'Sentiment Distribution': '情绪分布', 'Platform Breakdown': '平台分布', 'Latest SEC Filings': '最新 SEC 申报', Bullish: '看涨', Neutral: '中性', Bearish: '看跌', Mentions: '提及', 'No data': '无数据',
      'Previous 7 Days': '过去七日', Window: '时段', 'vs previous 7 days': '与之前七日比较', 'vs previous trading day': '与前一交易日比较', 'Overall sentiment': '整体情绪', 'Sentiment distribution': '情绪分布', 'Platform breakdown': '平台分布', unavailable: '无法获取', 'This dated report does not contain this sentiment breakdown.': '此指定日期报告不包含这项情绪明细。',
      'No filing records are available for this report.': '此报告没有可用的申报记录。', Date: '日期', Form: '表格', Filing: '申报', 'Short Volume Trend': '做空成交量趋势', 'Latest seven available trading days': '最近七个可用交易日', 'Borrow Fee Trend': '借贷费率趋势', 'Daily borrow cost': '每日借贷成本',
      'Shortable Shares Trend': '可借股份趋势', 'Available lending inventory': '可用借贷库存', 'Fails-to-Deliver Trend': '交收失败趋势', 'Utilization Trend': '使用率趋势', 'Lending pool utilization': '借贷池使用率', 'Days to Cover Trend': '回补天数趋势', 'Short interest relative to volume': '做空权益相对成交量',
      Low: '低', Moderate: '中等', High: '高', Extreme: '极高', 'Pressure is relatively contained.': '压力相对受控。', 'Pressure is developing.': '压力正在形成。', 'Elevated squeeze sensitivity.': '逼空敏感度偏高。', 'Severe pressure warrants review.': '严重压力需要审阅。',
      'Elevated short-side pressure may increase squeeze sensitivity. Management should monitor borrow conditions, available inventory, and covering activity closely.': '做空压力偏高可能增加逼空敏感度。管理层应密切监控借贷状况、可用库存及回补活动。', 'Moderate Lending Pressure': '中等借贷压力',
      'For informational purposes only. Not investment advice. Market data may be delayed or incomplete.': '仅供参考，并非投资建议。市场数据可能延迟或不完整。', 'SEC correspondence letter': 'SEC 往来函件', 'Notification of late filing': '延迟申报通知',
    },
  };
  function normalizeLanguage(value) { return value === 'zh-Hant' || value === 'zh-Hans' ? value : 'en'; }
  function locale(value) { const language = normalizeLanguage(value); return language === 'zh-Hant' ? 'zh-HK' : language === 'zh-Hans' ? 'zh-CN' : 'en-US'; }
  function translate(languageValue, sourceValue) {
    const language = normalizeLanguage(languageValue); const source = String(sourceValue ?? '');
    if (language === 'en' || !source) return source;
    const dictionary = translations[language]; if (dictionary[source]) return dictionary[source];
    const lendingPressure = source.match(/^(Low|Moderate|High|Extreme) Lending Pressure$/);
    if (lendingPressure) return `${dictionary[lendingPressure[1]]}${language === 'zh-Hant' ? '借貸壓力' : '借贷压力'}`;
    const risk = source.match(/^(Low|Moderate|High|Extreme) Risk$/); if (risk) return `${dictionary[risk[1]]}${dictionary.Risk}`;
    const asOf = source.match(/^As of (.+)$/); if (asOf) return `${dictionary['As of']} ${asOf[1]}`;
    const unavailable = source.match(/^(.+) unavailable$/i); if (unavailable) return `${translate(language, unavailable[1])}${dictionary.unavailable}`;
    const previousWindow = source.match(/^vs previous (.+)$/i); if (previousWindow) return `${language === 'zh-Hant' ? '與之前' : '与之前'}${previousWindow[1]}${language === 'zh-Hant' ? '比較' : '比较'}`;
    return source;
  }
  global.ReportI18n = { locale, normalizeLanguage, translate };
})(window);

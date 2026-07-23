window.REPORT_DATA = {
  "company": "Currenc Group Inc.",
  "ticker": "CURR",
  "exchange": "NASDAQ",
  "date": "May 29, 2026",
  "reportTitle": "07:00 PM Daily Full Closing Comprehensive Digest",
  "times": {
    "et": "07:00 PM ET, May 29, 2026",
    "beijing": "07:00 AM Beijing, May 30, 2026"
  },
  "status": "Elevated Closing Risk",
  "kpis": [
    {
      "label": "Squeeze Score",
      "value": "82 / 100",
      "delta": "+4 today",
      "tone": "high"
    },
    {
      "label": "Borrow Fee",
      "value": "162.4%",
      "delta": "+14.2 pts",
      "tone": "critical"
    },
    {
      "label": "Utilization",
      "value": "99.1%",
      "delta": "+0.8 pts",
      "tone": "critical"
    },
    {
      "label": "SI / Float",
      "value": "33.8%",
      "delta": "+1.3 pts",
      "tone": "high"
    },
    {
      "label": "Inst. Activity",
      "value": "72 / 100",
      "delta": "Short-side active",
      "tone": "high"
    },
    {
      "label": "Sentiment",
      "value": "64% Bullish",
      "delta": "+6 pts",
      "tone": "medium"
    }
  ],
  "alerts": [
    "Borrow fee closed at a new 30-day high; financing pressure remains severe.",
    "Global lending availability contracted into the close, reducing short-side flexibility.",
    "Two monitored funds showed covering signals, while one large fund continued to add exposure."
  ],
  "summary": "CURR closed with materially elevated short-squeeze pressure. Borrow fee acceleration and near-max utilization indicate constrained lending supply, while late-session volume suggests active repositioning by both short funds and momentum buyers. The highest-risk window for management is the next trading session open, where a borrow-pool deterioration or positive catalyst could force additional covering.",
  "battlefield": {
    "borrow": [
      118,
      124,
      132,
      129,
      141,
      148,
      162
    ],
    "util": [
      96.5,
      97.1,
      97.8,
      98.0,
      98.4,
      98.6,
      99.1
    ],
    "si": [
      29.7,
      30.1,
      30.8,
      31.5,
      32.5,
      33.0,
      33.8
    ],
    "days": [
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri AM",
      "Fri PM",
      "Close"
    ]
  },
  "institutions": [
    [
      "Marshall Wace",
      "1.46M",
      "+5.8%",
      "Adding",
      "High"
    ],
    [
      "Two Sigma",
      "0.89M",
      "-5.3%",
      "Reducing",
      "Medium"
    ],
    [
      "Millennium",
      "0.74M",
      "+3.1%",
      "Active",
      "Medium"
    ],
    [
      "RiverNorth",
      "0.54M",
      "+10.2%",
      "Adding",
      "High"
    ],
    [
      "Virtu / MM",
      "0.31M",
      "Intraday",
      "Neutral",
      "Low"
    ]
  ],
  "instSummary": "Short-side behavior was mixed but still pressure-biased. Marshall Wace and RiverNorth added exposure despite rising borrow costs, while Two Sigma showed partial covering into the close. This creates a less coordinated but more fragile short-side structure.",
  "news": [
    [
      "Market",
      "Late-session volume expanded above 20-day average, suggesting active closing flow."
    ],
    [
      "Company",
      "No new company filing detected after market close."
    ],
    [
      "Sector",
      "Small-cap fintech names traded with higher volatility during the final hour."
    ]
  ],
  "filings": [
    [
      "8-K",
      "None detected"
    ],
    [
      "13D/G",
      "No new activist entry"
    ],
    [
      "Form 4",
      "No insider transaction"
    ],
    [
      "S-3",
      "No change"
    ]
  ],
  "social": {
    "Positive": 64,
    "Neutral": 20,
    "Negative": 16,
    "mentions": "14,920"
  },
  "price": [
    [
      "Current Close",
      4.82
    ],
    [
      "Base Case",
      5.35
    ],
    [
      "Bull Case",
      6.4
    ],
    [
      "Squeeze Case",
      8.2
    ],
    [
      "Extreme Case",
      11.6
    ]
  ],
  "watch": [
    [
      "Critical",
      "Borrow Fee > 175%",
      "Would confirm further stress in short financing cost."
    ],
    [
      "Critical",
      "Utilization > 99.5%",
      "Would indicate near-exhausted borrow pool."
    ],
    [
      "Important",
      "Break above $5.35",
      "Could trigger systematic covering and momentum inflow."
    ],
    [
      "Monitor",
      "Marshall Wace position change",
      "Continuation of adding may cap upside; reduction may accelerate squeeze."
    ],
    [
      "Monitor",
      "After-hours news / filings",
      "Any positive corporate update could alter opening risk."
    ]
  ],
  "actions": [
    [
      "Board",
      "Review capital markets exposure and next-session volatility risk before market open."
    ],
    [
      "Management",
      "Prepare factual talking points in case abnormal volatility extends into next session."
    ],
    [
      "IR",
      "Monitor social narrative and inbound investor questions around short interest and borrow fee."
    ],
    [
      "Legal",
      "Review abnormal trading patterns and maintain record of unusual activity indicators."
    ],
    [
      "Capital Markets",
      "Watch borrow pool, opening gap, and short-volume concentration in first 30 minutes."
    ]
  ]
};

'use client';

import { Children, ReactNode, useState } from 'react';

type ImportDataTab = {
  id: string;
  title: string;
  file: string;
  sourcePlatform: string;
  recordCount: number;
  status: string;
};

type ImportDataTabsProps = {
  tabs: ImportDataTab[];
  children: ReactNode;
};

export function ImportDataTabs({ tabs, children }: ImportDataTabsProps) {
  const panels = Children.toArray(children);
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? '');
  const activeIndex = Math.max(0, tabs.findIndex(tab => tab.id === activeId));

  if (!tabs.length) return null;

  return (
    <div className="import-tabs">
      <div className="import-tabs__bar" role="tablist" aria-label="Imported data tables">
        {tabs.map(tab => {
          const active = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`import-tabs__tab ${active ? 'active' : ''}`}
              onClick={() => setActiveId(tab.id)}
            >
              <span>{tab.title}</span>
              <small>{tab.sourcePlatform} · {tab.recordCount.toLocaleString()} records</small>
            </button>
          );
        })}
      </div>
      <div className="import-tabs__panel" role="tabpanel">
        {panels[activeIndex]}
      </div>
    </div>
  );
}

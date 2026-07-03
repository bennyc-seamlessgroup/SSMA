'use client';

import { useEffect } from 'react';
import { clearAuthSession } from '@/lib/auth-client';
import { publicDemoTicker, startPublicDemoSession } from '@/lib/public-demo';

export function DemoLauncher() {
  useEffect(() => {
    clearAuthSession();
    startPublicDemoSession();
    window.location.replace(`/monitor/${publicDemoTicker}/dashboard-v2`);
  }, []);

  return (
    <main className="demo-launcher">
      <div className="demo-launcher__mark">CI</div>
      <strong>Opening the Currenc Intelligence live demo</strong>
      <span>Preparing the CURR demonstration workspace...</span>
    </main>
  );
}

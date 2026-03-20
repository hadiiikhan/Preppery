'use client';

import Aurora from './Aurora';

export default function AuroraBackground() {
  return (
    <div className="fixed inset-0 z-0 w-screen h-screen">
      <Aurora
        colorStops={["#1e40af", "#06b6d4", "#3b82f6"]}
        blend={0.5}
        amplitude={1.0}
        speed={0.5}
      />
    </div>
  );
}


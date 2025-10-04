"use client";

import dynamic from 'next/dynamic';

const ModeToggle = dynamic(() => import('./mode-toggle').then(mod => ({ default: mod.ModeToggle })), {
  ssr: false,
  loading: () => (
    <div className="h-9 w-9 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
      <div className="h-[1.1rem] w-[1.2rem]" />
    </div>
  )
});

export { ModeToggle };
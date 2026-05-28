'use client';
// components/animations/LightPillarClient.tsx
import dynamic from 'next/dynamic';

const LightPillar = dynamic(() => import('./LightPillar'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full absolute top-0 left-0 animate-pulse" />
    ),
});

export default LightPillar;

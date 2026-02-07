// =============================================================================
// map-generator.tsx — Separate entry point for the Map Generator dev tool
// =============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MapGenerator } from './tools/map-generator/MapGenerator';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MapGenerator />
  </StrictMode>
);

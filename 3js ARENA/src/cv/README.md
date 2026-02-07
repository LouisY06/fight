# Computer Vision Integration (Placeholder)

This folder contains placeholder stubs for the MediaPipe Hands/Pose integration.

## Integration Plan

1. **CVProvider.tsx** — React context that initializes the webcam, runs MediaPipe, and exposes hand/pose data
2. **useCVInput.ts** — Hook consumed by game entities that maps raw hand landmarks to `CVInputData` (weapon position, rotation, gesture detection)
3. **types.ts** — TypeScript interfaces for all CV data structures

## How the Game Consumes CV Data

- `Weapon.tsx` reads `weaponPosition` and `weaponRotation` every frame
- `CombatSystem.ts` reads `gesture` to determine attack type
- `weaponVelocity` magnitude determines if a swing counts as an attack
- `isTracking` triggers a "tracking lost" UI warning

## To Integrate MediaPipe

1. Install: `npm install @mediapipe/hands @mediapipe/pose @mediapipe/camera_utils`
2. Fill in `CVProvider.tsx` with webcam capture + MediaPipe processing
3. Map hand landmarks → 3D weapon position in `useCVInput.ts`
4. Implement gesture classification (slash vs stab vs block) based on hand movement patterns

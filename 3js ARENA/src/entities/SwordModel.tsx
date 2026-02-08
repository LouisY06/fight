// =============================================================================
// SwordModel.tsx — Renders the selected sword (all procedural) with
// impressive visual effects: energy pulse, idle hover, glow aura, swing trail.
// Used by both ViewmodelSword (keyboard mode) and MechaArms (CV mode).
//
// fpvMode: When true, sets depthTest/depthWrite false on all materials and
//          applies high renderOrder so the sword never clips through walls.
// =============================================================================

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  type SwordVariant,
  type SwordId,
  SWORD_VARIANTS,
  useSwordStore,
} from '../game/SwordSelection';
import { makeSword, makeCryoKatana, makePlasmaBlade } from '../avatars/MechaGeometry';
import { getSwingProgress } from '../combat/SwingState';

// ---- Geometry builder registry ----
const SWORD_BUILDERS: Record<SwordId, () => THREE.Group> = {
  energy_greatsword: makeSword,
  mecha_sword: makeCryoKatana,
  mecha_textured: makePlasmaBlade,
};

// FPV depth fix constants
const FPV_RENDER_ORDER = 999;

// Swing glow colours (purple/neon mecha aesthetic)
const SWING_EMISSIVE_COLOR = new THREE.Color(0xaa00ff);   // purple-neon
const SWING_EMISSIVE_INTENSITY_MAX = 3.5;

// ============================================================================
// Shared depth-fix helper
// ============================================================================

function applyFpvDepthFix(root: THREE.Object3D): void {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        (mat as THREE.Material).depthTest = false;
        (mat as THREE.Material).depthWrite = false;
      }
      mesh.renderOrder = FPV_RENDER_ORDER;
    }
  });
}

// ============================================================================
// Procedural Sword sub-component
// ============================================================================

interface SwordSubProps {
  variant: SwordVariant;
  /** Whether the sword is actively swinging (intensifies glow) */
  isSwinging?: boolean;
  /** FPV mode — disable depth test to prevent wall clipping */
  fpvMode?: boolean;
}

function ProceduralSwordModel({ variant, isSwinging = false, fpvMode = false }: SwordSubProps) {
  const builder = SWORD_BUILDERS[variant.id] ?? makeSword;
  const swordGroup = useMemo(() => builder(), [builder]);
  const groupRef = useRef<THREE.Group>(null!);
  const depthApplied = useRef(false);
  const energyColor = useMemo(() => new THREE.Color(variant.energyColor), [variant.energyColor]);

  useFrame(() => {
    if (!groupRef.current) return;
    const time = Date.now() * 0.001;
    const swingProgress = getSwingProgress();

    // FPV depth fix
    if (fpvMode && !depthApplied.current) {
      applyFpvDepthFix(groupRef.current);
      depthApplied.current = true;
    }

    // Idle energy node pulse
    const pulse = 0.6 + Math.sin(time * 3.0) * 0.4;
    const swingGlowFactor = isSwinging ? Math.sin(swingProgress * Math.PI) : 0;
    const intensityMul = isSwinging ? 2.5 : pulse;

    swordGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat.emissive && mat.emissiveIntensity > 0.1) {
          if (swingGlowFactor > 0.01) {
            mat.emissive.lerp(SWING_EMISSIVE_COLOR, swingGlowFactor * 0.5);
            mat.emissiveIntensity = intensityMul + swingGlowFactor * SWING_EMISSIVE_INTENSITY_MAX;
          } else {
            mat.emissiveIntensity = intensityMul;
          }
        }
      }
    });
  });

  return (
    <group
      ref={groupRef}
      scale={variant.scale}
      rotation={variant.rotationOffset}
      position={variant.positionOffset}
    >
      <primitive object={swordGroup} />
    </group>
  );
}

// ============================================================================
// Main SwordModel — public component used by ViewmodelSword + MechaArms
// ============================================================================

interface SwordModelProps {
  /** Override sword variant (if not set, uses the store selection) */
  variant?: SwordVariant;
  /** Whether the sword is actively swinging */
  isSwinging?: boolean;
  /** Additional scale multiplier */
  scaleMul?: number;
  /** FPV mode: disables depth test so sword never clips through walls */
  fpvMode?: boolean;
}

export function SwordModel({
  variant: overrideVariant,
  isSwinging = false,
  scaleMul = 1,
  fpvMode = false,
}: SwordModelProps) {
  const selectedId = useSwordStore((s) => s.selectedSwordId);
  const variant = overrideVariant ?? SWORD_VARIANTS.find((v) => v.id === selectedId) ?? SWORD_VARIANTS[0];

  return (
    <group scale={scaleMul}>
      <ProceduralSwordModel variant={variant} isSwinging={isSwinging} fpvMode={fpvMode} />
    </group>
  );
}

// ============================================================================
// SwordPreview — spinning preview for the selector UI (rendered in a portal)
// ============================================================================

export function SwordPreview({ variant, scaleMul = 1 }: { variant: SwordVariant; scaleMul?: number }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <group ref={groupRef}>
      <SwordModel variant={variant} scaleMul={scaleMul} />
    </group>
  );
}

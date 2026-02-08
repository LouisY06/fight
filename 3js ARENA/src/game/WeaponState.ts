// =============================================================================
// WeaponState.ts — Sword is the only weapon. This module is kept as a thin
// compatibility shim so existing imports don't break.  The "activeWeapon" is
// always 'sword'; the toggle / gun-aiming config have been removed.
// =============================================================================

/** The only weapon type. */
export type ActiveWeapon = 'sword';

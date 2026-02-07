// =============================================================================
// promptTemplates.ts — Prompt engineering for arena generation
// =============================================================================

/**
 * Wraps user input with the standardized arena prompt template.
 */
export function buildArenaPrompt(userInput: string): string {
  return `Generate an equirectangular panoramic image (360-degree, 2:1 aspect ratio) of a fighting arena environment. 

The scene should be: ${userInput}

Requirements:
- The image MUST be in equirectangular projection format suitable for wrapping around a sphere as a skybox
- The aspect ratio MUST be 2:1 (width is exactly double the height)
- The arena should feel enclosed or semi-enclosed — like a colosseum, cage, pit, or ring
- There should be dramatic lighting — spotlights, torches, neon, lava glow, or similar
- The center/ground area should be relatively open and flat (this is where players fight)
- Include atmospheric elements: smoke, haze, particles, volumetric light
- The mood should be intense and combat-appropriate
- Do NOT include any people, characters, or text in the image
- Make it visually dramatic and suitable as a video game fighting arena background`;
}

/**
 * Pre-built prompt templates for common arena styles.
 */
export const PRESET_TEMPLATES: Record<string, string> = {
  volcanic:
    'A volcanic arena surrounded by rivers of lava, jagged obsidian rocks, and billowing smoke. Overhead, the sky glows orange-red through volcanic ash clouds. Torches line the perimeter.',

  cyberpunk:
    'A neon-lit underground fight cage in a cyberpunk city. Chain-link fencing, holographic advertisements, purple and cyan neon tubes, wet concrete floor reflecting the lights. Industrial pipes and steam vents.',

  underwater:
    'A glass-domed arena on the ocean floor. Bioluminescent coral and deep-sea creatures visible through the transparent walls. Eerie blue-green lighting filtering from above. Ancient stone pillars covered in barnacles.',

  medieval:
    'A medieval castle courtyard arena. Stone walls with banners and flags, iron torches casting warm flickering light, wooden spectator stands, cobblestone ground. Overcast sky with dramatic clouds.',

  space:
    'A fighting platform floating in outer space, inside a partially open space station. Stars and nebulae visible through massive windows. Cool blue-white artificial lighting. Metal grate flooring, holographic barriers at the edges.',

  frozen:
    'An ice arena carved into the heart of a glacier. Translucent blue ice walls with light refracting through them. Frozen stalactites hanging from the ceiling. Aurora borealis visible through cracks in the ice ceiling.',

  jungle:
    'An ancient temple arena deep in a dense jungle. Overgrown stone ruins, vines hanging from crumbling pillars, shafts of golden sunlight piercing through the canopy. Fireflies and mist in the air.',

  neon:
    'An abstract arena made of pure light and geometry. Floating neon grid platforms, Tron-like aesthetics, deep black void background with colorful light trails. Synthwave color palette — pink, cyan, purple.',

  desert:
    'A crumbling colosseum arena in a vast desert. Sandstone walls half-buried in dunes, blazing sun overhead, heat shimmer in the air. Ancient hieroglyphs carved into pillars. Dust particles floating in shafts of light.',

  infernal:
    'A demonic arena in the depths of hell. Obsidian platforms over lakes of fire, twisted iron chains hanging from above, glowing runes on the ground. Crimson sky with swirling dark clouds. Skull motifs on pillars.',
};

/**
 * Get all template names for the dropdown.
 */
export function getPresetNames(): string[] {
  return Object.keys(PRESET_TEMPLATES);
}

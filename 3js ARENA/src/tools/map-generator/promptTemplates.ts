// =============================================================================
// promptTemplates.ts — Prompt engineering for arena generation
// Prompts are tuned for DISTANT background skyboxes. Close-range geometry
// (buildings, fences, pillars) is handled by ArenaProps.tsx in real 3D.
// =============================================================================

/**
 * Wraps user input with the standardized arena prompt template.
 * Emphasises distant/sky elements since nearby structures are real 3D.
 */
export function buildArenaPrompt(userInput: string): string {
  return `Generate an equirectangular panoramic image (360-degree, 2:1 aspect ratio) that will be used as a DISTANT SKYBOX background for a 3D fighting arena.

The scene should depict: ${userInput}

Critical requirements:
- The image MUST be in equirectangular projection format suitable for mapping onto a sphere as a skybox
- The aspect ratio MUST be exactly 2:1 (width is double the height)
- Focus on the FAR BACKGROUND and SKY — distant skyline, horizon, sky, clouds, far-away structures
- Do NOT render any close-range objects (close-up walls, fences, floors, or nearby structures) — those are handled by separate 3D geometry
- The bottom of the image should depict ground/horizon-level elements fading into distance
- Use dramatic atmospheric perspective: haze, fog, volumetric light to push elements into the distance
- Include atmospheric elements: smoke, haze, particles, volumetric light beams
- The mood should be intense and dramatic, suitable for a fighting game
- Make the image HIGH CONTRAST with rich, saturated colors and strong lighting
- Do NOT include any people, characters, or readable text
- Render in a detailed, high-quality digital art style — NOT blurry or painterly
- Sharp edges and clear shapes, even for distant elements`;
}

/**
 * Pre-built prompt templates for common arena styles.
 * Written for DISTANT backgrounds — the 3D environment handles close-range.
 */
export const PRESET_TEMPLATES: Record<string, string> = {
  volcanic:
    'A distant volcanic landscape. Erupting volcanoes on the horizon, rivers of lava flowing between dark mountain ridges. The sky is choked with volcanic ash clouds glowing orange-red from below. Lightning arcs through the ash. Massive lava falls visible in the far distance. Deep reds, oranges, and blacks.',

  cyberpunk:
    'A sprawling cyberpunk city skyline at night, seen from ground level inside the city. Towering mega-skyscrapers covered in holographic advertisements and neon signs stretching into a hazy sky. Dense fog at street level with purple, cyan, and magenta neon glow reflecting off clouds. Flying vehicles with light trails. Rain-slicked atmosphere. Corporate logos on distant towers.',

  underwater:
    'A deep ocean vista seen from inside a glass dome on the seafloor. Schools of bioluminescent fish, massive whale-like creatures silhouetted in the distant deep blue. Coral reefs and kelp forests at the edges. Light rays filtering from the surface far above. Eerie blue-green tones with bioluminescent accents of pink and yellow.',

  medieval:
    'A vast medieval kingdom at dusk, viewed from a castle courtyard. Distant castle towers, fortified walls stretching along hillsides, a village with thatched roofs below. Dramatic storm clouds with rays of golden light breaking through. Crows in the sky. Mountain ranges on the horizon. Banners flapping in the wind. Warm torch light contrasting against a moody sky.',

  space:
    'Outer space visible through massive space station windows. A colorful nebula stretching across the viewport. Distant stars, a planet with rings visible on one side, asteroid debris floating past. Cool blue-white artificial lighting from the station frame mixing with warm nebula colors. The Milky Way visible in the background.',

  frozen:
    'An arctic landscape during twilight. A vast glacier field stretching to the horizon with towering ice spires. The sky is alive with a brilliant aurora borealis in green, purple, and cyan. Distant snow-capped mountains under starlight. Frozen lakes reflecting the aurora. Blowing snow and ice crystals in the atmosphere.',

  jungle:
    'A dense tropical jungle canopy seen from a clearing. Massive ancient trees with bioluminescent fungi growing on them. Shafts of golden sunlight piercing through thick canopy. Mist and fireflies filling the air. Distant waterfalls visible through gaps in the trees. Lush greens with golden light accents. Overgrown stone ruins partially visible far away.',

  neon:
    'An abstract void space with a Tron-like aesthetic. A glowing neon grid stretching infinitely in all directions. Geometric light structures floating in a deep black void. Synthwave color palette: hot pink, electric cyan, deep purple. Light trails and digital particles. A distant glowing sun or geometric sphere on the horizon. Extremely high contrast.',

  desert:
    'A vast desert at sunset. Towering sandstone formations and ancient Egyptian-style ruins on the distant horizon. Sand dunes stretching to infinity. A massive setting sun casting long shadows and painting the sky in oranges, reds, and purples. Dust clouds and heat shimmer in the atmosphere. A crescent moon visible in the fading sky.',

  infernal:
    'The depths of a hellish underworld. A vast cavern with no sky — the ceiling is rock and chains. Rivers and lakes of fire stretching into the distance. Massive demonic architecture — dark gothic cathedrals and twisted iron towers far away. Crimson and black palette with embers floating everywhere. Swirling dark smoke. Glowing runes on distant cliff faces.',
};

/**
 * Get all template names for the dropdown.
 */
export function getPresetNames(): string[] {
  return Object.keys(PRESET_TEMPLATES);
}

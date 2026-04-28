/**
 * Challenge prompt presets for the Code Arena.
 * Each preset is a curated prompt designed to showcase model comparison
 * with visually interesting HTML/CSS/JS output.
 */

export interface ChallengePreset {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** Short description */
  description: string
  /** The prompt to load into the arena */
  prompt: string
  /** Emoji icon */
  icon: string
  /** Difficulty: easy / medium / hard */
  difficulty: 'easy' | 'medium' | 'hard'
  /** Category tag */
  category: string
}

export const CHALLENGE_PRESETS: ChallengePreset[] = [
  {
    id: 'grass-field',
    name: 'Grass Field',
    description: 'A rolling green meadow with wind-swaying grass and sky',
    prompt:
      'Create an interactive HTML/CSS/JS grass field scene. A rolling green meadow with individual blades of grass that sway in the wind using canvas animation. Include a blue sky with clouds, a sun, and a gentle breeze effect. Make it visually beautiful and performant.',
    icon: '🌿',
    difficulty: 'easy',
    category: 'Scene',
  },
  {
    id: 'solar-system',
    name: 'Solar System',
    description: 'Orbiting planets with realistic colors and animations',
    prompt:
      'Create an interactive HTML/CSS/JS solar system visualization. Show the sun at the center with all 8 planets orbiting at different speeds and distances. Each planet should have its characteristic color and size. Add orbital paths, a starry background, and smooth CSS or canvas animations. Make it look like a real space scene.',
    icon: '🪐',
    difficulty: 'medium',
    category: 'Simulation',
  },
  {
    id: 'pelican-bicycle',
    name: 'Pelican on a Bicycle',
    description: 'A whimsical animated pelican riding a bicycle',
    prompt:
      'Create an animated HTML/CSS/JS illustration of a pelican riding a bicycle. Use canvas or SVG to draw a cute pelican character with its distinctive beak, pedaling a bicycle along a road. The wheels should rotate, the pelican should bob up and down, and the background should scroll to create a parallax driving effect. Make it charming and fun.',
    icon: '🐦',
    difficulty: 'hard',
    category: 'Animation',
  },
  {
    id: 'tetris',
    name: 'Tetris',
    description: 'A playable Tetris game in a single HTML file',
    prompt:
      'Create a fully playable Tetris game in a single HTML file with inline CSS and JS. Include all 7 tetromino pieces with distinct colors, rotation, line clearing with flash animation, score tracking, level progression, next piece preview, game over screen, and keyboard controls (arrow keys + space for hard drop). Make it feel polished and responsive.',
    icon: '🧱',
    difficulty: 'hard',
    category: 'Game',
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'Classic snake game with smooth animations',
    prompt:
      'Create a classic Snake game in a single HTML file with inline CSS and JS. The snake should move on a grid, eat food that appears randomly, grow longer, and the game ends when the snake hits itself or the wall. Include score display, high score, smooth animations, color gradient snake body, keyboard controls (arrow keys), and a start/restart button. Make it visually appealing.',
    icon: '🐍',
    difficulty: 'medium',
    category: 'Game',
  },
  {
    id: 'bouncing-balls',
    name: 'Bouncing Balls',
    description: 'Colorful balls bouncing with gravity and collision physics',
    prompt:
      'Create an HTML/CSS/JS animation of colorful balls bouncing around a canvas with realistic gravity, collision detection between balls, and wall bouncing. Each ball should have a different color, size, and starting position. Add a subtle trail effect and make it visually mesmerizing. Include a control to add more balls with a click.',
    icon: '🎾',
    difficulty: 'medium',
    category: 'Simulation',
  },
  {
    id: 'particle-system',
    name: 'Particle System',
    description: 'Interactive particle physics with mouse follow',
    prompt:
      'Create an interactive HTML/CSS/JS particle system. Hundreds of particles that move with physics (gravity, velocity, friction), respond to mouse movement (attract/repel), and change color based on speed. Add a trail/fade effect, smooth rendering on canvas, and a beautiful color palette. Include a control panel to adjust particle count, gravity, and mouse force.',
    icon: '✨',
    difficulty: 'hard',
    category: 'Simulation',
  },
  {
    id: 'css-loader-gallery',
    name: 'CSS Loader Gallery',
    description: 'A gallery of pure CSS loading animations',
    prompt:
      'Create a beautiful HTML/CSS page that showcases a gallery of at least 8 different pure CSS loading animations (no JS for the loaders). Each loader should be in its own card with a label. Include a dark background, smooth hover effects on the cards, and a variety of loader styles: spinners, dots, bars, morphing shapes, wave animations, etc. Make the page itself feel polished and modern.',
    icon: '⏳',
    difficulty: 'easy',
    category: 'UI',
  },
]

/** Get a preset by ID */
export function getChallengePreset(id: string): ChallengePreset | undefined {
  return CHALLENGE_PRESETS.find((p) => p.id === id)
}

/** Group presets by category */
export function groupByCategory(
  presets: ChallengePreset[],
): Record<string, ChallengePreset[]> {
  const groups: Record<string, ChallengePreset[]> = {}
  for (const preset of presets) {
    if (!groups[preset.category]) {
      groups[preset.category] = []
    }
    groups[preset.category].push(preset)
  }
  return groups
}

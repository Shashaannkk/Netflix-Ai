/**
 * Central Cinematic Avatar Registry & Deterministic Identity System
 * Exactly 15 entries: 5 Male, 5 Female, 5 Child / Young Fictional Characters.
 */

export const CINEMATIC_AVATARS = [
  // MALE (5)
  { id: 'male-01', category: 'male', character: 'Spider-Man', src: '/avatars/male-01.webp' },
  { id: 'male-02', category: 'male', character: 'Iron Man', src: '/avatars/male-02.webp' },
  { id: 'male-03', category: 'male', character: 'John Wick', src: '/avatars/male-03.webp' },
  { id: 'male-04', category: 'male', character: 'Jack Sparrow', src: '/avatars/male-04.webp' },
  { id: 'male-05', category: 'male', character: 'Harry Potter', src: '/avatars/male-05.webp' },

  // FEMALE (5)
  { id: 'female-01', category: 'female', character: 'Wonder Woman', src: '/avatars/female-01.webp' },
  { id: 'female-02', category: 'female', character: 'Black Widow', src: '/avatars/female-02.webp' },
  { id: 'female-03', category: 'female', character: 'Lara Croft', src: '/avatars/female-03.webp' },
  { id: 'female-04', category: 'female', character: 'Hermione Granger', src: '/avatars/female-04.webp' },
  { id: 'female-05', category: 'female', character: 'Wednesday Addams', src: '/avatars/female-05.webp' },

  // CHILD / YOUNG (5)
  { id: 'child-01', category: 'child', character: 'Young Harry Potter', src: '/avatars/child-01.webp' },
  { id: 'child-02', category: 'child', character: 'Young Anakin Skywalker', src: '/avatars/child-02.webp' },
  { id: 'child-03', category: 'child', character: 'Eleven', src: '/avatars/child-03.webp' },
  { id: 'child-04', category: 'child', character: 'Kevin McCallister', src: '/avatars/child-04.webp' },
  { id: 'child-05', category: 'child', character: 'Young Wednesday Addams', src: '/avatars/child-05.webp' },
];

export const STABLE_COLORS = [
  '#e50914', // Netflix Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#f97316', // Orange
  '#ef4444', // Red-Orange
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#a855f7', // Deep Purple
  '#34d399', // Light Emerald
  '#fbbf24', // Yellow
  '#f43f5e', // Rose
];

export const getDeterministicHash = (str = '') => {
  let hash = 0;
  const s = String(str || 'guest');
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getStableAvatarObj = (userId, name = '', customAvatar = null) => {
  if (customAvatar && typeof customAvatar === 'object' && customAvatar.src) {
    return customAvatar;
  }
  const key = String(userId || name || 'guest');
  const index = getDeterministicHash(key) % CINEMATIC_AVATARS.length;
  return CINEMATIC_AVATARS[index];
};

export const getStableAvatar = (userId, name = '', customAvatar = null) => {
  if (typeof customAvatar === 'string' && customAvatar) return customAvatar;
  return getStableAvatarObj(userId, name, customAvatar).src;
};

export const getStableColor = (userId, name = '') => {
  const key = String(userId || name || 'guest');
  const index = getDeterministicHash(key) % STABLE_COLORS.length;
  return STABLE_COLORS[index];
};

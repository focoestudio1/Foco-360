// ============================================================
// Biblioteca de música de fondo para tours.
// ============================================================
// Las pistas viven en /public/music/ (no en R2) porque son las
// mismas 12 pistas compartidas por todos los proyectos. Total
// ~45MB que cabe holgadamente en el deploy de Vercel.
//
// Todas las pistas son de Pixabay Music — uso comercial libre,
// sin atribución obligatoria. Para reemplazar una pista, baja
// otra de pixabay.com/music con el mismo nombre de archivo.
// ============================================================

export type MusicMood = 'real-estate' | 'luxury' | 'architecture';

export const MOOD_LABEL: Record<MusicMood, string> = {
  'real-estate':  '🏠 Real Estate',
  'luxury':       '✨ Luxury / Premium',
  'architecture': '🏗 Arquitectura',
};

export type MusicTrack = {
  id: string;
  title: string;
  mood: MusicMood;
  // Nombre del archivo en /public/music/
  file: string;
};

// 12 pistas curadas. El orden importa: el dropdown del admin
// las agrupa por mood y dentro de cada mood respeta este orden.
//
// IDs derivados del autor + ID Pixabay → estables aunque cambies
// el título.
export const MUSIC_LIBRARY: MusicTrack[] = [
  // 🏠 Real Estate (warm, gentle, residencial)
  {
    id: 'delosound-432212',
    title: 'Modern Real Estate',
    mood: 'real-estate',
    file: 'delosound-real-estate-construction-architecture-432212.mp3',
  },
  {
    id: 'leberch-262604',
    title: 'Soft Estate',
    mood: 'real-estate',
    file: 'leberch-real-estate-262604.mp3',
  },
  {
    id: 'starostin-261850',
    title: 'Hotel & Property',
    mood: 'real-estate',
    file: 'starostin-real-estate-property-hotel-background-music-261850.mp3',
  },
  {
    id: 'hitslab-277939',
    title: 'Real Estate Tour',
    mood: 'real-estate',
    file: 'hitslab-real-estate-real-estate-music-background-277939.mp3',
  },

  // ✨ Luxury / Premium (más cinematográfico)
  {
    id: 'poradovskyi-497318',
    title: 'Luxury Estate 1',
    mood: 'luxury',
    file: 'poradovskyi-luxury-real-estate-music-497318.mp3',
  },
  {
    id: 'poradovskyi-530233',
    title: 'Luxury Estate 2',
    mood: 'luxury',
    file: 'poradovskyi-real-estate-luxury-music-530233.mp3',
  },
  {
    id: 'topflow-500467',
    title: 'Premium Luxury',
    mood: 'luxury',
    file: 'top-flow-real-estate-background-luxury-music-500467.mp3',
  },
  {
    id: 'freemusicforvideo-462852',
    title: 'Fashion House',
    mood: 'luxury',
    file: 'freemusicforvideo-real-estate-fashion-luxury-house-462852.mp3',
  },

  // 🏗 Arquitectura / Construcción (inspirador, moderno)
  {
    id: 'freemusicforvideo-456652',
    title: 'Architecture 1',
    mood: 'architecture',
    file: 'freemusicforvideo-real-estate-construction-architecture-456652.mp3',
  },
  {
    id: 'freemusicforvideo-456655',
    title: 'Architecture 2',
    mood: 'architecture',
    file: 'freemusicforvideo-real-estate-construction-architecture-456655.mp3',
  },
  {
    id: 'freemusicforvideo-462848',
    title: 'Architecture 3',
    mood: 'architecture',
    file: 'freemusicforvideo-real-estate-construction-architecture-462848.mp3',
  },
  {
    id: 'viacheslavstarostin-357216',
    title: 'Construction Inspiring',
    mood: 'architecture',
    file: 'viacheslavstarostin-real-estate-construction-architecture-music-357216.mp3',
  },
];

export function getTrackById(id: string | null | undefined): MusicTrack | null {
  if (!id) return null;
  return MUSIC_LIBRARY.find((t) => t.id === id) ?? null;
}

export function getTrackUrl(track: MusicTrack): string {
  return `/music/${track.file}`;
}

// Agrupa pistas por mood, preservando el orden de MUSIC_LIBRARY.
export function getLibraryByMood(): Record<MusicMood, MusicTrack[]> {
  const grouped: Record<MusicMood, MusicTrack[]> = {
    'real-estate':  [],
    'luxury':       [],
    'architecture': [],
  };
  for (const t of MUSIC_LIBRARY) grouped[t.mood].push(t);
  return grouped;
}

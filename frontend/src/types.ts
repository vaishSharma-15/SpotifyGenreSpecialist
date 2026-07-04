export interface Track {
  id: string
  title: string
  artist: string
  album_art_url: string
  genre_tags: string[]
  popularity_score: number
  sound_descriptors: Record<string, number>
}

export interface Persona {
  id: string
  name: string
  top_genre: string
  top_artists: string[]
}

export interface Genre {
  id: string
  name: string
}

export interface Mood {
  id: string
  name: string
}

export type ActionType = 'SAVE' | 'SKIP' | 'REPLAY'

export interface FeedbackEntry {
  track_id: string
  action: ActionType
}

import { create } from 'zustand'
import { api } from './api'
import type { ActionType, FeedbackEntry, Track } from './types'

interface AppState {
  personaId: string
  genre: string
  mood: string
  dial: number
  view: 'home' | 'discovery' | 'library'
  // Mentor device preview: forces Desktop or Mobile layout, live, same page.
  deviceOverride: 'desktop' | 'mobile'

  // playback
  queue: Track[]
  nowPlaying: Track | null
  isPlaying: boolean
  currentWhy: string
  whyLoading: boolean
  showMobilePlayer: boolean
  progress: number
  duration: number
  seekTo: number | null // set to request a seek; consumed by PlayerBar's <audio>

  served: string[]
  feedback: FeedbackEntry[]
  lastSignal: { type: ActionType; track: string; artist: string } | null // for the why-line
  likedTracks: Track[] // the user's "Liked Songs"
  savedMixes: { genre: string; mood: string }[]

  setPersona: (id: string) => void
  setGenre: (g: string) => void
  setMood: (m: string) => void
  setDial: (d: number) => void
  setView: (v: 'home' | 'discovery' | 'library') => void
  setDeviceOverride: (d: 'desktop' | 'mobile') => void

  setQueue: (tracks: Track[]) => void
  playTrack: (t: Track) => void
  togglePlay: () => void
  setIsPlaying: (b: boolean) => void
  next: () => void
  prev: () => void
  setShowMobilePlayer: (b: boolean) => void
  setProgress: (p: number) => void
  setDuration: (d: number) => void
  seek: (t: number) => void

  refreshPreview: (trackId: string) => Promise<string>

  addServed: (ids: string[]) => void
  resetServed: () => void
  addFeedback: (track: Track, action: ActionType) => void
  toggleLike: (t: Track) => void
  saveMix: () => void
  applyMix: (genre: string, mood: string) => void
}

export const useStore = create<AppState>((set, get) => ({
  personaId: '',
  genre: '',
  mood: '',
  dial: 0.5,
  view: 'home',
  deviceOverride: 'desktop',

  queue: [],
  nowPlaying: null,
  isPlaying: false,
  currentWhy: '',
  whyLoading: false,
  showMobilePlayer: false,
  progress: 0,
  duration: 0,
  seekTo: null,

  served: [],
  feedback: [],
  lastSignal: null,
  likedTracks: [],
  savedMixes: [],

  setPersona: (id) => set({ personaId: id, served: [] }),
  setGenre: (g) => set({ genre: g, served: [] }),
  setMood: (m) => set({ mood: m, served: [] }),
  setDial: (d) => set({ dial: d }),
  setView: (v) => set({ view: v }),
  setDeviceOverride: (d) => set({ deviceOverride: d }),

  setQueue: (tracks) => set({ queue: tracks }),

  playTrack: (t) => {
    set({ nowPlaying: t, isPlaying: true, currentWhy: '', whyLoading: true })
    const { personaId, genre, mood, lastSignal, likedTracks } = get()
    const topArtist = likedTracks.find((x) =>
      x.id !== t.id && x.genre_tags.some((g) => t.genre_tags.includes(g)),
    )?.artist ?? ''
    api
      .whyLine(
        t.id, personaId, genre, mood, topArtist,
        lastSignal?.type ?? '', lastSignal?.track ?? '', lastSignal?.artist ?? '',
      )
      .then((w) => {
        if (get().nowPlaying?.id === t.id) set({ currentWhy: w, whyLoading: false })
      })
      .catch(() => {
        if (get().nowPlaying?.id === t.id)
          set({ currentWhy: 'A deep cut picked for your taste.', whyLoading: false })
      })
  },

  togglePlay: () => {
    if (!get().nowPlaying) return
    set((s) => ({ isPlaying: !s.isPlaying }))
  },
  setIsPlaying: (b) => set({ isPlaying: b }),

  next: () => {
    const { queue, nowPlaying } = get()
    if (!nowPlaying || queue.length === 0) return
    const i = queue.findIndex((t) => t.id === nowPlaying.id)
    // Not found (e.g. the genre/mood filter changed queue since this track
    // started) — don't let index -1 + 1 = 0 silently jump to queue[0].
    if (i === -1) return
    const nxt = queue[i + 1]
    if (nxt) get().playTrack(nxt)
  },
  prev: () => {
    const { queue, nowPlaying } = get()
    if (!nowPlaying || queue.length === 0) return
    const i = queue.findIndex((t) => t.id === nowPlaying.id)
    if (i === -1) return
    const p = queue[i - 1]
    if (p) get().playTrack(p)
  },
  setShowMobilePlayer: (b) => set({ showMobilePlayer: b }),
  setProgress: (p) => set({ progress: p }),
  setDuration: (d) => set({ duration: d }),
  seek: (t) => set({ seekTo: t }),

  // Deezer's preview links are short-lived signed URLs; a track sitting in the
  // queue/now-playing/liked state can go stale no matter how long the app has
  // been open. Called on playback error, then patched everywhere it's held.
  refreshPreview: async (trackId) => {
    const fresh = await api.refreshPreview(trackId)
    const patch = (t: Track) => (t.id === trackId ? { ...t, preview_url: fresh.preview_url } : t)
    set((s) => ({
      queue: s.queue.map(patch),
      likedTracks: s.likedTracks.map(patch),
      nowPlaying: s.nowPlaying && s.nowPlaying.id === trackId
        ? { ...s.nowPlaying, preview_url: fresh.preview_url }
        : s.nowPlaying,
    }))
    return fresh.preview_url
  },

  addServed: (ids) => set((s) => ({ served: [...new Set([...s.served, ...ids])] })),
  resetServed: () => set({ served: [] }),
  addFeedback: (track, action) =>
    set((s) => ({
      feedback: [{ track_id: track.id, action }, ...s.feedback].slice(0, 30),
      lastSignal: { type: action, track: track.title, artist: track.artist },
    })),

  toggleLike: (t) =>
    set((s) => {
      const liked = s.likedTracks.some((x) => x.id === t.id)
      const likedTracks = liked
        ? s.likedTracks.filter((x) => x.id !== t.id)
        : [t, ...s.likedTracks]
      return { likedTracks }
    }),

  saveMix: () =>
    set((s) => {
      const mix = { genre: s.genre, mood: s.mood }
      if (s.savedMixes.some((m) => m.genre === mix.genre && m.mood === mix.mood)) return s
      return { savedMixes: [mix, ...s.savedMixes].slice(0, 12) }
    }),

  applyMix: (genre, mood) => set({ genre, mood, served: [], view: 'discovery' }),
}))

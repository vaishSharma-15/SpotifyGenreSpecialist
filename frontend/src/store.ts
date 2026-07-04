import { create } from 'zustand'
import { api } from './api'
import type { ActionType, FeedbackEntry, Track } from './types'

interface AppState {
  personaId: string
  genre: string
  mood: string
  dial: number
  view: 'home' | 'discovery'

  // playback
  queue: Track[]
  nowPlaying: Track | null
  isPlaying: boolean
  currentWhy: string
  whyLoading: boolean
  showMobilePlayer: boolean

  served: string[]
  feedback: FeedbackEntry[]

  setPersona: (id: string) => void
  setGenre: (g: string) => void
  setMood: (m: string) => void
  setDial: (d: number) => void
  setView: (v: 'home' | 'discovery') => void

  setQueue: (tracks: Track[]) => void
  playTrack: (t: Track) => void
  togglePlay: () => void
  setIsPlaying: (b: boolean) => void
  next: () => void
  prev: () => void
  setShowMobilePlayer: (b: boolean) => void

  addServed: (ids: string[]) => void
  resetServed: () => void
  addFeedback: (trackId: string, action: ActionType) => void
}

export const useStore = create<AppState>((set, get) => ({
  personaId: '',
  genre: '',
  mood: '',
  dial: 0.5,
  view: 'home',

  queue: [],
  nowPlaying: null,
  isPlaying: false,
  currentWhy: '',
  whyLoading: false,
  showMobilePlayer: false,

  served: [],
  feedback: [],

  setPersona: (id) => set({ personaId: id, served: [], feedback: [] }),
  setGenre: (g) => set({ genre: g, served: [] }),
  setMood: (m) => set({ mood: m, served: [] }),
  setDial: (d) => set({ dial: d }),
  setView: (v) => set({ view: v }),

  setQueue: (tracks) => set({ queue: tracks }),

  playTrack: (t) => {
    set({ nowPlaying: t, isPlaying: true, currentWhy: '', whyLoading: true })
    const personaId = get().personaId
    api
      .whyLine(t.id, personaId)
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
    const nxt = queue[i + 1]
    if (nxt) get().playTrack(nxt)
  },
  prev: () => {
    const { queue, nowPlaying } = get()
    if (!nowPlaying || queue.length === 0) return
    const i = queue.findIndex((t) => t.id === nowPlaying.id)
    const p = queue[i - 1]
    if (p) get().playTrack(p)
  },
  setShowMobilePlayer: (b) => set({ showMobilePlayer: b }),

  addServed: (ids) => set((s) => ({ served: [...new Set([...s.served, ...ids])] })),
  resetServed: () => set({ served: [] }),
  addFeedback: (trackId, action) =>
    set((s) => ({ feedback: [{ track_id: trackId, action }, ...s.feedback].slice(0, 30) })),
}))

import { create } from 'zustand'
import type { ActionType, FeedbackEntry, Track } from './types'

interface AppState {
  personaId: string
  genre: string
  dial: number
  view: 'home' | 'discovery'
  nowPlaying: Track | null
  served: string[] // track IDs already shown (endless discovery)
  feedback: FeedbackEntry[]

  setPersona: (id: string) => void
  setGenre: (g: string) => void
  setDial: (d: number) => void
  setView: (v: 'home' | 'discovery') => void
  setNowPlaying: (t: Track | null) => void
  addServed: (ids: string[]) => void
  resetServed: () => void
  addFeedback: (trackId: string, action: ActionType) => void
}

export const useStore = create<AppState>((set) => ({
  personaId: '',
  genre: '',
  dial: 0.5,
  view: 'home',
  nowPlaying: null,
  served: [],
  feedback: [],

  setPersona: (id) => set({ personaId: id, served: [], feedback: [] }),
  setGenre: (g) => set({ genre: g, served: [] }),
  setDial: (d) => set({ dial: d }),
  setView: (v) => set({ view: v }),
  setNowPlaying: (t) => set({ nowPlaying: t }),
  addServed: (ids) => set((s) => ({ served: [...new Set([...s.served, ...ids])] })),
  resetServed: () => set({ served: [] }),
  addFeedback: (trackId, action) =>
    set((s) => ({ feedback: [{ track_id: trackId, action }, ...s.feedback].slice(0, 20) })),
}))

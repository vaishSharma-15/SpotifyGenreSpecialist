import type { ActionType, Genre, Mood, Persona, Track } from './types'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  genres: () => get<{ genres: Genre[] }>('/genres').then((r) => r.genres),

  moods: () => get<{ moods: Mood[] }>('/moods').then((r) => r.moods),

  personas: () => get<{ personas: Persona[] }>('/personas').then((r) => r.personas),

  recommend: (
    personaId: string,
    genre: string,
    dial: number,
    limit = 8,
    exclude: string[] = [],
    mood = '',
  ) =>
    get<{ tracks: Track[]; exhausted: boolean }>(
      `/recommend?persona_id=${encodeURIComponent(personaId)}` +
        `&locked_genre=${encodeURIComponent(genre)}` +
        `&dial_position=${dial}&limit=${limit}` +
        `&exclude=${encodeURIComponent(exclude.join(','))}` +
        (mood ? `&mood=${encodeURIComponent(mood)}` : ''),
    ),

  whyLine: (trackId: string, personaId: string) =>
    post<{ why_line: string }>(
      `/why-line?track_id=${encodeURIComponent(trackId)}&persona_id=${encodeURIComponent(personaId)}`,
    ).then((r) => r.why_line),

  feedback: (personaId: string, trackId: string, action: ActionType) =>
    post<{ status: string }>('/feedback', {
      persona_id: personaId,
      track_id: trackId,
      action,
    }),

  baseline: (personaId: string, genre: string) =>
    get<{ track: Track; note: string }>(
      `/baseline?persona_id=${encodeURIComponent(personaId)}&locked_genre=${encodeURIComponent(genre)}`,
    ),
}

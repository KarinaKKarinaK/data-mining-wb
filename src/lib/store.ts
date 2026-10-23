import { useEffect, useState } from 'react'

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem('dm:' + key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem('dm:' + key, JSON.stringify(value))
  } catch {
    return
  }
}

export function useStored<T>(key: string, fallback: T) {
  const [v, setV] = useState<T>(() => load(key, fallback))
  useEffect(() => save(key, v), [key, v])
  return [v, setV] as const
}

import { useCallback, useEffect, useRef } from 'react'

export function useDebouncedHover(onHoverStart, delay = 100) {
  const timerRef = useRef(null)

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const schedule = useCallback((payload) => {
    cancel()
    timerRef.current = setTimeout(() => {
      onHoverStart(payload)
      timerRef.current = null
    }, delay)
  }, [cancel, delay, onHoverStart])

  useEffect(() => cancel, [cancel])

  return { schedule, cancel }
}

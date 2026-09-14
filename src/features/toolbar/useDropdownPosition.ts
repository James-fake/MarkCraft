import { useState, useEffect } from 'react'

const DROPDOWN_GAP = 4
const DROPDOWN_EST_WIDTH = 180
const DROPDOWN_EST_HEIGHT = 300

export default function useDropdownPosition(open: boolean, btnRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let top = rect.bottom + DROPDOWN_GAP
    let left = rect.left

    // If menu would overflow bottom, show above the button
    if (top + DROPDOWN_EST_HEIGHT > vh) {
      top = Math.max(DROPDOWN_GAP, rect.top - DROPDOWN_EST_HEIGHT - DROPDOWN_GAP)
    }
    // If menu would overflow right, align to right edge of button
    if (left + DROPDOWN_EST_WIDTH > vw) {
      left = Math.max(DROPDOWN_GAP, rect.right - DROPDOWN_EST_WIDTH)
    }

    setPos({ top, left })
  }, [open, btnRef])

  return pos
}

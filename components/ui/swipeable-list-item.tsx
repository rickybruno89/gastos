'use client'
import React, { useState, useRef } from 'react'

type SwipeableListItemProps = {
  card: React.ReactNode
  buttons: React.ReactElement
}

const SwipeableListItem: React.FC<SwipeableListItemProps> = ({ card, buttons }) => {
  const buttonChildren = Array.isArray(buttons.props.children) ? buttons.props.children.length : 1

  const translateXCLASS: { [key: number]: string } = {
    1: '-translate-x-20',
    2: '-translate-x-40',
    3: '-translate-x-60',
  }

  const translateX = translateXCLASS[buttonChildren]

  const [isSwiped, setIsSwiped] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const listItemRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    startX.current = touch.clientX
    currentX.current = touch.clientX
    if (listItemRef.current) {
      listItemRef.current.style.transition = 'none'
    }
    if (containerRef.current) {
      containerRef.current.style.overflowY = 'hidden' // Disable vertical scroll
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    currentX.current = touch.clientX
  }

  const handleTouchEnd = () => {
    if (listItemRef.current) {
      const threshold = -75 // Threshold to trigger swipe action
      const deltaX = currentX.current - startX.current

      if (deltaX < threshold) {
        setIsSwiped(true)
        // listItemRef.current.style.transform = 'translateX(-250px)'
      } else {
        setIsSwiped(false)
        // listItemRef.current.style.transform = 'translateX(0px)'
      }

      listItemRef.current.style.transition = 'transform 0.3s ease-in-out'
    }

    if (containerRef.current) {
      containerRef.current.style.overflowY = 'auto' // Re-enable vertical scroll
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-hidden overflow-y-auto touch-pan-y" // Ensure vertical scroll is enabled when not swiping
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`absolute inset-y-0 right-0 flex transition-transform duration-300 ease-in-out ${
          isSwiped ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {buttons}
      </div>

      <div
        ref={listItemRef}
        className={`transform transition-transform duration-300 ease-in-out ${isSwiped ? translateX : 'translate-x-0'}`}
      >
        {card}
      </div>
    </div>
  )
}

export default SwipeableListItem

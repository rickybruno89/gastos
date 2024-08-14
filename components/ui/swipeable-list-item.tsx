'use client'
import React, { useState, useRef } from 'react'

type SwipeableListItemProps = {
  children: React.ReactNode
  onDelete: () => void
  onEdit: () => void
}

const SwipeableListItem: React.FC<SwipeableListItemProps> = ({ children, onDelete, onEdit }) => {
  const [isSwiped, setIsSwiped] = useState(false)
  const startX = useRef(0)
  const currentX = useRef(0)
  const listItemRef = useRef<HTMLDivElement | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    startX.current = touch.clientX
    currentX.current = touch.clientX
    if (listItemRef.current) {
      listItemRef.current.style.transition = 'none'
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const deltaX = touch.clientX - startX.current

    currentX.current = touch.clientX

    if (listItemRef.current) {
      const translateX = Math.min(0, deltaX) // Only allow swiping to the left
      listItemRef.current.style.transform = `translateX(${translateX}px)`
    }
  }

  const handleTouchEnd = () => {
    if (listItemRef.current) {
      const threshold = -75 // Threshold to trigger swipe action
      const deltaX = currentX.current - startX.current

      if (deltaX < threshold) {
        setIsSwiped(true)
        listItemRef.current.style.transform = 'translateX(-150px)'
      } else {
        setIsSwiped(false)
        listItemRef.current.style.transform = 'translateX(0px)'
      }

      listItemRef.current.style.transition = 'transform 0.3s ease-in-out'
    }
  }

  return (
    <div
      className="relative w-full overflow-hidden touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Action buttons */}
      <div
        className={`absolute inset-y-0 right-0 flex space-x-2 transition-transform duration-300 ease-in-out ${
          isSwiped ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <button className="bg-red-500 text-white px-4 py-2" onClick={onDelete}>
          Delete
        </button>
        <button className="bg-blue-500 text-white px-4 py-2" onClick={onEdit}>
          Edit
        </button>
      </div>

      {/* List item content */}
      <div
        ref={listItemRef}
        className={`transform transition-transform duration-300 ease-in-out ${
          isSwiped ? '-translate-x-36' : 'translate-x-0'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

export default SwipeableListItem

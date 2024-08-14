'use client'
import React, { useState, useRef, useEffect } from 'react'

type SwipeableListItemProps = {
  card: React.ReactNode
  buttons: React.ReactElement
}

const SwipeableListItem: React.FC<SwipeableListItemProps> = ({ card, buttons }) => {
  const buttonChildren = Array.isArray(buttons.props.children) ? buttons.props.children.length : 1

  const translateXCLASS: { [key: number]: string } = {
    1: 'translateX(-80px)',
    2: 'translateX(-160px)',
    3: 'translateX(-240px)',
  }

  const translateXPX = translateXCLASS[buttonChildren]

  const startX = useRef(0)
  const currentX = useRef(0)
  const listItemRef = useRef<HTMLDivElement | null>(null)
  const buttonItemsRef = useRef<HTMLDivElement | null>(null)
  const [isSwiped, setIsSwiped] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    buttonItemsRef.current!.style.transition = 'none'
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

    if (listItemRef.current && buttonItemsRef.current) {
      const translateX = Math.min(0, deltaX) // Only allow swiping to the left
      listItemRef.current.style.transform = `translateX(${translateX}px)`
      const buttonsX = parseInt(translateXPX.split('-')[1].replace('px)', ''))
      buttonItemsRef.current.style.transform = `translateX(${deltaX + buttonsX}px)`
    }
  }

  const handleTouchEnd = () => {
    if (listItemRef.current && buttonItemsRef.current) {
      const threshold = -100 // Threshold to trigger swipe action
      const deltaX = currentX.current - startX.current

      listItemRef.current.style.transition = 'transform 0.3s ease-in-out'
      buttonItemsRef.current.style.transition = 'none'
      if (deltaX < threshold) {
        setIsSwiped(true)
        listItemRef.current.style.transform = translateXPX
        buttonItemsRef.current.style.transform = 'translateX(0px)'
        buttonItemsRef.current.style.transition = 'transform 0.3s ease-in-out'
      } else {
        listItemRef.current.style.transform = 'translateX(0px)'
        buttonItemsRef.current.style.transform = 'translateX(100%)'
        buttonItemsRef.current.style.transition = 'transform 0.3s ease-in-out'
        if (isSwiped) {
          setIsSwiped(false)
        }
      }
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
      <div ref={buttonItemsRef} className={`absolute inset-y-0 right-0 flex translate-x-full`}>
        {buttons}
      </div>

      {/* List item content */}
      <div
        ref={listItemRef}
        className={`transform transition-transform duration-300 ease-in-out ${isSwiped ? 'mr-2' : ''}`}
      >
        {card}
      </div>
    </div>
  )
}

export default SwipeableListItem

'use client'
import dynamic from 'next/dynamic'
import React from 'react'

const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <div className="w-full h-full" />,
})

interface LottiePlayerProps {
  options: {
    loop: boolean
    autoplay: boolean
    animationData: any
  }
  isStopped?: boolean
  isPaused?: boolean
  speed?: number
  isClickToPauseDisabled?: boolean
}

export default function LottiePlayer({ options, speed = 1 }: LottiePlayerProps) {
  // lottie-react usa una API diferente, más simple
  const lottieRef = React.useRef<any>(null)

  React.useEffect(() => {
    if (lottieRef.current && speed) {
      lottieRef.current.setSpeed(speed)
    }
  }, [speed])

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={options.animationData}
      loop={options.loop}
      autoplay={options.autoplay}
      style={{ width: '100%', height: '100%' }}
    />
  )
}


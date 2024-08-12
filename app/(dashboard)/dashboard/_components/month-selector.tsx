'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getToday, getTodayYear } from '@/lib/utils'
import Slider, { Settings } from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Edit } from 'lucide-react'

const MONTH_LIST = [
  {
    name: 'Ene',
    number: '01',
    longName: 'Enero',
  },
  {
    name: 'Feb',
    number: '02',
    longName: 'Febrero',
  },
  {
    name: 'Mar',
    number: '03',
    longName: 'Marzo',
  },
  {
    name: 'Abr',
    number: '04',
    longName: 'Abril',
  },
  {
    name: 'May',
    number: '05',
    longName: 'Mayo',
  },
  {
    name: 'Jun',
    number: '06',
    longName: 'Junio',
  },
  {
    name: 'Jul',
    number: '07',
    longName: 'Julio',
  },
  {
    name: 'Ago',
    number: '08',
    longName: 'Agosto',
  },
  {
    name: 'Sep',
    number: '09',
    longName: 'Septiembre',
  },
  {
    name: 'Oct',
    number: '10',
    longName: 'Octubre',
  },
  {
    name: 'Nov',
    number: '11',
    longName: 'Noviembre',
  },
  {
    name: 'Dic',
    number: '12',
    longName: 'Diciembre',
  },
]

const buildYearArray = () => {
  const yearsArray = []
  let index = 0
  for (let year = 2020; year <= parseInt(getTodayYear()) + 1; year++) {
    yearsArray.push({ index, year })
    index++
  }
  return yearsArray
}

type DatePicker = {
  month: string
  year: string
}

export default function MonthSelector({ date }: { date: string }) {
  const [pickedMonth, setPickedMonth] = useState<string | null>(date.split('-')[1])
  const [pickedYear, setPickedYear] = useState<string>(date.split('-')[0])

  const yearsArray = buildYearArray()
  const initialSlide = yearsArray.find((year) => year.year === parseInt(date.split('-')[0]))?.index

  const router = useRouter()
  const pathname = usePathname()
  const [sliderRef, setSliderRef] = useState<Slider | null>(null)

  const [endOfCarousel, setEndOfCarousel] = useState(initialSlide === yearsArray.length - 1)
  const [startOfCarousel, setStartOfCarousel] = useState(initialSlide === 0)

  const [flipped, setFlipped] = useState(false)

  const handleFlip = () => {
    setFlipped((prev) => !prev)
  }

  useEffect(() => {
    router.push(`${pathname}?date=${pickedYear}-${pickedMonth}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChangeDate = (newDatePicker: DatePicker) => {
    router.push(`${pathname}?date=${newDatePicker.year}-${newDatePicker.month}`)
  }

  const handleMonthPick = (monthNumber: string) => {
    const newDatePicker = { month: monthNumber, year: pickedYear }
    setPickedMonth(monthNumber)
    handleChangeDate(newDatePicker)
    handleFlip()
  }

  const getMonthSelectedClass = (monthNumber: string) => {
    return monthNumber === pickedMonth ? 'bg-orange-500 text-white' : ''
  }

  const slideChange = (index: number) => {
    setPickedYear(yearsArray.find((item) => item.index === index)!.year!.toString())
    setPickedMonth(null)
    if (index >= yearsArray.length - 1) setEndOfCarousel(true)
    else setEndOfCarousel(false)
    if (index === 0) {
      setStartOfCarousel(true)
    } else {
      setStartOfCarousel(false)
    }
  }

  const settings: Settings = {
    dots: false,
    infinite: false,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    initialSlide,
    afterChange: slideChange,
  }

  const next = () => {
    sliderRef!.slickNext()
  }

  const previous = () => {
    sliderRef!.slickPrev()
  }

  return (
    <div className="w-full perspective flex justify-center">
      <div
        className={`max-w-[420px] relative w-full duration-500 transform-style preserve-3d ${
          !flipped ? 'rotate-y-180 h-32' : 'h-36 md:h-40'
        }`}
      >
        {/* Front side */}
        <div className="absolute w-full h-full flex items-center justify-center rotate-y-180 backface-hidden">
          <div className="relative bg-orange-500 w-52 h-32 rounded-xl p-0.5 pt-8">
            <div className="absolute w-full flex justify-center top-0.5">
              <span className="text-white font-semibold text-lg">{pickedYear}</span>
            </div>
            <Edit className="absolute text-white w-5 cursor-pointer top-1 right-3" onClick={handleFlip} />
            <div className="bg-white w-full h-full rounded-xl text-4xl flex justify-center items-center">
              {MONTH_LIST.find((MONTH) => pickedMonth === MONTH.number)?.longName}
            </div>
          </div>
        </div>
        {/* Back side */}
        <div className="flex justify-center w-full absolute backface-hidden">
          <div className="bg-gray-100 rounded-md p-2 text-sm md:text-base w-full max-w-xl">
            <div className="relative w-[100px] mx-auto">
              {flipped ? (
                <Slider
                  ref={(slider) => {
                    setSliderRef(slider)
                  }}
                  {...settings}
                >
                  {yearsArray.map((item) => (
                    <div key={item.index} className="w-full text-center">
                      <h3 className="font-semibold">{item.year}</h3>
                    </div>
                  ))}
                </Slider>
              ) : null}
              {!startOfCarousel && flipped && (
                <button className="absolute top-[2px] left-0" onClick={previous}>
                  <ChevronLeftIcon className="w-4" />
                </button>
              )}

              {!endOfCarousel && flipped && (
                <button className="absolute top-[2px] right-0" onClick={next}>
                  <ChevronRightIcon className="w-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 mt-2 gap-3">
              {MONTH_LIST.map((month) => (
                <div
                  key={month.number}
                  className={`cursor-pointer rounded-md p-1 flex justify-center items-center transition-all ease-in-out duration-200 hover:scale-110 hover:bg-gray-600 hover:text-white ${getMonthSelectedClass(
                    month.number
                  )}`}
                  onClick={() => handleMonthPick(month.number)}
                >
                  <h1>{month.name}</h1>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

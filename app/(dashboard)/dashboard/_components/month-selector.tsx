'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getToday, getTodayYear } from '@/lib/utils'
import Slider, { Settings } from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

const MONTH_LIST = [
  {
    name: 'Ene',
    number: '01',
  },
  {
    name: 'Feb',
    number: '02',
  },
  {
    name: 'Mar',
    number: '03',
  },
  {
    name: 'Abr',
    number: '04',
  },
  {
    name: 'May',
    number: '05',
  },
  {
    name: 'Jun',
    number: '06',
  },
  {
    name: 'Jul',
    number: '07',
  },
  {
    name: 'Ago',
    number: '08',
  },
  {
    name: 'Sep',
    number: '09',
  },
  {
    name: 'Oct',
    number: '10',
  },
  {
    name: 'Nov',
    number: '11',
  },
  {
    name: 'Dic',
    number: '12',
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
  const pickedMonth = date.split('-')[1]
  const pickedYear = date.split('-')[0]

  const yearsArray = buildYearArray()
  const initialSlide = yearsArray.find((year) => year.year === parseInt(date.split('-')[0]))?.index

  const router = useRouter()
  const pathname = usePathname()
  const [sliderRef, setSliderRef] = useState<Slider | null>(null)

  const [endOfCarousel, setEndOfCarousel] = useState(initialSlide === yearsArray.length - 1)
  const [startOfCarousel, setStartOfCarousel] = useState(initialSlide === 0)

  useEffect(() => {
    router.push(`${pathname}?date=${pickedYear}-${pickedMonth}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChangeDate = (newDatePicker: DatePicker) => {
    router.push(`${pathname}?date=${newDatePicker.year}-${newDatePicker.month}`)
  }

  const handleMonthPick = (monthNumber: string) => {
    const newDatePicker = { month: monthNumber, year: pickedYear }
    handleChangeDate(newDatePicker)
  }

  const getMonthSelectedClass = (monthNumber: string) => {
    return monthNumber === pickedMonth ? 'bg-orange-500 text-white' : ''
  }

  const slideChange = (index: number) => {
    const newDatePicker = {
      month: pickedMonth,
      year: yearsArray.find((item) => item.index === index)!.year!.toString(),
    }
    handleChangeDate(newDatePicker)
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
    <div className="flex justify-center w-full">
      <div className="bg-gray-100 rounded-md p-2 text-sm md:text-base w-full max-w-xl">
        <div className="relative w-[100px] mx-auto">
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
          {!startOfCarousel && (
            <button className="absolute top-[2px] left-0" onClick={previous}>
              <ChevronLeftIcon className="w-4" />
            </button>
          )}

          {!endOfCarousel && (
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
  )
}

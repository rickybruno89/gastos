'use client'
import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getTodayYear } from '@/lib/utils'
import Slider, { Settings } from 'react-slick'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { Edit } from 'lucide-react'
import clsx from 'clsx'

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

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const toggleCalendar = () => {
    setIsCalendarOpen((prev) => !prev)
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
    toggleCalendar()
    setTimeout(() => {
      handleChangeDate(newDatePicker)
    }, 300)
  }

  const isMothSelected = (monthNumber: string) => monthNumber === pickedMonth

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

  const positions: { [key: number]: string } = {
    0: 'top-0 left-0',
    1: 'top-0 left-1/4',
    2: 'top-0 left-2/4',
    3: 'top-0 left-3/4',
    4: 'top-1/3 left-0',
    5: 'top-1/3 left-1/4',
    6: 'top-1/3 left-2/4',
    7: 'top-1/3 left-3/4',
    8: 'top-2/3 left-0',
    9: 'top-2/3 left-1/4',
    10: 'top-2/3 left-2/4',
    11: 'top-2/3 left-3/4',
  }

  return (
    <div className="w-full flex justify-center">
      <div
        className={clsx(
          'relative transition-all duration-300 ease-in-out w-80 h-36 bg-orange-500 rounded-xl pt-8 px-0.5 pb-0.5',
          !isCalendarOpen && '!w-44 !h-28'
        )}
      >
        <div className="absolute top-1 w-[100px] left-1/2 -translate-x-1/2 text-white text-center">
          {isCalendarOpen ? (
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
          ) : (
            <span className="text-white font-semibold text-base">{pickedYear}</span>
          )}
          {!startOfCarousel && isCalendarOpen && (
            <button className="absolute top-1 left-0" onClick={previous}>
              <ChevronLeftIcon className="w-4" />
            </button>
          )}

          {!endOfCarousel && isCalendarOpen && (
            <button className="absolute top-1 right-0" onClick={next}>
              <ChevronRightIcon className="w-4" />
            </button>
          )}
        </div>
        {!isCalendarOpen && (
          <Edit className="absolute text-white w-5 cursor-pointer top-1 right-3" onClick={toggleCalendar} />
        )}
        <div className="bg-white rounded-xl  w-full h-full p-2">
          <div className={clsx('relative flex flex-wrap w-full h-full justify-center items-center gap-2 ')}>
            {MONTH_LIST.map((month, index) => (
              <div
                key={month.number}
                className={clsx(
                  'absolute w-[24%] cursor-pointer rounded-md p-1 flex justify-center items-center transition-all duration-300',
                  positions[index],
                  isCalendarOpen && 'hover:bg-gray-700 hover:text-white text-sm',
                  !isCalendarOpen &&
                    isMothSelected(month.number) &&
                    '!top-1/2 !left-1/2 transition-all transform-gpu -translate-x-1/2 -translate-y-1/2 text-3xl',
                  !isCalendarOpen && !isMothSelected(month.number) && 'scale-0',
                  isCalendarOpen && isMothSelected(month.number) && 'bg-orange-500 text-white '
                )}
                onClick={() => handleMonthPick(month.number)}
              >
                <h1>{!isCalendarOpen && isMothSelected(month.number) ? month.longName : month.name}</h1>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

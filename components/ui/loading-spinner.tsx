export default function LoadingSpinner() {
  return (
    <div className="absolute w-full top-1/2 flex justify-center">
      <div className="border-gray-300 h-10 w-10 animate-spin rounded-full border-4 border-t-orange-500" />
    </div>
  )
}

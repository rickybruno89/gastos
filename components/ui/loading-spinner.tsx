export default function LoadingSpinner() {
  return (
    <div className="h-full w-full flex justify-center items-center">
      <div className="border-gray-300 h-10 w-10 animate-spin rounded-full border-4 border-t-blue-600" />
    </div>
  )
}

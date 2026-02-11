function Notification({ message, type = "info" }) {
  const bgColor = {
    success: "bg-green-100 border-green-500 text-green-800",
    error: "bg-red-100 border-red-500 text-red-800",
    info: "bg-blue-100 border-blue-500 text-blue-800",
    warning: "bg-yellow-100 border-yellow-500 text-yellow-800",
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className={`p-4 rounded-md border-l-4 shadow-md ${bgColor[type]}`}>{message}</div>
    </div>
  )
}

export default Notification

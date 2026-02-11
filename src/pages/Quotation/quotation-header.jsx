"use client"

const QuotationHeader = ({ image, isRevising, toggleRevising }) => {
  return (
    <div className="flex justify-between items-center mb-8 pt-4">
      <div className="flex items-center gap-6">
        <img src={image || "/placeholder.svg?height=120&width=120"} alt="Logo" className="h-32 w-auto object-contain" />
        <h1 className="text-5xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
          Botivate Services LLP
        </h1>
      </div>
      <div>
        <button
          className={`px-4 py-2 rounded-md ${isRevising ? "bg-red-500 hover:bg-red-600" : "bg-sky-500 hover:bg-sky-600"} text-white shadow-md`}
          onClick={toggleRevising}
        >
          {isRevising ? "Cancel Revise" : "Revise"}
        </button>
      </div>
    </div>
  )
}

export default QuotationHeader

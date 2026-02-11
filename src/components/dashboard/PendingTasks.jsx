import { Link } from "react-router-dom"
import { ArrowRightIcon, ClockIcon } from "../Icons"

function PendingTasks() {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Pending Tasks</h3>

      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-2">
                Follow-up
              </span>
              <h4 className="font-medium">ABC Corp</h4>
              <p className="text-sm text-slate-500">Enquiry No: En-01</p>
            </div>
            <div className="flex items-center text-blue-600 text-sm">
              <ClockIcon className="h-4 w-4 mr-1" />
              Today
            </div>
          </div>
          <div className="mt-3">
            <Link to="/follow-up/new?leadId=1">
              <button className="w-full px-4 py-2 text-sm font-medium rounded-md border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Call Now <ArrowRightIcon className="ml-2 h-3 w-3 inline" />
              </button>
            </Link>
          </div>
        </div>

        <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 mb-2">
                Quotation
              </span>
              <h4 className="font-medium">XYZ Industries</h4>
              <p className="text-sm text-slate-500">Enquiry No: En-05</p>
            </div>
            <div className="flex items-center text-sky-600 text-sm">
              <ClockIcon className="h-4 w-4 mr-1" />
              Tomorrow
            </div>
          </div>
          <div className="mt-3">
            <Link to="/quotations/new?enquiryNo=En-05">
              <button className="w-full px-4 py-2 text-sm font-medium rounded-md border border-sky-300 text-sky-700 bg-white hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">
                Create Quotation <ArrowRightIcon className="ml-2 h-3 w-3 inline" />
              </button>
            </Link>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 mb-2">
                Order Status
              </span>
              <h4 className="font-medium">PQR Ltd</h4>
              <p className="text-sm text-slate-500">Quotation No: Q-003</p>
            </div>
            <div className="flex items-center text-emerald-600 text-sm">
              <ClockIcon className="h-4 w-4 mr-1" />
              In 2 days
            </div>
          </div>
          <div className="mt-3">
            <Link to="/call-tracker/new?enquiryNo=En-03">
              <button className="w-full px-4 py-2 text-sm font-medium rounded-md border border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                Update Status <ArrowRightIcon className="ml-2 h-3 w-3 inline" />
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center">
        <Link to="/tasks">
          <button className="text-slate-500 hover:text-slate-700 text-sm font-medium">View all pending tasks</button>
        </Link>
      </div>
    </div>
  )
}

export default PendingTasks

function Footer() {
  return (
    <footer className="w-full bg-white border-t border-slate-100">
      <div className="flex justify-center items-center py-2.5 gap-1.5 text-[10px] text-slate-400">
        <span>Powered by</span>
        <a
          href="https://botivate.in/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-sky-500 hover:text-sky-600 transition-colors"
        >
          Botivate
        </a>
        <span className="text-slate-200">•</span>
        <span>© {new Date().getFullYear()} All rights reserved</span>
      </div>
    </footer>
  )
}

export default Footer

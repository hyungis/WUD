import { useState } from 'react';

interface TestInfoProps {
  title: string;
  fullName: string;
  purpose: string;
  method: string;
}

export default function TestInfoAccordion({ title, fullName, purpose, method }: TestInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 rounded-xl border border-white/20 bg-white/5 text-white backdrop-blur-md overflow-hidden text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 focus:outline-none hover:bg-white/10 transition-colors"
      >
        <span className="font-semibold text-sm sm:text-base tracking-wide text-zinc-200">
          {title}
        </span>
        <span 
          className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
        >
          <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-4 pt-0 text-[13px] leading-relaxed text-zinc-300">
          <p className="mb-4 font-bold text-indigo-300/90 text-sm">
            {fullName}
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="shrink-0 rounded bg-indigo-500/10 border border-indigo-400/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 tracking-widest mt-0.5">이유</span>
              <p className="flex-1">{purpose}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="shrink-0 rounded bg-indigo-500/10 border border-indigo-400/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 tracking-widest mt-0.5">방법</span>
              <p className="flex-1">{method}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

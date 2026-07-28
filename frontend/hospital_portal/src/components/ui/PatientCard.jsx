import React from 'react'
import { Badge } from './Badge'

export function PatientCard({ token, name, age, gender, time, status, issue, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer border-0 bg-transparent block ${active ? 'bg-[#EDF7FF] border-l-4 border-[#50ABE7]' : ''}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-[#50ABE7]">{token}</span>
        {status && (
          <Badge color={status === 'next' ? 'blue' : 'gray'} dot>
            {status}
          </Badge>
        )}
      </div>
      <p className="font-semibold text-sm text-[#1E293B]">{name}</p>
      <p className="text-xs text-[#64748B]">
        {age && `${age}`}
        {gender && `${gender}`}
        {time && ` · ${time}`}
      </p>
      {issue && <p className="text-xs text-[#94A3B8] truncate mt-0.5">{issue}</p>}
    </button>
  )
}

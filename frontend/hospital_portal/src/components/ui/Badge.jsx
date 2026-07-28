import React from 'react'

export function Badge({ children, color = 'blue', dot }) {
  const colors = {
    blue: 'bg-[#EDF7FF] text-[#50ABE7]',
    green: 'bg-[#ECFDF5] text-[#10B981]',
    yellow: 'bg-[#FFFBEB] text-[#F59E0B]',
    red: 'bg-[#FEF2F2] text-[#EF4444]',
    gray: 'bg-[#F1F5F9] text-[#64748B]',
    purple: 'bg-[#F5F3FF] text-[#7C3AED]',
  }
  const dots = {
    blue: 'bg-[#50ABE7]',
    green: 'bg-[#10B981]',
    yellow: 'bg-[#F59E0B]',
    red: 'bg-[#EF4444]',
    gray: 'bg-[#64748B]',
    purple: 'bg-[#7C3AED]',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors[color]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[color]}`} />}
      {children}
    </span>
  )
}

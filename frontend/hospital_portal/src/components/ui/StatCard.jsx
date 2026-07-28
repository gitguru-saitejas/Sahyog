import React from 'react'
import { Card } from './Card'

export function StatCard({ label, value, change, icon, color = 'blue' }) {
  const colors = {
    blue: 'bg-[#EDF7FF] text-[#50ABE7]',
    green: 'bg-[#ECFDF5] text-[#10B981]',
    yellow: 'bg-[#FFFBEB] text-[#F59E0B]',
    red: 'bg-[#FEF2F2] text-[#EF4444]',
  }
  return (
    <Card className="p-5 font-sans">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#64748B] font-medium">{label}</p>
          <p className="text-2xl font-bold text-[#1E293B] mt-1">{value}</p>
          {change && <p className="text-xs text-[#10B981] font-semibold mt-1">{change}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

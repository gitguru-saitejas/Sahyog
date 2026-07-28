import React from 'react'

export function Card({ children, className = '', style, hover, glass, onClick }) {
  return (
    <div
      style={style}
      onClick={onClick}
      className={`
        rounded-2xl border border-[#E5E7EB] bg-white
        shadow-[0_2px_16px_rgba(80, 171, 231, 0.08),0_1px_4px_rgba(0,0,0,0.04)]
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${glass ? 'glass' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

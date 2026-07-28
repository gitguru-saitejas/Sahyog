import React from 'react'

export function Btn({ variant = 'primary', size = 'md', children, icon, fullWidth, className = '', ...rest }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'
  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
    xl: 'px-8 py-4 text-lg',
  }
  const variants = {
    primary: 'bg-[#50ABE7] text-white hover:bg-[#2E8DC7] shadow-sm hover:shadow-md',
    secondary: 'bg-[#EDF7FF] text-[#50ABE7] hover:bg-[#D8EFFE]',
    outlined: 'border-2 border-[#50ABE7] text-[#50ABE7] hover:bg-[#EDF7FF] bg-transparent',
    danger: 'bg-[#EF4444] text-white hover:bg-[#DC2626] shadow-sm',
    ghost: 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1E293B] bg-transparent',
  }
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}

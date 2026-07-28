import React from 'react'

export function Avatar({ name, size = 'md', src }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' }
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return src ? (
    <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ring-2 ring-white`} />
  ) : (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-[#50ABE7] to-[#7AD8FF] text-white font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  )
}

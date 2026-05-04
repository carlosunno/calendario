interface AvatarProps {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
  imageUrl?: string
}

const sizeClasses = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

export function Avatar({ name, color = '#3b82f6', size = 'md', imageUrl }: AvatarProps) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white`}
      />
    )
  }
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold text-white ring-2 ring-white`}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </div>
  )
}

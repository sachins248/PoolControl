import { getInitials, getAvatarColor } from '@/lib/utils/avatar'
import { cn } from '@/lib/utils'

interface LifeguardAvatarProps {
  name: string
  avatarColor?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function LifeguardAvatar({ name, avatarColor, size = 'md', className }: LifeguardAvatarProps) {
  const color = avatarColor ?? getAvatarColor(name)
  const initials = getInitials(name)
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
        SIZE_CLASSES[size],
        className
      )}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  )
}

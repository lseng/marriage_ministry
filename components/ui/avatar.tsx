import { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  className,
  ...props
}: AvatarProps) {
  const initials = fallback ? getInitials(fallback) : alt ? getInitials(alt) : '?';

  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="aspect-square h-full w-full object-cover"
          onError={(e) => {
            // Hide the image on error and show fallback
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : null}
      <span
        className={cn(
          'flex h-full w-full items-center justify-center font-medium text-muted-foreground',
          src && 'absolute opacity-0'
        )}
        aria-hidden={!!src}
      >
        {initials}
      </span>
    </div>
  );
}

export interface AvatarGroupProps extends HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: AvatarProps['size'];
  children: React.ReactElement<AvatarProps>[];
}

export function AvatarGroup({
  max = 4,
  size = 'md',
  children,
  className,
  ...props
}: AvatarGroupProps) {
  const avatars = children.slice(0, max);
  const remaining = children.length - max;

  return (
    <div className={cn('flex -space-x-2', className)} {...props}>
      {avatars.map((avatar, index) => (
        <div
          key={index}
          className="ring-2 ring-background rounded-full"
        >
          {avatar}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-muted ring-2 ring-background font-medium text-muted-foreground',
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

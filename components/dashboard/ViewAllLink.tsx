import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ViewAllLinkProps {
  /** The destination URL */
  href: string;
  /** The link text (defaults to "View All") */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function ViewAllLink({
  href,
  label = 'View All',
  className,
}: ViewAllLinkProps) {
  return (
    <Link
      to={href}
      className={cn(
        'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded',
        className
      )}
    >
      {label}
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

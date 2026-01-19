import { Link } from 'react-router-dom';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: number | string;
  icon?: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  className?: string;
  /** Click handler for interactive metric cards */
  onClick?: () => void;
  /** Navigation href for link-based metric cards */
  href?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  loading = false,
  className,
  onClick,
  href,
}: MetricCardProps) {
  const isInteractive = onClick || href;

  const cardContent = (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {loading ? (
          <div className="h-9 w-20 animate-pulse rounded bg-muted" />
        ) : (
          <p className="text-3xl font-bold">{value}</p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div
            className={cn(
              'flex items-center text-xs font-medium',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            <span className="ml-1 text-muted-foreground">vs last week</span>
          </div>
        )}
      </div>
      {Icon && (
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      )}
    </div>
  );

  const cardClasses = cn(
    'p-6',
    isInteractive && 'cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
    className
  );

  // If href is provided, render as a Link
  if (href) {
    return (
      <Link to={href} className="block" aria-label={`View ${title}`}>
        <Card className={cardClasses}>
          {cardContent}
        </Card>
      </Link>
    );
  }

  // If onClick is provided, render as a clickable card
  if (onClick) {
    return (
      <Card
        className={cardClasses}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`View ${title}`}
      >
        {cardContent}
      </Card>
    );
  }

  // Default non-interactive card
  return (
    <Card className={cn('p-6', className)}>
      {cardContent}
    </Card>
  );
}

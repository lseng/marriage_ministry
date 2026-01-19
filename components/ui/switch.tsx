import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, label, id, disabled, ...props }, ref) => {
    const switchId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(event.target.checked);
    };

    return (
      <label
        htmlFor={switchId}
        className={cn(
          'inline-flex items-center cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <div className="relative">
          <input
            type="checkbox"
            id={switchId}
            ref={ref}
            checked={checked}
            onChange={handleChange}
            disabled={disabled}
            className="sr-only peer"
            role="switch"
            aria-checked={checked}
            {...props}
          />
          <div
            className={cn(
              'w-11 h-6 rounded-full transition-colors duration-200 ease-in-out',
              'bg-muted peer-checked:bg-primary',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background'
            )}
          />
          <div
            className={cn(
              'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow-sm',
              'transition-transform duration-200 ease-in-out',
              'peer-checked:translate-x-5'
            )}
          />
        </div>
        {label && (
          <span className="ml-3 text-sm font-medium">{label}</span>
        )}
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };

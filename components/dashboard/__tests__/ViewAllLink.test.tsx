import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ViewAllLink } from '../ViewAllLink';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ViewAllLink', () => {
  it('should render with default label', () => {
    renderWithRouter(<ViewAllLink href="/coaches" />);

    expect(screen.getByText('View All')).toBeInTheDocument();
  });

  it('should render with custom label', () => {
    renderWithRouter(<ViewAllLink href="/coaches" label="See More" />);

    expect(screen.getByText('See More')).toBeInTheDocument();
  });

  it('should render as a link with correct href', () => {
    renderWithRouter(<ViewAllLink href="/coaches" />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/coaches');
  });

  it('should render chevron icon', () => {
    renderWithRouter(<ViewAllLink href="/coaches" />);

    // ChevronRight icon should be present
    const icon = document.querySelector('svg');
    expect(icon).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    renderWithRouter(
      <ViewAllLink href="/coaches" className="custom-class" />
    );

    const link = screen.getByRole('link');
    expect(link).toHaveClass('custom-class');
  });

  it('should have muted text styling', () => {
    renderWithRouter(<ViewAllLink href="/coaches" />);

    const link = screen.getByRole('link');
    expect(link).toHaveClass('text-muted-foreground');
  });

  it('should be focusable', () => {
    renderWithRouter(<ViewAllLink href="/coaches" />);

    const link = screen.getByRole('link');
    link.focus();
    expect(document.activeElement).toBe(link);
  });
});

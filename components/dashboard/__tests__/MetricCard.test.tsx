import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MetricCard } from '../MetricCard';
import { Users } from 'lucide-react';

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('MetricCard', () => {
  it('should render basic metric card with title and value', () => {
    render(<MetricCard title="Total Users" value={42} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render with an icon', () => {
    render(<MetricCard title="Total Users" value={42} icon={Users} />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    // Icon should be rendered in the icon container
    const iconContainer = document.querySelector('.rounded-full.bg-primary\\/10');
    expect(iconContainer).toBeInTheDocument();
  });

  it('should render with description', () => {
    render(
      <MetricCard
        title="Total Users"
        value={42}
        description="Active this month"
      />
    );

    expect(screen.getByText('Active this month')).toBeInTheDocument();
  });

  it('should render loading state', () => {
    render(<MetricCard title="Total Users" value={42} loading={true} />);

    // Should show loading placeholder instead of value
    expect(screen.queryByText('42')).not.toBeInTheDocument();
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should render with positive trend', () => {
    render(
      <MetricCard
        title="Total Users"
        value={42}
        trend={{ value: 10, isPositive: true }}
      />
    );

    expect(screen.getByText('+10%')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('should render with negative trend', () => {
    render(
      <MetricCard
        title="Total Users"
        value={42}
        trend={{ value: 5, isPositive: false }}
      />
    );

    expect(screen.getByText('5%')).toBeInTheDocument();
  });

  it('should be clickable when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <MetricCard title="Total Users" value={42} onClick={handleClick} />
    );

    const card = screen.getByRole('button');
    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle keyboard navigation when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <MetricCard title="Total Users" value={42} onClick={handleClick} />
    );

    const card = screen.getByRole('button');
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should render as link when href is provided', () => {
    renderWithRouter(
      <MetricCard title="Total Users" value={42} href="/users" />
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/users');
  });

  it('should have hover styles when interactive', () => {
    const handleClick = vi.fn();
    render(
      <MetricCard title="Total Users" value={42} onClick={handleClick} />
    );

    const card = screen.getByRole('button');
    expect(card).toHaveClass('cursor-pointer');
  });

  it('should not have interactive styles when not clickable', () => {
    render(<MetricCard title="Total Users" value={42} />);

    const card = document.querySelector('.p-6');
    expect(card).not.toHaveClass('cursor-pointer');
  });

  it('should have accessible label when onClick is provided', () => {
    const handleClick = vi.fn();
    render(
      <MetricCard title="Total Users" value={42} onClick={handleClick} />
    );

    const card = screen.getByRole('button', { name: /view total users/i });
    expect(card).toBeInTheDocument();
  });

  it('should have accessible label when href is provided', () => {
    renderWithRouter(
      <MetricCard title="Total Users" value={42} href="/users" />
    );

    const link = screen.getByRole('link', { name: /view total users/i });
    expect(link).toBeInTheDocument();
  });
});

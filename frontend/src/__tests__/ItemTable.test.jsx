import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ItemTable from '../components/ItemTable';

const noop = vi.fn();

const baseItem = {
  id: 1,
  name: 'Widget',
  url: 'https://amazon.com/dp/B001',
  target_price: 30.00,
  current_price: null,
  last_scraped_at: null,
  check_interval_minutes: 60,
  active: true,
};

function renderTable(itemOverrides = {}) {
  return render(
    <ItemTable
      items={[{ ...baseItem, ...itemOverrides }]}
      onDelete={noop}
      onToggle={noop}
      onUpdate={noop}
      onScrapeNow={noop}
      onSelectItem={noop}
      selectedId={null}
    />
  );
}

describe('ItemTable', () => {
  it('shows N/A when current price is null', () => {
    renderTable({ current_price: null });
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('shows price in green when at or below target', () => {
    renderTable({ current_price: 25.00, target_price: 30.00 });
    const priceEl = screen.getByText('$25.00');
    expect(priceEl).toHaveStyle({ color: '#a6e3a1' });
  });

  it('shows price in default color when above target', () => {
    renderTable({ current_price: 35.00, target_price: 30.00 });
    const priceEl = screen.getByText('$35.00');
    expect(priceEl).toHaveStyle({ color: '#cdd6f4' });
  });

  it('renders History button for each row', () => {
    renderTable();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(
      <ItemTable
        items={[]}
        onDelete={noop}
        onToggle={noop}
        onUpdate={noop}
        onScrapeNow={noop}
        onSelectItem={noop}
        selectedId={null}
      />
    );
    expect(screen.getByText(/No items monitored yet/)).toBeInTheDocument();
  });
});

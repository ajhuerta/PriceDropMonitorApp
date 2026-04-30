import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PriceHistoryPanel from '../components/PriceHistoryPanel';
import { getPriceHistory } from '../api';

vi.mock('../api');

const items = [{ id: 1, name: 'Widget', target_price: 30.00 }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PriceHistoryPanel', () => {
  it('renders nothing when itemId is null', () => {
    const { container } = render(<PriceHistoryPanel itemId={null} items={items} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows empty state message when no history records exist', async () => {
    getPriceHistory.mockResolvedValue([]);
    render(<PriceHistoryPanel itemId={1} items={items} />);
    await waitFor(() => {
      expect(screen.getByText(/No price data yet/)).toBeInTheDocument();
    });
  });

  it('renders price rows when history is available', async () => {
    getPriceHistory.mockResolvedValue([
      { id: 1, price: 25.00, scraped_at: '2024-01-01T12:00:00' },
    ]);
    render(<PriceHistoryPanel itemId={1} items={items} />);
    await waitFor(() => {
      // Price appears in stat boxes (Latest, Lowest) and table row
      expect(screen.getAllByText('$25.00').length).toBeGreaterThan(0);
    });
  });

  it('shows "At target" label when price is at or below target', async () => {
    getPriceHistory.mockResolvedValue([
      { id: 1, price: 25.00, scraped_at: '2024-01-01T12:00:00' },
    ]);
    render(<PriceHistoryPanel itemId={1} items={items} />);
    await waitFor(() => {
      expect(screen.getByText('✓ At target')).toBeInTheDocument();
    });
  });
});

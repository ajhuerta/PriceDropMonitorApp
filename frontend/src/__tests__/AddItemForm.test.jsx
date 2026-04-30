import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddItemForm from '../components/AddItemForm';

describe('AddItemForm', () => {
  it('shows validation error when submitted with empty fields', () => {
    render(<AddItemForm onAdd={vi.fn()} onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByText('+ Add'));
    expect(screen.getByText('Name, URL, and target price are required.')).toBeInTheDocument();
  });

  it('calls onAdd with correctly parsed numeric values', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddItemForm onAdd={onAdd} onRefresh={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Product name'), {
      target: { value: 'Widget' },
    });
    fireEvent.change(screen.getByPlaceholderText('Amazon URL'), {
      target: { value: 'https://amazon.com/dp/B001' },
    });
    fireEvent.change(screen.getByPlaceholderText('Target $'), {
      target: { value: '29.99' },
    });

    fireEvent.click(screen.getByText('+ Add'));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        name: 'Widget',
        url: 'https://amazon.com/dp/B001',
        target_price: 29.99,
        check_interval_minutes: 60,
      });
    });
  });

  it('clears the form after successful submission', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(<AddItemForm onAdd={onAdd} onRefresh={vi.fn()} />);

    const nameInput = screen.getByPlaceholderText('Product name');
    fireEvent.change(nameInput, { target: { value: 'Widget' } });
    fireEvent.change(screen.getByPlaceholderText('Amazon URL'), {
      target: { value: 'https://amazon.com/dp/B001' },
    });
    fireEvent.change(screen.getByPlaceholderText('Target $'), {
      target: { value: '29.99' },
    });

    fireEvent.click(screen.getByText('+ Add'));

    await waitFor(() => expect(nameInput.value).toBe(''));
  });
});

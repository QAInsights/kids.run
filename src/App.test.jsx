import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';

describe('KidRun App', () => {

  beforeEach(() => {
    // Pre-populate an API key so components don't block
    localStorage.setItem("kidrun_api_key", "fake-api-key");
  });

  it('renders correctly and has default kids', () => {
    render(<App />);
    expect(screen.getByText('Kids.Run')).toBeInTheDocument();
    
    // Check initial layout elements
    expect(screen.getByText('Basecamp')).toBeInTheDocument();
    expect(screen.getByText('The Squad')).toBeInTheDocument();
    
    // Check default kids Child 1 and Child 2
    const child1Input = screen.getByDisplayValue('Child 1');
    const child2Input = screen.getByDisplayValue('Child 2');
    expect(child1Input).toBeInTheDocument();
    expect(child2Input).toBeInTheDocument();
  });

  it('handles empty coordinates correctly on route generation', async () => {
    render(<App />);
    
    // Try generating route without entering the Basecamp and activities location
    const generateBtn = screen.getByText('Generate Trip Plan');
    fireEvent.click(generateBtn);
    
    // It should immediately show a route error and not generate the table
    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid Home address/i)).toBeInTheDocument();
    });
  });

  it('preserves input fields upon generation to prevent data loss', async () => {
    render(<App />);
    
    // Set basecamp
    const basecampInput = screen.getByPlaceholderText('e.g. 123 Family Lane...');
    fireEvent.change(basecampInput, { target: { value: '123 Test Ave' } });
    
    // Add activity for Ava
    const addActivityBtns = screen.getAllByText('Add Activity');
    fireEvent.click(addActivityBtns[0]); // Ava's add

    // Now we can find Custom Address
    const customAddressInput = screen.getByPlaceholderText('Type Custom Address');
    fireEvent.change(customAddressInput, { target: { value: 'Gym' } });
    
    // Trigger generation
    const generateBtn = screen.getByText('Generate Trip Plan');
    fireEvent.click(generateBtn);

    // After re-renders and mocking resolve, the basecamp value should persist!
    expect(basecampInput.value).toBe('123 Test Ave');
    expect(customAddressInput.value).toBe('Gym');
  });
  
  it('toggles correctly between table and timeline view', async () => {
    render(<App />);
    
    // Fake a valid setup to trigger the plan render
    const basecampInput = screen.getByPlaceholderText('e.g. 123 Family Lane...');
    fireEvent.change(basecampInput, { target: { value: '123 Test Ave' } });
    
    // Add activities for both kids
    const addActivityBtns = screen.getAllByText('Add Activity');
    fireEvent.click(addActivityBtns[0]);
    fireEvent.click(addActivityBtns[1]);

    const customAddressInputs = screen.getAllByPlaceholderText('Type Custom Address');
    fireEvent.change(customAddressInputs[0], { target: { value: 'Gym A' } });
    fireEvent.change(customAddressInputs[1], { target: { value: 'Gym B' } });
    
    // Generate the trip plan
    vi.useFakeTimers();
    const generateBtn = screen.getByText('Generate Trip Plan');
    fireEvent.click(generateBtn);
    vi.runAllTimers(); // Bypass setTimeouts if fallback used
    
    await waitFor(() => {
        expect(screen.getByText('The Master Plan')).toBeInTheDocument();
    });
    
    // Default is table view now
    expect(screen.getByRole('table')).toBeInTheDocument();
    
    // Find the toggle button
    const toggleBtn = screen.getByTitle('Toggle View Mode');
    fireEvent.click(toggleBtn);
    
    // Table should be gone, Timeline visible
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });
});

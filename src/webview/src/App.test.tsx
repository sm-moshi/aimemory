import { render, screen } from '@testing-library/react';
import App from './App.js';
import { describe, it, expect } from 'vitest';

describe('App', () => {
	it('renders fallback when VSCode API is not available', () => {
		render(<App />);
		expect(screen.getByText(/VSCode API not available/i)).toBeInTheDocument();
	});
});

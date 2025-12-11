import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Spinner from './Spinner';
import React from 'react';

describe('Spinner Component', () => {
    it('renders correctly', () => {
        render(<Spinner />);
        // Spinner usually has role="status" or just exists. 
        // We'll check if it renders without crashing.
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
    });
});

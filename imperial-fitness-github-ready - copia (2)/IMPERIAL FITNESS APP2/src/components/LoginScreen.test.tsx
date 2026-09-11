import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  it('renders private access login', () => {
    render(<LoginScreen onLogin={() => undefined} users={[]} onRegister={() => undefined} />);
    expect(screen.getByText(/Acceso Seguro/i)).toBeInTheDocument();
    expect(screen.getByText(/Solicitar acceso como cliente/i)).toBeInTheDocument();
  });
});
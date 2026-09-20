import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import * as api from '../api';

vi.mock('../api');

describe('LoginPage', () => {
  it('submits credentials and stores token', async () => {
    vi.mocked(api.login).mockResolvedValue({
      access_token: 'test-token',
      refresh_token: 'refresh-token'
    });

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByText('Login'));

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBe('test-token');
    });
  });
});

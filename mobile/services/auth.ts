import { apiFetch } from '../lib/api';

export async function startMagicLink(email: string) {
  const response = await apiFetch('/auth/start', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    throw new Error('Failed to start magic link');
  }
  return response.json();
}

export async function verifyMagicLink(token: string) {
  const response = await apiFetch('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  if (!response.ok) {
    throw new Error('Failed to verify magic link');
  }
  return response.json();
}

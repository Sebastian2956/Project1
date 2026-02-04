import { useAuthStore } from '../store/authStore';

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

async function refreshTokens() {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return null;

  const response = await fetch(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    await clear();
    return null;
  }

  const data = await response.json();
  await setTokens(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const { accessToken } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });

  if (response.status === 401) {
    const newAccess = await refreshTokens();
    if (!newAccess) {
      return response;
    }

    const retryHeaders = { ...headers, Authorization: `Bearer ${newAccess}` };
    return fetch(`${baseUrl}${path}`, { ...options, headers: retryHeaders });
  }

  return response;
}

export { baseUrl };

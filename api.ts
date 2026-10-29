import Constants from 'expo-constants';

const SERVER_PORT = 3000;

const getBaseUrl = () => {
  // Automatically get the IP address from Expo's dev server
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:${SERVER_PORT}`;
  }
  // Fallback for local testing
  return `http://127.0.0.1:${SERVER_PORT}`;
};

export const BASE_URL = getBaseUrl();

export const api = {
  test: () => fetch(`${BASE_URL}/api/test`).then(r => r.json()),
  echo: (data: any) =>
    fetch(`${BASE_URL}/api/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json()),
};

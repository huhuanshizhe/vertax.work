/** Per-platform Electron deep-link callbacks from env. */

function readCallback(envKey: string, fallback: string): string {
  const value = process.env[envKey]?.trim();
  return value || fallback;
}

export function getLinkedInCallbackUrl(): string {
  return readCallback(
    "LINKEDIN_CALLBACK_URL",
    "vertax://linkedin/authorization",
  );
}

export function getTikTokCallbackUrl(): string {
  return readCallback("TIKTOK_CALLBACK_URL", "vertax://tiktok/authorization");
}

export function getTwitterCallbackUrl(): string {
  return readCallback(
    "TWITTER_CALLBACK_URL",
    "vertax://twitter/authorization",
  );
}

export function getFacebookCallbackUrl(): string {
  return readCallback(
    "FACEBOOK_CALLBACK_URL",
    "vertax://facebook/authorization",
  );
}

export function getYouTubeCallbackUrl(): string {
  return readCallback(
    "YOUTUBE_CALLBACK_URL",
    "vertax://youtube/authorization",
  );
}

export function getDesktopLoginCallbackUrl(): string {
  return readCallback("DESKTOP_LOGIN_CALLBACK_URL", "vertax://account/login");
}

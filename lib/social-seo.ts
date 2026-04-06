/** X / Twitter handles: env may be with or without @ */
export function normalizeTwitterHandle(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const h = raw.trim();
  return h.startsWith("@") ? h : `@${h}`;
}

export function getFacebookAppIdFromEnv(): string | undefined {
  return process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() || undefined;
}

export function getTwitterSiteHandle(): string | undefined {
  return normalizeTwitterHandle(process.env.NEXT_PUBLIC_TWITTER_SITE);
}

export function getTwitterCreatorHandle(): string | undefined {
  return normalizeTwitterHandle(
    process.env.NEXT_PUBLIC_TWITTER_CREATOR || process.env.NEXT_PUBLIC_TWITTER_SITE
  );
}

export function getLinkedInUrlFromEnv(): string | undefined {
  return process.env.NEXT_PUBLIC_LINKEDIN_URL?.trim() || undefined;
}

export function getTelegramUrlFromEnv(): string | undefined {
  return process.env.NEXT_PUBLIC_TELEGRAM_URL?.trim() || undefined;
}

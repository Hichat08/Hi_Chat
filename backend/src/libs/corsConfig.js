const normalize = (url = "") => url.trim().replace(/\/$/, "");

const explicitOrigins = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || "").split(","),
]
  .map((origin) => normalize(origin || ""))
  .filter(Boolean);

const allowVercelPreview =
  (process.env.ALLOW_VERCEL_PREVIEW || "true").toLowerCase() === "true";

const isVercelPreviewOrigin = (origin = "") => {
  const normalized = normalize(origin);

  return /^https:\/\/[a-z0-9-]+-git-[a-z0-9-]+-[a-z0-9-]+\.vercel\.app$/i.test(
    normalized
  );
};

export const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = normalize(origin);

  if (explicitOrigins.includes(normalizedOrigin)) {
    return true;
  }

  if (allowVercelPreview && isVercelPreviewOrigin(normalizedOrigin)) {
    return true;
  }

  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Không được phép bởi CORS"));
  },
  credentials: true,
};

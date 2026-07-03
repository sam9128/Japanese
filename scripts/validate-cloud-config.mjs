const url = process.env.VITE_SUPABASE_URL?.trim();
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const errors = [];

try {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".supabase.co")
  ) {
    errors.push("VITE_SUPABASE_URL 必須是 Supabase 的 HTTPS Project URL");
  }
} catch {
  errors.push("缺少或無法解析 VITE_SUPABASE_URL");
}

if (!key || !(key.startsWith("sb_publishable_") || key.startsWith("eyJ"))) {
  errors.push("缺少有效的 VITE_SUPABASE_PUBLISHABLE_KEY");
}
if (key?.startsWith("sb_secret_") || /service_role/i.test(key || "")) {
  errors.push("禁止把 Secret 或 service_role key 放進前端建置");
}
if (key?.startsWith("eyJ")) {
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url"));
    if (payload.role === "service_role") {
      errors.push("禁止把 legacy service_role JWT 放進前端建置");
    }
  } catch {
    errors.push("Legacy anon key 不是有效的 JWT");
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Supabase public build configuration passed.");

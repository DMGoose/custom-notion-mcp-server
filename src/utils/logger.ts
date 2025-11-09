export const log = {
  info: (...msg: any[]) => console.log("[INFO]", ...msg),
  warn: (...msg: any[]) => console.warn("[WARN]", ...msg),
  error: (...msg: any[]) => console.error("[ERROR]", ...msg),
};

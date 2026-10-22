export function getUserIdFromToken(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(payload));
    return typeof decoded.userId === "string" ? decoded.userId : "";
  } catch {
    return "";
  }
}

export function slugFromPathname(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[2] || 'dashboard';
}

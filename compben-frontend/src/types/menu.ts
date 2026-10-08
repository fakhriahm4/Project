export interface MenuItem {
  id: string;
  label: string;
  icon: string;           // Nama icon (SVG path)
  path?: string;
  children?: MenuItem[];
  roles?: string[];       // Role yang boleh akses
  badge?: string;         // Badge opsional (contoh: "NEW", "5")
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}
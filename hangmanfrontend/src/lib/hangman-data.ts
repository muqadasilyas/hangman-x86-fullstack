export type ThemeKey = "technology" | "business" | "programming" | "networking" | "electronics" | "software";

export const THEMES: { key: ThemeKey; label: string; icon: string; blurb: string }[] = [
  { key: "technology", label: "Technology", icon: "💻", blurb: "Networks, data, encryption…" },
  { key: "business", label: "Business", icon: "📈", blurb: "Capital, revenue, finance…" },
  { key: "programming", label: "Programming", icon: "⌨️", blurb: "Pointers, stacks, recursion…" },
  { key: "networking", label: "Networking", icon: "🌐", blurb: "Routers, protocols, firewalls…" },
  { key: "electronics", label: "Electronics", icon: "🔌", blurb: "Transistors, oscilloscopes…" },
  { key: "software", label: "Software Eng.", icon: "🛠️", blurb: "Patterns, scaling, deployment…" },
];

export const WORDS: Record<ThemeKey, string[]> = {
  technology: ["network", "database", "program", "microprocessor", "datascience", "encryption", "computervision"],
  business: ["capital", "revenue", "profit", "finance", "stakeholder", "entrepreneurship", "investment"],
  programming: ["assembly", "pointer", "stack", "object", "encapsulation", "recursion", "dynamicallocation"],
  networking: ["protocol", "networkaddress", "router", "multiplexing", "firewall", "subnetting", "localareanetwork"],
  electronics: ["digitallogicdesign", "kirchofflaw", "productofsum", "transistor", "oscilloscope", "rectifier", "breadboard"],
  software: ["debug", "deployment", "designpatterns", "scalability", "multithreading", "scrummodel", "modularity"],
};

export function livesForLevel(level: number): number {
  if (level <= 2) return 8;
  if (level === 3) return 6;
  return 4;
}

export function difficultyForLevel(level: number): "Easy" | "Medium" | "Hard" {
  if (level <= 2) return "Easy";
  if (level === 3) return "Medium";
  return "Hard";
}

export const MAX_LEVEL = 5;

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  key: string;
  root: string;
  card: string;
  primaryBtn: string;
  secondaryBtn: string;
  accent: string;
  glow: string;
  font: string;
  question: string;
  radius: string;
  btnRadius: string;
  scanlines: string;
  phosphor: string;
  toast: string;
}

export function getTheme(mode: ThemeMode = 'dark'): Theme {
  if (mode === 'light') {
    return {
      key: 'retroLight',
      root: 'bg-amber-50 text-black',
      card: 'bg-white border-amber-300',
      primaryBtn: 'bg-amber-500 text-black hover:bg-amber-400',
      secondaryBtn: 'bg-white border border-amber-300 text-black hover:bg-amber-50',
      accent: 'text-amber-600',
      glow: 'ring-amber-300/40',
      font: 'font-mono',
      question: 'uppercase tracking-wide',
      radius: 'rounded-none',
      btnRadius: 'rounded-none',
      scanlines: '[background:repeating-linear-gradient(0deg,rgba(0,0,0,0.05)_0px,rgba(0,0,0,0.05)_1px,transparent_1px,transparent_3px)]',
      phosphor: 'bg-[radial-gradient(ellipse_at_center,rgba(255,200,0,0.08),transparent_60%)]',
      toast: 'bg-amber-500 text-black',
    };
  }
  
  return {
    key: 'retroDark',
    root: 'bg-black text-amber-400',
    card: 'bg-black border-amber-700/40',
    primaryBtn: 'bg-amber-400 text-black hover:bg-amber-300',
    secondaryBtn: 'bg-black border border-amber-700/40 text-amber-400 hover:bg-black/50',
    accent: 'text-amber-300',
    glow: 'ring-amber-400/30',
    font: 'font-mono',
    question: 'uppercase tracking-wide',
    radius: 'rounded-none',
    btnRadius: 'rounded-none',
    scanlines: '[background:repeating-linear-gradient(0deg,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_3px)]',
    phosphor: 'bg-[radial-gradient(ellipse_at_center,rgba(255,200,0,0.06),transparent_60%)]',
    toast: 'bg-amber-400 text-black',
  };
}
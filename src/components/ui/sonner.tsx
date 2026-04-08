// src/components/ui/sonner.tsx
// Componente placeholder per le notifiche Sonner
// Questo evita errori di build se il componente originale manca

import { Toaster } from 'sonner';

interface SonnerProps {
  // Aggiungi qui le props se necessarie, altrimenti lascia vuoto
}

export function Sonner({}: SonnerProps) {
  return (
    <Toaster richColors position="top-right" />
  );
}

export default Sonner;

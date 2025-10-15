import React from 'react';
import { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Protector de Contenido Web',
  description: 'Protege el contenido de cualquier URL de manera segura',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Protección básica contra DevTools
              document.addEventListener('keydown', function(e) {
                if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                  e.preventDefault();
                  alert('🔒 Acceso denegado: Las herramientas de desarrollador están deshabilitadas');
                  return false;
                }
              });
              
              // Deshabilitar clic derecho
              document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
              });
              
              // Deshabilitar selección de texto
              document.addEventListener('selectstart', function(e) {
                e.preventDefault();
                return false;
              });
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

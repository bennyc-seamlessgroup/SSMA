import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Currenc Intelligence',
  description: 'Enterprise stock monitoring and report delivery for issuer teams.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-portal-design="b" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{document.documentElement.dataset.portalDesign='b';document.documentElement.dataset.designBTheme=localStorage.getItem('monitor-design-b-theme')==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.portalDesign='b';document.documentElement.dataset.designBTheme='light'}",
          }}
        />
        {children}
      </body>
    </html>
  );
}

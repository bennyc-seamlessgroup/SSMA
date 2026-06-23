import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Currenc Intelligence',
  description: 'Enterprise stock monitoring and report delivery for issuer teams.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: "try{document.documentElement.dataset.portalDesign=localStorage.getItem('monitor-portal-design')==='b'?'b':'a';document.documentElement.dataset.designBTheme=localStorage.getItem('monitor-design-b-theme')==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.portalDesign='a';document.documentElement.dataset.designBTheme='light'}",
          }}
        />
        {children}
      </body>
    </html>
  );
}

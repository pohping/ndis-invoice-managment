import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import AppShell from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
   title: 'NDIS Invoice',
   description: 'NDIS participant invoicing and rate management',
};

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="en">
         <body>
            <AntdRegistry>
               <AppShell>{children}</AppShell>
            </AntdRegistry>
         </body>
      </html>
   );
}

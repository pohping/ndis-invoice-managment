'use client';

import PageLayout from '@/components/PageLayout';
import { Card, Col, Row } from 'antd';
import Link from 'next/link';

type Module = { key: string; title: string; content: string };

const MODULES: Module[] = [
   {
      key: '/clients',
      title: 'Participants',
      content: 'Manage participants records.',
   },
   {
      key: '/providers',
      title: 'Providers',
      content: 'Manage providers records.',
   },
   {
      key: '/rate-sets',
      title: 'Rate Sets',
      content: 'Manage effective date windows and metadata for each rate set.',
   },
   {
      key: '/invoices',
      title: 'Invoices',
      content: 'Manage invoices.',
   },
];

export default function DashboardPage() {
   return (
      <PageLayout
         title="My NDIS Portal"
         description="Use the cards below to access the modules available."
      >
         <Row gutter={[16, 16]}>
            {MODULES.map(({ key, title, content }) => (
               <Col key={key} sm={24} md={12} lg={8}>
                  <Link href={`${key}`}>
                     <Card title={title} hoverable style={{ height: '100%' }}>
                        {content}
                     </Card>
                  </Link>
               </Col>
            ))}
         </Row>
      </PageLayout>
   );
}

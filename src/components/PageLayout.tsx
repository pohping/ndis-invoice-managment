'use client';

import { Card, Space, Typography } from 'antd';
import { PropsWithChildren } from 'react';

interface PageLayoutProps extends PropsWithChildren {
   title: string;
   description: string;
}

const { Title, Text } = Typography;

export default function PageLayout({
   children,
   title,
   description,
}: PageLayoutProps) {
   return (
      <Space orientation="vertical" style={{ width: '100%', gap: '16px' }}>
         <Card>
            <Title level={3} style={{ marginBottom: '4px' }}>
               {title}
            </Title>
            <Text type="secondary">{description}</Text>
         </Card>
         {children}
      </Space>
   );
}

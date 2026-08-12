'use client';

import { PropsWithChildren, useState } from 'react';
import { Layout, Menu, Typography, Button, Tooltip } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';

type AppShellProps = PropsWithChildren;

const { Content, Sider } = Layout;
const { Title, Text } = Typography;

const items = [
   { key: '/dashboard', icon: <span>D</span>, label: 'Dashboard' },
   { key: '/clients', icon: <span>Pa</span>, label: 'Participants' },
   { key: '/providers', icon: <span>Pr</span>, label: 'Providers' },
   {
      key: 'invoices',
      icon: <span>I</span>,
      label: 'Invoices',
      children: [{ key: '/invoices', label: 'Invoice List' }],
   },
   { key: '/rate-sets', icon: <span>R</span>, label: 'Rate Sets' },
];

export default function AppShell({ children }: AppShellProps) {
   const [collapsed, setCollapsed] = useState(false);
   const router = useRouter();
   const pathname = usePathname();

   return (
      <Layout className="h-screen">
         <Sider
            theme="light"
            width={300}
            trigger={null}
            collapsible
            collapsed={collapsed}
         >
            <div
               className={
                  collapsed ? 'p-2' : 'flex items-center justify-between p-3'
               }
            >
               {!collapsed && (
                  <Title level={4} style={{ margin: 0 }}>
                     My NDIS Portal
                  </Title>
               )}
               <div
                  className={`flex items-center ${collapsed ? 'flex-col w-full gap-2' : 'gap-1'}`}
               >
                  <Button
                     icon={
                        collapsed ? (
                           <MenuUnfoldOutlined />
                        ) : (
                           <MenuFoldOutlined />
                        )
                     }
                     style={{ width: '40px', height: '40px' }}
                     type="text"
                     onClick={() => setCollapsed(!collapsed)}
                  />
               </div>
            </div>
            <Menu
               items={items}
               mode="inline"
               defaultSelectedKeys={[pathname]}
               onClick={({ key }) => router.push(key)}
            />
         </Sider>
         <Layout>
            <Content style={{ padding: '20px' }}>{children}</Content>
         </Layout>
      </Layout>
   );
}

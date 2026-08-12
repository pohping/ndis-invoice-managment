'use client';

import { Button, Drawer, Flex, Table, Form, type TableProps } from 'antd';
import { useState } from 'react';
import useSWR from 'swr';
import PageLayout from '@/components/PageLayout';
import { ApiSuccess, swrFetch } from '@/lib/swr-client';
import type { Pagination, Provider } from '@/types';
import { ProviderForm } from './_components/providerForm';
import ProviderActions from './_components/providerActions';

export default function ProvidersPage() {
   const [page, setPage] = useState(1);
   const {
      data: providers,
      mutate,
      isValidating,
   } = useSWR<ApiSuccess<Provider[], Pagination>>(
      `/api/providers?page=${page}`,
      swrFetch,
   );
   const [drawerOpen, setDrawerOpen] = useState(false);
   const [editing, setEditing] = useState<Provider | null>(null);
   const [form] = Form.useForm<Provider>();

   const openCreate = () => {
      setEditing(null);
      setDrawerOpen(true);
   };

   const openEdit = (provider: Provider) => {
      form.setFieldsValue(provider);
      setEditing(provider);
      setDrawerOpen(true);
   };

   const closeDrawer = () => {
      setDrawerOpen(false);
      setEditing(null);

      form.resetFields();
      mutate(); // Refresh the provider list after closing the drawer
   };

   const refetchProviders = async () => {
      await mutate();
   };

   const columns: TableProps['columns'] = [
      { title: 'ABN', dataIndex: 'abn' },
      { title: 'Name', dataIndex: 'name' },
      { title: 'Email', dataIndex: 'email' },
      {
         title: 'Phone Number',
         dataIndex: 'phone_number',
         render: (value: string | null) => value || '-',
      },
      { title: 'Address', dataIndex: 'address' },
      {
         title: 'Unit/Building',
         dataIndex: 'unit_building',
         render: (value: string | null) => value || '-',
      },
      {
         title: 'Active',
         dataIndex: 'deactivated_at',
         render: (value: string | null) => (value ? 'No' : 'Yes'),
      },
      {
         title: 'Action',
         fixed: 'end',
         render: (record: Provider) => (
            <ProviderActions
               provider={record}
               onEdit={openEdit}
               onDelete={refetchProviders}
            />
         ),
      },
   ];

   return (
      <PageLayout title="Providers" description="Manage provider records.">
         <Flex gap="small">
            <Button onClick={refetchProviders}>Refresh</Button>
            <Button type="primary" onClick={openCreate}>
               Add Provider
            </Button>
         </Flex>
         <Table
            columns={columns}
            dataSource={providers?.data}
            pagination={{
               current: page,
               total: providers?.total,
               pageSize: 20,
               onChange: setPage,
            }}
            rowKey="id"
            loading={isValidating}
         />
         <Drawer
            title={editing ? 'Edit Provider' : 'Add Provider'}
            placement="right"
            open={drawerOpen}
            onClose={closeDrawer}
         >
            <ProviderForm form={form} onClose={closeDrawer} editing={editing} />
         </Drawer>
      </PageLayout>
   );
}

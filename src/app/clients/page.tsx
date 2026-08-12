'use client';

import PageLayout from '@/components/PageLayout';
import { ApiSuccess, swrFetch } from '@/lib/swr-client';
import { Button, Drawer, Flex, Form, Table, type TableProps } from 'antd';
import { useState } from 'react';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { Client, Pagination } from '@/types';
import ClientForm from './_components/clientForm';
import ClientActions from './_components/clientActions';

export default function ClientsPage() {
   const [page, setPage] = useState(1);
   const {
      data: clients,
      isValidating,
      mutate,
   } = useSWR<ApiSuccess<Client[], Pagination>>(
      `/api/clients?page=${page}`,
      swrFetch,
   );
   const [drawerOpen, setDrawerOpen] = useState(false);
   const [editing, setEditing] = useState<Client | null>();
   const [form] = Form.useForm();

   const openCreate = () => {
      setDrawerOpen(true);
      setEditing(null);
   };

   const openEdit = (record: Client) => {
      form.setFieldsValue({
         ...record,
         dob: record['dob']
            ? dayjs(record['dob' as keyof Client] as string)
            : undefined,
      });
      setDrawerOpen(true);
      setEditing(record);
   };

   const closeDrawer = () => {
      setDrawerOpen(false);
      setEditing(null);

      form.resetFields();
      mutate(); // Refresh the provider list after closing the drawer
   };

   const refetchClients = async () => {
      await mutate();
   };

   const columns: TableProps['columns'] = [
      { title: 'First Name', dataIndex: 'first_name' },
      { title: 'Last Name', dataIndex: 'last_name' },
      { title: 'Gender', dataIndex: 'gender_label' },
      {
         title: 'Date of Birth',
         dataIndex: 'dob',
         render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
      },
      { title: 'NDIS Number', dataIndex: 'ndis_number' },
      { title: 'Email', dataIndex: 'email' },
      { title: 'Phone Number', dataIndex: 'phone_number' },
      { title: 'Address', dataIndex: 'address' },
      {
         title: 'Unit/Building',
         dataIndex: 'unit_building',
         render: (value: string | null) => value || '-',
      },
      { title: 'Pricing Region', dataIndex: 'pricing_region' },
      {
         title: 'Active',
         dataIndex: 'deactivated_at',
         render: (value: string | null) => (value ? 'No' : 'Yes'),
      },
      {
         title: 'Action',
         fixed: 'end',
         render: (record: Client) => (
            <ClientActions
               client={record}
               onEdit={openEdit}
               onDelete={refetchClients}
            />
         ),
      },
   ];

   return (
      <PageLayout
         title="Participants"
         description="Manage participant records."
      >
         <Flex gap="small">
            <Button onClick={refetchClients}>Refresh</Button>
            <Button type="primary" onClick={openCreate}>
               Add Participant
            </Button>
         </Flex>

         <Table
            loading={isValidating}
            dataSource={clients?.data}
            pagination={{
               current: page,
               total: clients?.total,
               pageSize: 20,
               onChange: setPage,
            }}
            rowKey="id"
            columns={columns}
            scroll={{ x: 'max-content' }}
         />

         <Drawer
            title={editing ? 'Edit Participant' : 'Add Participant'}
            placement="right"
            open={drawerOpen}
            onClose={closeDrawer}
         >
            <ClientForm form={form} onClose={closeDrawer} editing={editing} />
         </Drawer>
      </PageLayout>
   );
}

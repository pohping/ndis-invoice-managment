'use client';

import PageLayout from '@/components/PageLayout';
import { Button, Drawer, Flex, Form, Table, type TableProps } from 'antd';
import { useState } from 'react';
import RateSetsForm from './_components/rateSetForm';
import useSWR from 'swr';
import dayjs from 'dayjs';
import { ApiSuccess, swrFetch } from '@/lib/swr-client';
import { RateSet } from '@/types';
import { RateSetActions } from './_components/rateSetActions';

export default function RateSetsPage() {
   const [page, setPage] = useState(1);
   const {
      data: rateSets,
      isValidating,
      mutate,
   } = useSWR<
      ApiSuccess<RateSet[], { page: number; pageSize: number; total: number }>
   >(`/api/rate-sets?page=${page}&pageSize=20`, swrFetch);

   const [drawerOpen, setDrawerOpen] = useState(false);
   const [editing, setEditing] = useState<RateSet | null>(null);
   const [form] = Form.useForm();

   const openCreate = () => {
      setEditing(null);
      setDrawerOpen(true);
   };

   const openEdit = (rateSet: RateSet) => {
      form.setFieldsValue({
         ...rateSet,
         start_date: rateSet.start_date ? dayjs(rateSet.start_date) : undefined,
         end_date: rateSet.end_date ? dayjs(rateSet.end_date) : undefined,
      });
      setEditing(rateSet);
      setDrawerOpen(true);
   };

   const closeDrawer = () => {
      setDrawerOpen(false);
      setEditing(null);

      form.resetFields();
      mutate(); // Refresh the provider list after closing the drawer
   };

   const refetchRateSets = async () => {
      await mutate();
   };

   const columns: TableProps['columns'] = [
      { title: 'Name', dataIndex: 'name' },
      {
         title: 'Description',
         dataIndex: 'description',
         render: (value: string | null) => value || '-',
      },
      {
         title: 'Start Date',
         dataIndex: 'start_date',
         render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
      },
      {
         title: 'End Date',
         dataIndex: 'end_date',
         render: (value: string) => dayjs(value).format('DD/MM/YYYY'),
      },
      {
         title: 'Active',
         dataIndex: 'deactivated_at',
         render: (value: string | null) => (value ? 'No' : 'Yes'),
      },
      {
         title: 'Action',
         fixed: 'end',
         render: (record: RateSet) => (
            <RateSetActions
               rateSet={record}
               onEdit={openEdit}
               onDelete={refetchRateSets}
            />
         ),
      },
   ];

   return (
      <PageLayout
         title="Rate Sets"
         description="Manage effective date windows and metadata for each rate set."
      >
         <Flex gap="small">
            <Button onClick={refetchRateSets}>Refresh</Button>
            <Button type="primary" onClick={openCreate}>
               Add Rate Set
            </Button>
         </Flex>
         <Table
            columns={columns}
            pagination={{
               current: page,
               total: rateSets?.total,
               pageSize: 20,
               onChange: setPage,
            }}
            dataSource={rateSets?.data}
            rowKey="id"
            loading={isValidating}
         />
         <Drawer
            title={editing ? 'Edit Rate Set' : 'Add Rate Set'}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            destroyOnHidden
         >
            <RateSetsForm onClose={closeDrawer} form={form} editing={editing} />
         </Drawer>
      </PageLayout>
   );
}

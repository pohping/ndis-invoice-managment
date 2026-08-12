'use client';

import dayjs from 'dayjs';
import useSWR from 'swr';
import PageLayout from '@/components/PageLayout';
import { Button, Drawer, Flex, Form, message, Table, TableProps } from 'antd';
import InvoiceForm from './_components/invoiceForm';
import useSWRMutation from 'swr/mutation';
import { ApiSuccess, swrFetch, swrMutation } from '@/lib/swr-client';
import { useEffect, useState } from 'react';
import { Pagination, Invoice, InvoiceItem } from '@/types';
import InvoiceActions from './_components/invoiceActions';

export default function InvoicesPage() {
   const { trigger: saveInvoice, isMutating: isSaving } = useSWRMutation(
      '/api/invoices',
      swrMutation,
   );
   const [page, setPage] = useState(1);
   const {
      data: invoices,
      isValidating,
      mutate,
   } = useSWR<ApiSuccess<Invoice[], Pagination>>(
      `/api/invoices?page=${page}`,
      swrFetch,
   );
   const [editing, setEditing] = useState<Invoice | null>(null);
   const { data: invoice } = useSWR<
      ApiSuccess<Invoice & { items: InvoiceItem[] }>
   >(editing ? `/api/invoices/${editing.id}` : null, swrFetch);

   const [drawerOpen, setDrawerOpen] = useState(false);
   const [form] = Form.useForm();

   const openCreate = () => {
      setDrawerOpen(true);
   };

   const refetchInvoices = async () => {
      await mutate();
   };

   const handleSubmit = async (status: 'completed' | 'drafted') => {
      try {
         const values =
            status === 'drafted'
               ? await form.getFieldsValue()
               : await form.validateFields();
         const payload = { ...values, status };

         console.log({ payload });
         await saveInvoice({ method: 'POST', body: payload });
         message.success(editing ? 'Invoice updated.' : 'Invoice created.');
         closeDrawer();
      } catch (err) {
         if (err instanceof Error) {
            console.error(err);
            message.error(err.message);
         }
      }
   };

   const openEdit = (record: Invoice) => {
      setDrawerOpen(true);
      setEditing(record);
   };

   const closeDrawer = () => {
      setDrawerOpen(false);

      form.resetFields();
      mutate(); // Refresh the provider list after closing the drawer
      setEditing(null);
   };

   useEffect(() => {
      if (!invoice?.data) return;

      const { items, invoice_date, ...rest } = invoice.data;

      form.setFieldsValue({
         ...rest,
         invoice_date: invoice_date ? dayjs(invoice_date) : undefined,
         items: items.map(({ start_date, end_date, ...props }) => ({
            ...props,
            start_date: start_date ? dayjs(start_date) : undefined,
            end_date: end_date ? dayjs(end_date) : undefined,
         })),
      });
   }, [invoice, form]);

   const columns: TableProps['columns'] = [
      {
         title: 'Participant',
         dataIndex: 'client_label',
         render: (value: string | null) => value || '-',
      },
      {
         title: 'Provider',
         dataIndex: 'provider_label',
         render: (value: string | null) => value || '-',
      },
      {
         title: 'Invoice Number',
         dataIndex: 'invoice_number',
         render: (value: string | null) => value || '-',
      },
      {
         title: 'Expected Amount',
         dataIndex: 'expected_amount',
         render: (value?: number) =>
            value == null ? '-' : Number(value).toFixed(2),
      },
      {
         title: 'Amount',
         dataIndex: 'amount',
         render: (value?: number) =>
            value == null ? '-' : Number(value).toFixed(2),
      },
      {
         title: 'Actions',
         fixed: 'end',
         render: (record) => (
            <InvoiceActions
               invoice={record}
               onEdit={openEdit}
               onDelete={refetchInvoices}
            />
         ),
      },
   ];

   return (
      <PageLayout title="Invoices" description="Manage invoices.">
         <Flex gap="small">
            <Button onClick={refetchInvoices}>Refresh</Button>
            <Button type="primary" onClick={openCreate}>
               Add Invoice
            </Button>
         </Flex>
         <Table
            columns={columns}
            pagination={{
               current: page,
               total: invoices?.total,
               pageSize: 20,
               onChange: setPage,
            }}
            dataSource={invoices?.data}
            rowKey="id"
            loading={isValidating}
         />
         <Drawer
            open={drawerOpen}
            title={editing ? 'Edit Invoice' : 'Add Invoice'}
            size="100%"
            onClose={closeDrawer}
            extra={
               <Flex gap={8}>
                  <Button disabled={isSaving} onClick={closeDrawer}>
                     Cancel
                  </Button>
                  <Button
                     disabled={isSaving}
                     onClick={() => handleSubmit('drafted')}
                  >
                     Save as Draft
                  </Button>
                  <Button
                     disabled={isSaving}
                     type="primary"
                     onClick={() => handleSubmit('completed')}
                  >
                     Save
                  </Button>
               </Flex>
            }
         >
            <InvoiceForm form={form} />
         </Drawer>
      </PageLayout>
   );
}

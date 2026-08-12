import {
   Button,
   Col,
   DatePicker,
   Form,
   FormInstance,
   Input,
   InputNumber,
   Row,
   Select,
   Space,
   Typography,
} from 'antd';
import InvoiceItemForm from './invoiceItemForm';
import useSWR from 'swr';
import { ApiSuccess, swrFetch } from '@/lib/swr-client';
import { Client, Provider } from '@/types';
import { useEffect } from 'react';
import { Dayjs } from 'dayjs';

const { Title } = Typography;

type InvoiceItem = {
   serviceStart?: Dayjs;
   serviceEnd?: Dayjs;
   category_id?: number;
   support_item_id?: number;
   max_rate?: number;
   unit?: number;
   input_rate?: number;
   amount?: number;
};

interface InvoiceFormProps {
   form: FormInstance;
}

export default function InvoiceForm({ form }: InvoiceFormProps) {
   const { data: clients } = useSWR<ApiSuccess<Client[]>>(
      '/api/clients',
      swrFetch,
   );
   const { data: providers } = useSWR<ApiSuccess<Provider[]>>(
      '/api/providers',
      swrFetch,
   );

   const items = Form.useWatch<InvoiceItem[]>('items', form) ?? [];
   useEffect(() => {
      const total = items.reduce((sum, item) => sum + (item?.amount ?? 0), 0);

      if (!isNaN(total)) form.setFieldValue('amount', Number(total).toFixed(2));

      // Re-run expected_amount validation
      form.validateFields(['expected_amount']);
   }, [items, form]);

   return (
      <Form
         layout="vertical"
         form={form}
         initialValues={{
            items: [
               {
                  unit: 1,
               },
            ],
         }}
      >
         <Form.Item name="id" hidden>
            <Input />
         </Form.Item>
         <Row gutter={16}>
            <Col span={4}>
               <Form.Item
                  label="Participant"
                  name="client_id"
                  rules={[
                     { required: true, message: 'Participant is required' },
                  ]}
               >
                  <Select
                     showSearch
                     popupMatchSelectWidth={250}
                     style={{ width: '100%' }}
                     options={clients?.data.map((c) => ({
                        value: c.id,
                        label: `${c.first_name} ${c.last_name} (${c.ndis_number})`,
                     }))}
                  />
               </Form.Item>
            </Col>
            <Col span={4}>
               <Form.Item
                  label="Provider"
                  name="provider_id"
                  rules={[{ required: true, message: 'Provider is required' }]}
               >
                  <Select
                     showSearch
                     popupMatchSelectWidth={350}
                     style={{ width: '100%' }}
                     options={providers?.data.map((p) => ({
                        value: p.id,
                        label: `${p.name} (${p.abn})`,
                     }))}
                  />
               </Form.Item>
            </Col>
            <Col span={4}>
               <Form.Item
                  label="Invoice Number"
                  name="invoice_number"
                  rules={[
                     { required: true, message: 'Invoice Number is required' },
                  ]}
               >
                  <Input />
               </Form.Item>
            </Col>
            <Col span={4}>
               <Form.Item
                  label="Invoice Date"
                  name="invoice_date"
                  rules={[
                     { required: true, message: 'Invoice Date is required' },
                  ]}
               >
                  <DatePicker style={{ width: '100%' }} />
               </Form.Item>
            </Col>
            <Col span={4}>
               <Form.Item
                  label="Expected Amount"
                  name="expected_amount"
                  rules={[
                     { required: true, message: 'Expected Amount is required' },
                     {
                        validator: (_, value) => {
                           if (value == null) {
                              return Promise.resolve();
                           }

                           const amount = form.getFieldValue('amount');

                           if (Number(value) !== Number(amount)) {
                              return Promise.reject(
                                 new Error('Expected Amount must equal Amount'),
                              );
                           }

                           return Promise.resolve();
                        },
                     },
                  ]}
               >
                  <InputNumber style={{ width: '100%' }} precision={2} />
               </Form.Item>
            </Col>
            <Col span={4}>
               <Form.Item label="Amount" name="amount">
                  <InputNumber
                     style={{ width: '100%' }}
                     disabled
                     precision={2}
                  />
               </Form.Item>
            </Col>
         </Row>
         <Title level={4}>
            Items {items.length > 0 && `(${items.length})`}
         </Title>
         <Form.List name="items">
            {(fields, { add, remove }) => {
               const handleCopy = (index: number) => {
                  const item = form.getFieldValue(['items', index]);
                  add({ ...item }, index + 1);
               };

               return (
                  <Space
                     orientation="vertical"
                     style={{ width: '100%', gap: '16px' }}
                  >
                     {fields.map((field) => (
                        <InvoiceItemForm
                           key={field.key}
                           field={field}
                           onCopy={handleCopy}
                           onRemove={remove}
                        />
                     ))}
                     <Button type="dashed" onClick={() => add({ unit: 1 })}>
                        Add Item
                     </Button>
                  </Space>
               );
            }}
         </Form.List>
      </Form>
   );
}

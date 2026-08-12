import {
   RateSet,
   RateSetCategoryOptions,
   RateSetSupportItemOptions,
} from '@/types';
import { ApiSuccess, swrFetch } from '@/lib/swr-client';
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import {
   Button,
   Card,
   Col,
   DatePicker,
   Flex,
   Form,
   InputNumber,
   Typography,
   Row,
   Select,
   type FormListFieldData,
   Input,
} from 'antd';
import { useEffect } from 'react';
import useSWR from 'swr';

interface InvoiceItemFormProps {
   field: FormListFieldData;
   onRemove: (index: number) => void;
   onCopy: (index: number) => void;
}

const { Text } = Typography;

export default function InvoiceItemForm({
   field,
   onRemove,
   onCopy,
}: InvoiceItemFormProps) {
   const form = Form.useFormInstance();
   const startDate = Form.useWatch(
      ['items', field.name, 'start_date'],
      form,
   )?.format('YYYY-MM-DD');
   const endDate = Form.useWatch(
      ['items', field.name, 'end_date'],
      form,
   )?.format('YYYY-MM-DD');

   // 1. rate set matches
   const { data: rateSet, error } = useSWR<ApiSuccess<RateSet>>(
      startDate && endDate
         ? `/api/invoice-items/rate-set-match?start_date=${startDate}&end_date=${endDate}`
         : null,
      swrFetch,
   );

   // 2. rate set category options from rate_set_id
   const { data: categoryOptions } = useSWR<ApiSuccess<RateSetCategoryOptions>>(
      rateSet
         ? `/api/rate-set-categories/options?rate_set_id=${rateSet.data.id}`
         : null,
      swrFetch,
   );

   // 3. rate set support item options from category_id and rate_set_id
   const categoryId = Form.useWatch(['items', field.name, 'category_id'], form);
   const { data: supportItemOptions } = useSWR<
      ApiSuccess<RateSetSupportItemOptions>
   >(
      categoryId
         ? `/api/rate-set-support-items/options?category_id=${categoryId}&rate_set_id=${rateSet?.data.id}`
         : null,
      swrFetch,
   );

   // 4. find max_rate
   const supportItemId = Form.useWatch(
      ['items', field.name, 'support_item_id'],
      form,
   );
   const clientId = Form.useWatch('client_id', form);
   const { data: maxRate } = useSWR<ApiSuccess<{ max_rate: string }>>(
      supportItemId && clientId
         ? `/api/invoice-items/max-rate?rate_set_id=${rateSet?.data.id}&support_item_id=${supportItemId}&client_id=${clientId}&start_date=${startDate}&end_date=${endDate}`
         : null,
      swrFetch,
   );

   // store max_rate_id to hidden field
   useEffect(() => {
      if (rateSet?.data?.id) {
         form.setFieldValue(
            ['items', field.name, 'rate_set_id'],
            rateSet.data.id,
         );
      }
   }, [rateSet, form, field.name]);

   // set max_rate field and initial input_rate field
   useEffect(() => {
      if (maxRate?.data?.max_rate) {
         form.setFieldValue(
            ['items', field.name, 'max_rate'],
            Number(maxRate.data.max_rate),
         );
         form.setFieldValue(
            ['items', field.name, 'input_rate'],
            Number(maxRate.data.max_rate),
         );
      }
   }, [maxRate, form, field.name]);

   // Calculate amount (unit * input_rate)
   const unit = Form.useWatch(['items', field.name, 'unit'], form);
   const inputRate = Form.useWatch(['items', field.name, 'input_rate'], form);
   useEffect(() => {
      if (unit == null || inputRate == null) {
         form.setFieldValue(['items', field.name, 'amount'], undefined);
         return;
      }

      const amount = Number(unit) * Number(inputRate);

      form.setFieldValue(
         ['items', field.name, 'amount'],
         Number(amount.toFixed(2)),
      );
   }, [unit, inputRate, form, field.name]);

   // maxRate for invoiced rate
   const _maxRate = Form.useWatch(['items', field.name, 'max_rate'], form);

   return (
      <Card
         size="small"
         title={`#${field.name + 1}`}
         extra={
            <Flex gap={4}>
               <Button
                  icon={<CopyOutlined />}
                  type="text"
                  onClick={() => onCopy(field.name)}
               />
               <Button
                  icon={<DeleteOutlined />}
                  type="text"
                  onClick={() => onRemove(field.name)}
               />
            </Flex>
         }
      >
         <Form.Item name={[field.name, 'rate_set_id']} hidden>
            <Input />
         </Form.Item>
         <Row gutter={16}>
            <Col span={4}>
               <Form.Item
                  name={[field.name, 'start_date']}
                  label="Service Start Date"
                  rules={[
                     {
                        required: true,
                        message: 'Service Start Date is required',
                     },
                  ]}
                  validateStatus={error ? 'error' : undefined}
               >
                  <DatePicker style={{ width: '100%' }} />
               </Form.Item>
            </Col>

            <Col span={4}>
               <Form.Item
                  name={[field.name, 'end_date']}
                  label="Service End Date"
                  rules={[
                     {
                        required: true,
                        message: 'Service End Date is required',
                     },
                  ]}
                  validateStatus={error ? 'error' : undefined}
               >
                  <DatePicker style={{ width: '100%' }} />
               </Form.Item>
            </Col>

            <Col span={8}>
               <Form.Item
                  name={[field.name, 'category_id']}
                  label="Support Category"
                  rules={[
                     {
                        required: true,
                        message: 'Support Category is required',
                     },
                  ]}
               >
                  <Select
                     options={categoryOptions?.data.map((opt) => ({
                        value: opt.id,
                        label: opt.label,
                     }))}
                     showSearch={{
                        optionFilterProp: 'label',
                     }}
                     disabled={!categoryOptions}
                     onChange={() => {
                        form.setFieldValue(
                           ['items', field.name, 'support_item_id'],
                           undefined,
                        );
                        form.setFieldValue(
                           ['items', field.name, 'max_rate'],
                           undefined,
                        );
                     }}
                  />
               </Form.Item>
            </Col>

            <Col span={8}>
               <Form.Item
                  name={[field.name, 'support_item_id']}
                  label="Support Item"
                  rules={[
                     { required: true, message: 'Support Item is required' },
                  ]}
               >
                  <Select
                     options={supportItemOptions?.data.map((opt) => ({
                        value: opt.id,
                        label: opt.label,
                     }))}
                     showSearch={{
                        optionFilterProp: 'label',
                     }}
                     disabled={!supportItemOptions}
                  />
               </Form.Item>
            </Col>
         </Row>

         <Row gutter={16}>
            <Col span={4}>
               <Form.Item name={[field.name, 'max_rate']} label="Max Rate">
                  <InputNumber disabled style={{ width: '100%' }} />
               </Form.Item>
            </Col>

            <Col span={4}>
               <Form.Item
                  name={[field.name, 'unit']}
                  label="Unit"
                  rules={[{ required: true, message: 'Unit is required' }]}
               >
                  <InputNumber style={{ width: '100%' }} precision={2} />
               </Form.Item>
            </Col>

            <Col span={4}>
               <Form.Item
                  name={[field.name, 'input_rate']}
                  label="Invoiced Rate"
                  rules={[
                     { required: true, message: 'Invoiced Rate is required' },
                     {
                        validator: (_, value) => {
                           if (!_maxRate || value == null) {
                              return Promise.resolve();
                           }

                           if (value > _maxRate) {
                              return Promise.reject(
                                 new Error(
                                    `Invoiced Rate cannot exceed ${Number(_maxRate).toFixed(2)}`,
                                 ),
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
               <Form.Item name={[field.name, 'amount']} label="Invoiced Amount">
                  <InputNumber
                     disabled
                     style={{ width: '100%' }}
                     precision={2}
                  />
               </Form.Item>
            </Col>
         </Row>
         {error && (
            <Text type="danger">{error instanceof Error && error.message}</Text>
         )}
      </Card>
   );
}

import { RateSet } from '@/types';
import { optionalTrim } from '@/lib/form-validator';
import { ApiSuccess, MutationArg, swrMutation } from '@/lib/swr-client';
import { ImportSummary } from '@/services/excel-import.service';
import {
   Button,
   DatePicker,
   Flex,
   Form,
   FormInstance,
   FormProps,
   Input,
   message,
   Upload,
} from 'antd';
import { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import useSWRMutation from 'swr/mutation';

interface RateSetFormProps {
   onClose: () => void;
   form: FormInstance;
   editing?: RateSet | null;
}

export default function RateSetsForm({
   onClose,
   form,
   editing,
}: RateSetFormProps) {
   const { trigger: createRateSet, isMutating: isCreating } = useSWRMutation<
      ApiSuccess<RateSet>,
      unknown,
      string,
      MutationArg
   >('/api/rate-sets', swrMutation);
   const { trigger: updateRateSet, isMutating: isUpdating } = useSWRMutation(
      `api/rate-sets/${editing?.id}`,
      swrMutation,
   );
   const { trigger: importExcel, isMutating: isUploading } = useSWRMutation<
      ApiSuccess<ImportSummary>,
      unknown,
      string,
      MutationArg
   >('/api/rate-sets/import', swrMutation);

   const [file, setFile] = useState<File | null>(null);

   useEffect(() => {
      // cleanup on destroy
      return () => setFile(null);
   }, []);

   const handleFinish: FormProps['onFinish'] = async (values) => {
      let actionText = 'Rate set created';
      let rateSetId: number;
      try {
         if (editing) {
            await updateRateSet({ method: 'PUT', body: values });
            rateSetId = editing.id;
            actionText = 'Rate set updated';
         } else {
            const rateSet = await createRateSet({
               method: 'POST',
               body: values,
            });
            rateSetId = rateSet.data.id;
         }

         // store rate_set id and file into formData
         if (file) {
            const formData = new FormData();
            formData.append('rateSetId', String(rateSetId));
            formData.append('file', file);

            const { data } = await importExcel({
               method: 'POST',
               body: formData,
            });

            message.success({
               content: (
                  <div style={{ textAlign: 'left' }}>
                     <strong>{actionText}</strong>
                     <ul
                        style={{
                           paddingLeft: 8,
                           margin: '6px 0 0 0',
                           fontSize: '14px',
                        }}
                     >
                        <li>
                           Categories: {data.categoriesCreated} created,{' '}
                           {data.categoriesUpdated} updated,{' '}
                           {data.categoriesDeactivated} deactivated
                        </li>
                        <li>
                           Items: {data.itemsCreated} created,{' '}
                           {data.itemsUpdated} updated, {data.itemsDeactivated}{' '}
                           deactivated
                        </li>
                        <li>
                           Prices: {data.pricesCreated} created,{' '}
                           {data.pricesUpdated} updated, {data.pricesRemoved}{' '}
                           removed
                        </li>
                     </ul>
                  </div>
               ),
               duration: 6,
            });
            return onClose();
         }

         message.success(actionText);
         onClose();
      } catch (err) {
         if (err instanceof Error) {
            console.error(err.message);
            message.error(err.message);
         }
      }
   };

   const buttonLoadState = isCreating || isUpdating || isUploading;

   return (
      <Form form={form} layout="vertical" onFinish={handleFinish}>
         <Form.Item
            label="Name"
            name="name"
            rules={[
               { required: true, message: 'Name is required.' },
               optionalTrim('Name must not be empty'),
            ]}
         >
            <Input placeholder="Enter name" />
         </Form.Item>
         <Form.Item label="Description" name="description">
            <Input.TextArea rows={4} placeholder="Enter description" />
         </Form.Item>
         <Form.Item
            label="Start Date"
            name="start_date"
            rules={[
               {
                  required: true,
                  message: 'Start date is required.',
               },
            ]}
         >
            <DatePicker
               showTime
               style={{ width: '100%' }}
               format="YYYY-MM-DD HH:mm"
            />
         </Form.Item>
         <Form.Item
            label="End Date"
            name="end_date"
            dependencies={['start_date']}
            rules={[
               ({ getFieldValue }) => ({
                  validator(_, value: Dayjs | undefined) {
                     const start = getFieldValue('start_date');

                     if (!value || !start) {
                        return Promise.resolve();
                     }

                     if (value.isBefore(start)) {
                        return Promise.reject(
                           new Error(
                              'End date must be after or equal to the start date.',
                           ),
                        );
                     }

                     return Promise.resolve();
                  },
               }),
            ]}
         >
            <DatePicker
               showTime
               style={{ width: '100%' }}
               format="YYYY-MM-DD HH:mm"
            />
         </Form.Item>
         <Form.Item label="Upload NDIS Excel">
            <Upload
               accept=".xlsx,.xls"
               maxCount={1}
               beforeUpload={() => false}
               onChange={({ fileList }) =>
                  setFile(fileList[0]?.originFileObj ?? null)
               }
            >
               <Button variant="outlined">Select File</Button>
            </Upload>
         </Form.Item>

         <Form.Item label={null}>
            <Flex gap={8} justify="end">
               <Button onClick={onClose}>Cancel</Button>
               <Button
                  type="primary"
                  htmlType="submit"
                  loading={buttonLoadState}
               >
                  Save
               </Button>
            </Flex>
         </Form.Item>
      </Form>
   );
}

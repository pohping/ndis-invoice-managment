import {
   message,
   Button,
   Form,
   Input,
   type FormInstance,
   type FormProps,
   Flex,
} from 'antd';
import type { Provider } from '@/db/types';
import { trimRequired, optionalTrim } from '@/lib/form-validator';
import { swrMutation } from '@/lib/swr-client';
import useSWRMutation from 'swr/mutation';

interface ProviderFormProps {
   form: FormInstance;
   onClose: () => void;
   editing?: Provider | null;
}

export function ProviderForm({ form, onClose, editing }: ProviderFormProps) {
   const { trigger: createProvider } = useSWRMutation(
      '/api/providers',
      swrMutation,
   );
   const { trigger: updateProvider } = useSWRMutation(
      `/api/providers/${editing?.id}`,
      swrMutation,
   );

   const handleFinish: FormProps['onFinish'] = async (values) => {
      try {
         if (editing) {
            await updateProvider({
               method: 'PUT',
               body: { ...editing, ...values },
            });
            message.success('Provider updated');
         } else {
            await createProvider({ method: 'POST', body: values });
            message.success('Provider created');
         }
         onClose();
      } catch (err) {
         if (err instanceof Error) message.error(err.message);
      }
   };

   return (
      <Form layout="vertical" form={form} onFinish={handleFinish}>
         <Form.Item
            label="ABN"
            name="abn"
            rules={[
               { required: true, message: 'ABN is required.' },
               {
                  pattern: /^\d{1,11}$/,
                  message:
                     'ABN must contain only digits and be up to 11 digits.',
               },
            ]}
         >
            <Input maxLength={11} placeholder="Enter ABN" />
         </Form.Item>
         <Form.Item
            label="Name"
            name="name"
            rules={[
               { required: true, message: 'Name is required.' },
               optionalTrim('Name must not be empty.'),
            ]}
         >
            <Input placeholder="Enter name" />
         </Form.Item>
         <Form.Item
            label="Email"
            name="email"
            rules={[
               { required: true, message: 'Email is required.' },
               {
                  type: 'email',
                  message: 'Please enter a valid email address.',
               },
            ]}
         >
            <Input placeholder="Enter email" />
         </Form.Item>
         <Form.Item
            label="Phone Number"
            name="phone_number"
            rules={[
               {
                  validator: (_, value) => {
                     if (!value) {
                        return Promise.resolve();
                     }

                     if (!/^\d{3,16}$/.test(value)) {
                        return Promise.reject(
                           new Error(
                              'Phone number must contain only digits and be between 3 and 16 digits.',
                           ),
                        );
                     }

                     return Promise.resolve();
                  },
               },
            ]}
         >
            <Input maxLength={16} placeholder="Enter phone number" />
         </Form.Item>
         <Form.Item
            label="Address"
            name="address"
            rules={[
               { required: true, message: 'Address is required.' },
               optionalTrim('Address must not be empty.'),
            ]}
         >
            <Input.TextArea rows={3} placeholder="Enter address" />
         </Form.Item>
         <Form.Item
            label="Unit / Building"
            name="unit_building"
            rules={[
               optionalTrim('Unit/Building must not be empty if provided.'),
            ]}
         >
            <Input placeholder="Enter unit or building" />
         </Form.Item>
         <Form.Item label={null}>
            <Flex gap={8} justify="end">
               <Button onClick={onClose}>Cancel</Button>
               <Button type="primary" htmlType="submit">
                  Save
               </Button>
            </Flex>
         </Form.Item>
      </Form>
   );
}

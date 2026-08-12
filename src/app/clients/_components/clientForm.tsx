import { Client, Gender } from '@/types';
import { ApiSuccess, swrFetch, swrMutation } from '@/lib/swr-client';
import {
   Button,
   DatePicker,
   Flex,
   Form,
   FormProps,
   Input,
   message,
   Select,
   type FormInstance,
} from 'antd';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

interface ClientFormProps {
   form: FormInstance;
   onClose: () => void;
   editing?: Client | null;
}

export default function ClientForm({
   editing,
   form,
   onClose,
}: ClientFormProps) {
   const { data: genders } = useSWR<ApiSuccess<Gender[]>>(
      '/api/genders',
      swrFetch,
   );
   const { data: pricingRegions } = useSWR<ApiSuccess<Gender[]>>(
      '/api/rate-set-pricing-regions',
      swrFetch,
   );
   const { trigger: createClient } = useSWRMutation(
      '/api/clients',
      swrMutation,
   );
   const { trigger: updateClient } = useSWRMutation(
      `/api/clients/${editing?.id}`,
      swrMutation,
   );

   const handleFinish: FormProps['onFinish'] = async (values) => {
      const payload = {
         ...values,
         dob: values.dob ? values.dob.format('YYYY-MM-DD') : undefined,
      };

      try {
         if (editing) {
            await updateClient({
               method: 'PUT',
               body: { ...editing, ...payload },
            });
            message.success('Participant updated');
         } else {
            await createClient({ method: 'POST', body: payload });
            message.success('Participant created');
         }
         onClose();
      } catch (err) {
         if (err instanceof Error) message.error(err.message);
      }
   };

   return (
      <Form form={form} layout="vertical" onFinish={handleFinish}>
         <Form.Item
            name="first_name"
            label="First Name"
            rules={[
               { required: true, message: 'First name is required.' },
               {
                  validator: (_, value) => {
                     if (!value || value.trim().length > 0) {
                        return Promise.resolve();
                     }
                     return Promise.reject(
                        new Error('First name cannot be empty.'),
                     );
                  },
               },
            ]}
         >
            <Input placeholder="Enter first name" />
         </Form.Item>
         <Form.Item
            name="last_name"
            label="Last Name"
            rules={[
               { required: true, message: 'Last name is required.' },
               {
                  validator: (_, value) => {
                     if (!value || value.trim().length > 0) {
                        return Promise.resolve();
                     }
                     return Promise.reject(
                        new Error('Last name cannot be empty.'),
                     );
                  },
               },
            ]}
         >
            <Input placeholder="Enter last name" />
         </Form.Item>
         <Form.Item
            name="gender_id"
            label="Gender"
            rules={[
               {
                  required: true,
                  message: 'Please select a gender.',
               },
            ]}
         >
            <Select
               placeholder="Select gender"
               showSearch={{ optionFilterProp: 'label' }}
               options={genders?.data.map((g) => ({
                  value: g.id,
                  label: g.label,
               }))}
            />
         </Form.Item>
         <Form.Item
            name="dob"
            label="Date of Birth"
            rules={[
               {
                  required: true,
                  message: 'Date of birth is required.',
               },
            ]}
         >
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
         </Form.Item>
         <Form.Item
            name="ndis_number"
            label="NDIS Number"
            rules={[
               {
                  required: true,
                  message: 'NDIS number is required.',
               },
               {
                  pattern: /^\d{1,16}$/,
                  message:
                     'NDIS number must contain only digits and up to 16 digits.',
               },
            ]}
         >
            <Input maxLength={16} placeholder="Enter NDIS number" />
         </Form.Item>
         <Form.Item
            name="email"
            label="Email"
            rules={[
               {
                  required: true,
                  message: 'Email is required.',
               },
               {
                  type: 'email',
                  message: 'Please enter a valid email address.',
               },
            ]}
         >
            <Input placeholder="Enter email" />
         </Form.Item>
         <Form.Item
            name="phone_number"
            label="Phone Number"
            rules={[
               {
                  pattern: /^\d{3,16}$/,
                  message:
                     'Phone number must contain only digits and be between 3 and 16 digits.',
               },
            ]}
         >
            <Input maxLength={16} placeholder="Enter phone number" />
         </Form.Item>
         <Form.Item
            name="address"
            label="Address"
            rules={[
               {
                  required: true,
                  message: 'Address is required.',
               },
               {
                  validator: (_, value) => {
                     if (!value || value.trim().length > 0) {
                        return Promise.resolve();
                     }
                     return Promise.reject(
                        new Error('Address cannot be empty.'),
                     );
                  },
               },
            ]}
         >
            <Input placeholder="Enter address" />
         </Form.Item>
         <Form.Item name="unit_building" label="Unit / Building">
            <Input placeholder="Enter unit or building" />
         </Form.Item>
         <Form.Item
            name="pricing_region"
            label="Pricing Region"
            rules={[
               {
                  required: true,
                  message: 'Pricing region is required.',
               },
            ]}
         >
            <Select
               placeholder="Select pricing region"
               showSearch={{ optionFilterProp: 'label' }}
               options={pricingRegions?.data.map((r) => ({
                  value: r.code,
                  label: r.label,
               }))}
            />
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

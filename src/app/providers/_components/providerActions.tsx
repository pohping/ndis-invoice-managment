import type { Provider } from '@/db/types';
import { swrMutation } from '@/lib/swr-client';
import { Button, Flex, Popconfirm, message } from 'antd';
import useSWRMutation from 'swr/mutation';

interface ProviderActionProps {
   onEdit: (provider: Provider) => void;
   onDelete: () => void;
   provider: Provider;
}

export default function ProviderActions({
   onEdit,
   onDelete,
   provider,
}: ProviderActionProps) {
   const { trigger: deleteProvider, isMutating } = useSWRMutation(
      `/api/providers/${provider.id}`,
      swrMutation,
   );

   const handleEdit = () => onEdit(provider);

   const handleDelete = async () => {
      try {
         await deleteProvider({ method: 'DELETE' });
         onDelete();
         message.success('Provider deleted successfully');
      } catch (err) {
         if (err instanceof Error) {
            console.error('Error deleting provider:', err);
            message.error('Failed to delete provider. Please try again.');
         }
      }
   };

   return (
      <Flex align="center" gap={8}>
         <Button size="small" variant="outlined" onClick={handleEdit}>
            Edit
         </Button>
         <Popconfirm
            placement="topRight"
            title="Delete Provider"
            okButtonProps={{ danger: true, loading: isMutating }}
            okText="Delete"
            description="Are you sure you want to delete this provider?"
            onConfirm={handleDelete}
         >
            <Button size="small" variant="outlined" color="danger">
               Delete
            </Button>
         </Popconfirm>
      </Flex>
   );
}

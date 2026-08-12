import type { Client } from '@/types';
import { swrMutation } from '@/lib/swr-client';
import { Button, Flex, Popconfirm, message } from 'antd';
import useSWRMutation from 'swr/mutation';

interface ClientActionsProps {
   onEdit: (provider: Client) => void;
   onDelete: () => void;
   client: Client;
}

export default function ClientActions({
   onEdit,
   onDelete,
   client,
}: ClientActionsProps) {
   const { trigger: deleteProvider, isMutating: isDeleting } = useSWRMutation(
      `/api/clients/${client.id}`,
      swrMutation,
   );

   const handleEdit = () => onEdit(client);

   const handleDelete = async () => {
      try {
         await deleteProvider({ method: 'DELETE' });
         onDelete();
         message.success('Client deleted.');
      } catch (err) {
         if (err instanceof Error) {
            console.error('Error deleting client:', err);
            message.error('Failed to delete client. Please try again.');
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
            title="Delete Client"
            okButtonProps={{ danger: true, loading: isDeleting }}
            okText="Delete"
            description="Are you sure you want to delete this client?"
            onConfirm={handleDelete}
         >
            <Button size="small" variant="outlined" color="danger">
               Delete
            </Button>
         </Popconfirm>
      </Flex>
   );
}

import { RateSet } from '@/types';
import { swrMutation } from '@/lib/swr-client';
import { Button, Flex, message, Popconfirm } from 'antd';
import useSWRMutation from 'swr/mutation';

interface RateSetActionProps {
   onEdit: (provider: RateSet) => void;
   onDelete: () => void;
   rateSet: RateSet;
}

export function RateSetActions({
   onEdit,
   onDelete,
   rateSet,
}: RateSetActionProps) {
   const { trigger: deleteRateSet, isMutating: isDeleting } = useSWRMutation(
      `/api/rate-sets/${rateSet.id}`,
      swrMutation,
   );

   const handleEdit = () => onEdit(rateSet);

   const handleDelete = async () => {
      try {
         await deleteRateSet({ method: 'DELETE' });
         onDelete();
         message.success('Rate set deleted.');
      } catch (err) {
         if (err instanceof Error) {
            console.error('Error deleting rate set:', err);
            message.error('Failed to delete rate set. Please try again.');
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
            title="Delete Rate Set"
            okButtonProps={{ danger: true, loading: isDeleting }}
            okText="Delete"
            description="Are you sure you want to delete this rate set?"
            onConfirm={handleDelete}
         >
            <Button size="small" variant="outlined" color="danger">
               Delete
            </Button>
         </Popconfirm>
      </Flex>
   );
}

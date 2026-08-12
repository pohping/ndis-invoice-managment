import { swrMutation } from '@/lib/swr-client';
import { Invoice } from '@/types';
import { Button, Flex, message, Popconfirm } from 'antd';
import useSWRMutation from 'swr/mutation';

interface InvoiceActionsProps {
   onEdit: (invoice: Invoice) => void;
   onDelete: () => void;
   invoice: Invoice;
}

export default function InvoiceActions({
   onEdit,
   onDelete,
   invoice,
}: InvoiceActionsProps) {
   const { trigger: deleteInvoice, isMutating: isDeleting } = useSWRMutation(
      `/api/invoices/${invoice.id}`,
      swrMutation,
   );

   const handleEdit = () => onEdit(invoice);

   const handleDelete = async () => {
      try {
         await deleteInvoice({ method: 'DELETE' });
         onDelete();
         message.success('Invoice deleted.');
      } catch (err) {
         if (err instanceof Error) {
            console.error('Error deleting invoice: ', err);
            message.error('Failed to delete invoice.');
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
            title="Delete Invoice"
            okButtonProps={{ danger: true, loading: isDeleting }}
            okText="Delete"
            description="Are you sure you want to delete this invoice?"
            onConfirm={handleDelete}
         >
            <Button size="small" variant="outlined" color="danger">
               Delete
            </Button>
         </Popconfirm>
      </Flex>
   );
}

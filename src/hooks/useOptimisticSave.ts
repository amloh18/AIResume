import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface OptimisticSaveParams<TData, TVariables> {
  queryKey: unknown[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccessPayloadSync?: (data: TData) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticSave<TData, TVariables>({
  queryKey,
  mutationFn,
  onSuccessPayloadSync,
  successMessage,
  errorMessage = 'Failed to save changes. Your data was reverted.',
}: OptimisticSaveParams<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (newVariables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) => {
        // This is a naive merge. For deeply nested structures,
        // you might want to provide a custom updater function.
        if (typeof old === 'object' && old !== null) {
          return { ...old, ...newVariables };
        }
        return newVariables as unknown as TData;
      });

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, newVariables, context) => {
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(errorMessage, { position: 'bottom-center' });
    },
    onSuccess: (data) => {
      // Sync cache explicitly with backend response struct
      queryClient.setQueryData(queryKey, data);
      
      if (onSuccessPayloadSync) {
        onSuccessPayloadSync(data);
      }
      
      if (successMessage) {
        toast.success(successMessage, { position: 'bottom-center' });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure absolute consistency
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

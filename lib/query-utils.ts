/** Server actions in this app return `{ error?: string }` on failure rather
 *  than throwing — this bridges that convention into TanStack Query's
 *  useMutation, which only runs onError/retry when the mutationFn itself
 *  rejects. Wrap any action call passed to `mutationFn` with this. */
export async function unwrapAction<T extends { error?: string }>(promise: Promise<T>): Promise<T> {
  const result = await promise;
  if (result.error) throw new Error(result.error);
  return result;
}

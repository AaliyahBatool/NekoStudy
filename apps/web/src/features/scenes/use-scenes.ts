import { useQuery } from '@tanstack/react-query';

import { getScenes } from '../../lib/api-client';

export function useScenes() {
  return useQuery({
    queryKey: ['scenes'],
    queryFn: getScenes,
    staleTime: 5 * 60 * 1000,
  });
}

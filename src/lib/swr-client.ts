export type ApiSuccess<T, M extends object = {}> = M & {
   data: T;
};

export interface ApiFailure {
   error: { code: string; message: string; details?: Record<string, string[]> };
}

export type MutationArg = {
   method?: RequestInit['method'];
   body?: unknown;
   headers?: HeadersInit;
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
   const isFormData = options?.body instanceof FormData;
   const res = await fetch(url, {
      ...options,
      headers: {
         ...(!isFormData && { 'Content-Type': 'application/json' }),
         ...(options?.headers ?? {}),
      },
   });

   const json = (await res.json()) as T;

   if (!res.ok || 'error' in (json as ApiFailure)) {
      const failure = json as ApiFailure;
      throw new Error(failure.error?.message ?? 'Request failed');
   }

   return json;
}

export function swrFetch<T>(url: string, options?: RequestInit): Promise<T> {
   return request<T>(url, options);
}

export function swrMutation<T>(
   url: string,
   { arg }: { arg: MutationArg },
): Promise<T> {
   const body =
      arg.body instanceof FormData
         ? arg.body
         : arg.body
           ? JSON.stringify(arg.body)
           : undefined;
   return request<T>(url, {
      method: arg.method ?? 'POST',
      headers: arg.headers,
      body,
   });
}

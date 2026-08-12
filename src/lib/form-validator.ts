import type { Rule } from 'antd/es/form';

export const trimRequired = (message: string): Rule => ({
   validator(_, value: string) {
      if (!value || value.trim() === '') {
         return Promise.reject(new Error(`${message}`));
      }
      return Promise.resolve();
   },
});

export const optionalTrim = (message: string): Rule => ({
   validator(_, value?: string) {
      if (!value) return Promise.resolve();

      if (value.trim() === '') {
         return Promise.reject(new Error(message));
      }

      return Promise.resolve();
   },
});

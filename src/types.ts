import type * as schema from '@/db/schema';
import { Selectable } from 'kysely';

export type Client = Selectable<schema.Client>;
export type Gender = Selectable<schema.Gender>;
export type Provider = Selectable<schema.Provider>;
export type RateSet = Selectable<schema.RateSet>;
export type Invoice = Selectable<schema.Invoice>;
export type InvoiceItem = Selectable<schema.InvoiceItem>;

export type RateSetCategoryOptions = {
   id: number;
   rate_set_id: number;
   label: string;
}[];

export type RateSetSupportItemOptions = {
   id: number;
   label: string;
}[];

export interface Pagination {
   page: number;
   pageSize: number;
   total: number;
}

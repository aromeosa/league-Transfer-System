import { ValueTransformer } from 'typeorm';

/** Postgres numeric columns come back as strings from `pg` — convert to number at the entity boundary. */
export const DecimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : parseFloat(value)),
};

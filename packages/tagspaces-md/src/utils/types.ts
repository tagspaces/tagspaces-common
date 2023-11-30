import type { Dispatch, SetStateAction } from 'react';

export type SetState<T> = Dispatch<SetStateAction<T>>;

export type DocSearch = {
  appId: string;
  apiKey: string;
  indexName: string;
};

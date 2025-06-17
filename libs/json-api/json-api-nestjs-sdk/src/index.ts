export {
  FilterOperand,
  ResourceObject,
  QueryField,
} from '@knoknoxjson-api-nestjs-shared';

export { JsonApiUtilsService, JsonApiSdkService } from './lib/service';
export * from './lib/json-api-js';
export { adapterForAxios } from './lib/utils';
export { AtomicOperations, Operands, QueryParams } from './lib/types';

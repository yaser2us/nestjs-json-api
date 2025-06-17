import { Body, Param, Query, RequestMethod } from '@nestjs/common';

import { BindingsConfig } from '../types';
import { JsonBaseController } from '../controllers/json-base.controller';
import { PARAMS_RELATION_NAME, PARAMS_RESOURCE_ID } from '../../../constants';

import {
  queryInputMixin,
  queryMixin,
  queryFiledInIncludeMixin,
  queryCheckSelectFieldMixin,
  idPipeMixin,
  checkItemEntityPipeMixin,
  postInputPipeMixin,
  patchInputPipeMixin,
  parseRelationshipNamePipeMixin,
  postRelationshipPipeMixin,
  patchRelationshipPipeMixin,
  contextMixin,
} from '../pipe';
import { DefaultContextPipe } from '../pipe/context/context.pipe';

// Create a mixin for the context pipe
export function createContextPipeMixin(PipeClass: any) {
  return function contextPipeMixin(target: any, propertyKey: string, parameterIndex: number) {
    // Apply the pipe to the parameter
    const existingPipes = Reflect.getMetadata('pipes', target, propertyKey) || [];
    existingPipes.push(PipeClass);
    Reflect.defineMetadata('pipes', existingPipes, target, propertyKey);
  };
}

// Add a function to create dynamic mixins based on config
export function createQueryMixins(): any[] {
  const baseMixins = [
    queryInputMixin,
    queryMixin,
    queryFiledInIncludeMixin,
    queryCheckSelectFieldMixin,
    contextMixin
  ];

  // ✨ Add context pipe if enabled
  // if (options.enableContext || options.pipeForQuery) {
  // const contextPipe = options.pipeForQuery || DefaultContextPipe;
  // baseMixins.push(createContextPipeMixin(contextPipe));
  // }

  return baseMixins;
}


const Bindings: BindingsConfig = {
  getAll: {
    method: RequestMethod.GET,
    name: 'getAll',
    path: '/',
    implementation: JsonBaseController.prototype.getAll,
    parameters: [
      {
        decorator: Query,
        mixins: createQueryMixins(), // ✨ Dynamic mixins

        // mixins: [
        //   queryInputMixin,
        //   queryMixin,
        //   queryFiledInIncludeMixin,
        //   queryCheckSelectFieldMixin,
        // ],
      },
    ],
  },
  getOne: {
    method: RequestMethod.GET,
    name: 'getOne',
    path: `:${PARAMS_RESOURCE_ID}`,
    implementation: JsonBaseController.prototype.getOne,
    parameters: [
      {
        property: PARAMS_RESOURCE_ID,
        decorator: Param,
        mixins: [idPipeMixin, checkItemEntityPipeMixin],
      },
      {
        decorator: Query,
        mixins: [
          queryInputMixin,
          queryMixin,
          queryFiledInIncludeMixin,
          queryCheckSelectFieldMixin,
        ],
      },
    ],
  },
  deleteOne: {
    method: RequestMethod.DELETE,
    name: 'deleteOne',
    path: `:${PARAMS_RESOURCE_ID}`,
    implementation: JsonBaseController.prototype.deleteOne,
    parameters: [
      {
        property: PARAMS_RESOURCE_ID,
        decorator: Param,
        mixins: [idPipeMixin, checkItemEntityPipeMixin],
      },
    ],
  },
  postOne: {
    method: RequestMethod.POST,
    name: 'postOne',
    path: '/',
    implementation: JsonBaseController.prototype.postOne,
    parameters: [
      {
        decorator: Body,
        mixins: [postInputPipeMixin],
      },
    ],
  },
  patchOne: {
    method: RequestMethod.PATCH,
    name: 'patchOne',
    path: `:${PARAMS_RESOURCE_ID}`,
    implementation: JsonBaseController.prototype.patchOne,
    parameters: [
      {
        property: PARAMS_RESOURCE_ID,
        decorator: Param,
        mixins: [idPipeMixin, checkItemEntityPipeMixin],
      },
      {
        decorator: Body,
        mixins: [patchInputPipeMixin],
      },
    ],
  },
  getRelationship: {
    path: `:${PARAMS_RESOURCE_ID}/relationships/:${PARAMS_RELATION_NAME}`,
    name: 'getRelationship',
    method: RequestMethod.GET,
    implementation: JsonBaseController.prototype.getRelationship,
    parameters: [
      {
        property: PARAMS_RESOURCE_ID,
        decorator: Param,
        mixins: [idPipeMixin, checkItemEntityPipeMixin],
      },
      {
        property: PARAMS_RELATION_NAME,
        decorator: Param,
        mixins: [parseRelationshipNamePipeMixin],
      },
    ],
  },
  postRelationship: {
    path: `:${PARAMS_RESOURCE_ID}/relationships/:${PARAMS_RELATION_NAME}`,
    name: 'postRelationship',
    method: RequestMethod.POST,
    implementation: JsonBaseController.prototype['postRelationship'],
    parameters: [
      {
        property: PARAMS_RESOURCE_ID,
        decorator: Param,
        mixins: [idPipeMixin, checkItemEntityPipeMixin],
      },
      {
        property: PARAMS_RELATION_NAME,
        decorator: Param,
        mixins: [parseRelationshipNamePipeMixin],
      },
      {
        decorator: Body,
        mixins: [postRelationshipPipeMixin],
      },
    ],
  },
  deleteRelationship: {
    path: `:${PARAMS_RESOURCE_ID}/relationships/:${PARAMS_RELATION_NAME}`,
    name: 'deleteRelationship',
    method: RequestMethod.DELETE,
    implementation: JsonBaseController.prototype['deleteRelationship'],
    parameters: [
      {
        property: PARAMS_RESOURCE_ID,
        decorator: Param,
        mixins: [idPipeMixin, checkItemEntityPipeMixin],
      },
      {
        property: PARAMS_RELATION_NAME,
        decorator: Param,
        mixins: [parseRelationshipNamePipeMixin],
      },
      {
        decorator: Body,
        mixins: [postRelationshipPipeMixin],
      },
    ],
  },
  patchRelationship: {
    path: `:${PARAMS_RESOURCE_ID}/relationships/:${PARAMS_RELATION_NAME}`,
    name: 'patchRelationship',
    method: RequestMethod.PATCH,
    implementation: JsonBaseController.prototype['patchRelationship'],
    parameters: [
      {
        property: PARAMS_RESOURCE_ID,
        decorator: Param,
        mixins: [idPipeMixin, checkItemEntityPipeMixin],
      },
      {
        property: PARAMS_RELATION_NAME,
        decorator: Param,
        mixins: [parseRelationshipNamePipeMixin],
      },
      {
        decorator: Body,
        mixins: [patchRelationshipPipeMixin],
      },
    ],
  },
};

export { Bindings };

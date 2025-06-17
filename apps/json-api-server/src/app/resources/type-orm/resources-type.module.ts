import { Module } from '@nestjs/common';
import { JsonApiModule, ORM_SERVICE } from '@klerick/json-api-nestjs';
import { TypeOrmJsonApiModule, createSimpleAccessControlledService } from '@klerick/json-api-nestjs-typeorm';


import {
  Users,
  Addresses,
  Comments,
  Roles,
  BookList,
  School,
  User,
  Workspace,
  YasserNasser
} from '@nestjs-json-api/typeorm-database';

import { ExtendBookListController } from './controllers/extend-book-list/extend-book-list.controller';
import { ExtendUserController } from './controllers/extend-user/extend-user.controller';
import { ExampleService } from './service/example.service';
import { TestingController } from './controllers/testing/testing.controller';
import { RealDbIntegrationController } from './controllers/testing/real-db-integration-controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnhancedUserContextPipe } from '../pipe.pipe';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Users,
      Addresses,
      Comments,
      Roles,
      BookList,
      School,
      User,
      Workspace,
      YasserNasser
    ]), // Add this line - makes repositories available

    JsonApiModule.forRoot(TypeOrmJsonApiModule, {
      entities: [
        Users,
        Addresses,
        Comments,
        Roles,
        BookList,
        School,
        User,
        Workspace,
        YasserNasser
      ],
      controllers: [ExtendBookListController, ExtendUserController],
      providers: [
        ExampleService,
        // Add this provider for user context
        {
          provide: 'USER_CONTEXT',
          useValue: {
            id: 'test-user-123',
            workspaceId: 'test-workspace-123',
            roles: ['admin']
          }
        },
        // Override the ORM service with our access-controlled version
        // {
        //   provide: ORM_SERVICE,
        //   useFactory: (originalService: any, userContext: any) => {
        //     return createSimpleAccessControlledService(originalService, userContext);
        //   },
        //   inject: [ORM_SERVICE, 'USER_CONTEXT']
        // }
      ],
      options: {
        debug: true,
        requiredSelectField: false,
        operationUrl: 'operation',
        pipeForQuery: EnhancedUserContextPipe,  // ✨ Use custom pipe
        enableContext: true
      },
    }),
  ],
  controllers: [TestingController, RealDbIntegrationController]
})
export class ResourcesTypeModule { }

// simple-access-controlled-get-all.ts
// Simplified POC - Avoids complex TypeScript generic issues

import { Query } from '@klerick/json-api-nestjs';
import { ResourceObject } from '@klerick/json-api-nestjs-shared';
import { TypeOrmService } from '../../service';

// ======================
// SIMPLE MOCK ACCESS FUNCTION
// ======================

interface UserContext {
  id: string;
  workspaceId: string;
  roles: string[];
}

const mockAccessFunction = (entityType: string, user: UserContext): string[] => {
  console.log(`🔍 Access check: ${entityType} for user ${user.id} in workspace ${user.workspaceId}`);

  // Mock logic based on entity type and user
  switch (entityType) {
    case 'Users':
      if (user.roles.includes('admin')) {
        return ['1', '2', '3', '4', '5', '15', '17', '18', '19', '13', '11', '25', '27']; // Admin sees all users
      } else {
        return ['1', '2']; // Regular user sees limited users
      }

    case 'School':
      if (user.roles.includes('admin')) {
        return ['1', '2', '3', '4', '5', '15', '17', '18', '19', '13', '11', '25', '27']; // Admin sees all users
      } else {
        return ['1', '2']; // Regular user sees limited users
      }

    case 'Documents':
      if (user.workspaceId === 'workspace-123') {
        return ['10', '11', '12']; // User has access to these documents
      } else {
        return []; // No access to documents in other workspaces
      }

    case 'Projects':
      return ['100', '101']; // User has access to these projects

    default:
      console.warn(`❌ Unknown entity type: ${entityType}`);
      return []; // No access by default
  }
};

// ======================
// SIMPLE ACCESS CONTROLLED getAll
// ======================

export async function simpleAccessControlledGetAll(
  service: any, // Using any to avoid generic complexity
  query: any,
  userContext: UserContext
): Promise<any> {

  console.log('🚀 Starting simple access-controlled getAll...');

  // Step 1: Get entity type from repository metadata
  const entityType = service.repository.metadata.name;
  console.log(`📋 Entity type: ${entityType}`);

  // Step 2: Get accessible IDs using simple access function
  const accessibleIds = mockAccessFunction(entityType, userContext);
  console.log(`🔑 Accessible IDs for ${entityType}:`, accessibleIds);

  // Step 3: If no access, return empty result immediately
  if (accessibleIds.length === 0) {
    console.log('❌ No accessible IDs - returning empty result');
    return {
      meta: {
        pageNumber: query.page?.number || 1,
        totalItems: 0,
        pageSize: query.page?.size || 10,
      },
      data: [],
    };
  }

  // Step 4: Build a simple query with access control
  const primaryColumn = service.typeormUtilsService.currentPrimaryColumn;
  const currentAlias = service.typeormUtilsService.currentAlias;

  console.log(`🔧 Primary column: ${String(primaryColumn)}, Alias: ${currentAlias}`);

  // Step 5: Create a simple query builder with access control
  const queryBuilder = service.repository
    .createQueryBuilder(currentAlias)
    .where(`${currentAlias}.${String(primaryColumn)} IN (:...accessibleIds)`, {
      accessibleIds
    });

  // Step 6: Apply pagination if provided
  const pageSize = query.page?.size || 10;
  const pageNumber = query.page?.number || 1;
  const skip = (pageNumber - 1) * pageSize;

  queryBuilder.offset(skip).limit(pageSize);

  console.log('📊 Generated SQL:', queryBuilder.getQuery());
  console.log('📊 Parameters:', queryBuilder.getParameters());

  // Step 7: Execute the query
  const totalItems = await queryBuilder.getCount();
  const resultData = await queryBuilder.getMany();

  console.log(`✅ Query executed: ${resultData.length} items returned, ${totalItems} total`);

  // Step 8: Return in JSON API format (simplified)
  return {
    meta: {
      pageNumber,
      totalItems,
      pageSize,
    },
    data: resultData,
  };
}

// ======================
// SIMPLE FACTORY INTEGRATION
// ======================

export function createSimpleAccessControlledService(
  originalService: any,
  userContext: UserContext
): any {

  console.log('🏭 Creating simple access-controlled service...');

  // Create a wrapper object
  const wrapper = {
    ...originalService,
    getAll: async function (query: any) {
      return simpleAccessControlledGetAll(originalService, query, userContext);
    }
  };

  console.log('✅ Simple access-controlled service created');
  return wrapper;
}

// ======================
// SIMPLE TEST FUNCTION
// ======================

export function testSimpleAccessControl() {
  console.log('🧪 Testing simple access control...');

  // Test different user scenarios
  const adminUser: UserContext = {
    id: 'user-123',
    workspaceId: 'workspace-123',
    roles: ['admin']
  };

  const regularUser: UserContext = {
    id: 'user-456',
    workspaceId: 'workspace-123',
    roles: ['user']
  };

  console.log('👨‍💼 Admin user access to Users:');
  const adminUserAccess = mockAccessFunction('Users', adminUser);
  console.log('Result:', adminUserAccess);

  console.log('👤 Regular user access to Users:');
  const regularUserAccess = mockAccessFunction('Users', regularUser);
  console.log('Result:', regularUserAccess);

  console.log('📄 Admin user access to Documents:');
  const adminDocAccess = mockAccessFunction('Documents', adminUser);
  console.log('Result:', adminDocAccess);

  console.log('❌ Regular user access to unknown entity:');
  const unknownAccess = mockAccessFunction('UnknownEntity', regularUser);
  console.log('Result:', unknownAccess);
}

// ======================
// USAGE NOTES
// ======================

/*
USAGE:

1. In your controller or service:

const userContext = {
  id: 'user-123',
  workspaceId: 'workspace-123',
  roles: ['admin']
};

const accessService = createSimpleAccessControlledService(originalTypeOrmService, userContext);

const result = await accessService.getAll({
  page: { number: 1, size: 10 }
});

2. To test the access function:

testSimpleAccessControl();

3. Check console for detailed logging of access decisions and SQL generation.

This version avoids all the complex TypeScript generic issues and focuses on 
proving the concept works!
*/
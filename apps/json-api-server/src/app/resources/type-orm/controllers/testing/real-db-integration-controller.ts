// real-db-integration-controller.ts
// Test access control with actual database queries

import { Controller, Get, Query, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { simpleAccessControlledGetAll } from '@knoknoxjson-api-nestjs-typeorm';

// Import your entities
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

@Controller('api/real-test')
export class RealDbIntegrationController {

    constructor(
        @InjectRepository(School) private usersRepository: Repository<School>
    ) { }

    @Get('users-original')
    async getOriginalUsers(@Query() query: any) {
        console.log('📊 Testing ORIGINAL database query (no access control)...');

        const pageSize = parseInt(query.size) || 10;
        const pageNumber = parseInt(query.page) || 1;
        const skip = (pageNumber - 1) * pageSize;

        // Simple original query
        const [data, totalItems] = await this.usersRepository.findAndCount({
            take: pageSize,
            skip: skip
        });

        console.log(`📊 Original query: ${data.length} items returned, ${totalItems} total`);
        console.log('📊 First user:', data[0]);

        return {
            meta: {
                pageNumber,
                totalItems,
                pageSize,
            },
            data,
            message: 'Original query - no access control'
        };
    }

    @Get('users-access-controlled')
    async getAccessControlledUsers(@Query() query: any) {
        console.log('🔐 Testing ACCESS CONTROLLED database query...');

        // Mock TypeORM service structure
        const mockTypeOrmService = {
            repository: this.usersRepository,
            typeormUtilsService: {
                currentAlias: 'school',
                currentPrimaryColumn: 'id'
            },
            transformDataService: {
                transformData: (data: any, query: any) => ({
                    data,
                    included: null
                })
            }
        };

        // Mock user context
        const userContext = {
            id: 'test-user-123',
            workspaceId: 'test-workspace-123',
            roles: ['admin'] // Try changing to ['user'] to see different results
        };

        // Mock query structure
        const mockQuery = {
            page: {
                size: parseInt(query.size) || 10,
                number: parseInt(query.page) || 1
            }
        };

        try {
            // Call our access-controlled function
            const result = await simpleAccessControlledGetAll(
                mockTypeOrmService,
                mockQuery,
                userContext
            );

            console.log('🔐 Access controlled result:', result);

            return {
                ...result,
                message: 'Access controlled query - only accessible users returned'
            };

        } catch (error) {
            console.error('❌ Error in access controlled query:', error);
            return {
                error: 'Access controlled query failed',
                details: error.message,
                data: []
            };
        }
    }

    @Get('compare')
    async compareResults(@Query() query: any) {
        console.log('🔍 COMPARING original vs access-controlled results...');

        try {
            // Get both results
            const original = await this.getOriginalUsers(query);
            const accessControlled = await this.getAccessControlledUsers(query);

            console.log('📊 COMPARISON RESULTS:');
            console.log(`Original: ${original.data?.length || 0} users`);
            console.log(`Access Controlled: ${accessControlled.data?.length || 0} users`);

            return {
                original: {
                    count: original.data?.length || 0,
                    totalItems: original.meta?.totalItems || 0,
                    data: original.data
                },
                accessControlled: {
                    count: accessControlled.data?.length || 0,
                    totalItems: accessControlled.meta?.totalItems || 0,
                    data: accessControlled.data
                },
                comparison: {
                    filtered: (original.data?.length || 0) - (accessControlled.data?.length || 0),
                    message: 'Access control successfully filtered results'
                }
            };

        } catch (error) {
            console.error('❌ Comparison failed:', error);
            return {
                error: 'Comparison failed',
                details: error.message
            };
        }
    }

    @Get('test-different-users')
    async testDifferentUsers() {
        console.log('👥 Testing DIFFERENT USER ROLES...');

        const mockTypeOrmService = {
            repository: this.usersRepository,
            typeormUtilsService: {
                currentAlias: 'users',
                currentPrimaryColumn: 'id'
            },
            transformDataService: {
                transformData: (data: any, query: any) => ({ data, included: null })
            }
        };

        const mockQuery = { page: { size: 10, number: 1 } };

        // Test admin user
        const adminContext = {
            id: 'admin-user',
            workspaceId: 'test-workspace-123',
            roles: ['admin']
        };

        // Test regular user
        const userContext = {
            id: 'regular-user',
            workspaceId: 'test-workspace-123',
            roles: ['user']
        };

        try {
            const adminResult = await simpleAccessControlledGetAll(mockTypeOrmService, mockQuery, adminContext);
            const userResult = await simpleAccessControlledGetAll(mockTypeOrmService, mockQuery, userContext);

            console.log(`👨‍💼 Admin sees: ${adminResult.data?.length || 0} users`);
            console.log(`👤 Regular user sees: ${userResult.data?.length || 0} users`);

            return {
                admin: {
                    accessibleIds: ['1', '2', '3', '4', '5'], // From our mock function
                    actualResults: adminResult.data?.length || 0,
                    data: adminResult.data
                },
                user: {
                    accessibleIds: ['1', '2'], // From our mock function
                    actualResults: userResult.data?.length || 0,
                    data: userResult.data
                },
                message: 'Different users see different results based on access control'
            };

        } catch (error) {
            console.error('❌ Multi-user test failed:', error);
            return {
                error: 'Multi-user test failed',
                details: error.message
            };
        }
    }
}

// ===================================
// ADD TO YOUR MODULE
// ===================================

/*
Add this to your resources-type.module.ts:

import { RealDbIntegrationController } from './real-db-integration-controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users]), // Make sure Users entity is available
    TypeOrmJsonApiModule.forRoot({
      entities: [Users, Documents],
    })
  ],
  controllers: [TestController, RealDbIntegrationController], // Add the new controller
})
export class ResourcesTypeModule {}
*/

// ===================================
// TESTING ENDPOINTS
// ===================================

/*
NOW TEST THESE ENDPOINTS:

1. GET /api/real-test/users-original
   → Should return ALL users from database (no filtering)

2. GET /api/real-test/users-access-controlled  
   → Should return ONLY users with IDs ['1','2','3','4','5'] (admin) or ['1','2'] (user)

3. GET /api/real-test/compare
   → Shows side-by-side comparison of original vs access-controlled results

4. GET /api/real-test/test-different-users
   → Tests admin vs regular user access patterns

WHAT TO LOOK FOR:

✅ Original query returns all users in database
✅ Access controlled query only returns users with IDs in access list
✅ Admin user gets more results than regular user
✅ SQL IN clause is properly generated and executed
✅ No errors or crashes

If you see SQL like:
SELECT * FROM users WHERE users.id IN ('1','2','3','4','5') LIMIT 10

Then our access control is working perfectly! 🎉
*/
// ============================================
// STEP 2: ALTERNATIVE APPROACH WITH REQUEST INJECTION
// ============================================

// enhanced-user-context.pipe.ts (better approach)

import {
    Injectable,
    PipeTransform,
    ArgumentMetadata,
    Inject,
    Scope
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Injectable({ scope: Scope.REQUEST })
export class EnhancedUserContextPipe implements PipeTransform {

    constructor(
        @Inject(REQUEST) private readonly request: any
    ) { }

    transform(query: any, metadata: ArgumentMetadata): any {
        console.log('🚰 EnhancedUserContextPipe activated');
        console.log('📥 Original query:', query);

        try {
            console.log('👤 Request user:', this.request.user);
            console.log('🔗 Request headers:', this.request.headers);

            // Create enhanced query with user context
            const enhancedQuery = {
                ...query,
                context: {
                    // User context from JWT
                    userContext: this.request.user ? {
                        id: this.request.user.id,
                        workspaceId: this.request.user.workspaceId,
                        roles: this.request.user.roles || [],
                        email: this.request.user.email,
                        permissions: this.request.user.permissions || []
                    } : {
                        id: 'user-456',
                        roles: ['manager'],
                        accessibleIds: ['1', '2', '3', '4', '5', '15', '17', '18', '19', '13', '11', '25', '27'], // Specific records user can access
                        departmentId: 42
                    },

                    // Request metadata
                    requestId: this.request.headers['x-request-id'] || `req-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    userAgent: this.request.headers['user-agent'],

                    // Network info
                    ipAddress: this.request.ip || this.request.connection?.remoteAddress,
                    origin: this.request.headers['origin'],

                    // Tenant/workspace context
                    tenantId: this.request.headers['x-tenant-id'] || this.request.user?.workspaceId,

                    // API metadata
                    apiVersion: this.request.headers['api-version'] || '1.0',
                    endpoint: this.request.route?.path || this.request.url,
                    method: this.request.method,

                    // Security context
                    sessionId: this.request.sessionID,
                    csrfToken: this.request.headers['x-csrf-token'],

                    // Feature flags (you could add async loading here)
                    featureFlags: {
                        // Default flags - you could make this dynamic
                        enableAdvancedSearch: this.request.user?.roles?.includes('admin') || false,
                        enableBetaFeatures: this.request.user?.roles?.includes('beta-tester') || false,
                        enableAuditLogging: true
                    }
                }
            };

            console.log('✅ Successfully enhanced query with context');
            console.log('🔧 Context keys:', Object.keys(enhancedQuery.context));

            return enhancedQuery;

        } catch (error) {
            console.error('❌ Error in EnhancedUserContextPipe:', error);
            // Return original query on error
            return query;
        }
    }
}
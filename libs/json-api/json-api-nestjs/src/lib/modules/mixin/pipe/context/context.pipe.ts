// ============================================
// STEP 4: CREATE DEFAULT CONTEXT PIPE
// ============================================

// File: src/lib/pipes/context.pipe.ts
// Create a default context extraction pipe

import {
    Injectable,
    PipeTransform,
    ArgumentMetadata,
    Inject,
    Scope,
    Optional
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

export interface ContextExtractor {
    (request: any): any;
}

@Injectable({ scope: Scope.REQUEST })
export class DefaultContextPipe implements PipeTransform {

    constructor(
        @Inject(REQUEST) private readonly request: any,
        @Optional() @Inject('CONTEXT_EXTRACTOR') private readonly contextExtractor?: ContextExtractor
    ) { }

    transform(query: any, metadata: ArgumentMetadata): any {
        try {
            // If custom context extractor is provided, use it
            if (this.contextExtractor) {
                const customContext = this.contextExtractor(this.request);
                return {
                    ...query,
                    context: customContext
                };
            }

            // Default context extraction
            const context = this.extractDefaultContext(this.request);

            return {
                ...query,
                context
            };

        } catch (error) {
            console.error('❌ Error in DefaultContextPipe:', error);
            return query;
        }
    }

    private extractDefaultContext(request: any): any {
        return {
            userContext: request.user ? {
                id: request.user.id,
                workspaceId: request.user.workspaceId,
                roles: request.user.roles || [],
                permissions: request.user.permissions || [],
                email: request.user.email,
            } : null,

            requestId: request.headers['x-request-id'] || `req-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userAgent: request.headers['user-agent'],
            ipAddress: request.ip || request.connection?.remoteAddress,
            origin: request.headers['origin'],
            tenantId: request.headers['x-tenant-id'] || request.user?.workspaceId,
            apiVersion: request.headers['api-version'] || '1.0',
            endpoint: request.route?.path || request.url,
            method: request.method,
            sessionId: request.sessionID,
            csrfToken: request.headers['x-csrf-token'],

            featureFlags: {
                enableAdvancedSearch: request.user?.roles?.includes('admin') || false,
                enableBetaFeatures: request.user?.roles?.includes('beta-tester') || false,
                enableAuditLogging: true
            }
        };
    }
}
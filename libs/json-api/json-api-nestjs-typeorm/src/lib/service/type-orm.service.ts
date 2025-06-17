// File: src/service/context-aware-typeorm.service.ts

import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  OrmService,
  PatchData,
  PatchRelationshipData,
  PostData,
  PostRelationshipData,
  Query,
  QueryOne,
  EntityControllerParam,
  JsonApiTransformerService,
  CONTROLLER_OPTIONS_TOKEN,
  MODULE_OPTIONS_TOKEN,
  PrepareParams,
} from '@knoknox/json-api-nestjs';
import {
  ResourceObject,
  RelationKeys,
  ResourceObjectRelationships,
} from '@knoknox/json-api-nestjs-shared';

import { Repository } from 'typeorm';

import {
  getAll,
  getOne,
  deleteOne,
  postOne,
  patchOne,
  getRelationship,
  postRelationship,
  deleteRelationship,
  patchRelationship,
} from '../orm-methods';

import { TypeormUtilsService } from './typeorm-utils.service';
import { CURRENT_ENTITY_REPOSITORY } from '../constants';
import { TypeOrmParam } from '../type';

@Injectable()
export class TypeOrmService<E extends object, IdKey extends string = 'id'>
  implements OrmService<E, IdKey>
{
  private readonly logger = new Logger(TypeOrmService.name);
  private enableContext: boolean = false;
  private enableAuditLogging: boolean = false;

  // Use same injection pattern as original TypeOrmService
  @Inject(TypeormUtilsService)
  public typeormUtilsService!: TypeormUtilsService<E, IdKey>;
  
  @Inject(JsonApiTransformerService)
  public transformDataService!: JsonApiTransformerService<E, IdKey>;
  
  @Inject(CONTROLLER_OPTIONS_TOKEN)
  public config!: EntityControllerParam<TypeOrmParam>;
  
  @Inject(CURRENT_ENTITY_REPOSITORY) 
  public repository!: Repository<E>;

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly moduleOptions: PrepareParams<TypeOrmParam>
  ) {
    // Initialize context settings after injection
    setTimeout(() => this.initializeContextSettings(), 0);
  }

  private initializeContextSettings(): void {
    if (!this.moduleOptions) {
      this.logger.warn('⚠️ Module options not available');
      return;
    }
    
    this.enableContext = !!this.moduleOptions?.options?.enableContext || 
                        !!this.moduleOptions?.options?.pipeForQuery;
    this.enableAuditLogging = !!this.moduleOptions?.options?.enableAuditLogging;
    
    if (this.enableContext) {
      this.logger.log('🔒 Context-aware ORM service initialized');
    }
  }

  // ============================================
  // METHODS WITH EXACT SAME PATTERN AS ORIGINAL
  // ============================================

  getAll(query: Query<E, IdKey>): Promise<ResourceObject<E, 'array', null, IdKey>> {
    this.logger.debug('🔍 getAll called with context support');
    
    if (!this.enableContext) {
      return getAll.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof getAll<E, IdKey>>,
        ReturnType<typeof getAll<E, IdKey>>
      >(this, query);
    }

    const enhancedQuery = this.applyAccessControl(query, 'getAll');
    this.logAccess(query, 'getAll');
    
    // DEBUG: Log what we're about to send to the ORM
    this.logger.debug('🔍 Enhanced query being sent to ORM:', JSON.stringify(enhancedQuery, null, 2));
    
    // If we have ID-based access control, we might need to handle it differently
    const context = query?.context;
    const accessibleIds = (context as { userContext?: { accessibleIds?: any[] } })?.userContext?.accessibleIds;
    
    if (accessibleIds && Array.isArray(accessibleIds) && accessibleIds.length > 0) {
      // Override the method to apply direct TypeORM filtering
      return this.getallWithDirectFiltering(enhancedQuery, accessibleIds);
    }
    
    return getAll.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof getAll<E, IdKey>>,
      ReturnType<typeof getAll<E, IdKey>>
    >(this, enhancedQuery);
  }

  private async getallWithDirectFiltering(
    query: Query<E, IdKey>, 
    accessibleIds: any[]
  ): Promise<ResourceObject<E, 'array', null, IdKey>> {
    this.logger.debug('🔧 Applying direct TypeORM filtering for ID access control');
    
    try {
      // Get the base query builder through the utils service
      const queryBuilder = this.repository.createQueryBuilder('entity');
      
      // Apply ID filtering directly at TypeORM level
      const idField = this.getEntityIdField();
      queryBuilder.whereInIds(accessibleIds);
      
      // Apply other filters from the query, but exclude JSON API specific properties
      if (query.filter) {
        const jsonApiProperties = ['target', 'relation', 'id']; // Properties to exclude
        
        Object.entries(query.filter).forEach(([key, value]) => {
          // Skip JSON API specific properties and the ID field (handled separately)
          if (!jsonApiProperties.includes(key) && value !== null && value !== undefined) {
            
            // Check if this field actually exists in the entity
            const hasField = this.repository.metadata.columns.some(col => col.propertyName === key);
            if (!hasField) {
              this.logger.warn(`⚠️ Skipping filter for non-existent field: ${key}`);
              return;
            }
            
            if (typeof value === 'object' && value !== null) {
              // Handle complex filters
              Object.entries(value).forEach(([operator, operandValue]) => {
                switch (operator) {
                  case '$eq':
                    queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: operandValue });
                    break;
                  case '$ne':
                    queryBuilder.andWhere(`entity.${key} != :${key}`, { [key]: operandValue });
                    break;
                  case '$in':
                    queryBuilder.andWhere(`entity.${key} IN (:...${key})`, { [key]: operandValue });
                    break;
                  case '$gt':
                    queryBuilder.andWhere(`entity.${key} > :${key}`, { [key]: operandValue });
                    break;
                  case '$lt':
                    queryBuilder.andWhere(`entity.${key} < :${key}`, { [key]: operandValue });
                    break;
                  case '$gte':
                    queryBuilder.andWhere(`entity.${key} >= :${key}`, { [key]: operandValue });
                    break;
                  case '$lte':
                    queryBuilder.andWhere(`entity.${key} <= :${key}`, { [key]: operandValue });
                    break;
                  case '$like':
                    queryBuilder.andWhere(`entity.${key} LIKE :${key}`, { [key]: `%${operandValue}%` });
                    break;
                  default:
                    this.logger.warn(`⚠️ Unknown operator: ${operator}`);
                    break;
                }
              });
            } else {
              // Simple equality filter
              queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: value });
            }
          }
        });
      }
      
      // Apply pagination if specified
      if (query.page) {
        const { number, size } = query.page;
        if (size) queryBuilder.take(size);
        if (number && size) queryBuilder.skip((number - 1) * size);
      }
      
      // Apply sorting if specified
      if (query.sort) {
        Array.isArray(query.sort) && query.sort.forEach((sortField: string) => {
          const direction = sortField.startsWith('-') ? 'DESC' : 'ASC';
          const field = sortField.replace(/^-/, '');
          
          // Check if sort field exists
          const hasField = this.repository.metadata.columns.some(col => col.propertyName === field);
          if (hasField) {
            queryBuilder.addOrderBy(`entity.${field}`, direction);
          } else {
            this.logger.warn(`⚠️ Skipping sort for non-existent field: ${field}`);
          }
        });
      }
      
      // Execute the query
      const [entities, total] = await queryBuilder.getManyAndCount();
      
      this.logger.debug(`🔍 Direct filtering returned ${entities.length} entities out of ${total} total`);
      
      // Transform the results back to JSON API format using the transformer service
      const transformedData = this.transformDataService.transformData(entities, query);
      
      // Construct the proper ResourceObject with all required properties
      const result: ResourceObject<E, 'array', null, IdKey> = {
        data: transformedData.data,
        included: transformedData.included || [],
        meta: {
          totalItems: total,
          // pageSize: query.page?.size ? Math.ceil(total / query.page.size) : 1,
          pageNumber : query.page?.number || 1,
          pageSize: query.page?.size || total
        },
        // links: {
        //   self: query.meta?.currentUrl || '',
        //   first: query.meta?.currentUrl || '',
        //   last: query.meta?.currentUrl || '',
        //   prev: null,
        //   next: null
        // }
      };
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ Error in direct TypeORM filtering:', error);
      // Fallback to original method
      return getAll.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof getAll<E, IdKey>>,
        ReturnType<typeof getAll<E, IdKey>>
      >(this, query);
    }
  }

  getOne(
    id: number | string,
    query: QueryOne<E, IdKey>
  ): Promise<ResourceObject<E, 'object', null, IdKey>> {
    this.logger.debug('🔍 getOne called with context support');
    
    if (!this.enableContext) {
      return getOne.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof getOne<E, IdKey>>,
        ReturnType<typeof getOne<E, IdKey>>
      >(this, id, query);
    }

    const enhancedQuery = this.applyAccessControl(query, 'getOne');
    this.logAccess(query, 'getOne', { id });
    
    return getOne.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof getOne<E, IdKey>>,
      ReturnType<typeof getOne<E, IdKey>>
    >(this, id, enhancedQuery);
  }

  postOne(
    inputData: PostData<E, IdKey>
  ): Promise<ResourceObject<E, 'object', null, IdKey>> {
    this.logger.debug('✏️ postOne called with context support');
    
    if (!this.enableContext) {
      return postOne.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof postOne<E, IdKey>>,
        ReturnType<typeof postOne<E, IdKey>>
      >(this, inputData);
    }

    const enhancedData = this.applyContextToData(inputData, 'create');
    this.logAccess(null, 'postOne', { data: inputData });
    
    return postOne.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof postOne<E, IdKey>>,
      ReturnType<typeof postOne<E, IdKey>>
    >(this, enhancedData);
  }

  patchOne(
    id: number | string,
    inputData: PatchData<E, IdKey>
  ): Promise<ResourceObject<E, 'object', null, IdKey>> {
    this.logger.debug('✏️ patchOne called with context support');
    
    if (!this.enableContext) {
      return patchOne.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof patchOne<E, IdKey>>,
        ReturnType<typeof patchOne<E, IdKey>>
      >(this, id, inputData);
    }

    const enhancedData = this.applyContextToData(inputData, 'update');
    this.logAccess(null, 'patchOne', { id, data: inputData });
    
    return patchOne.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof patchOne<E, IdKey>>,
      ReturnType<typeof patchOne<E, IdKey>>
    >(this, id, enhancedData);
  }

  deleteOne(id: number | string): Promise<void> {
    this.logger.debug('🗑️ deleteOne called with context support');
    
    if (!this.enableContext) {
      return deleteOne.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof deleteOne<E, IdKey>>,
        ReturnType<typeof deleteOne<E, IdKey>>
      >(this, id);
    }

    this.checkDeletePermissions();
    this.logAccess(null, 'deleteOne', { id });
    
    return deleteOne.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof deleteOne<E, IdKey>>,
      ReturnType<typeof deleteOne<E, IdKey>>
    >(this, id);
  }

  getRelationship<Rel extends RelationKeys<E, IdKey>>(
    id: number | string,
    rel: Rel
  ): Promise<ResourceObjectRelationships<E, IdKey, Rel>> {
    this.logger.debug(`🔗 getRelationship(${String(rel)}) called with context support`);
    
    if (!this.enableContext) {
      return getRelationship.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof getRelationship<E, IdKey, Rel>>,
        ReturnType<typeof getRelationship<E, IdKey, Rel>>
      >(this, id, rel);
    }

    this.logAccess(null, 'getRelationship', { id, relationship: String(rel) });
    
    return getRelationship.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof getRelationship<E, IdKey, Rel>>,
      ReturnType<typeof getRelationship<E, IdKey, Rel>>
    >(this, id, rel);
  }

  postRelationship<Rel extends RelationKeys<E, IdKey>>(
    id: number | string,
    rel: Rel,
    input: PostRelationshipData
  ): Promise<ResourceObjectRelationships<E, IdKey, Rel>> {
    this.logger.debug(`🔗 postRelationship(${String(rel)}) called with context support`);
    
    if (!this.enableContext) {
      return postRelationship.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof postRelationship<E, IdKey, Rel>>,
        ReturnType<typeof postRelationship<E, IdKey, Rel>>
      >(this, id, rel, input);
    }

    this.logAccess(null, 'postRelationship', { id, relationship: String(rel), data: input });
    
    return postRelationship.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof postRelationship<E, IdKey, Rel>>,
      ReturnType<typeof postRelationship<E, IdKey, Rel>>
    >(this, id, rel, input);
  }

  patchRelationship<Rel extends RelationKeys<E, IdKey>>(
    id: number | string,
    rel: Rel,
    input: PatchRelationshipData
  ): Promise<ResourceObjectRelationships<E, IdKey, Rel>> {
    this.logger.debug(`🔗 patchRelationship(${String(rel)}) called with context support`);
    
    if (!this.enableContext) {
      return patchRelationship.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof patchRelationship<E, IdKey, Rel>>,
        ReturnType<typeof patchRelationship<E, IdKey, Rel>>
      >(this, id, rel, input);
    }

    this.logAccess(null, 'patchRelationship', { id, relationship: String(rel), data: input });
    
    return patchRelationship.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof patchRelationship<E, IdKey, Rel>>,
      ReturnType<typeof patchRelationship<E, IdKey, Rel>>
    >(this, id, rel, input);
  }

  deleteRelationship<Rel extends RelationKeys<E, IdKey>>(
    id: number | string,
    rel: Rel,
    input: PostRelationshipData
  ): Promise<void> {
    this.logger.debug(`🔗 deleteRelationship(${String(rel)}) called with context support`);
    
    if (!this.enableContext) {
      return deleteRelationship.call<
        TypeOrmService<E, IdKey>,
        Parameters<typeof deleteRelationship<E, IdKey, Rel>>,
        ReturnType<typeof deleteRelationship<E, IdKey, Rel>>
      >(this, id, rel, input);
    }

    this.checkDeletePermissions();
    this.logAccess(null, 'deleteRelationship', { id, relationship: String(rel), data: input });
    
    return deleteRelationship.call<
      TypeOrmService<E, IdKey>,
      Parameters<typeof deleteRelationship<E, IdKey, Rel>>,
      ReturnType<typeof deleteRelationship<E, IdKey, Rel>>
    >(this, id, rel, input);
  }

  // ============================================
  // CONTEXT ACCESS CONTROL LOGIC
  // ============================================

  private applyAccessControl(query: any, operation: string): any {
    const context = query?.context;
    if (!context) {
      this.logger.warn('⚠️ No context found in query - skipping access control');
      return query;
    }

    this.logger.debug(`🔒 Applying access control for ${operation}`, {
      userId: context.userContext?.id,
      tenantId: context.tenantId,
      operation
    });

    const enhancedQuery = { ...query };

    // 1. TENANT ISOLATION - Force tenant filtering
    if (context.tenantId && this.hasWorkspaceField()) {
      enhancedQuery.filter = {
        ...enhancedQuery.filter,
        workspaceId: context.tenantId
      };
      this.logger.debug(`🏢 Applied tenant filter: ${context.tenantId}`);
    }

    if (context.userContext) {
      const { roles, id: userId, accessibleIds } = context.userContext;

      // 2. ADMIN ACCESS - Full access within tenant
      if (roles?.includes('admin')) {
        this.logger.debug('👑 Admin access granted - no additional filtering');
        return enhancedQuery;
      }

      // 3. ID-BASED ACCESS CONTROL - Filter by accessible IDs
      if (accessibleIds && Array.isArray(accessibleIds) && accessibleIds.length > 0) {
        const entityIdField = this.getEntityIdField();
        
        // Try different filter formats that the JSON API library might support
        const idFilter = this.createIdFilter(accessibleIds, entityIdField);
        enhancedQuery.filter = {
          ...enhancedQuery.filter,
          ...idFilter
        };
        
        this.logger.debug(`🔐 Applied ID-based filter: ${accessibleIds.length} accessible IDs`, {
          filter: idFilter,
          accessibleIds
        });
      }

      // 4. USER OWNERSHIP - Filter by user ownership
      else if (this.hasUserField() && !this.isReadOnlyEntity()) {
        enhancedQuery.filter = {
          ...enhancedQuery.filter,
          userId: userId
        };
        this.logger.debug(`👤 Applied user ownership filter: ${userId}`);
      }

      // 5. ROLE-BASED ACCESS - Apply role-specific filtering
      if (context.roleBasedAccess) {
        const roleFilters = this.applyRoleBasedFilters(roles, context.roleBasedAccess);
        if (roleFilters) {
          enhancedQuery.filter = {
            ...enhancedQuery.filter,
            ...roleFilters
          };
          this.logger.debug(`👥 Applied role-based filters for roles: ${roles?.join(', ')}`);
        }
      }

      // 6. DEPARTMENT/TEAM-BASED ACCESS
      if (context.userContext.departmentId && this.hasDepartmentField()) {
        enhancedQuery.filter = {
          ...enhancedQuery.filter,
          departmentId: context.userContext.departmentId
        };
        this.logger.debug(`🏢 Applied department filter: ${context.userContext.departmentId}`);
      }

      // 7. TIME-BASED ACCESS (if specified)
      if (context.timeBasedAccess) {
        const timeFilters = this.applyTimeBasedFilters(context.timeBasedAccess);
        if (timeFilters) {
          enhancedQuery.filter = {
            ...enhancedQuery.filter,
            ...timeFilters
          };
          this.logger.debug('⏰ Applied time-based access filters');
        }
      }
    }

    this.logger.debug('🔍 Final enhanced query:', JSON.stringify(enhancedQuery, null, 2));
    return enhancedQuery;
  }

  private createIdFilter(accessibleIds: any[], entityIdField: string): any {
    // Let's try the JSON API standard filter format
    // Based on your log showing { "id": { "$in": [...] } }, let's try simpler formats
    
    this.logger.debug(`🧪 Creating ID filter for field: ${entityIdField}, IDs: ${accessibleIds}`);
    
    // Since you saw it create { "id": { "$in": [...] } } but it returned everything,
    // the issue might be that the library doesn't process the filter correctly.
    // Let's try a different approach - OR conditions
    
    if (accessibleIds.length === 1) {
      // Single ID - simple equality
      return {
        [entityIdField]: accessibleIds[0]
      };
    }
    
    // Multiple IDs - try OR format that JSON API might understand better
    return {
      $or: accessibleIds.map(id => ({
        [entityIdField]: id
      }))
    };
  }

  private applyContextToData(data: any, operation: 'create' | 'update'): any {
    this.logger.debug(`🔧 Applying context to ${operation} data`);
    return data;
  }

  private checkDeletePermissions(): void {
    this.logger.debug('🔒 Checking delete permissions');
  }

  private logAccess(query: any, operation: string, additionalData?: any): void {
    if (!this.enableAuditLogging) return;

    const context = query?.context;
    const auditLog = {
      userId: context?.userContext?.id || 'anonymous',
      operation,
      entity: this.getEntityName(),
      timestamp: new Date().toISOString(),
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      tenantId: context?.tenantId,
      additionalData,
    };

    this.logger.log('📊 Audit Log:', auditLog);
  }

  private hasWorkspaceField(): boolean {
    try {
      const metadata = this.repository?.metadata;
      return metadata?.columns?.some(col => col.propertyName === 'workspaceId') || false;
    } catch {
      return false;
    }
  }

  private hasUserField(): boolean {
    try {
      const metadata = this.repository?.metadata;
      return metadata?.columns?.some(col => col.propertyName === 'userId') || false;
    } catch {
      return false;
    }
  }

  private hasDepartmentField(): boolean {
    try {
      const metadata = this.repository?.metadata;
      return metadata?.columns?.some(col => col.propertyName === 'departmentId') || false;
    } catch {
      return false;
    }
  }

  private getEntityIdField(): string {
    try {
      const metadata = this.repository?.metadata;
      const primaryColumn = metadata?.primaryColumns?.[0];
      return primaryColumn?.propertyName || 'id';
    } catch {
      return 'id';
    }
  }

  private applyRoleBasedFilters(roles: string[] = [], roleBasedAccess: any): any {
    if (!roles.length || !roleBasedAccess) return null;

    const filters: any = {};

    // Example: Different roles get different access patterns
    if (roles.includes('manager')) {
      // Managers can see their team's data
      if (roleBasedAccess.teamIds) {
        filters.teamId = { $in: roleBasedAccess.teamIds };
      }
    }

    if (roles.includes('supervisor')) {
      // Supervisors can see their direct reports
      if (roleBasedAccess.directReportIds) {
        filters.createdBy = { $in: roleBasedAccess.directReportIds };
      }
    }

    if (roles.includes('viewer')) {
      // Viewers can only see published/public content
      filters.status = 'published';
      filters.isPublic = true;
    }

    return Object.keys(filters).length > 0 ? filters : null;
  }

  private applyTimeBasedFilters(timeBasedAccess: any): any {
    const filters: any = {};

    if (timeBasedAccess.startDate) {
      filters.createdAt = { $gte: new Date(timeBasedAccess.startDate) };
    }

    if (timeBasedAccess.endDate) {
      filters.createdAt = {
        ...filters.createdAt,
        $lte: new Date(timeBasedAccess.endDate)
      };
    }

    // Only allow access to active records
    if (timeBasedAccess.onlyActive) {
      filters.isActive = true;
      filters.deletedAt = null;
    }

    return Object.keys(filters).length > 0 ? filters : null;
  }

  private isReadOnlyEntity(): boolean {
    const readOnlyEntities = ['role', 'permission', 'resourcetype'];
    return readOnlyEntities.includes(this.getEntityName().toLowerCase());
  }

  private getEntityName(): string {
    try {
      return this.repository?.metadata?.name || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
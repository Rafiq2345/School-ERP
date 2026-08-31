import { prisma } from '../db/prisma';

export class CustomFieldService {
  /**
   * Retrieves all active custom field definitions for a given entity type (e.g. STUDENT).
   */
  public static async getCustomFieldsForEntity(tenantId: string, entityType: string = 'STUDENT') {
    return prisma.customFieldDefinition.findMany({
      where: {
        tenantId,
        entityType,
        isActive: true,
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Soft deletes or disables a custom field definition.
   */
  public static async deleteCustomField(tenantId: string, fieldId: string, userId?: string) {
    const existing = await prisma.customFieldDefinition.findFirst({
      where: { id: fieldId, tenantId },
    });
    if (!existing) throw new Error('Custom field definition not found.');

    const deleted = await prisma.customFieldDefinition.update({
      where: { id: fieldId },
      data: { isActive: false },
    });

    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            module: 'STUDENTS',
            entityType: 'CUSTOM_FIELD',
            entityId: fieldId,
            action: 'DELETE',
            changeSummary: `Disabled custom field '${existing.label}' (${existing.fieldKey})`,
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return deleted;
  }
}

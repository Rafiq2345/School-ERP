import { prisma } from '../db/prisma';
import {
  MODULE_REGISTRY,
  getAllModules,
  isModuleEnabledForTenant,
  isFeatureEnabledForTenant,
} from '../modules/module-registry';
import { ModuleCode, ProductTier } from '../types';

export interface ModuleStatusDTO {
  code: ModuleCode;
  nameEn: string;
  nameUr: string;
  descriptionEn: string;
  category: string;
  isBaseModule: boolean;
  isProtected: boolean;
  defaultTiers: ProductTier[];
  isEnabled: boolean;
  dependsOn?: ModuleCode[];
  features: {
    key: string;
    nameEn: string;
    nameUr: string;
    descriptionEn: string;
    isBaseFeature: boolean;
    isEnabled: boolean;
    dependsOn?: string[];
  }[];
}

export class ModuleSettingsService {
  private static PROTECTED_MODULES: ModuleCode[] = ['CONFIG', 'SECURITY', 'AUDIT', 'PUBLISHING'];

  public static async getTenantModuleSettings(
    tenantId: string,
    tier: ProductTier = 'BASE'
  ): Promise<ModuleStatusDTO[]> {
    const toggles = await prisma.moduleFeatureToggle.findMany({
      where: { tenantId },
    });

    const moduleOverrideMap = new Map<string, boolean>();
    const featureOverrideMap = new Map<string, Record<string, boolean>>();

    for (const t of toggles) {
      moduleOverrideMap.set(t.moduleCode, t.isEnabled);
      if (t.configOverrides && typeof t.configOverrides === 'object') {
        featureOverrideMap.set(t.moduleCode, t.configOverrides as Record<string, boolean>);
      }
    }

    const allModules = getAllModules();
    const result: ModuleStatusDTO[] = [];

    for (const mod of allModules) {
      const isProtected = this.PROTECTED_MODULES.includes(mod.code);

      let isEnabled = isModuleEnabledForTenant(
        mod.code,
        tier,
        Object.fromEntries(moduleOverrideMap.entries())
      );

      if (isProtected) {
        isEnabled = true;
      }

      const featOverrides = featureOverrideMap.get(mod.code);
      const features = (mod.features || []).map((f) => {
        const featureEnabled = isFeatureEnabledForTenant(
          mod.code,
          f.key,
          tier,
          isEnabled,
          featOverrides
        );

        return {
          key: f.key,
          nameEn: f.nameEn,
          nameUr: f.nameUr,
          descriptionEn: f.descriptionEn,
          isBaseFeature: f.isBaseFeature,
          isEnabled: featureEnabled,
          dependsOn: f.dependsOn,
        };
      });

      result.push({
        code: mod.code,
        nameEn: mod.nameEn,
        nameUr: mod.nameUr,
        descriptionEn: mod.descriptionEn,
        category: mod.category,
        isBaseModule: mod.isBaseModule,
        isProtected,
        defaultTiers: mod.defaultTiers,
        isEnabled,
        dependsOn: mod.dependsOn,
        features,
      });
    }

    return result;
  }

  public static async toggleModule(
    tenantId: string,
    moduleCode: ModuleCode,
    isEnabled: boolean,
    userId?: string
  ) {
    if (this.PROTECTED_MODULES.includes(moduleCode) && !isEnabled) {
      throw new Error(
        `Safeguard Protection: The "${MODULE_REGISTRY[moduleCode]?.nameEn || moduleCode}" core module is required for ERP operations and cannot be disabled.`
      );
    }

    if (!isEnabled) {
      const currentSettings = await this.getTenantModuleSettings(tenantId);
      const dependentModules = currentSettings.filter(
        (m) => m.isEnabled && m.dependsOn && m.dependsOn.includes(moduleCode)
      );

      if (dependentModules.length > 0) {
        const names = dependentModules.map((m) => m.nameEn).join(', ');
        throw new Error(
          `Cannot disable "${MODULE_REGISTRY[moduleCode]?.nameEn}" because the following active modules depend on it: ${names}. Please disable them first.`
        );
      }
    }

    if (isEnabled) {
      const def = MODULE_REGISTRY[moduleCode];
      if (def?.dependsOn && def.dependsOn.length > 0) {
        const currentSettings = await this.getTenantModuleSettings(tenantId);
        const missingPrereqs = def.dependsOn.filter((prereq) => {
          const found = currentSettings.find((m) => m.code === prereq);
          return !found || !found.isEnabled;
        });

        if (missingPrereqs.length > 0) {
          const prereqNames = missingPrereqs
            .map((p) => MODULE_REGISTRY[p]?.nameEn || p)
            .join(', ');
          throw new Error(
            `Cannot enable "${def.nameEn}" because the prerequisite module "${prereqNames}" is currently disabled. Please enable it first.`
          );
        }
      }
    }

    const record = await prisma.moduleFeatureToggle.upsert({
      where: { tenantId_moduleCode: { tenantId, moduleCode } },
      update: { isEnabled },
      create: {
        tenantId,
        moduleCode,
        isEnabled,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: isEnabled ? 'MODULE_ENABLE' : 'MODULE_DISABLE',
      entityType: 'MODULE_FEATURE_TOGGLE',
      entityId: moduleCode,
      newValues: { moduleCode, isEnabled },
      changeSummary: `${isEnabled ? 'Enabled' : 'Disabled'} module "${MODULE_REGISTRY[moduleCode]?.nameEn || moduleCode}"`,
    });

    return record;
  }

  public static async toggleFeature(
    tenantId: string,
    moduleCode: ModuleCode,
    featureKey: string,
    isEnabled: boolean,
    userId?: string
  ) {
    const def = MODULE_REGISTRY[moduleCode];
    if (!def) throw new Error(`Module "${moduleCode}" does not exist.`);

    const feat = (def.features || []).find((f) => f.key === featureKey);
    if (!feat) throw new Error(`Feature "${featureKey}" not found in module "${moduleCode}".`);

    const toggleRecord = await prisma.moduleFeatureToggle.findUnique({
      where: { tenantId_moduleCode: { tenantId, moduleCode } },
    });

    const currentOverrides: Record<string, boolean> =
      (toggleRecord?.configOverrides as Record<string, boolean>) || {};

    if (!isEnabled) {
      const dependentFeatures = (def.features || []).filter((f) => {
        const isDependentActive =
          currentOverrides[f.key] !== undefined ? currentOverrides[f.key] : f.isBaseFeature;
        return isDependentActive && f.dependsOn && f.dependsOn.includes(featureKey);
      });

      if (dependentFeatures.length > 0) {
        const depNames = dependentFeatures.map((f) => f.nameEn).join(', ');
        throw new Error(
          `Cannot disable "${feat.nameEn}" because the active feature "${depNames}" depends on it.`
        );
      }
    }

    if (isEnabled && feat.dependsOn && feat.dependsOn.length > 0) {
      for (const reqKey of feat.dependsOn) {
        const isReqActive =
          currentOverrides[reqKey] !== undefined
            ? currentOverrides[reqKey]
            : (def.features || []).find((f) => f.key === reqKey)?.isBaseFeature;

        if (!isReqActive) {
          const reqDef = (def.features || []).find((f) => f.key === reqKey);
          throw new Error(
            `Cannot enable "${feat.nameEn}" because the prerequisite feature "${reqDef?.nameEn || reqKey}" is currently disabled.`
          );
        }
      }
    }

    const updatedOverrides = {
      ...currentOverrides,
      [featureKey]: isEnabled,
    };

    const record = await prisma.moduleFeatureToggle.upsert({
      where: { tenantId_moduleCode: { tenantId, moduleCode } },
      update: { configOverrides: updatedOverrides },
      create: {
        tenantId,
        moduleCode,
        isEnabled: true,
        configOverrides: updatedOverrides,
      },
    });

    await this.logAudit({
      tenantId,
      userId,
      action: isEnabled ? 'FEATURE_ENABLE' : 'FEATURE_DISABLE',
      entityType: 'MODULE_FEATURE_TOGGLE',
      entityId: `${moduleCode}.${featureKey}`,
      newValues: { moduleCode, featureKey, isEnabled },
      changeSummary: `${isEnabled ? 'Enabled' : 'Disabled'} feature "${feat.nameEn}" in "${def.nameEn}"`,
    });

    return record;
  }

  public static async requireModule(tenantId: string, moduleCode: ModuleCode) {
    if (this.PROTECTED_MODULES.includes(moduleCode)) return true;

    const toggle = await prisma.moduleFeatureToggle.findUnique({
      where: { tenantId_moduleCode: { tenantId, moduleCode } },
    });

    const isExplicitlyDisabled = toggle && toggle.isEnabled === false;
    if (isExplicitlyDisabled) {
      throw new Error(`The module "${MODULE_REGISTRY[moduleCode]?.nameEn || moduleCode}" is disabled for this school.`);
    }

    const def = MODULE_REGISTRY[moduleCode];
    if (!def) {
      throw new Error(`Module "${moduleCode}" is not registered.`);
    }

    return true;
  }

  public static async requireFeature(
    tenantId: string,
    moduleCode: ModuleCode,
    featureKey: string
  ) {
    await this.requireModule(tenantId, moduleCode);

    const toggle = await prisma.moduleFeatureToggle.findUnique({
      where: { tenantId_moduleCode: { tenantId, moduleCode } },
    });

    const overrides: Record<string, boolean> = (toggle?.configOverrides as Record<string, boolean>) || {};
    if (overrides[featureKey] === false) {
      throw new Error(`The feature "${featureKey}" is currently disabled in "${moduleCode}".`);
    }

    return true;
  }

  private static async logAudit(params: {
    tenantId: string;
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
    changeSummary?: string;
  }) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId || 'usr-admin-01',
          module: 'CONFIG',
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          oldValues: params.oldValues || null,
          newValues: params.newValues || null,
          changeSummary: params.changeSummary || null,
        },
      });
    } catch {
      // Non-blocking
    }
  }
}

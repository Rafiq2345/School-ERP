import { prisma } from '../db/prisma';

export type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'MULTISELECT' | 'CHECKBOX' | 'RADIO' | 'FILE' | 'IMAGE' | 'TEXTAREA';

export interface DetectedField {
  id: string; // temporary client/detected ID
  rawLabel: string;
  fieldLabel: string;
  fieldKey: string;
  fieldType: FieldType;
  isRequired: boolean;
  section: string;
  options?: string[]; // for DROPDOWN / MULTISELECT
  action: 'MAP_TO_STANDARD' | 'CREATE_CUSTOM' | 'IGNORE' | 'ALREADY_EXISTS';
  standardMatchKey?: string;
  standardMatchDescription?: string;
  confidenceScore: number;
  notes?: string;
}

export interface StandardFieldDefinition {
  key: string;
  label: string;
  aliases: string[];
  type: FieldType;
  section: string;
  targetModel: 'Student' | 'Guardian' | 'Enrollment' | 'PreviousSchool';
  targetField: string;
  description: string;
}

export const STANDARD_STUDENT_FIELDS: StandardFieldDefinition[] = [
  {
    key: 'first_name',
    label: 'Student Name / First Name',
    aliases: ['student name', 'candidate name', 'name of student', 'student full name', 'first name', 'applicant name', 'طالب علم کا نام'],
    type: 'TEXT',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'firstNameEn',
    description: 'Mapped to primary Student English Name',
  },
  {
    key: 'last_name',
    label: 'Last Name / Surname',
    aliases: ['last name', 'surname', 'family name', 'ولدیت'],
    type: 'TEXT',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'lastNameEn',
    description: 'Mapped to Student Last Name',
  },
  {
    key: 'urdu_name',
    label: 'Full Name (Urdu)',
    aliases: ['name in urdu', 'urdu name', 'نام اردو میں', 'مکمل نام اردو'],
    type: 'TEXT',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'fullNameUr',
    description: 'Mapped to Student Bilingual Urdu Name',
  },
  {
    key: 'gender',
    label: 'Gender / Sex',
    aliases: ['gender', 'sex', 'boy / girl', 'جنس'],
    type: 'DROPDOWN',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'gender',
    description: 'Mapped to standard Gender (MALE, FEMALE, OTHER)',
  },
  {
    key: 'dob',
    label: 'Date of Birth',
    aliases: ['date of birth', 'dob', 'birth date', 'birthdate', 'تاریخ پیدائش'],
    type: 'DATE',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'dob',
    description: 'Mapped to Student Date of Birth',
  },
  {
    key: 'blood_group',
    label: 'Blood Group',
    aliases: ['blood group', 'blood type', 'rh factor', 'بلڈ گروپ'],
    type: 'DROPDOWN',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'bloodGroup',
    description: 'Mapped to standard Blood Group enum',
  },
  {
    key: 'national_id',
    label: 'B-Form / CNIC / National ID',
    aliases: ['b-form', 'b form', 'bform', 'cnic', 'national id', 'passport no', 'bay form', 'ب فارم نمبر', 'شناختی کارڈ نمبر'],
    type: 'TEXT',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'nationalId',
    description: 'Mapped to Student B-Form / National Identity Number',
  },
  {
    key: 'religion',
    label: 'Religion',
    aliases: ['religion', 'faith', 'مذہب'],
    type: 'TEXT',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'religion',
    description: 'Mapped to Student Religion field',
  },
  {
    key: 'nationality',
    label: 'Nationality',
    aliases: ['nationality', 'citizenship', 'country of origin', 'قومیت'],
    type: 'TEXT',
    section: 'Student Personal Details',
    targetModel: 'Student',
    targetField: 'nationality',
    description: 'Mapped to Student Nationality',
  },
  {
    key: 'admission_date',
    label: 'Admission Date',
    aliases: ['admission date', 'date of admission', 'enrolled date', 'تاریخ داخلہ'],
    type: 'DATE',
    section: 'Academic Information',
    targetModel: 'Student',
    targetField: 'admissionDate',
    description: 'Mapped to official Student Admission Date',
  },
  {
    key: 'class_grade',
    label: 'Class / Grade Applied',
    aliases: ['class', 'grade', 'class applied', 'grade seeking admission', 'admission sought for class', 'جماعت'],
    type: 'DROPDOWN',
    section: 'Academic Information',
    targetModel: 'Enrollment',
    targetField: 'classId',
    description: 'Mapped to central School Class master',
  },
  {
    key: 'section',
    label: 'Section',
    aliases: ['section', 'classroom', 'سیکشن'],
    type: 'DROPDOWN',
    section: 'Academic Information',
    targetModel: 'Enrollment',
    targetField: 'sectionId',
    description: 'Mapped to Class Section master',
  },
  {
    key: 'roll_number',
    label: 'Roll Number',
    aliases: ['roll no', 'roll number', 'class roll', 'رول نمبر'],
    type: 'TEXT',
    section: 'Academic Information',
    targetModel: 'Enrollment',
    targetField: 'rollNumber',
    description: 'Mapped to Class Roll Number',
  },
  {
    key: 'father_name',
    label: "Father's Name / Guardian Name",
    aliases: ['father name', "father's name", 'guardian name', 'parent name', 'name of father', 'والد کا نام', 'سرپرست کا نام'],
    type: 'TEXT',
    section: 'Parent/Guardian',
    targetModel: 'Guardian',
    targetField: 'fullNameEn',
    description: 'Mapped to Guardian Full Name (supports shared sibling family)',
  },
  {
    key: 'father_cnic',
    label: "Father's CNIC / National ID",
    aliases: ['father cnic', "father's cnic", 'guardian cnic', 'parent cnic', 'father id', 'والد کا شناختی کارڈ نمبر'],
    type: 'TEXT',
    section: 'Parent/Guardian',
    targetModel: 'Guardian',
    targetField: 'nationalId',
    description: 'Mapped to Guardian CNIC (enables auto-sibling linking)',
  },
  {
    key: 'father_phone',
    label: "Father's Mobile / Phone",
    aliases: ['father phone', "father's phone", 'father mobile', 'contact number', 'parent phone', 'primary phone', 'فون نمبر', 'موبائل نمبر'],
    type: 'TEXT',
    section: 'Parent/Guardian',
    targetModel: 'Guardian',
    targetField: 'primaryPhone',
    description: 'Mapped to primary Parent / Guardian Contact Number',
  },
  {
    key: 'father_occupation',
    label: "Father's Occupation / Profession",
    aliases: ['father occupation', "father's occupation", 'occupation', 'profession', 'business', 'job title', 'پیشہ'],
    type: 'TEXT',
    section: 'Parent/Guardian',
    targetModel: 'Guardian',
    targetField: 'occupation',
    description: 'Mapped to Guardian Occupation',
  },
  {
    key: 'annual_income',
    label: 'Annual Income',
    aliases: ['annual income', 'monthly income', 'household income', 'salary', 'آمدنی'],
    type: 'NUMBER',
    section: 'Parent/Guardian',
    targetModel: 'Guardian',
    targetField: 'annualIncome',
    description: 'Mapped to Guardian Annual Income for financial profiling',
  },
  {
    key: 'residential_address',
    label: 'Residential Address',
    aliases: ['address', 'residential address', 'home address', 'current address', 'present address', 'postal address', 'رہائشی پتہ'],
    type: 'TEXTAREA',
    section: 'Address',
    targetModel: 'Student',
    targetField: 'currentAddressEn',
    description: 'Mapped to Student Residential Address',
  },
  {
    key: 'emergency_phone',
    label: 'Emergency Contact Phone',
    aliases: ['emergency contact', 'emergency phone', 'emergency number', 'alternate phone', 'دوسرا رابطہ نمبر'],
    type: 'TEXT',
    section: 'Contact Information',
    targetModel: 'Student',
    targetField: 'emergencyContactPhone',
    description: 'Mapped to Student Emergency Contact Phone',
  },
  {
    key: 'previous_school',
    label: 'Previous School Attended',
    aliases: ['previous school', 'last school attended', 'name of previous school', 'سابقہ اسکول کا نام'],
    type: 'TEXT',
    section: 'Previous School',
    targetModel: 'PreviousSchool',
    targetField: 'schoolName',
    description: 'Mapped to Previous School Academic Background record',
  },
  {
    key: 'previous_slc_no',
    label: 'School Leaving Certificate (SLC) No.',
    aliases: ['slc no', 'slc number', 'leaving certificate no', 'transfer certificate no', 'ٹی سی نمبر'],
    type: 'TEXT',
    section: 'Previous School',
    targetModel: 'PreviousSchool',
    targetField: 'slcNumber',
    description: 'Mapped to Prior Institution SLC Number',
  },
];

export class FormAnalyzerService {
  /**
   * Helper to normalize text for string similarity matching.
   */
  private static normalizeText(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Matches a raw label against known standard fields.
   */
  public static matchStandardField(rawLabel: string): StandardFieldDefinition | null {
    const clean = this.normalizeText(rawLabel);
    if (!clean) return null;

    // 1. Exact match first
    for (const std of STANDARD_STUDENT_FIELDS) {
      for (const alias of std.aliases) {
        const cleanAlias = this.normalizeText(alias);
        if (cleanAlias && clean === cleanAlias) {
          return std;
        }
      }
    }

    // 2. Substring match (require at least 4 characters to prevent false positives)
    for (const std of STANDARD_STUDENT_FIELDS) {
      for (const alias of std.aliases) {
        const cleanAlias = this.normalizeText(alias);
        if (cleanAlias && cleanAlias.length >= 4) {
          if (clean.includes(cleanAlias) || cleanAlias.includes(clean)) {
            return std;
          }
        }
      }
    }

    return null;
  }

  /**
   * Analyzes an uploaded school form document (or text buffer/template).
   * Extracts fields, attempts standard field matching, detects custom fields, and assigns sections.
   */
  public static async analyzeFormDocument(
    tenantId: string,
    params: {
      fileName: string;
      fileType?: string;
      rawContentText?: string;
      templatePreset?: string;
    },
    userId?: string
  ): Promise<{ detectedFields: DetectedField[]; summary: { total: number; standardMapped: number; customSuggested: number } }> {
    // 1. Fetch existing custom fields for tenant to avoid re-suggesting already created custom keys
    const existingCustom = await prisma.customFieldDefinition.findMany({
      where: { tenantId, entityType: 'STUDENT' },
      select: { fieldKey: true, label: true },
    });
    const existingKeys = new Set(existingCustom.map((c) => c.fieldKey));

    // 2. Parse candidate field list (from provided text or intelligent template parser)
    const rawItems = this.extractRawFieldCandidates(params);

    const detectedFields: DetectedField[] = [];
    let standardMappedCount = 0;
    let customSuggestedCount = 0;

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const stdMatch = this.matchStandardField(item.label);
      const generatedKey = this.generateFieldKey(item.label);

      let action: DetectedField['action'] = 'CREATE_CUSTOM';
      let standardMatchKey: string | undefined;
      let standardMatchDescription: string | undefined;
      let confidence = 0.88;

      if (stdMatch) {
        action = 'MAP_TO_STANDARD';
        standardMatchKey = stdMatch.key;
        standardMatchDescription = stdMatch.description;
        confidence = 0.96;
        standardMappedCount++;
      } else if (existingKeys.has(generatedKey)) {
        action = 'ALREADY_EXISTS';
        notes: 'Custom field with this key already exists in School ERP.';
        confidence = 0.99;
      } else {
        action = 'CREATE_CUSTOM';
        customSuggestedCount++;
      }

      detectedFields.push({
        id: `fld-${i + 1}-${Date.now().toString(36)}`,
        rawLabel: item.label,
        fieldLabel: item.label,
        fieldKey: stdMatch ? stdMatch.key : generatedKey,
        fieldType: stdMatch ? stdMatch.type : item.type || 'TEXT',
        isRequired: item.isRequired ?? false,
        section: stdMatch ? stdMatch.section : item.section || 'Other Information',
        options: item.options || undefined,
        action,
        standardMatchKey,
        standardMatchDescription,
        confidenceScore: confidence,
      });
    }

    // 3. Audit Log
    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            module: 'STUDENTS',
            entityType: 'FORM_ANALYZER',
            entityId: params.fileName,
            action: 'CREATE',
            changeSummary: `Uploaded school admission form '${params.fileName}' and analyzed ${detectedFields.length} detected fields.`,
            newValues: {
              fileName: params.fileName,
              totalDetected: detectedFields.length,
              standardMapped: standardMappedCount,
              customSuggested: customSuggestedCount,
            },
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return {
      detectedFields,
      summary: {
        total: detectedFields.length,
        standardMapped: standardMappedCount,
        customSuggested: customSuggestedCount,
      },
    };
  }

  /**
   * Approves and commits selected custom fields into custom_field_definitions and custom_field_options tables.
   */
  public static async approveCustomFields(
    tenantId: string,
    fields: {
      fieldLabel: string;
      fieldKey: string;
      fieldType: FieldType;
      isRequired?: boolean;
      section: string;
      options?: string[];
      sortOrder?: number;
    }[],
    userId?: string
  ) {
    if (!fields || fields.length === 0) {
      return { createdCount: 0, fields: [] };
    }

    const createdList: any[] = [];

    // Execute in transaction
    await prisma.$transaction(async (tx) => {
      let orderIndex = 1;
      for (const f of fields) {
        const cleanKey = this.generateFieldKey(f.fieldKey || f.fieldLabel);

        // Check if already exists for this tenant
        const existing = await tx.customFieldDefinition.findFirst({
          where: { tenantId, entityType: 'STUDENT', fieldKey: cleanKey },
        });

        if (existing) {
          continue; // skip duplicate without error
        }

        const fieldDef = await tx.customFieldDefinition.create({
          data: {
            tenantId,
            entityType: 'STUDENT',
            fieldKey: cleanKey,
            label: f.fieldLabel.trim(),
            fieldType: f.fieldType,
            isRequired: Boolean(f.isRequired),
            sortOrder: f.sortOrder ?? orderIndex++,
            validationRules: {
              section: f.section || 'Other Information',
              detectedFromForm: true,
            },
          },
        });

        // If field has dropdown options
        if (['DROPDOWN', 'MULTISELECT', 'RADIO'].includes(f.fieldType) && f.options && f.options.length > 0) {
          let optOrder = 1;
          for (const opt of f.options) {
            if (opt && opt.trim()) {
              await tx.customFieldOption.create({
                data: {
                  tenantId,
                  customFieldDefinitionId: fieldDef.id,
                  label: opt.trim(),
                  value: this.generateFieldKey(opt.trim()),
                  sortOrder: optOrder++,
                },
              });
            }
          }
        }

        createdList.push(fieldDef);
      }
    });

    // Audit Log
    if (userId && createdList.length > 0) {
      try {
        await prisma.auditLog.create({
          data: {
            tenantId,
            userId,
            module: 'STUDENTS',
            entityType: 'CUSTOM_FIELDS',
            entityId: `batch-${Date.now()}`,
            action: 'CREATE',
            changeSummary: `Approved and created ${createdList.length} custom field definitions from AI form analyzer.`,
            newValues: createdList.map((c) => ({ key: c.fieldKey, label: c.label, type: c.fieldType })),
          },
        });
      } catch {
        // Non-blocking
      }
    }

    return { createdCount: createdList.length, fields: createdList };
  }

  /**
   * Helper to generate a clean snake_case identifier key.
   */
  public static generateFieldKey(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s_]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .slice(0, 48);
  }

  /**
   * Internal parser extracting candidate field items from content or template presets.
   */
  private static extractRawFieldCandidates(params: {
    fileName: string;
    fileType?: string;
    rawContentText?: string;
    templatePreset?: string;
  }): { label: string; type?: FieldType; section?: string; options?: string[]; isRequired?: boolean }[] {
    // If raw text is provided (e.g. from OCR or pasted text), parse line-by-line
    if (params.rawContentText && params.rawContentText.trim()) {
      const lines = params.rawContentText
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter((l) => l.length > 1 && !l.startsWith('#'));

      const results: { label: string; type?: FieldType; section?: string; options?: string[]; isRequired?: boolean }[] = [];
      let currentSection = 'Student Personal Details';

      for (const line of lines) {
        if (line.endsWith(':') && line.length < 35 && (line.includes('Information') || line.includes('Details') || line.includes('Section'))) {
          currentSection = line.replace(':', '');
          continue;
        }

        const cleanLabel = line.replace(/[:_\.\*]/g, '').trim();
        if (cleanLabel.length > 1) {
          const isReq = line.includes('*') || line.toLowerCase().includes('(required)');
          let fType: FieldType = 'TEXT';
          let opts: string[] | undefined;

          if (/date|dob|birth/i.test(cleanLabel)) fType = 'DATE';
          else if (/income|salary|fee|amount|marks|percentage/i.test(cleanLabel)) fType = 'NUMBER';
          else if (/allergy|medical|disease/i.test(cleanLabel)) fType = 'TEXT';
          else if (/bus|route|transport/i.test(cleanLabel)) {
            fType = 'DROPDOWN';
            opts = ['Route 1 (North)', 'Route 2 (East)', 'Route 3 (West)', 'Self Transport'];
          } else if (/house/i.test(cleanLabel)) {
            fType = 'DROPDOWN';
            opts = ['Jinnah', 'Iqbal', 'Sir Syed', 'Liaquat'];
          } else if (/address|remarks|notes/i.test(cleanLabel)) {
            fType = 'TEXTAREA';
          }

          results.push({
            label: cleanLabel.replace(/\(required\)/i, '').trim(),
            type: fType,
            section: currentSection,
            options: opts,
            isRequired: isReq,
          });
        }
      }

      if (results.length > 0) return results;
    }

    // Default Comprehensive Admission Form Template (representing typical standard + custom school fields)
    return [
      { label: 'Student Full Name', type: 'TEXT', section: 'Student Personal Details', isRequired: true },
      { label: 'Name in Urdu', type: 'TEXT', section: 'Student Personal Details' },
      { label: 'Gender', type: 'DROPDOWN', section: 'Student Personal Details', isRequired: true },
      { label: 'Date of Birth', type: 'DATE', section: 'Student Personal Details', isRequired: true },
      { label: 'Blood Group', type: 'DROPDOWN', section: 'Student Personal Details' },
      { label: 'B-Form / CNIC Number', type: 'TEXT', section: 'Student Personal Details', isRequired: true },
      { label: 'Religion', type: 'TEXT', section: 'Student Personal Details' },
      { label: 'Nationality', type: 'TEXT', section: 'Student Personal Details' },
      { label: 'Admission Date', type: 'DATE', section: 'Academic Information', isRequired: true },
      { label: 'Class Applied For', type: 'DROPDOWN', section: 'Academic Information', isRequired: true },
      { label: 'Father Name', type: 'TEXT', section: 'Parent/Guardian', isRequired: true },
      { label: 'Father CNIC', type: 'TEXT', section: 'Parent/Guardian', isRequired: true },
      { label: 'Father Mobile Number', type: 'TEXT', section: 'Parent/Guardian', isRequired: true },
      { label: 'Father Occupation', type: 'TEXT', section: 'Parent/Guardian' },
      { label: 'Annual Income', type: 'NUMBER', section: 'Parent/Guardian' },
      { label: 'Residential Address', type: 'TEXTAREA', section: 'Address', isRequired: true },
      { label: 'Emergency Contact Number', type: 'TEXT', section: 'Contact Information' },
      { label: 'Previous School Name', type: 'TEXT', section: 'Previous School' },
      // Distinct custom school-specific fields:
      {
        label: 'Medical Allergies / Conditions',
        type: 'TEXTAREA',
        section: 'Medical Information',
        isRequired: false,
      },
      {
        label: 'Emergency Hospital Preference',
        type: 'TEXT',
        section: 'Medical Information',
        isRequired: false,
      },
      {
        label: 'School Bus Route / Stop',
        type: 'DROPDOWN',
        section: 'Other Information',
        options: ['Route 1 - North Campus', 'Route 2 - Gulshan', 'Route 3 - DHA / Clifton', 'Self Conveyance'],
        isRequired: false,
      },
      {
        label: 'Mother Tongue / Primary Spoken Language',
        type: 'DROPDOWN',
        section: 'Other Information',
        options: ['Urdu', 'English', 'Sindhi', 'Punjabi', 'Pashto', 'Balochi', 'Other'],
        isRequired: false,
      },
      {
        label: 'Hafiz-e-Quran',
        type: 'DROPDOWN',
        section: 'Other Information',
        options: ['Yes', 'No'],
        isRequired: false,
      },
    ];
  }
}

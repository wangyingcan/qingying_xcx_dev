// 仅用于更清晰地组织数据；小程序运行时就是普通对象
export class MetaProperty {
  constructor(raw) {
    this.id = raw.id;
    this.propertyCode = raw.propertyCode;
    this.propertyName = raw.propertyName; // -> label
    this.propertyType = raw.propertyType; // INT/DECIMAL/BOOL/STRING/STRING_LIST/INT_LIST/DATETIME
    this.propertyDesc = raw.propertyDesc;
    this.inputMode = raw.inputMode;       // CUSTOM/SINGLE/MULTIPLE
    this.optionSourceType = raw.optionSourceType; // NONE/STATIC/SERVICE
    this.options = safeParseOptions(raw.options); // [{value,label}] 或 []
    this.serviceName = raw.serviceName || null;
    this.defaultValue = raw.defaultValue ?? null;
    this.minimum = raw.minimum ?? null;
    this.maximum = raw.maximum ?? null;
    this.regexPattern = raw.regexPattern ?? null;
    this.unit = raw.unit ?? null;
    this.value = this.defaultValue; // 前端可编辑值
  }
}

export class Rule {
  constructor(raw) {
    this.ruleId = raw.ruleId;
    this.ruleName = raw.ruleName;
    this.ruleDesc = raw.ruleDesc || '';
    this.metapropertyEntityList = (raw.metapropertyEntityList || []).map(m => new MetaProperty(m));
  }
}

export class RuleSetVO {
  constructor(raw) {
    this.ruleSetId = raw.ruleSetId;
    this.ruleSetName = raw.ruleSetName;
    this.description = raw.description || '';
    this.defaultRuleId = raw.defaultRuleId;
    this.required = raw.required
    this.ruleList = (raw.ruleList || []).map(r => new Rule(r));
  }
}

export function safeParseOptions(optionsText) {
  if (!optionsText) return [];
  try {
    const arr = JSON.parse(optionsText);
    if (Array.isArray(arr)) return arr;
  } catch (e) { /* fallthrough */ }

  // 兼容“逗号分隔”的简写：a,b,c
  return String(optionsText)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(v => ({ value: v, label: v }));
}

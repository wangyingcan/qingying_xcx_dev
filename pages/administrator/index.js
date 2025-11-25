const {
  get,
} = require('../../api/index')

const {
  RULE
} = require('../../api/constant/index')

const {
  RuleSetVO,safeParseOptions
} = require('../../data/vo/index');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    ruleSets: [], // 存储规则集列表
    activeRuleSetId: null, // UI：展开中的规则集
    // tooltip 状态：当前展示 tooltip 的规则集和规则
    tooltipRuleSetId: null,
    tooltipRuleId: null,
    // 元数据 tooltip 状态
    tooltipMetaRuleSetId: null,
    tooltipMetaRuleId: null,
    tooltipMetaCode: null,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  async onShow() {
    wx.showLoading({
      title: '努力加载中',
    })
    // 获取后端数据
    let result = await get(RULE.GETALLRULE)

    // 处理每条ruleset
    const list = Array.isArray(result) ? result.map(rs => new RuleSetVO(rs)) : [];

    list.forEach(rs => {
      // 优先使用后端给的 defaultRuleId，否则取第一条规则
      const firstRuleId = rs.ruleList.length > 0 ? rs.ruleList[0].ruleId : null;
      rs.selectedRuleId = rs.defaultRuleId || firstRuleId;

      // 如果有 MULTIPLE 类型，且 meta.value 为数组，需要映射到 options.checked
      rs.ruleList.forEach(rule => {
        rule.metapropertyEntityList.forEach(meta => {
          if (meta.inputMode == 'MULTIPLE' && Array.isArray(meta.options)) {
            const valArr = Array.isArray(meta.value) ? meta.value : [];
            meta.options = meta.options.map(opt => ({
              ...opt,
              // 仅用于渲染，多选用 meta.value 比对提交
              checked: valArr.indexOf(opt.value) > -1
            }));
          }
        });
      });
    });

    this.setData({
      ruleSets: list,
      activeRuleSetId: list[0] ? list[0].ruleSetId : null,
    });

    // 懒加载 SERVICE 类型的 options
    list.forEach(rs => rs.ruleList.forEach(rule => {
      rule.metapropertyEntityList.forEach(meta => {
        if (meta.optionSourceType == 'SERVICE' && meta.serviceName) {
          this.loadServiceOptions(meta, rs.ruleSetId, rule.ruleId);
        }
      });
    }));

    wx.hideLoading()
  },

  // 加载 SERVICE 类型的 options
  async loadServiceOptions(meta, ruleSetId, ruleId) {
    let data = await get('',{serviceName:meta.serviceName})
    let data_arr = safeParseOptions(data)

    if (Array.isArray(data_arr)) {
      const ruleSets = this.data.ruleSets;
      const rs = ruleSets.find(x => x.ruleSetId == ruleSetId);
      if (!rs) return;
      const r = rs.ruleList.find(x => x.ruleId == ruleId);
      if (!r) return;
      const m = r.metapropertyEntityList.find(x => x.propertyCode === meta.propertyCode);
      if (!m) return;
      m.options = data_arr;
      this.setData({
        ruleSets
      });
    }
  },

  // 展开/收起规则集
  onToggleRuleSet(e) {
    const {
      id
    } = e.currentTarget.dataset;
    this.setData({
      activeRuleSetId: this.data.activeRuleSetId == id ? null : id
    });
  },

  // ① 规则集内单选规则
  onRuleChange(e) {
    const ruleSetId = e.currentTarget.dataset.rsid;
    const ruleId = e.detail.value; // radio 的 value 是字符串
    const ruleSets = this.data.ruleSets;
    const rs = ruleSets.find(x => x.ruleSetId == ruleSetId);
    if (!rs) return;
    rs.selectedRuleId = ruleId;
    this.setData({
      ruleSets
    });
  },

  // ===== 元数据输入事件：更新 meta.value =====

  onTextInput(e) {
    const {
      rsid,
      rid,
      code
    } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.updateMetaValue(rsid, rid, code, value);
  },

  onNumberInput(e) {
    const {
      rsid,
      rid,
      code,
      min,
      max
    } = e.currentTarget.dataset;
    let v = e.detail.value;
    if (v !== '' && !isNaN(v)) {
      v = Number(v);
      if (min !== undefined && min !== null && min !== '' && !isNaN(min)) {
        v = Math.max(v, Number(min));
      }
      if (max !== undefined && max !== null && max !== '' && !isNaN(max)) {
        v = Math.min(v, Number(max));
      }
    }
    this.updateMetaValue(rsid, rid, code, v);
  },

  onSwitchChange(e) {
    const {
      rsid,
      rid,
      code
    } = e.currentTarget.dataset;
    this.updateMetaValue(rsid, rid, code, e.detail.value);
  },

  onRadioChange(e) {
    const {
      rsid,
      rid,
      code
    } = e.currentTarget.dataset;
    this.updateMetaValue(rsid, rid, code, e.detail.value);
  },

  onCheckboxChange(e) {
    const {
      rsid,
      rid,
      code
    } = e.currentTarget.dataset;
    const values = e.detail.value; // ['optA','optB',...]

    this.updateMetaValue(rsid, rid, code, values);

    // 同步更新 options.checked
    const ruleSets = this.data.ruleSets;
    const rs = ruleSets.find(x => x.ruleSetId == rsid);
    const rule = rs.ruleList.find(x => x.ruleId == rid);
    const meta = rule.metapropertyEntityList.find(x => x.propertyCode === code);

    meta.options = meta.options.map(opt => ({
      ...opt,
      checked: values.indexOf(opt.value) > -1
    }));

    this.setData({
      ruleSets
    });
  },

  updateMetaValue(ruleSetId, ruleId, propertyCode, value) {
    const ruleSets = this.data.ruleSets;
    const rs = ruleSets.find(x => x.ruleSetId == ruleSetId);
    if (!rs) return;
    const rule = rs.ruleList.find(x => x.ruleId == ruleId);
    if (!rule) return;
    const meta = rule.metapropertyEntityList.find(x => x.propertyCode === propertyCode);
    if (!meta) return;
    meta.value = value;

    // 如果是多选，顺便更新 options.checked，便于视觉同步
    if (meta.inputMode == 'MULTIPLE' && Array.isArray(meta.options)) {
      const arr = Array.isArray(value) ? value : [];
      meta.options = meta.options.map(opt => ({
        ...opt,
        checked: arr.indexOf(opt.value) > -1
      }));
    }

    this.setData({
      ruleSets
    });
  },

  // ② 提交所有规则集：每个规则集只提交“选中的那一条规则”
  onSubmit() {
    const payload = this.data.ruleSets.map(rs => {
      const selectedRule = rs.ruleList.find(r => r.ruleId == rs.selectedRuleId);
      const values = selectedRule ?
        selectedRule.metapropertyEntityList.reduce((acc, meta) => {
          acc[meta.propertyCode] = meta.value;
          return acc;
        }, {}) :
        {};

      return {
        ruleSetId: rs.ruleSetId,
        ruleSetName: rs.ruleSetName,
        selectedRuleId: rs.selectedRuleId,
        ruleValues: values
      };
    });

    console.log('submit payload', payload);

    wx.request({
      url: '/api/ruleSets/apply', // TODO: 替换为实际保存接口
      method: 'POST',
      data: payload,
      success: () => {
        wx.showToast({
          title: '已提交',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '提交失败',
          icon: 'none'
        });
      }
    });
  },

  onRuleDescTap(e) {
    const { rsid, rid } = e.currentTarget.dataset;
    const { tooltipRuleSetId, tooltipRuleId } = this.data;
  
    // 再次点击同一个 icon -> 关闭 tooltip
    if (tooltipRuleSetId == rsid && tooltipRuleId == rid) {
      this.setData({
        tooltipRuleSetId: null,
        tooltipRuleId: null,
      });
      return;
    }
  
    // 打开新的 tooltip
    this.setData({
      tooltipRuleSetId: rsid,
      tooltipRuleId: rid,
    });
  
    // 可选：自动关闭（比如 3 秒）
    setTimeout(() => {
      const { tooltipRuleSetId: curRsid, tooltipRuleId: curRid } = this.data;
      if (curRsid == rsid && curRid == rid) {
        this.setData({
          tooltipRuleSetId: null,
          tooltipRuleId: null,
        });
      }
    }, 3000);
  },
  
  onMetaDescTap(e) {
    const { rsid, rid, code, desc } = e.currentTarget.dataset;
    const { tooltipMetaRuleSetId, tooltipMetaRuleId, tooltipMetaCode } = this.data;
  
    // 再点一次同一条 -> 关闭
    if (
      tooltipMetaRuleSetId == rsid &&
      tooltipMetaRuleId == rid &&
      tooltipMetaCode == code
    ) {
      this.setData({
        tooltipMetaRuleSetId: null,
        tooltipMetaRuleId: null,
        tooltipMetaCode: null,
      });
      return;
    }
  
    // 打开新的 tooltip
    this.setData({
      tooltipMetaRuleSetId: rsid,
      tooltipMetaRuleId: rid,
      tooltipMetaCode: code,
    });
  
    // 可选：自动关闭（例如 3 秒）
    setTimeout(() => {
      const {
        tooltipMetaRuleSetId: curRsid,
        tooltipMetaRuleId: curRid,
        tooltipMetaCode: curCode,
      } = this.data;
      if (curRsid == rsid && curRid == rid && curCode == code) {
        this.setData({
          tooltipMetaRuleSetId: null,
          tooltipMetaRuleId: null,
          tooltipMetaCode: null,
        });
      }
    }, 3000);
  },  
})
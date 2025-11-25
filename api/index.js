// 工具：轻量 Promise 化 wx.request
function request(options) {
  return new Promise((resolve, reject) => {
    // 1. 默认参数
    const baseURL = 'http://localhost:8888/'; // 一次改完，全局生效
    const url = options.url.startsWith('http') ? options.url : baseURL + options.url;
    const method = (options.method || 'GET').toUpperCase();   // HTTP请求类型
    const data = options.data || {};
    const header = {
      'Content-Type': 'application/json; charset=utf-8',
      ...options.header
    };

    // 2. 自动带 Cookie（小程序默认 wx.request 会自己携带，无需手动）
    // 3. 发起请求
    wx.request({
      url,
      method,
      data,
      header,
      // 请求成功的处理
      success: (res) => {
        
        const { statusCode, data: body } = res;
        if (statusCode >= 200 && statusCode < 300) {
          // 4. 统一解析后端格式  {code: 0, msg: 'ok', data: {...}}
          const { code ,success ,message, data} = body;
          if (code === 200) {
            resolve(data);              // 业务只关心 data
          } else {
            // 其他业务错误，弹提示
            wx.showToast({ title: message || '服务异常', icon: 'none' });
            reject(body);
          }
        } else {
          // HTTP 层错误
          wx.showToast({ title: `网络错误(${statusCode})`, icon: 'none' });
          reject({ code: statusCode, msg: `HTTP ${statusCode}` });
        }
      },

      // 请求失败的处理
      fail: (err) => {
        // 网络不可达、超时等
        wx.showToast({ title: '网络不可用', icon: 'none' });
        reject(err);
      }
    });
  });
}

// 导出快捷方法
module.exports = {
  get: (url, params) => request({ url, method: 'GET', data: params }),
  post: (url, data) => request({ url, method: 'POST', data }),
  put: (url, data) => request({ url, method: 'PUT', data }),
  del: (url, data) => request({ url, method: 'DELETE', data }),
  request          // 原始对象，备用
};
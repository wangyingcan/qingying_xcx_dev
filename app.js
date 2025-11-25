const {
  get,
  post,
  put,
  del
} = require('./api/index')

const {
  USER
} = require('./api/constant/index')

App({
  onLaunch: function () {
    wx.login({
      success: async (res) => {
        let code = res.code
    
        let result = await post(USER.LOGIN,{code})

        console.log("login接口result：",result);
      },
    })
  },
  
  globalData: {
    
  }
})

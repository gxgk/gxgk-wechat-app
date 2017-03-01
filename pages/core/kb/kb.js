//kb.js
//获取应用实例
var app = getApp();
Page({
  data: {
    remind: '加载中',
    _days: ['一', '二', '三', '四', '五', '六', '日'],
    _weeks: ['第一周', '第二周', '第三周', '第四周', '第五周', '第六周', '第七周', '第八周', '第九周', '第十周', '十一周', '十二周', '十三周', '十四周', '十五周', '十六周', '十七周', '十八周', '十九周', '二十周'],
    _time: [ //课程时间与指针位置的映射，{begin:课程开始,end:结束时间,top:指针距开始top格数}
      { begin: '0:00', end: '7:59', beginTop: -4, endTop: -4 },
      { begin: '8:00', end: '9:40', beginTop: 0, endTop: 200 },
      { begin: '9:41', end: '10:04', beginTop: 204, endTop: 204 },
      { begin: '10:05', end: '11:45', beginTop: 208, endTop: 408 },
      { begin: '11:46', end: '13:59', beginTop: 414, endTop: 414 },
      { begin: '14:00', end: '15:40', beginTop: 420, endTop: 620 },
      { begin: '15:41', end: '16:04', beginTop: 624, endTop: 624 },
      { begin: '16:05', end: '17:45', beginTop: 628, endTop: 828 },
      { begin: '17:46', end: '18:59', beginTop: 834, endTop: 834 },
      { begin: '19:00', end: '20:40', beginTop: 840, endTop: 1040 },
      { begin: '20:41', end: '20:49', beginTop: 1044, endTop: 1044 },
      { begin: '20:50', end: '22:30', beginTop: 1048, endTop: 1248 },
      { begin: '22:31', end: '23:59', beginTop: 1254, endTop: 1254 },
    ],
    timelineTop: 0,
    scroll: {
      left: 0
    },
    targetLessons: [],
    targetX: 0, //target x轴top距离
    targetY: 0, //target y轴left距离
    targetDay: 0, //target day
    targetWid: 0, //target wid
    targetI: 0,   //target 第几个active
    targetLen: 0, //target 课程长度
    blur: false,
    today: '',  //当前星期数
    toweek: 1,  //当前周数
    week: 1,    //视图周数（'*'表示学期视图）
    lessons: [],  //课程data
    dates: [],     //本周日期
    teacher: false   //是否为教师课表
  },
  //分享
  onShareAppMessage: function () {
    var name = this.data.name || app.user.student.name,
      id = this.data.id || app.user.student.id;
    return {
      title: name + '的课表',
      desc: '莞香小喵 - 课表查询',
      path: '/pages/core/kb/kb?id=' + id + '&name=' + name
    };
  },
  onLoad: function (options) {
    var _this = this;
    app.loginLoad(function () {
      _this.loginHandler.call(_this, options);
    }, options.id);
  },
  //让分享时自动登录
  loginHandler: function (options) {
    var _this = this;
    _this.setData({
      'term': app.user.school.term,
      'teacher': app.user.is_teacher
    });
    // onLoad时获取一次课表
    var id = options.id;
    if (!id && !app.user.student.id && !app.user.teacher.teacherid) {
      _this.setData({
        remind: '未绑定'
      });
      return false;
    }
    if (options.id && options.name) {
      _this.setData({
        id: options.id,
        name: options.name
      });
    }
    _this.get_kb(id);
  },
  onShow: function () {
    var _this = this;
    // 计算timeline时针位置
    function parseMinute(dateStr) { return dateStr.split(':')[0] * 60 + parseInt(dateStr.split(':')[1]); }
    function compareDate(dateStr1, dateStr2) {
      return parseMinute(dateStr1) <= parseMinute(dateStr2);
    }
    var nowTime = app.util.formatTime(new Date(), 'h:m');
    _this.data._time.forEach(function (e, i) {
      if (compareDate(e.begin, nowTime) && compareDate(nowTime, e.end)) {
        _this.setData({
          timelineTop: Math.round(e.beginTop + (e.endTop - e.beginTop) * (parseMinute(nowTime) - parseMinute(e.begin)) / 100)
        });
      };
    });
    //设置滚动至当前时间附近，如果周末为设置left为其最大值102
    var nowWeek = new Date().getDay();
    _this.setData({
      'scroll.left': (nowWeek === 6 || nowWeek === 0) ? 102 : 0
    });
  },
  onReady: function () {
    var _this = this;
    //查询其他人课表时显示
    if (_this.data.name) {
      wx.setNavigationBarTitle({
        title: _this.data.name + '的课表'
      });
    }
  },
  scrollXHandle: function (e) {
    this.setData({
      'scroll.left': e.detail.scrollLeft
    });
  },
  showDetail: function (e) {
    // 点击课程卡片后执行
    var _this = this;
    var week = _this.data.week;
    var dataset = e.currentTarget.dataset;
    var lessons = _this.data.lessons[dataset.day][dataset.wid];
    var targetI = 0;
    lessons[dataset.cid].target = true;
    if (week != '*') {
      lessons = lessons.filter(function (e) {
        return e.weeks.indexOf(parseInt(week)) !== -1;
      });
    }
    lessons.map(function (e, i) {
      if (lessons.length === 1) {
        e.left = 0;
      } else {
        //笼罩层卡片防止超出课表区域
        //周一~周四0~3:n lessons.length>=2*n+1时，设置left0为-n*128，否则设置为-60*(lessons.length-1)；
        //周日~周五6~4:n lessons.length>=2*(6-n)+1时，设置left0为-(7-n-lessons.length)*128，否则设置为-60*(lessons.length-1)；
        var left0 = -60 * (lessons.length - 1);
        if (dataset.day <= 3 && lessons.length >= 2 * dataset.day + 1) {
          left0 = -dataset.day * 128;
        } else if (dataset.day >= 4 && lessons.length >= 2 * (6 - dataset.day) + 1) {
          left0 = -(7 - dataset.day - lessons.length) * 128;
        }
        e.left = left0 + 128 * i;
      }
      return e;
    });
    lessons.forEach(function (e, i) {
      if (e.target) {
        targetI = i;
        lessons[i].target = false;
      }
    });
    if (!lessons.length) { return false; }
    _this.setData({
      targetX: dataset.day * 129 + 35 + 8,
      targetY: dataset.wid * 206 + Math.floor(dataset.wid / 2) * 4 + 60 + 8,
      targetDay: dataset.day,
      targetWid: dataset.wid,
      targetI: targetI,
      targetLessons: lessons,
      targetLen: lessons.length,
      blur: true
    });
  },
  hideDetail: function () {
    // 点击遮罩层时触发，取消主体部分的模糊，清空target
    this.setData({
      blur: false,
      targetLessons: [],
      targetX: 0,
      targetY: 0,
      targetDay: 0,
      targetWid: 0,
      targetI: 0,
      targetLen: 0
    });

  },
  infoCardTap: function (e) {
    var dataset = e.currentTarget.dataset;
    if (this.data.targetI == dataset.index) { return false; }
    this.setData({
      targetI: dataset.index
    });
  },
  infoCardChange: function (e) {
    var current = e.detail.current;
    if (this.data.targetI == current) { return false; }
    this.setData({
      targetI: current
    });
  },
  chooseView: function () {
    app.showLoadToast('切换视图中', 500);
    //切换视图(周/学期) *表示学期视图
    this.setData({
      week: this.data.week == '*' ? this.data.toweek : '*'
    });
  },
  returnCurrent: function () {
    //返回本周
    this.setData({
      week: this.data.toweek
    });
  },
  currentChange: function (e) {
    // 更改底部周数时触发，修改当前选择的周数
    var current = e.detail.current
    this.setData({
      week: current + 1
    });
  },
  catchMoveDetail: function () { /*阻止滑动穿透*/ },
  bindStartDetail: function (e) {
    this.setData({
      startPoint: [e.touches[0].pageX, e.touches[0].pageY]
    });
  },
  //滑动切换课程详情
  bindMoveDetail: function (e) {
    var _this = this;
    var curPoint = [e.changedTouches[0].pageX, e.changedTouches[0].pageY],
      startPoint = _this.data.startPoint, i = 0;
    if (curPoint[0] <= startPoint[0]) {
      if (Math.abs(curPoint[0] - startPoint[0]) >= Math.abs(curPoint[1] - startPoint[1])) {
        if (_this.data.targetI != _this.data.targetLen - 1) {
          i = 1;//左滑
        }
      }
    } else {
      if (Math.abs(curPoint[0] - startPoint[0]) >= Math.abs(curPoint[1] - startPoint[1])) {
        if (_this.data.targetI != 0) {
          i = -1;//右滑
        }
      }
    }
    if (!i) { return false; }
    _this.setData({
      targetI: parseInt(_this.data.targetI) + i
    });
  },
  //点击左右按钮切换swiper
  swiperChangeBtn: function (e) {
    var _this = this;
    var dataset = e.currentTarget.dataset, i, data = {};
    if (_this.data[dataset.target] == 1 && dataset.direction == 'left') {
      i = 0;
    }
    else if (dataset.direction == 'left') { i = -1; }
    else if (dataset.direction == 'right') { i = 1; }
    data[dataset.target] = parseInt(_this.data[dataset.target]) + i;
    _this.setData(data);
  },
  get_kb: function (id) {
    //数组去除指定值
    function removeByValue(array, val) {
      for (var i = 0, len = array.length; i < len; i++) {
        if (array[i] == val) { array.splice(i, 1); break; }
      }
      return array;
    }
    // 根据获取课表
    var _this = this, data = {
      session_id: app.user.wxinfo.id,
      week: _this.data.week,
      is_teacher: app.user.is_teacher,
      weekday: '',
      studentid: id
    };
    if (app.user.is_teacher) { data.type = 'teacher'; }
    //判断并读取缓存
    if (app.cache.kb_all && !id) { kbRender(app.cache.kb_all); }
    //课表渲染
    function kbRender(_data) {
      var colors = ['red', 'green', 'purple', 'yellow'];
      var today = parseInt(app.user.school.weekday);  //星期几，0周日,1周一
      today = today === 0 ? 6 : today - 1; //0周一,1周二...6周日
      var week = _data.week;//当前周
      var lessons = _data;
      //各周日期计算
      var nowD = new Date(),
        nowMonth = nowD.getMonth() + 1,
        nowDate = nowD.getDate();
      var dates = _this.data._weeks.slice(0);  //0:第1周,1:第2周,..19:第20周
      dates = dates.map(function (e, m) {
        var idates = _this.data._days.slice(0);  //0:周一,1:周二,..6:周日
        idates = idates.map(function (e, i) {
          var d = (m === (week - 1) && i === today) ? nowD : new Date(nowD.getFullYear(), nowD.getMonth(), nowD.getDate() - ((week - 1 - m) * 7 + (today - i)));
          return {
            month: d.getMonth() + 1,
            date: d.getDate()
          }
        });
        return idates;
      });
      _this.setData({
        today: today,
        week: week,
        toweek: week,
        lessons: lessons,
        dates: dates,
        remind: ''
      });
    }
    wx.showNavigationBarLoading();
    //获取课表
    wx.request({
      url: app.server + '/api/users/get_schedule',
      method: 'POST',
      data: data,
      success: function (res) {
        if (res.data && res.data.status === 200) {
          var _data = res.data.data;
          if (_data) {
            if (!id) {
              //保存课表缓存
              app.saveCache('kb_all', _data);
            }
            _data.week = app.user.school.weeknum;
            kbRender(_data);
          } else { _this.setData({ remind: '暂无数据' }); }

        } else {
          app.removeCache('kb_all');
          _this.setData({
            remind: res.data.message || '未知错误'
          });
        }
      },
      fail: function (res) {
        if (_this.data.remind == '加载中') {
          _this.setData({
            remind: '网络错误'
          });
        }
        console.warn('网络错误');
      },
      complete: function () {
        wx.hideNavigationBarLoading();
      }
    });
  }
});
import type { SiteCopy } from './types'
export const zh: SiteCopy = {
  hero: { title: '你好，我是 Elodie。', lines: ['我让网站', '充满个性与活力。'] },
  labels: { home: '首页', about: '关于我', playground: '实验室', guestbook: '打个招呼', close: '关闭', next: '下一个项目', visit: '访问网站', role: '职责', duration: '背景', platform: '平台', tools: '工具', problem: '挑战', solution: '方案', process: '项目如何成形', contact: '简历与联系', code: '在 GitHub 查看代码', contents: '项目目录', allProjects: '全部项目' },
  about: { title: 'Elodie Lin', subtitle: '网页开发者，对世界充满好奇。', bio: ['我目前就读于 Efrei 三年级，同时在 Ody 以工学交替的方式从事网页开发。我既关注网站的功能，也关心使用它时的感受。', '我喜欢打造生动的界面，把设计与代码连接起来，并尝试新的想法。在网络之外，摄影和中国文化也不断激发我的好奇心。'], experience: '工作经历', education: '教育经历', languages: '语言', credits: '三维对象和互动实验均为本作品集创作。', portraitAlt: 'Elodie Lin 的肖像', location: '法国巴黎', highlights: ['Ody 工学交替', '上海实习', '中文 HSK 6', 'Efrei 2027'], interestsLabel: '兴趣爱好', interests: ['钢琴', '摄影', '羽毛球', '旅行'], languageRows: [{ name: '法语' }, { name: '英语', level: 'B1', rank: 3 }, { name: '中文', level: 'HSK 6', rank: 6 }], strengthsLabel: '优势', strengths: ['积极主动', '沟通能力', '同理心', '好奇心'], experienceRows: [{ name: 'Ody', logo: '/media/logos/ody.svg', logoTile: 'dark', role: '网页开发（工学交替）', period: '2026年9月起', points: ['为餐厅和商家设计并重构响应式网站：设计、集成与用户体验', '为 ODY 平台新增功能、修复问题，并在 GitHub 上提交 pull request', '在电脑、平板和手机上做功能测试，跟进并记录问题，验证修复结果', '通过 Cloudflare 和 ODY 后台完成部署、维护与监控', '在国际团队中以英语协作，与产品和销售团队合作'] }, { name: 'Info2soft', logo: '/media/logos/info2soft.webp', role: '网页开发实习生', period: '2025年6–8月', place: '上海', badge: '国际经历', points: ['参与公司网站的改版', '把界面改写成英文，面向国际用户', '提升网站在海外的可见度与可访问性'] }, { name: 'Sushi Tokyo', role: '网页开发实习', period: '2025年4–6月', place: '阿涅勒', points: ['设计并开发电子菜单', '使用 React 与响应式设计，可通过二维码访问', '改善用户体验'] }, { name: 'Delpech', logo: '/media/logos/delpech.webp', role: '药房与实验室实习', period: '2019年4月', place: '巴黎', points: ['提供药妆产品咨询', '初步接触实验室管理软件', '与科研团队交流'] }, { name: 'Arteque', logo: '/media/logos/arteque.webp', role: '志愿者', period: '2024年起', place: '巴黎', points: ['为儿童制作编程入门教程', '组织音乐工作坊', '在巴黎13区区政府的春节活动中担任志愿者'] }], educationRows: [{ name: 'Efrei', logo: '/media/logos/efrei.webp', role: '工程与数字技术学士', period: '2024–2027' }, { name: 'Elysée Marbeuf', logo: '/media/logos/elysee-marbeuf.webp', role: '美容 CAP 职业证书', period: '2023–2024' }, { name: 'UPEC', logo: '/media/logos/upec.webp', role: '健康科学学士（PASS）', period: '2022–2023' }, { name: 'Lycée Saint-André', logo: '/media/logos/lycee-saint-andre.webp', role: '高中会考，数学与物理化学方向', period: '2019–2022' }] },
  playground: {
    "title": "Playground",
    "intro": "六个手写的小游戏，都在泳池水里。选一个，全屏开玩，刷新你的最高分。",
    "instruction": "使用鼠标或触摸控制。键盘：方向键移动，回车键操作。点击“重新开始”可重置体验。",
    "markers": [
      "全屏游玩",
      "保留最高分"
    ],
    "ui": {
      "today": "今日游戏",
      "play": "开始玩",
      "fullscreen": "全屏",
      "exitFullscreen": "退出全屏",
      "how": "代码揭秘",
      "open": "打开并体验",
      "replay": "重新开始",
      "pause": "暂停",
      "resume": "继续",
      "controls": "操作",
      "notes": "实验笔记",
      "best": "最高分",
      "notPlayed": "还没玩过",
      "technique": "技术",
      "keys": "按键",
      "hint": "使用鼠标或触摸操作。键盘：方向键控制，回车键行动。",
      "tags": [
        "游戏 · 竞速",
        "游戏 · 引力",
        "游戏 · 打砖块",
        "游戏 · 技巧",
        "游戏 · 潜水",
        "游戏 · 反应"
      ],
      "canvas": {"start": "点击开始", "startTouch": "轻触开始", "againTouch": "轻触再玩一次", "keys": "或按回车键", "again": "点击再玩一次", "over": "游戏结束", "level": "关卡", "combo": "连击"}
    },
    "items": [
      {
        "id": "koi",
        "title": "泳道",
        "description": "驾着火烈鸟游泳圈在三条泳道间穿梭：收集橡皮鸭，躲开浮标和沙滩球。三颗心用完后，点击即可重新出发。",
        "hook": "火烈鸟游泳圈，全速冲刺泳道",
        "technique": "Canvas 2D、透视投影、物体队列",
        "keys": "鼠标或 ← → · 点击或回车开始",
        "touch": "手指滑动 · 轻触重新出发",
        "notes": "每个物体只记录所在泳道和深度，由同一个函数投影到屏幕上，越近越大、越靠下。碰撞只在物体越过火烈鸟所在深度的那一刻判定，不需要任何几何计算。速度随时间提升，每按一次方向键就换一整条泳道，让键盘和鼠标一样灵敏。"
      },
      {
        "id": "encre",
        "title": "涟漪",
        "description": "按住鼠标把球吸向光标，收集每关的 7 只小黄鸭，别碰到救生圈。点击重新开始。",
        "hook": "一个球，七只鸭，旋转的救生圈",
        "technique": "Canvas 2D、矢量吸引、反弹",
        "keys": "按住鼠标或方向键 · 回车吸引",
        "touch": "按住屏幕把球吸过来",
        "notes": "球受到随距离增大的引力被吸向指针，速度有上下限。拖尾存放在固定的环形缓冲区里，每帧不分配内存。救生圈沿两条反向的椭圆轨道运动，碰撞时球沿接触法线反弹。"
      },
      {
        "id": "hanzi",
        "title": "瓷砖",
        "description": "用浮板把球弹回去，打碎彩色马赛克瓷砖，并接住掉落的奖励胶囊。你有三个球；点击即可重新开始。",
        "hook": "一块一块，打碎泳池马赛克",
        "technique": "Canvas 2D、分步圆形与矩形碰撞检测",
        "keys": "鼠标或 ← → · 点击或回车发球",
        "touch": "手指滑动 · 轻触发球",
        "notes": "球每次最多移动 6 像素，分步前进，即使速度很快也不会穿过瓷砖。反弹角度取决于球落在浮板的位置：中间直上，边缘斜飞。每一关都是用文字写成的十列网格，“2”表示需要打两次的瓷砖。"
      },
      {
        "id": "chambre-noire",
        "title": "打水漂",
        "description": "用指针高度瞄准，在力量条高时出手：石子入水越平越快，弹得越多。每局五颗石子，点击再玩一次。",
        "hook": "让石子在水面上弹得更远",
        "technique": "Canvas 2D、抛体运动、临界角弹跳",
        "keys": "鼠标或 ↑ ↓ · 点击或回车投掷",
        "touch": "滑动瞄准 · 轻触投掷",
        "notes": "石子按简单的抛体运动计算，每帧两个子步。每次触水时由入射角决定：小于 26° 就弹起并减速，否则沉没。镜头平滑跟随石子，背景以三种速度视差滚动。"
      },
      {
        "id": "sable",
        "title": "潜水",
        "description": "用指针引导潜水员，收集贝壳和珍珠，躲开水母和海胆，抓住气泡补充空气。点击可短暂冲刺并无敌片刻；点击再玩一次。",
        "hook": "潜入海底，收集珍珠，注意氧气",
        "technique": "Canvas 2D、视差滚动、椭圆碰撞检测",
        "keys": "鼠标或 ↑ ↓ · 点击或回车冲刺",
        "touch": "手指滑动 · 轻触冲刺",
        "notes": "珊瑚礁由重复的背景条组成，每层以不同速度滚动。物体来自固定的复用数组，生成图案越来越密以提高难度。碰撞用潜水员周围的椭圆判定：拾取宽松，危险更严格。"
      },
      {
        "id": "bulles",
        "title": "泡泡",
        "description": "在泡泡逃走前戳破它们，连续戳同一种颜色叠加连击，但别碰带刺的海胆。点击重新开始。",
        "hook": "戳泡泡，连颜色，躲海胆",
        "technique": "Canvas 2D、对象池、难度递增",
        "keys": "鼠标或方向键 · 点击或回车戳破",
        "touch": "轻触泡泡把它们戳破",
        "notes": "泡泡来自 40 个可复用对象的固定池，游戏中不分配内存。点击会选中边缘离指针最近的泡泡，键盘操作时判定范围更大。生成频率和上升速度随时间加快，海胆也越来越多。"
      }
    ]
  },
  projects: {
    streamflix: { type: 'Efrei 的团队项目', tagline: '从影片目录到播放画面。', role: '与同学共同完成的团队项目', duration: '2026 年，6 个月', platform: '电影网站', problem: '在团队项目中，将影片发现与连贯的观看体验连接起来。', solution: '一个使用 PHP 的平台，连接 TMDB 目录，并提供会话购物车、单片购买和三种订阅方案。', process: [{ icon: '01', title: '组织', text: '规划页面和应用路由。' }, { icon: '02', title: '连接', text: '连接 PostgreSQL、PDO 和 TMDB 数据。' }, { icon: '03', title: '观看', text: '整合目录、购物车与 HTML5 播放器。' }], sections: [{ id: 'catalogue', title: '连接数据的影片目录', body: ['影片信息通过 Guzzle 从 TMDB 获取。PostgreSQL 与 PDO 负责应用数据的持久化。'], media: [{ shot: 0, alt: 'StreamFlix 的影片目录：当前热门前十' }] }, { id: 'parcours', title: '一条流程，多种使用方式', body: ['单片购买、会话购物车与月度订阅探索不同的影片访问方式，最终通过 HTML5 播放器观看。'], media: [{ shot: 1, alt: 'StreamFlix 按类型排列的影片' }] }], alts: { hero: 'StreamFlix 视频平台项目的图形展示' } },
    yoru: { type: 'Ody 的餐厅网站', tagline: '巴黎的一张餐桌，体验从线上开始。', role: '在 Ody 从事网页开发', duration: 'Ody 项目', platform: '法语 / 英语网站', problem: '清晰展示餐厅菜单，并让访客直接在网站上预订。', solution: '双语网站搭配结构化菜单，以及连接 Odyssey 公共 API 的定制预订流程。', process: [{ icon: '01', title: '整理', text: '根据餐厅数据组织菜单。' }, { icon: '02', title: '预订', text: '以折叠面板组织预订步骤。' }, { icon: '03', title: '引导', text: '处理错误并提供电话预订方案。' }], sections: [{ id: 'reservation', title: '逐步完成预订', body: ['流程先查询可用座位，再向 Odyssey 提交预订。针对错误响应进行处理，并在十秒超时后提供电话联系的替代方式。'], media: [{ shot: 0, alt: 'YORU 的实用信息页：地址、营业时间、地铁和电话' }] }, { id: 'identite', title: '流动的视觉形象', body: ['WebGL 背景呈现液态大理石效果。菜单从 Excel 整理而来，包含 28 个分类和 181 道菜。页面附有 Restaurant 结构化数据。'], media: [{ shot: 1, alt: 'YORU 首页的液态大理石背景' }, { shot: 2, alt: 'YORU 的菜单：前菜、寿司与刺身、卷物' }] }], alts: { hero: '蒙帕纳斯餐厅 YORU 网站的图形展示' } },
    kanpai: { type: '在 Ody 完成的餐厅网站', tagline: '巴黎中心的日式风情。', role: '在目前任职的 Ody 从事网页开发', duration: 'Ody 项目', platform: '网站', problem: '呈现 Kanpai Paris 的特色，让访客轻松了解餐厅与菜单。', solution: '使用 React 和 GSAP 动效搭建网站，包含图库以及 Odyssey 预订和点餐入口。', process: [{ icon: '01', title: '展示', text: '呈现餐厅、菜品与主厨。' }, { icon: '02', title: '动效', text: '通过 GSAP 动效引导阅读。' }, { icon: '03', title: '连接', text: '让预订与点餐入口清晰易达。' }], sections: [{ id: 'restaurant', title: '巴黎的一家日式餐厅', body: ['网站通过菜单、主厨介绍和摄影呈现 Kanpai。这家日式餐厅位于巴黎第六区的 Bréa 街。'], media: [{ shot: 0, alt: 'Kanpai 餐厅（Bréa 街）的照片墙' }] }, { id: 'technique', title: '在 Ody 完成的项目', body: ['该项目在我目前任职的 Ody 完成，使用 React、TypeScript、Tailwind 和 GSAP，并链接至 Odyssey 的预订与点餐服务。'], media: [{ shot: 1, alt: 'Kanpai 网站上的招牌菜品' }, { shot: 2, alt: 'Kanpai 网站菜单中的菜品行：寿司与刺身，附价格' }] }], alts: { hero: '在 Ody 完成的 Kanpai Paris 网站预览' } },
    carnival: { type: '在 Ody 设计的餐厅网站', tagline: '一家亚洲自助餐厅，化作一个手绘的世界。', role: '在 Ody 负责设计与开发（工学交替）', duration: '全面改版 · 2026 年 11 月', platform: '法语 / 英语 / 日语网站', problem: '以一张情绪板为起点，从零重做 Carnival 17 的网站。这家亚洲自助餐厅位于拉罗谢尔附近的 Puilboreau，改版时还要让实用信息一目了然。', solution: '一个共五页的 React 网站，灵感来自手绘日本动画，使用 GSAP 和 Lenis 制作动效，提供三种语言。', process: [{ icon: '01', title: '构想', text: '把情绪板变成一个世界：靛蓝夜色、撕边和纸、盛开的樱花、灯笼，以及焕然一新的传统色彩。' }, { icon: '02', title: '动效', text: '每个效果都为网站专门打造：开场暖帘、多层景深的首屏、灯笼、青海波纹、卷轴菜单和飘落的花瓣。' }, { icon: '03', title: '适配', text: '单独设计手机版并减轻动效，将网站译成法语、英语和日语，并预渲染页面以利于 SEO。' }], sections: [{ id: 'univers', title: '一个手绘的世界', body: ['打开网站时，暖帘向两侧拉开，仿佛走进 Carnival 的世界。首屏由多个图层组成：手绘场景的每一层以各自的深度移动，花瓣随之飘落。', '向下滚动时，Lenis 让滚动更加顺滑，灯笼逐一亮起，青海波纹随滚动速度起伏。招牌菜区块是一组自动滚动的餐厅照片轮播，每张都镶着金框。'], media: [{ shot: 0, alt: 'Carnival 17 首页靛蓝底色的“Nos spécialités”区块：金框照片轮播，展示挂满灯笼的休息区和招财猫、金色吧台，以及樱花间手绘的鸟居石阶' }] }, { id: 'carte', title: '卷轴上的菜单', body: ['在菜单页（La carte），菜单以卷轴（makimono）的形式徐徐展开。首页、餐厅、菜单、图库和信息五个页面共享同一个世界，花瓣伴随页面之间的切换。'], media: [{ shot: 1, alt: 'Carnival 17 的菜单页：完整菜单（营业时间、自助餐价格和饮品）展开在两根木轴之间的卷轴上' }] }, { id: 'pratique', title: '为手机设计，处处实用', body: ['手机版单独设计，而不是把电脑版简单堆叠，动效也更轻。营业时间、地址和 Google 地图直接显示；拨号按钮只放在页脚和信息页。', '这次改版在 Ody 从零开始，由我主导设计与开发，使用 Vite、React、TypeScript、Tailwind、GSAP 和 Lenis。'], media: [{ shot: 2, alt: 'Carnival 17 网站米色和纸底的图库页：挂满灯笼、贴着海报墙并摆着招财猫的休息区，以及金色灯光下的自助餐台' }] }], alts: { hero: 'Carnival 17 网站首页：手绘的夜景中有灯笼、樱花、满月、富士山和红色鸟居，上方是金色标题“Bienvenue chez Carnival”' } },
  },
}

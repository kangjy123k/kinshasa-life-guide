// 业务数据与类型的共享模块 — 首页、/map 二级页共用
import {
  ShoppingBag,
  UtensilsCrossed,
  Hotel,
  HeartPulse,
  Briefcase,
  PartyPopper,
  Wrench,
  Building2,
  Tag,
} from "lucide-react";
import type React from "react";

export interface BusinessUpdate {
  id: string;
  at: string; // ISO timestamp
  text: string;
  images?: string[];
}

export interface Business {
  id: number;
  submissionId?: string; // 对应 user_submission.id (仅用户提交的商家有)
  name: string;
  englishName?: string;
  contactPerson: string;
  wechat: string;
  phone: string;
  area: string;
  address?: string;  // 具体地址（法语），供语音播报 + 地图标注
  mainService: string;
  hasStore: string;
  serviceScope?: string;
  intro?: string;
  image: string;
  gallery?: string[];
  updates?: BusinessUpdate[];
  category: string;
  subcategory?: string;
  featured?: boolean;
  lat?: number;
  lng?: number;
  hidden?: boolean; // true = 保留数据但不在页面展示
}

/* 金沙萨主要 commune 的近似坐标 */
export const AREA_COORDS: Record<string, [number, number]> = {
  "Gombe":       [-4.3050, 15.3050],
  "Ngaliema":    [-4.3633, 15.2500],
  "Limete":      [-4.3580, 15.3367],
  "Masina":      [-4.3833, 15.4167],
  "Ma Campagne": [-4.3400, 15.2833],
  "Binza":       [-4.3833, 15.2333],
  "Kintambo":    [-4.3267, 15.2700],
  "Kalamu":      [-4.3500, 15.3150],
  "Bandalungwa": [-4.3400, 15.2900],
  "Lemba":       [-4.3833, 15.3500],
};
export const KINSHASA_CENTER: [number, number] = [-4.3276, 15.3136];

/* 金沙萨 24 个 commune（按华人聚集/关注度排序，供入驻表单下拉使用）*/
export const KINSHASA_COMMUNES: string[] = [
  "Gombe",
  "Ngaliema",
  "Limete",
  "Ma Campagne",
  "Kintambo",
  "Bandalungwa",
  "Kalamu",
  "Binza",
  "Lemba",
  "Masina",
  "Barumbu",
  "Kasa-Vubu",
  "Lingwala",
  "Ngiri-Ngiri",
  "Kinshasa (commune)",
  "Selembao",
  "Makala",
  "Mont-Ngafula",
  "Matete",
  "Ngaba",
  "Kimbanseke",
  "N'djili",
  "Kisenso",
  "Bumbu",
  "Nsele",
  "Maluku",
];

export function coordsForArea(area: string, id = 0): [number, number] {
  let base: [number, number] = KINSHASA_CENTER;
  for (const k of Object.keys(AREA_COORDS)) {
    if (area.includes(k)) { base = AREA_COORDS[k]; break; }
  }
  // 用 id 做稳定的小偏移，避免同区 marker 完全重叠
  const jitter = ((id * 9301 + 49297) % 233280) / 233280; // 伪随机 0~1
  const jitter2 = ((id * 7919 + 12345) % 233280) / 233280;
  return [base[0] + (jitter - 0.5) * 0.012, base[1] + (jitter2 - 0.5) * 0.012];
}

export interface CategoryDef {
  key: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
    className?: string;
    style?: React.CSSProperties;
    color?: string;
  }>;
  sub: string[];
  color: string;
  emoji: string;
}
export const categories: CategoryDef[] = [
  { key: "goods",      label: "商品",     icon: ShoppingBag,     sub: ["生活用品", "食品", "建材", "交通工具", "能源产品"], color: "#f59e0b", emoji: "🛍️" },
  { key: "restaurant", label: "餐厅",     icon: UtensilsCrossed, sub: ["中国餐厅", "西餐厅", "刚果风味餐厅", "酒吧", "咖啡厅"], color: "#ef4444", emoji: "🍜" },
  { key: "lodging",    label: "住宿",     icon: Hotel,           sub: ["中国酒店", "中国公寓", "国际级酒店", "本地酒店公寓"], color: "#8b5cf6", emoji: "🏨" },
  { key: "life",       label: "生活服务", icon: HeartPulse,      sub: ["健康", "美容", "教育", "安保", "金融", "运动"], color: "#10b981", emoji: "💗" },
  { key: "business",   label: "商业服务", icon: Briefcase,       sub: ["工程承包商", "建筑相关服务商", "装修队", "物流清关", "商业咨询"], color: "#3b82f6", emoji: "💼" },
  { key: "leisure",    label: "休闲娱乐", icon: PartyPopper,     sub: [], color: "#ec4899", emoji: "🎉" },
  { key: "rental",     label: "租赁设备", icon: Wrench,          sub: ["脚手架", "电气设备", "运输设备"], color: "#64748b", emoji: "🔧" },
  { key: "realestate", label: "房地产",   icon: Building2,       sub: ["中国房地产", "非中国房地产"], color: "#0ea5e9", emoji: "🏘️" },
  { key: "secondhand", label: "二手专区", icon: Tag,             sub: [], color: "#f97316", emoji: "🏷️" },
];
export const seedBusinesses: Business[] = [
  {
    id: 1,
    name: "川味坊",
    contactPerson: "李伟",
    wechat: "liwei_ksv88",
    phone: "+243 81 234 5678",
    area: "金沙萨 Gombe区",
    mainService: "正宗川菜、重庆火锅、家常炒菜、外卖及宴席承办",
    hasStore: "有 — 堂食餐厅，120平米，15张桌",
    serviceScope: "Gombe、Ngaliema、Ma Campagne 区域；支持微信下单配送",
    intro: "2021年开业，金沙萨Gombe区最受欢迎的中餐厅。主厨李伟来自成都，擅长正宗川味 — 麻婆豆腐、重庆火锅、宫保鸡丁等经典菜品。同时提供企业团餐、矿区送餐、节日宴会定制服务。",
    image: "/images/guide/restaurant1.jpg",
    category: "restaurant",
    subcategory: "中国餐厅",
    featured: true,
  },
  {
    id: 2,
    name: "金龙酒楼",
    contactPerson: "张梅",
    wechat: "zhangmei_gd",
    phone: "+243 82 345 6789",
    area: "金沙萨 Ngaliema区",
    mainService: "广式早茶、海鲜、烧腊、包间聚餐、宴席承办",
    hasStore: "有 — 带包间餐厅，200平米",
    serviceScope: "金沙萨全市；可提供上门宴席服务",
    intro: "金龙酒楼为金沙萨带来高品质粤菜。周末早茶在华人圈最受追捧，设有包间可供商务宴请和庆典聚会，配备酒吧和KTV设施。主厨在广州从业超过15年。",
    image: "/images/guide/restaurant2.jpg",
    category: "restaurant",
    subcategory: "中国餐厅",
  },
  {
    id: 3,
    name: "亚洲超市",
    contactPerson: "陈杰",
    wechat: "chen_asiamarket",
    phone: "+243 99 876 5432",
    area: "金沙萨 Gombe区",
    mainService: "中国食品、亚洲调味料、方便面、冷冻食品、大米、零食、饮料",
    hasStore: "有 — 零售店+仓库，300平米",
    serviceScope: "金沙萨全市配送；餐厅、矿区、企业批量订购",
    intro: "金沙萨最大的中国食品超市，从中国直接进口，每两周到一批新货。中式烹饪必备品一应俱全 — 酱油、辣椒油、花椒、干面条、速冻饺子、豆腐等。支持餐厅和矿区批发供货。微信下单，Gombe区当日配送。",
    image: "/images/guide/supermarket1.jpg",
    category: "goods",
    subcategory: "食品",
    featured: true,
  },

  /* ---------- 商品（除食品外的子分类） ---------- */
  {
    id: 11,
    name: "万家日用百货",
    contactPerson: "王霞",
    wechat: "wangxia_mama",
    phone: "+243 81 555 7788",
    area: "金沙萨 Limete区",
    mainService: "洗护用品、清洁用品、家居杂货、塑料制品、文具、电池、蚊香",
    hasStore: "有 — 临街店铺，180平米 + 仓储",
    serviceScope: "金沙萨全市；满50美元免费配送 Gombe / Limete",
    intro: "中资日用百货批发零售店，商品从义乌直接进口，价格比本地超市低 30-40%。专注华人家庭、企业宿舍、矿区营地的整箱采购。可代下单义乌小商品，3-5周到货。",
    image: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=800&h=600&fit=crop",
    category: "goods",
    subcategory: "生活用品",
  },
  {
    id: 12,
    name: "刚果建材城",
    contactPerson: "周强",
    wechat: "zhou_jiancai",
    phone: "+243 82 444 1122",
    area: "金沙萨 Masina区",
    mainService: "瓷砖、洁具、五金、电线、PPR管、水泥、钢材、油漆",
    hasStore: "有 — 建材展厅+仓库，1500平米",
    serviceScope: "金沙萨全市送货上门；可发往卢本巴希、科卢韦齐",
    intro: "金沙萨最大的中资建材综合商场，覆盖装修全品类。瓷砖来自佛山、洁具来自潮州、五金电料从顺德直采。承接华人住宅、餐厅、酒店、办公楼整体建材供应。提供选材建议和工地报价。",
    image: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&h=600&fit=crop",
    category: "goods",
    subcategory: "建材",
    featured: true,
  },
  {
    id: 13,
    name: "中非汽车贸易",
    contactPerson: "韩磊",
    wechat: "hanlei_motors",
    phone: "+243 99 333 8899",
    area: "金沙萨 Gombe区",
    mainService: "中国品牌汽车销售、二手丰田/三菱、皮卡、SUV、摩托车、配件",
    hasStore: "有 — 展厅+维修车间，2000平米",
    serviceScope: "全国销售配送；矿区车队整批供应",
    intro: "代理长城、奇瑞、吉利、五菱在刚果金的销售。同时经营从迪拜进口的二手丰田Hilux、Land Cruiser、Prado等热门皮卡SUV。提供购车按揭、保险、上牌、维修一条龙服务。",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=600&fit=crop",
    category: "goods",
    subcategory: "交通工具",
  },
  {
    id: 14,
    name: "金沙萨阳光新能源",
    contactPerson: "钱建国",
    wechat: "qianjianguo_solar",
    phone: "+243 81 222 6611",
    area: "金沙萨 Gombe区",
    mainService: "太阳能板、储能电池、逆变器、柴油发电机、UPS、燃油批发",
    hasStore: "有 — 展厅+仓储，800平米",
    serviceScope: "金沙萨及周边城市；矿区项目可定制方案",
    intro: "面向矿区、酒店、住宅小区的能源解决方案商。代理华为、锦浪、阳光电源逆变器；隆基、晶科太阳能板。柴油发电机覆盖康明斯、潍柴、玉柴。专业团队提供选型、安装、运维。",
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=600&fit=crop",
    category: "goods",
    subcategory: "能源产品",
  },

  /* ---------- 住宿 ---------- */
  {
    id: 21,
    name: "金都华人短租公寓",
    contactPerson: "刘姐",
    wechat: "jindu_apt",
    phone: "+243 82 100 2233",
    area: "金沙萨 Gombe区",
    mainService: "日租/周租公寓、含早餐、24小时中文管家、机场接送",
    hasStore: "有 — 12套精装公寓，含安保",
    serviceScope: "金沙萨 Gombe / Ngaliema 区",
    intro: "专为华人出差短期商务客打造的中式公寓，配备中式厨房、烧水壶、转换插头、中文电视。24小时中文前台，可代订餐、协助办事。日租 80-150 USD，周租可享 8 折。",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop",
    category: "lodging",
    subcategory: "中国酒店",
    featured: true,
  },
  {
    id: 22,
    name: "华兴长租公寓",
    contactPerson: "黄敏",
    wechat: "huangmin_rental",
    phone: "+243 81 999 6677",
    area: "金沙萨 Gombe区",
    mainService: "1-3居室长租、含家具家电、清洁服务、网络、备用发电",
    hasStore: "有 — 多栋自营公寓楼",
    serviceScope: "Gombe、Ngaliema、Limete、Ma Campagne",
    intro: "覆盖单身公寓到家庭三居室，月租 1200-3500 USD。所有房源含家具家电、Wi-Fi、24小时备用发电、安保。专为驻外华人企业、个体经营者设计，签约灵活、押一付三起。新到客户免费机场接送。",
    image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop",
    category: "lodging",
    subcategory: "中国公寓",
  },
  {
    id: 23,
    name: "Pullman 金沙萨大酒店",
    contactPerson: "中文礼宾部",
    wechat: "pullman_kin",
    phone: "+243 99 100 0001",
    area: "金沙萨 Gombe区",
    mainService: "五星国际酒店、商务套房、宴会厅、泳池、健身房、行政酒廊",
    hasStore: "有 — 240间客房，配中文服务",
    serviceScope: "全球酒店集团 — 雅高 Accor 旗下",
    intro: "金沙萨高端商务首选，毗邻刚果河、外交使馆区。中文礼宾员协助登记、用餐、商务安排。会议厅可承办100-500人活动。会员可享行政酒廊、迎宾酒、延迟退房等权益。",
    image: "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&h=600&fit=crop",
    category: "lodging",
    subcategory: "国际级酒店",
  },
  {
    id: 24,
    name: "金沙萨万豪本地公寓",
    contactPerson: "Patrick",
    wechat: "kin_localapt",
    phone: "+243 82 700 5544",
    area: "金沙萨 Ngaliema区",
    mainService: "本地中端酒店式公寓、月租周租、家具齐全、备用发电",
    hasStore: "有 — 3栋公寓共40套",
    serviceScope: "Ngaliema、Binza 高档区",
    intro: "本地业主自营的酒店式公寓，价格比国际五星低 50%，但配备齐全（空调、热水、Wi-Fi、备用发电、安保）。适合预算有限的中长期商务、矿企外派员工。月租 600-1500 USD。",
    image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop",
    category: "lodging",
    subcategory: "本地酒店公寓",
  },

  /* ---------- 生活服务 ---------- */
  {
    id: 31,
    name: "康健诊所",
    contactPerson: "李华医生",
    wechat: "drlihua_ksv",
    phone: "+243 99 222 4455",
    area: "金沙萨 Gombe区",
    mainService: "全科诊疗、中西医结合、体检、疟疾治疗、疫苗接种、药房",
    hasStore: "有 — 诊所+药房，200平米",
    serviceScope: "金沙萨；24小时急诊可出诊",
    intro: "服务金沙萨华人社区的中资诊所。李华医生拥有20年临床经验，提供中医和西医诊疗服务。专长热带疾病防治，包括疟疾和伤寒。诊所内设药房，备有中药和进口药品。可承接企业团体体检。24小时急诊电话服务。",
    image: "/images/guide/medical1.jpg",
    category: "life",
    subcategory: "健康",
    featured: true,
  },
  {
    id: 32,
    name: "小星星中文学校",
    contactPerson: "马丽",
    wechat: "mali_school_ksv",
    phone: "+243 82 888 5566",
    area: "金沙萨 Ngaliema区",
    mainService: "华侨子女中文课、法语辅导、课业辅导、周末文化课程",
    hasStore: "有 — 教学场地，150平米，3间教室",
    serviceScope: "金沙萨面授；同时提供线上课程",
    intro: "为金沙萨华侨子女提供优质中文教育。参照国内课程标准，针对海外学习者做适当调整。招收4-15岁学生，从零基础到高级班。同时为华人家庭提供法语辅导。周末开设书法、绘画、传统文化活动课。小班教学（每班最多8人），确保个性化辅导。",
    image: "/images/guide/education1.jpg",
    category: "life",
    subcategory: "教育",
  },
  {
    id: 33,
    name: "金狮安保服务",
    contactPerson: "陈队长",
    wechat: "jinshi_security",
    phone: "+243 81 555 9988",
    area: "金沙萨 Gombe区（总部）",
    mainService: "商铺/仓库/住宅 24小时驻守保安、工地安保外派、华人活动安保、报警系统安装、CCTV 监控部署",
    hasStore: "有 — 调度中心 + 安保器材仓库",
    serviceScope: "金沙萨全市 24小时响应；卢本巴希、马塔迪可派队驻点",
    intro: "面向华人企业和家庭的专业安保公司，由前部队中方顾问与本地退伍警员联合管理。提供持证保安人员驻守、夜班巡逻、现金护送、CCTV+报警系统集成方案。所有保安统一着装、配备对讲机和应急车辆，10分钟内可到达 Gombe / Limete 商圈。可签长期月度合同，也可按活动短期承接。",
    image: "https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&h=600&fit=crop",
    category: "life",
    subcategory: "安保",
    featured: true,
  },

  /* ---------- 商业服务 ---------- */
  {
    id: 41,
    name: "中铁刚果工程",
    contactPerson: "项目部 王经理",
    wechat: "zt_kongo",
    phone: "+243 81 600 1100",
    area: "金沙萨 Gombe区（总部）",
    mainService: "公路、桥梁、矿山土建、水利工程总承包、EPC 项目",
    hasStore: "有 — 总部办公+多个工地项目部",
    serviceScope: "刚果金全境；可承接周边国家项目",
    intro: "中资基建综合承包商，拥有刚果金全级别建筑施工资质。承接过多条公路、矿区配套设施、水利工程项目。具备 EPC 总承包能力，可提供从设计、采购到施工的一站式服务。配备中国管理团队+本地施工队伍。",
    image: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop",
    category: "business",
    subcategory: "工程承包商",
    featured: true,
  },
  {
    id: 42,
    name: "刚果金建工辅材",
    contactPerson: "孙经理",
    wechat: "kongo_jiangong",
    phone: "+243 82 200 7700",
    area: "金沙萨 Limete区",
    mainService: "脚手架、模板、扣件、工地围挡、安全防护、建筑机械配件",
    hasStore: "有 — 仓库 + 现场施工服务",
    serviceScope: "金沙萨及全国工地配套",
    intro: "为中资工程公司、本地承包商提供建筑辅材和现场服务。可现场搭设脚手架、提供模板系统、安全防护方案。库存充足，急用 24 小时内送达工地。同时承接旧设备回收。",
    image: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
    category: "business",
    subcategory: "建筑相关服务商",
  },
  {
    id: 43,
    name: "京匠装修队",
    contactPerson: "赵师傅",
    wechat: "jingjiang_deco",
    phone: "+243 99 660 8855",
    area: "金沙萨",
    mainService: "住宅、餐厅、办公室、商铺整体装修；水电、瓦工、木工、油漆",
    hasStore: "无固定店面 — 工长上门量房报价",
    serviceScope: "金沙萨全市；卢本巴希可派队伍",
    intro: "中国工长带本地施工队，专做华人需要的中式装修风格。从设计到完工 30-90 天，材料可代购或客户自备。承接过 50+ 套华人公寓、10+ 家中餐厅装修。提供 2 年质保。",
    image: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&h=600&fit=crop",
    category: "business",
    subcategory: "装修队",
  },
  {
    id: 44,
    name: "非洲速运物流",
    contactPerson: "赵鹏",
    wechat: "zhaopeng_logistics",
    phone: "+243 99 111 2233",
    area: "金沙萨 Gombe区（总部）；广州办事处",
    mainService: "中国到刚果海运/空运、清关、门到门配送、仓储服务",
    hasStore: "有 — 金沙萨仓库（500平米）+ 广州集货中心",
    serviceScope: "广州/义乌到金沙萨；刚果国内配送至卢本巴希、科卢韦齐",
    intro: "中国与刚果之间的可靠物流伙伴。全程供应链服务 — 从广州/义乌揽收、集货、海运/空运、马塔迪港清关，到金沙萨及矿业省份终端配送。海运约45-55天，空运7-10天。专长建材、机械及普货运输。免费仓储30天。",
    image: "/images/guide/logistics1.jpg",
    category: "business",
    subcategory: "物流清关",
    featured: true,
  },
  {
    id: 45,
    name: "中刚商务咨询",
    contactPerson: "Cindy 林",
    wechat: "cindy_consult",
    phone: "+243 81 880 4400",
    area: "金沙萨 Gombe区",
    mainService: "公司注册、税务申报、签证劳工证、合同翻译、政府关系协助",
    hasStore: "有 — 写字楼办公室",
    serviceScope: "全国服务；卢本巴希设代理",
    intro: "由资深华人律师团队组建的商务咨询公司，专门服务中资企业和个体投资者。可办理 SARL 公司注册、ANR 安全审查、外籍员工劳工证、年度税务合规等。中法英三语团队，与各部委有稳定渠道。",
    image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=600&fit=crop",
    category: "business",
  },

  /* ---------- 休闲娱乐 ---------- */
  {
    id: 51,
    name: "金龙夜总会 KTV",
    contactPerson: "Mike",
    wechat: "jinlong_ktv",
    phone: "+243 82 555 3322",
    area: "金沙萨 Gombe区",
    mainService: "包厢KTV、华语日语金曲、洋酒、商务接待、宴会包场",
    hasStore: "有 — 12 间包厢，含豪华包",
    serviceScope: "金沙萨；可代办活动策划",
    intro: "金沙萨华人圈最受欢迎的 KTV 夜总会，配备国内最新点歌系统，曲库覆盖中粤台日韩英。包厢 6-30 人，提供商务套餐、宴会包场。配套酒水餐饮，可承办公司年会、生日会、客户答谢宴。",
    image: "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=800&h=600&fit=crop",
    category: "leisure",
    featured: true,
  },

  /* ---------- 租赁设备 ---------- */
  {
    id: 61,
    name: "刚果鼎鑫脚手架租赁",
    contactPerson: "李师傅",
    wechat: "dingxin_scaff",
    phone: "+243 81 700 8800",
    area: "金沙萨 Limete区",
    mainService: "扣件式脚手架、盘扣脚手架、移动脚手架、塔吊、模板、安全网",
    hasStore: "有 — 5000 平米堆场",
    serviceScope: "金沙萨及周边 200 公里；可委托运输至外省",
    intro: "覆盖小型住宅到大型工程的脚手架租赁。可按米/吨计租，月租 1.5-3 USD/平米起。提供搭设、拆除、运输全套服务。所有产品定期检测，符合国际安全标准。库存充足，签约后 48 小时内进场。",
    image: "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&h=600&fit=crop",
    category: "rental",
    subcategory: "脚手架",
  },
  {
    id: 62,
    name: "华威电气设备租赁",
    contactPerson: "陈工",
    wechat: "huawei_elec",
    phone: "+243 99 880 1100",
    area: "金沙萨 Gombe区",
    mainService: "柴油发电机、UPS、配电柜、电缆、移动变压器、空压机、焊机",
    hasStore: "有 — 设备仓库+维保车间",
    serviceScope: "金沙萨、卢本巴希、科卢韦齐三地仓",
    intro: "工业级电气设备租赁商，主力机型 30-1000 kVA 柴油发电机（康明斯、卡特彼勒、Volvo），日租/月租灵活。配套燃油加注、24 小时维保。适用工地、矿区、活动临电、医院备电场景。",
    image: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&h=600&fit=crop",
    category: "rental",
    subcategory: "电气设备",
  },
  {
    id: 63,
    name: "金沙萨大件运输",
    contactPerson: "Jacques",
    wechat: "ksv_transport",
    phone: "+243 81 990 2233",
    area: "金沙萨 Masina区",
    mainService: "重型卡车、自卸车、平板拖车、起重机、叉车、箱式货车租赁",
    hasStore: "有 — 70+ 辆运营车队",
    serviceScope: "刚果金全境；可办理跨境运输手续",
    intro: "服务工程项目、矿区物流的大件运输公司。车队覆盖 5-50 吨各类卡车、25-100 吨吊车、3-15 吨叉车。可按趟、按天、按月计费。司机配备齐全，可承接长途、夜间运输任务。所有车辆带 GPS 定位。",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=600&fit=crop",
    category: "rental",
    subcategory: "运输设备",
  },
  {
    id: 64,
    name: "刚果车修租赁",
    contactPerson: "孙浩",
    wechat: "sunhao_techfix",
    phone: "+243 81 777 3344",
    area: "金沙萨 Limete区",
    mainService: "汽修举升机、轮胎拆装机、动平衡仪、四轮定位仪、千斤顶、拖车",
    hasStore: "有 — 设备展厅+维保",
    serviceScope: "金沙萨；可发往全国",
    intro: "面向汽修店、车队的专业汽修设备租赁。设备来自国内顶级品牌，定期校准。日租 30 USD 起，月租可享 7 折。配套技术指导、操作培训。可提供整套小型汽修店设备打包租赁方案。",
    image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&h=600&fit=crop",
    category: "rental",
  },

  /* ---------- 二手专区（示例：实际由表单发布） ---------- */
  {
    id: 81,
    name: "出售：丰田 Land Cruiser 2018款",
    contactPerson: "李先生",
    wechat: "lixx_2nd",
    phone: "+243 81 200 9900",
    area: "金沙萨 Gombe区",
    mainService: "二手车 / 9 成新 / 售价 35,000 USD",
    hasStore: "支持验车、过户协助",
    serviceScope: "金沙萨当面交易；可协助上牌",
    intro: "本人因回国出售自用 Land Cruiser 4.5 柴油版，2018 年购入，行驶 78,000 km。历次保养记录齐全，刚做完大保。原装备胎、原厂导航、防弹膜。可议价。微信沟通看车。",
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&h=600&fit=crop",
    category: "secondhand",
  },
];
export const liveBusinesses: Business[] = [];

/* 种子数据全部标记 hidden，保留但页面不展示 */
export const businesses: Business[] = [
  ...seedBusinesses.map((b) => ({ ...b, hidden: true })),
  ...liveBusinesses,
];
export type SubmissionType =
  | "merchant"
  | "secondhand"
  | "purchase"
  | "survey"
  | "event";
export interface RawSubmission {
  id: string;
  type: SubmissionType;
  timestamp: string;
  status: string;
  data: Record<string, string>;
}

export const DEFAULT_IMG: Record<string, string> = {
  goods:      "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=800&h=600&fit=crop",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
  lodging:    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop",
  life:       "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop",
  business:   "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop",
  leisure:    "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=800&h=600&fit=crop",
  rental:     "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&h=600&fit=crop",
  secondhand: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&h=600&fit=crop",
};

export function submissionToBusiness(s: RawSubmission, idx: number): Business | null {
  const d = s.data || {};
  const baseId = 1_000_000 + idx;
  const get = (k: string) => (d[k] ?? "").trim();

  if (s.type === "merchant") {
    const catLabel = get("category");
    const cat = categories.find((c) => c.label === catLabel);
    if (!cat) return null;
    const name = get("nameZh") || get("name");
    const nameIntl = get("nameIntl");
    const isValidImg = (u: string) => /^https?:\/\//i.test(u) || u.startsWith("/api/media/");
    const cover = get("coverImageUrl");
    const galleryRaw = get("galleryUrls");
    const gallery = galleryRaw
      ? galleryRaw
          .split(/\r?\n/)
          .map((u) => u.trim())
          .filter(isValidImg)
          .slice(0, 12)
      : [];
    const updatesRaw = get("updates");
    let updates: BusinessUpdate[] = [];
    if (updatesRaw) {
      try {
        const parsed = JSON.parse(updatesRaw);
        if (Array.isArray(parsed)) {
          updates = parsed
            .filter(
              (u): u is BusinessUpdate =>
                !!u &&
                typeof u === "object" &&
                typeof (u as BusinessUpdate).id === "string" &&
                typeof (u as BusinessUpdate).at === "string" &&
                typeof (u as BusinessUpdate).text === "string",
            )
            .slice(0, 20);
        }
      } catch {
        /* 破损数据忽略 */
      }
    }
    // 入驻表单自带的"最新动态"字段 → 合成一条排在最前（始终展示当前版本，被商家再次编辑即更新）
    // 只要 text 或 图片任一有内容就展示，之前只看 text 导致"只传图"被吞
    const latestText = get("latestUpdateText");
    const latestImgsRaw = get("latestUpdateImages");
    const latestImgs = latestImgsRaw
      ? latestImgsRaw
          .split(/\r?\n/)
          .map((u) => u.trim())
          .filter(isValidImg)
          .slice(0, 6)
      : [];
    if (latestText || latestImgs.length > 0) {
      const formUpdate: BusinessUpdate = {
        id: `form-${s.id}`,
        at: s.timestamp || new Date().toISOString(),
        text: latestText,
        ...(latestImgs.length ? { images: latestImgs } : {}),
      };
      updates = [formUpdate, ...updates].slice(0, 20);
    }
    const area = get("area");
    // 优先用商家自己在地图上点选的定位；没有（老数据 / 无门店）再回落到 commune 近似坐标
    const latRaw = get("storeLocationLat");
    const lngRaw = get("storeLocationLng");
    const pickedLat = latRaw ? Number(latRaw) : NaN;
    const pickedLng = lngRaw ? Number(lngRaw) : NaN;
    const hasPicked = Number.isFinite(pickedLat) && Number.isFinite(pickedLng);
    const coord = hasPicked
      ? ([pickedLat, pickedLng] as [number, number])
      : AREA_COORDS[area];
    return {
      id: baseId,
      submissionId: s.id,
      name,
      englishName: nameIntl || undefined,
      contactPerson: get("contactPerson"),
      wechat: get("wechat"),
      phone: get("phone"),
      area,
      address: get("storeAddress") || undefined,
      mainService: get("mainService"),
      hasStore: get("hasStore"),
      image: isValidImg(cover) ? cover : DEFAULT_IMG[cat.key] ?? DEFAULT_IMG.business,
      gallery: gallery.length ? gallery : undefined,
      updates: updates.length ? updates : undefined,
      category: cat.key,
      subcategory: get("subcategory") || undefined,
      ...(coord ? { lat: coord[0], lng: coord[1] } : {}),
    };
  }

  if (s.type === "secondhand") {
    const category = get("categoryKey") || get("category");
    const area = get("address") || get("area");
    const phone = get("phone") || get("contact_phone") || get("contact_whatsapp");
    const wechat = get("wechat") || get("contact_wechat");
    const isValidImg = (u: string) => /^https?:\/\//i.test(u) || u.startsWith("/api/media/");
    const urls = (get("galleryUrls") || "")
      .split(/\r?\n/)
      .map((u) => u.trim())
      .filter(isValidImg)
      .slice(0, 9);
    const [cover, ...rest] = urls;
    return {
      id: baseId,
      submissionId: s.id,
      name: `${get("itemName")}${get("condition") ? `（${get("condition")}）` : ""}`,
      contactPerson: get("contactPerson"),
      wechat,
      phone,
      area,
      mainService: `${category}${get("price") ? ` | 售价 ${get("price")} USD` : ""}`,
      hasStore: get("condition"),
      serviceScope: area,
      intro: get("description"),
      image: cover || DEFAULT_IMG.secondhand,
      gallery: rest.length ? rest : undefined,
      category: "secondhand",
    };
  }

  return null;
}

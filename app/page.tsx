"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Search,
  MapPin,
  Phone,
  MessageCircle,
  Store,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Star,
  UtensilsCrossed,
  ShoppingBag,
  Hotel,
  HeartPulse,
  Briefcase,
  PartyPopper,
  Wrench,
  Users,
  Tag,
  X,
  Megaphone,
  UserPlus,
  UserSearch,
  Recycle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Volume2,
  Smartphone,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Business {
  id: number;
  name: string;
  contactPerson: string;
  wechat: string;
  phone: string;
  area: string;
  mainService: string;
  hasStore: string;
  serviceScope: string;
  intro: string;
  image: string;
  category: string;
  subcategory?: string;
  featured?: boolean;
  lat?: number;
  lng?: number;
  hidden?: boolean; // true = 保留数据但不在页面展示
}

/* 金沙萨主要 commune 的近似坐标 */
const AREA_COORDS: Record<string, [number, number]> = {
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
const KINSHASA_CENTER: [number, number] = [-4.3276, 15.3136];

function coordsForArea(area: string, id = 0): [number, number] {
  let base: [number, number] = KINSHASA_CENTER;
  for (const k of Object.keys(AREA_COORDS)) {
    if (area.includes(k)) { base = AREA_COORDS[k]; break; }
  }
  // 用 id 做稳定的小偏移，避免同区 marker 完全重叠
  const jitter = ((id * 9301 + 49297) % 233280) / 233280; // 伪随机 0~1
  const jitter2 = ((id * 7919 + 12345) % 233280) / 233280;
  return [base[0] + (jitter - 0.5) * 0.012, base[1] + (jitter2 - 0.5) * 0.012];
}

interface CategoryDef {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  sub: string[];
  color: string;
  emoji: string;
}

/* ------------------------------------------------------------------ */
/*  Categories（二级页面分类）                                          */
/* ------------------------------------------------------------------ */
const categories: CategoryDef[] = [
  { key: "goods",      label: "商品",     icon: ShoppingBag,     sub: ["生活用品", "食品", "建材", "交通工具", "能源产品"], color: "#f59e0b", emoji: "🛍️" },
  { key: "restaurant", label: "餐厅",     icon: UtensilsCrossed, sub: ["中国餐厅", "西餐厅", "刚果风味餐厅", "酒吧", "咖啡厅"], color: "#ef4444", emoji: "🍜" },
  { key: "lodging",    label: "住宿",     icon: Hotel,           sub: ["中国酒店短租", "中国公寓长租", "国际级酒店", "本地酒店公寓"], color: "#8b5cf6", emoji: "🏨" },
  { key: "life",       label: "生活服务", icon: HeartPulse,      sub: ["健康", "教育", "安保"], color: "#10b981", emoji: "💗" },
  { key: "business",   label: "商业服务", icon: Briefcase,       sub: ["工程承包商", "建筑相关服务商", "装修队", "物流清关", "商业咨询"], color: "#3b82f6", emoji: "💼" },
  { key: "leisure",    label: "休闲娱乐", icon: PartyPopper,     sub: [], color: "#ec4899", emoji: "🎉" },
  { key: "rental",     label: "租赁设备", icon: Wrench,          sub: ["脚手架", "电气设备", "运输设备", "汽修设备"], color: "#64748b", emoji: "🔧" },
  { key: "jobs",       label: "招聘求职", icon: Users,           sub: ["招聘", "求职"], color: "#14b8a6", emoji: "👥" },
  { key: "secondhand", label: "二手专区", icon: Tag,             sub: [], color: "#f97316", emoji: "🏷️" },
];

/* ------------------------------------------------------------------ */
/*  种子数据 — 保留为基础样本，但默认 hidden 不在页面显示                */
/* ------------------------------------------------------------------ */
const seedBusinesses: Business[] = [
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
    subcategory: "中国酒店短租",
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
    subcategory: "中国公寓长租",
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
    subcategory: "商业咨询",
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
    subcategory: "汽修设备",
  },

  /* ---------- 招聘求职（示例：实际由表单发布） ---------- */
  {
    id: 71,
    name: "矿区项目招聘 — 中文翻译/采购员",
    contactPerson: "中冶刚果 HR",
    wechat: "zhongye_hr",
    phone: "+243 99 333 1100",
    area: "刚果金 卢本巴希矿区",
    mainService: "中文-法语翻译 2 名 / 采购员 1 名",
    hasStore: "薪资 2000-3500 USD/月 + 食宿 + 年假机票",
    serviceScope: "工作地：卢本巴希；2 年合同",
    intro: "中冶刚果项目部招聘随队翻译及采购员。要求：法语流利（DELF B2+）、有海外工作经验或采购经验优先。提供单间宿舍、三餐、医保、年终奖。可微信投递简历。",
    image: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop",
    category: "jobs",
    subcategory: "招聘",
  },
  {
    id: 72,
    name: "求职 — 餐厅大厨/管理岗",
    contactPerson: "陈先生",
    wechat: "chenchef_2026",
    phone: "+243 82 110 9988",
    area: "可金沙萨/卢本巴希",
    mainService: "10 年中餐主厨经验（粤菜+川菜），擅长宴会、外卖运营",
    hasStore: "期望薪资 2500-4000 USD/月 + 提成",
    serviceScope: "可立即到岗；偏好中餐厅或矿区食堂管理",
    intro: "国内五星酒店主厨出身，2018 年起在金沙萨工作。擅长团队管理、采购成本控制、菜单设计。最近一份工作做到行政总厨，因合同到期寻找新机会。可提供作品图册和过往业绩。",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=600&fit=crop",
    category: "jobs",
    subcategory: "求职",
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

/* ------------------------------------------------------------------ */
/*  页面实际展示的商家（真实录入 — 可逐步补充）                         */
/* ------------------------------------------------------------------ */
const liveBusinesses: Business[] = [
  {
    id: 2001,
    name: "福美超市",
    contactPerson: "",
    wechat: "",
    phone: "",
    area: "金沙萨 Commune de Kinshasa · Avenue du Progrès",
    mainService: "综合食品超市：中国食品、粮油调味、方便面、零食饮料、冷冻食品、日用百货",
    hasStore: "有 — 临街超市门店",
    serviceScope: "金沙萨市区",
    intro: "福美超市位于 Avenue du Progrès，是华人常去的综合型食品超市。中国粮油、调味料、方便面、速冻饺子、零食饮料、日用杂货齐全，适合日常采买。",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&h=600&fit=crop",
    category: "goods",
    subcategory: "食品",
    featured: true,
    lat: -4.3500,
    lng: 15.3050,
  },
  {
    id: 2002,
    name: "亚洲花园 Jardin d'Asie",
    contactPerson: "餐厅前台",
    wechat: "",
    phone: "+243 85 903 8380",
    area: "金沙萨 Gombe 区 · Avenue Uvira N°60，Immeuble Aimer Tower 17-18 楼",
    mainService: "亚洲料理 · 中餐 / 日料 / 韩式拼盘 · 商务宴请 · 刚果河景包房",
    hasStore: "有 — Aimer Tower 顶层整层餐厅",
    serviceScope: "金沙萨市区；可预订包房、节日订席",
    intro: "位于 Gombe 区 Aimer Tower 17-18 层的高端亚洲餐厅，俯瞰刚果河。菜品覆盖中餐、日料、韩式拼盘，环境优雅，适合商务宴请、家庭聚餐和节日庆典。Instagram @jardin_dasie_drc 可查看环境图与菜品。",
    image: "/images/businesses/jardin-dasie.jpg",
    category: "restaurant",
    subcategory: "中国餐厅",
    featured: true,
    lat: -4.2990,
    lng: 15.2895,
  },
  {
    id: 2003,
    name: "喜客饭店",
    contactPerson: "",
    wechat: "",
    phone: "",
    area: "金沙萨 Ngaliema 区 · 26 Avenue Sergent Moke",
    mainService: "家常中餐、川菜、粤菜、小炒、外卖",
    hasStore: "有 — 堂食餐厅",
    serviceScope: "金沙萨市区；可预订包场小聚",
    intro: "喜客饭店位于 Avenue Sergent Moke 26 号，周边是华人常驻的 Ngaliema / Haut Commandement 社区。主打家常中餐，川粤口味，适合日常快餐、家庭聚餐或小型宴请。",
    image: "/images/businesses/xike.webp",
    category: "restaurant",
    subcategory: "中国餐厅",
    lat: -4.3700,
    lng: 15.2600,
  },
];

/* 种子数据全部标记 hidden，保留但页面不展示 */
const businesses: Business[] = [
  ...seedBusinesses.map((b) => ({ ...b, hidden: true })),
  ...liveBusinesses,
];

/* ------------------------------------------------------------------ */
/*  审核通过的用户提交 → 转 Business                                    */
/* ------------------------------------------------------------------ */
type SubmissionType = "merchant" | "hiring" | "jobseeker" | "secondhand";
interface RawSubmission {
  id: string;
  type: SubmissionType;
  timestamp: string;
  status: string;
  data: Record<string, string>;
}

const DEFAULT_IMG: Record<string, string> = {
  goods:      "https://images.unsplash.com/photo-1583394293214-28ded15ee548?w=800&h=600&fit=crop",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop",
  lodging:    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop",
  life:       "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop",
  business:   "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop",
  leisure:    "https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=800&h=600&fit=crop",
  rental:     "https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&h=600&fit=crop",
  jobs:       "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=600&fit=crop",
  secondhand: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&h=600&fit=crop",
};

function submissionToBusiness(s: RawSubmission, idx: number): Business | null {
  const d = s.data || {};
  const baseId = 1_000_000 + idx;
  const get = (k: string) => (d[k] ?? "").trim();

  if (s.type === "merchant") {
    const catLabel = get("category");
    const cat = categories.find((c) => c.label === catLabel);
    if (!cat) return null;
    return {
      id: baseId,
      name: get("name"),
      contactPerson: get("contactPerson"),
      wechat: get("wechat"),
      phone: get("phone"),
      area: get("area"),
      mainService: get("mainService"),
      hasStore: get("hasStore"),
      serviceScope: get("serviceScope"),
      intro: get("intro"),
      image: DEFAULT_IMG[cat.key] ?? DEFAULT_IMG.business,
      category: cat.key,
      subcategory: get("subcategory") || undefined,
    };
  }

  if (s.type === "hiring") {
    const company = get("company");
    const position = get("position");
    return {
      id: baseId,
      name: `招聘：${position}${company ? ` · ${company}` : ""}`,
      contactPerson: get("contactPerson"),
      wechat: get("wechat"),
      phone: get("phone"),
      area: get("area"),
      mainService: `${position}${get("salary") ? ` | ${get("salary")}` : ""}`,
      hasStore: get("salary"),
      serviceScope: get("area"),
      intro: [get("requirement"), get("description")].filter(Boolean).join("\n\n"),
      image: DEFAULT_IMG.jobs,
      category: "jobs",
      subcategory: "招聘",
    };
  }

  if (s.type === "jobseeker") {
    return {
      id: baseId,
      name: `求职：${get("targetPosition")}`,
      contactPerson: get("name"),
      wechat: get("wechat"),
      phone: get("phone"),
      area: get("expectArea"),
      mainService: `${get("targetPosition")}${get("expectSalary") ? ` | 期望 ${get("expectSalary")}` : ""}`,
      hasStore: get("expectSalary"),
      serviceScope: get("expectArea"),
      intro: [
        get("experience") && `工作经验：${get("experience")}`,
        get("skills") && `技能：${get("skills")}`,
        get("intro"),
      ].filter(Boolean).join("\n\n"),
      image: DEFAULT_IMG.jobs,
      category: "jobs",
      subcategory: "求职",
    };
  }

  if (s.type === "secondhand") {
    return {
      id: baseId,
      name: `${get("itemName")}${get("condition") ? `（${get("condition")}）` : ""}`,
      contactPerson: get("contactPerson"),
      wechat: get("wechat"),
      phone: get("phone"),
      area: get("area"),
      mainService: `${get("category")}${get("price") ? ` | 售价 ${get("price")} USD` : ""}`,
      hasStore: get("condition"),
      serviceScope: get("area"),
      intro: get("description"),
      image: DEFAULT_IMG.secondhand,
      category: "secondhand",
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  轮播广告位                                                          */
/* ------------------------------------------------------------------ */
interface AdSlide {
  title: string;
  subtitle: string;
  bg: string;       // tailwind gradient
  emoji: string;
  phone?: string;
  address?: string;
}

const ads: AdSlide[] = [
  {
    title: "欢迎商家入驻名录",
    subtitle: "免费收录 · 让客户更快找到你",
    bg: "from-sky-400 via-sky-500 to-blue-500",
    emoji: "🏪",
  },
  {
    title: "混凝土搅拌站",
    subtitle: "工程建材一站供应 · 价格实惠",
    bg: "from-amber-400 via-yellow-400 to-orange-400",
    emoji: "🏗️",
    phone: "+243823170887",
    address: "中国城",
  },
];

/* ------------------------------------------------------------------ */
/*  表单字段定义                                                        */
/* ------------------------------------------------------------------ */
type FieldType = "text" | "textarea" | "select";
interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

const FORMS: Record<
  "merchant" | "hiring" | "jobseeker" | "secondhand",
  { title: string; fields: FormField[] }
> = {
  merchant: {
    title: "商家入驻申请",
    fields: [
      { name: "name",          label: "商家名称",         type: "text", required: true },
      { name: "contactPerson", label: "联系人",           type: "text", required: true },
      { name: "wechat",        label: "微信号",           type: "text" },
      { name: "phone",         label: "电话 / WhatsApp",  type: "text", required: true },
      { name: "category",      label: "所属分类",         type: "select", required: true,
        options: categories.map((c) => c.label) },
      { name: "subcategory",   label: "子分类",           type: "text", placeholder: "如：中国餐厅、生活用品 …" },
      { name: "area",          label: "所在区域",         type: "text", placeholder: "如：金沙萨 Gombe区" },
      { name: "hasStore",      label: "是否有门店",       type: "select", options: ["有", "无"] },
      { name: "mainService",   label: "主营产品或服务",   type: "textarea", required: true },
      { name: "serviceScope",  label: "服务范围",         type: "textarea" },
      { name: "intro",         label: "商家简介",         type: "textarea" },
    ],
  },
  hiring: {
    title: "招聘信息发布",
    fields: [
      { name: "company",      label: "公司名称",        type: "text", required: true },
      { name: "contactPerson",label: "联系人",          type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
      { name: "area",         label: "工作地点",        type: "text", placeholder: "如：金沙萨、卢本巴希 …" },
      { name: "position",     label: "招聘岗位",        type: "text", required: true },
      { name: "salary",       label: "薪资范围",        type: "text", placeholder: "如：1500-2500 USD/月" },
      { name: "requirement",  label: "岗位要求",        type: "textarea", required: true,
        placeholder: "学历、经验、语言、技能 …" },
      { name: "description",  label: "岗位描述",        type: "textarea" },
    ],
  },
  jobseeker: {
    title: "求职信息发布",
    fields: [
      { name: "name",         label: "姓名",            type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
      { name: "targetPosition",label: "目标岗位",       type: "text", required: true },
      { name: "expectArea",   label: "期望工作地",      type: "text" },
      { name: "expectSalary", label: "期望薪资",        type: "text" },
      { name: "experience",   label: "工作经验",        type: "textarea", required: true },
      { name: "skills",       label: "技能特长",        type: "textarea" },
      { name: "intro",        label: "个人简介",        type: "textarea" },
    ],
  },
  secondhand: {
    title: "二手物品发布",
    fields: [
      { name: "itemName",     label: "物品名称",        type: "text", required: true },
      { name: "category",     label: "类别",            type: "text", placeholder: "家电、家具、车辆、电子产品 …" },
      { name: "condition",    label: "新旧程度",        type: "select",
        options: ["全新", "9成新", "8成新", "7成新", "6成新及以下"] },
      { name: "price",        label: "售价（USD）",      type: "text", required: true },
      { name: "description",  label: "物品描述",        type: "textarea", required: true },
      { name: "area",         label: "所在区域",        type: "text" },
      { name: "contactPerson",label: "联系人",          type: "text", required: true },
      { name: "phone",        label: "电话 / WhatsApp", type: "text", required: true },
      { name: "wechat",       label: "微信号",          type: "text" },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
type View = "home" | "category" | "business";
type FormKey = keyof typeof FORMS;

const MapSection = dynamic(() => import("./MapSection"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] md:h-[460px] rounded-2xl bg-sky-50 flex items-center justify-center text-sky-400 text-sm">
      地图加载中…
    </div>
  ),
});

export default function GuidePage() {
  const [view, setView] = useState<View>("home");
  const [activeCategory, setActiveCategory] = useState<string>("restaurant");
  const [activeSub, setActiveSub] = useState<string>("全部");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [adIndex, setAdIndex] = useState(0);
  const [formOpen, setFormOpen] = useState<FormKey | null>(null);
  const [approvedExtras, setApprovedExtras] = useState<Business[]>([]);
  const [detailBizId, setDetailBizId] = useState<number | null>(null);
  const [focusBizId, setFocusBizId] = useState<number | null>(null);

  // 记录访问量
  useEffect(() => {
    fetch("/api/track", { method: "POST" }).catch(() => {});
  }, []);

  // 拉取审核通过的用户提交（mount + 窗口聚焦 + 30s 轮询）
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/public/approved", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { records?: RawSubmission[] }) => {
          if (cancelled) return;
          const records = d.records ?? [];
          const items = records
            .map((r, i) => submissionToBusiness(r, i))
            .filter((b): b is Business => !!b);
          setApprovedExtras(items);
        })
        .catch(() => {});
    };
    load();
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
      clearInterval(timer);
    };
  }, []);

  // 轮播自动切换
  useEffect(() => {
    const t = setInterval(() => setAdIndex((i) => (i + 1) % ads.length), 4000);
    return () => clearInterval(t);
  }, []);

  const allBusinesses = useMemo(
    () =>
      [...businesses, ...approvedExtras]
        .filter((b) => !b.hidden)
        .map((b) => {
          if (typeof b.lat === "number" && typeof b.lng === "number") return b;
          const [lat, lng] = coordsForArea(b.area, b.id);
          return { ...b, lat, lng };
        }),
    [approvedExtras]
  );

  const openCategory = (key: string) => {
    setActiveCategory(key);
    setActiveSub("全部");
    setSearchQuery("");
    setView("category");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const openBusiness = (id: number) => {
    setDetailBizId(id);
    setView("business");
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const focusOnMap = (id: number | null) => {
    setFocusBizId(id);
    setView("home");
    if (typeof window !== "undefined") {
      // 等渲染后滚到地图区
      setTimeout(() => {
        document.getElementById("map-section")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    }
  };

  const detailBiz = useMemo(
    () => allBusinesses.find((b) => b.id === detailBizId) ?? null,
    [allBusinesses, detailBizId]
  );

  return (
    <div className="min-h-screen bg-sky-50">
      {view === "home" && (
        <HomeView
          businesses={allBusinesses}
          onOpenCategory={openCategory}
          adIndex={adIndex}
          setAdIndex={setAdIndex}
          onOpenForm={setFormOpen}
          focusBizId={focusBizId}
          onOpenBusiness={openBusiness}
        />
      )}
      {view === "category" && (
        <CategoryView
          businesses={allBusinesses}
          categoryKey={activeCategory}
          activeSub={activeSub}
          setActiveSub={setActiveSub}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          onBack={() => setView("home")}
          onOpenBusiness={openBusiness}
        />
      )}
      {view === "business" && detailBiz && (
        <BusinessDetailView
          biz={detailBiz}
          onBack={() => setView("home")}
          onFocusMap={() => focusOnMap(detailBiz.id)}
          onViewAllMap={() => focusOnMap(null)}
        />
      )}

      <Footer />

      {formOpen && (
        <SubmissionModal
          formKey={formOpen}
          onClose={() => setFormOpen(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Home View                                                          */
/* ------------------------------------------------------------------ */
function HomeView({
  businesses: allBusinesses,
  onOpenCategory,
  adIndex,
  setAdIndex,
  onOpenForm,
  focusBizId,
  onOpenBusiness,
}: {
  businesses: Business[];
  onOpenCategory: (k: string) => void;
  adIndex: number;
  setAdIndex: (n: number) => void;
  onOpenForm: (k: FormKey) => void;
  focusBizId: number | null;
  onOpenBusiness: (id: number) => void;
}) {
  const featured = allBusinesses
    .slice()
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
    .slice(0, 6);
  return (
    <>
      {/* ---- 顶部横幅（淡蓝 + 黄色五角星点缀） ---- */}
      <section className="relative bg-gradient-to-br from-sky-400 via-sky-500 to-blue-500 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-8 left-8 w-32 h-32 rounded-full bg-white" />
          <div className="absolute bottom-4 right-10 w-48 h-48 rounded-full bg-white" />
        </div>
        {/* 黄色五角星（中国国旗元素） */}
        <Star
          size={28}
          className="absolute top-6 right-6 text-yellow-300 drop-shadow"
          fill="currentColor"
        />
        <Star
          size={16}
          className="absolute top-12 right-16 text-yellow-300 drop-shadow"
          fill="currentColor"
        />

        <div className="relative max-w-4xl mx-auto px-4 pt-10 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm font-medium mb-4">
            <MapPin size={14} /> 刚果金 · 金沙萨
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3 leading-tight">
            刚果金华人生活服务指南
          </h1>
          <p className="font-handwriting text-xl md:text-2xl text-yellow-200 mb-1.5 tracking-wide">
            帮助刚果金华人更快找到本地服务
          </p>
          <p className="text-sm md:text-base text-sky-50 max-w-md mx-auto">
            买商品 · 找餐厅 · 找住宿 · 找服务 · 租赁设备 · 招聘求职 · 二手专区
          </p>
        </div>
      </section>

      {/* ---- 轮播广告位 ---- */}
      <section className="max-w-4xl mx-auto px-4 -mt-4 relative z-10">
        <Carousel index={adIndex} onChange={setAdIndex} />
      </section>

      {/* ---- 二级页面导航 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-red-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">服务分类</h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => onOpenCategory(cat.key)}
                className="group flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm border border-sky-100 hover:border-red-300 hover:shadow-md transition-all"
              >
                <span className="w-12 h-12 rounded-2xl bg-sky-100 group-hover:bg-red-100 flex items-center justify-center transition-colors">
                  <Icon size={24} className="text-sky-600 group-hover:text-red-500 transition-colors" />
                </span>
                <span className="text-sm font-medium text-gray-700 group-hover:text-red-500 transition-colors">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ---- 实用指南 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-emerald-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">实用指南</h2>
          <span className="text-xs text-gray-400">刚果金本地常用信息</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link
            href="/guides/recharge"
            className="group flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-sky-100 hover:border-emerald-300 hover:shadow-md transition-all"
          >
            <span className="w-12 h-12 rounded-2xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors shrink-0">
              <Smartphone size={22} className="text-emerald-600" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">本地话费充值指南</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Vodacom / Orange / Airtel / Africell USSD 速查
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* ---- 金沙萨商家地图 ---- */}
      <section id="map-section" className="max-w-4xl mx-auto px-4 mt-8 scroll-mt-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-sky-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">金沙萨商家地图</h2>
          <span className="text-xs text-gray-400">切换分类 · 点图钉看详情</span>
        </div>
        <MapSection
          businesses={allBusinesses.map((b) => ({
            id: b.id,
            name: b.name,
            category: b.category,
            subcategory: b.subcategory,
            area: b.area,
            mainService: b.mainService,
            image: b.image,
            lat: b.lat,
            lng: b.lng,
          }))}
          categories={categories.map((c) => ({
            key: c.key,
            label: c.label,
            color: c.color,
            emoji: c.emoji,
          }))}
          focusBusinessId={focusBizId}
          onOpenBusiness={onOpenBusiness}
        />
      </section>

      {/* ---- 信息发布通道 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-yellow-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">信息发布通道</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PublishCard
            label="商家入驻"
            sub="加入名录"
            color="bg-gradient-to-br from-sky-400 to-blue-500"
            icon={<Megaphone size={22} />}
            onClick={() => onOpenForm("merchant")}
          />
          <PublishCard
            label="发布招聘"
            sub="找合适人才"
            color="bg-gradient-to-br from-red-400 to-rose-500"
            icon={<UserPlus size={22} />}
            onClick={() => onOpenForm("hiring")}
          />
          <PublishCard
            label="发布求职"
            sub="找心仪工作"
            color="bg-gradient-to-br from-amber-400 to-yellow-500"
            icon={<UserSearch size={22} />}
            onClick={() => onOpenForm("jobseeker")}
          />
          <PublishCard
            label="二手物品"
            sub="转手快出"
            color="bg-gradient-to-br from-teal-400 to-sky-500"
            icon={<Recycle size={22} />}
            onClick={() => onOpenForm("secondhand")}
          />
        </div>
      </section>

      {/* ---- 推荐商家 ---- */}
      <section className="max-w-4xl mx-auto px-4 mt-8 pb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1 h-5 bg-red-400 rounded-full" />
          <h2 className="text-base font-bold text-gray-800">推荐商家</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featured.map((biz) => (
            <BusinessCard key={biz.id} biz={biz} onOpen={onOpenBusiness} />
          ))}
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Carousel                                                           */
/* ------------------------------------------------------------------ */
function Carousel({ index, onChange }: { index: number; onChange: (n: number) => void }) {
  const slide = ads[index];
  const next = () => onChange((index + 1) % ads.length);
  const prev = () => onChange((index - 1 + ads.length) % ads.length);

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r ${slide.bg}`}>
      <div key={index} className="animate-slide-in flex items-center gap-4 p-5 md:p-7 text-white">
        <span className="text-5xl md:text-6xl shrink-0">{slide.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-lg md:text-2xl font-bold leading-snug">{slide.title}</p>
          <p className="text-sm md:text-base text-white/90 mt-1">{slide.subtitle}</p>
          {(slide.phone || slide.address) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {slide.phone && (
                <a
                  href={`tel:${slide.phone.replace(/\s+/g, "")}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur text-sm font-semibold"
                >
                  <Phone size={14} /> {slide.phone}
                </a>
              )}
              {slide.address && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-sm font-medium">
                  <MapPin size={14} /> {slide.address}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 左右切换 */}
      <button
        onClick={prev}
        aria-label="上一条"
        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        onClick={next}
        aria-label="下一条"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur flex items-center justify-center text-white"
      >
        <ChevronRight size={16} />
      </button>

      {/* 指示器 */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {ads.map((_, i) => (
          <button
            key={i}
            onClick={() => onChange(i)}
            aria-label={`广告 ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Publish Card                                                       */
/* ------------------------------------------------------------------ */
function PublishCard({
  label,
  sub,
  color,
  icon,
  onClick,
}: {
  label: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative ${color} text-white rounded-2xl p-4 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all`}
    >
      <span className="absolute top-3 right-3 opacity-80">{icon}</span>
      <p className="text-base font-bold">{label}</p>
      <p className="text-xs text-white/85 mt-0.5">{sub}</p>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Category View                                                      */
/* ------------------------------------------------------------------ */
function CategoryView({
  businesses: allBusinesses,
  categoryKey,
  activeSub,
  setActiveSub,
  searchQuery,
  setSearchQuery,
  showSearch,
  setShowSearch,
  onBack,
  onOpenBusiness,
}: {
  businesses: Business[];
  categoryKey: string;
  activeSub: string;
  setActiveSub: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (s: string) => void;
  showSearch: boolean;
  setShowSearch: (b: boolean) => void;
  onBack: () => void;
  onOpenBusiness: (id: number) => void;
}) {
  const cat = categories.find((c) => c.key === categoryKey)!;
  const subs = useMemo(() => ["全部", ...cat.sub], [cat]);

  const filtered = allBusinesses.filter((b) => {
    if (b.category !== cat.key) return false;
    if (activeSub !== "全部" && b.subcategory !== activeSub) return false;
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      b.name.toLowerCase().includes(q) ||
      b.mainService.toLowerCase().includes(q) ||
      b.area.toLowerCase().includes(q) ||
      b.intro.toLowerCase().includes(q)
    );
  });

  const Icon = cat.icon;

  return (
    <>
      {/* 顶部条 */}
      <section className="bg-gradient-to-r from-sky-400 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon size={20} />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">{cat.label}</h1>
            <p className="text-xs text-white/80">共 {filtered.length} 条信息</p>
          </div>
        </div>
      </section>

      {/* 搜索 */}
      <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-sky-100">
        <div className="max-w-4xl mx-auto px-4 py-3">
          {showSearch ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-sky-50 rounded-xl px-3 py-2">
                <Search size={18} className="text-sky-400 shrink-0" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`在「${cat.label}」中搜索…`}
                  className="flex-1 ml-2 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")}>
                    <X size={16} className="text-gray-400" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="text-sm text-gray-500 shrink-0"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="w-full flex items-center gap-2 bg-sky-50 rounded-xl px-4 py-2.5 text-sm text-gray-400"
            >
              <Search size={18} /> 在「{cat.label}」中搜索…
            </button>
          )}
        </div>
      </div>

      {/* 子分类标签 */}
      {cat.sub.length > 0 && (
        <div className="bg-white border-b border-sky-100">
          <div className="max-w-4xl mx-auto">
            <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 py-3">
              {subs.map((s) => {
                const isActive = activeSub === s;
                return (
                  <button
                    key={s}
                    onClick={() => setActiveSub(s)}
                    className={`px-3.5 py-1.5 rounded-full shrink-0 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-red-400 text-white shadow-sm"
                        : "bg-sky-50 text-gray-600 hover:bg-sky-100"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="max-w-4xl mx-auto px-4 py-6 min-h-[40vh]">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Icon size={40} className="mx-auto text-sky-300 mb-3" />
            <p className="text-gray-400 text-sm">该分类暂无信息，欢迎商家入驻发布</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((biz) => (
              <BusinessCard key={biz.id} biz={biz} onOpen={onOpenBusiness} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Business Detail View                                               */
/* ------------------------------------------------------------------ */
function BusinessDetailView({
  biz,
  onBack,
  onFocusMap,
  onViewAllMap,
}: {
  biz: Business;
  onBack: () => void;
  onFocusMap: () => void;
  onViewAllMap: () => void;
}) {
  const cat = categories.find((c) => c.key === biz.category);

  return (
    <>
      <section className="bg-gradient-to-r from-sky-400 to-blue-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            aria-label="返回"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight truncate">{biz.name}</h1>
            <p className="text-xs text-white/80">
              {cat?.label}
              {biz.subcategory ? ` · ${biz.subcategory}` : ""}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">
        <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
          <div className="relative h-56 md:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" />
            {biz.featured && (
              <span className="absolute top-3 left-3 px-2.5 py-1 bg-yellow-400 text-white text-xs font-bold rounded-full shadow flex items-center gap-1">
                <Star size={12} fill="white" /> 推荐
              </span>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-start gap-2">
              <h2 className="flex-1 text-xl font-bold text-gray-900">{biz.name}</h2>
              <SpeakButton
                text={`Je veux aller à cette adresse, ${biz.area}`}
                cacheKey={`biz-${biz.id}`}
              />
            </div>

            {/* 地图按钮（双向查询） */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={onFocusMap}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-red-400 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <MapPin size={16} /> 在地图上查看
              </button>
              <button
                onClick={onViewAllMap}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                🗺️ 查看全部地图
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <Field label="所在区域" value={biz.area} />
              <Field label="联系人" value={biz.contactPerson} />
              <Field label="微信号" value={biz.wechat} />
              <Field label="电话 / WhatsApp" value={biz.phone} />
              <Field label="门店/仓库" value={biz.hasStore} />
              <Field label="服务范围" value={biz.serviceScope} />
              <Field label="主营产品或服务" value={biz.mainService} />
              <Field label="商家简介" value={biz.intro} />
            </div>

            <ContactButtons biz={biz} className="mt-5" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  BusinessCard                                                       */
/* ------------------------------------------------------------------ */
function BusinessCard({ biz, onOpen }: { biz: Business; onOpen?: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const cat = categories.find((c) => c.key === biz.category);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden transition-all hover:shadow-md hover:border-red-200">
      <div className="relative h-44">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={biz.image} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
        {biz.featured && (
          <span className="absolute top-3 left-3 px-2.5 py-1 bg-yellow-400 text-white text-xs font-bold rounded-full shadow flex items-center gap-1">
            <Star size={12} fill="white" /> 推荐
          </span>
        )}
        <span className="absolute top-3 right-3 px-2.5 py-1 bg-sky-500 text-white text-xs font-semibold rounded-full shadow">
          {cat?.label}
          {biz.subcategory ? ` · ${biz.subcategory}` : ""}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 text-lg font-bold text-gray-900 leading-snug">{biz.name}</h3>
          <SpeakButton
            text={`Je veux aller à cette adresse, ${biz.area}`}
            cacheKey={`biz-${biz.id}`}
          />
        </div>

        <div className="mt-3 space-y-2">
          <Row icon={<MapPin size={15} className="text-red-400" />} text={biz.area} />
          <Row icon={<Store size={15} className="text-sky-400" />} text={biz.mainService} clamp />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-sky-600 font-medium hover:text-red-500 transition-colors"
          >
            {expanded ? "收起" : "快速预览"}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {onOpen && (
            <button
              onClick={() => onOpen(biz.id)}
              className="ml-auto flex items-center gap-1 text-sm text-red-500 font-medium hover:text-red-600 transition-colors"
            >
              进入详情页 <ChevronRight size={14} />
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-sky-100 space-y-3 text-sm">
            <Field label="联系人" value={biz.contactPerson} />
            <Field label="微信号" value={biz.wechat} />
            <Field label="电话 / WhatsApp" value={biz.phone} />
            <Field label="门店/仓库" value={biz.hasStore} />
            <Field label="服务范围" value={biz.serviceScope} />
            <Field label="主营产品或服务" value={biz.mainService} />
            <Field label="商家简介" value={biz.intro} />

            <ContactButtons biz={biz} className="pt-2" />
          </div>
        )}
      </div>
    </div>
  );
}

function ContactButtons({ biz, className = "" }: { biz: Business; className?: string }) {
  const hasPhone = !!biz.phone?.trim();
  const hasWechat = !!biz.wechat?.trim();
  if (!hasPhone && !hasWechat) {
    return (
      <p className={`text-sm text-gray-400 italic ${className}`}>
        暂无联系方式 · 请到店咨询
      </p>
    );
  }
  return (
    <div className={`flex gap-2 ${className}`}>
      {hasPhone && (
        <a
          href={`https://wa.me/${biz.phone.replace(/[^0-9]/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-red-400 text-white text-sm font-semibold rounded-xl hover:bg-red-500 transition-colors"
        >
          <Phone size={14} /> WhatsApp 联系
        </a>
      )}
      {hasWechat && (
        <button
          onClick={() => {
            navigator.clipboard.writeText(biz.wechat);
            alert(`已复制微信号：${biz.wechat}`);
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-sky-500 text-white text-sm font-semibold rounded-xl hover:bg-sky-600 transition-colors"
        >
          <MessageCircle size={14} /> 复制微信号
        </button>
      )}
    </div>
  );
}

function hashText(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return (h >>> 0).toString(36);
}

function SpeakButton({ text, cacheKey }: { text: string; cacheKey?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const reportError = (stage: string, extra?: unknown) => {
    console.error(`[SpeakButton] ${stage}`, extra);
    alert(
      `法语朗读失败（${stage}）。请检查：\n` +
        `• 网络 / 后端 /api/speak 是否 200\n` +
        `• GEMINI_API_KEY 是否已在 .env.local 配置并重启 dev\n` +
        `• Gemini 配额是否耗尽\n` +
        `（详细错误已打到控制台）`
    );
  };

  const speak = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (speaking) return;
    setSpeaking(true);

    const fullCacheKey = cacheKey ? `${cacheKey}-${hashText(text)}` : undefined;
    let res: Response;
    try {
      res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, cacheKey: fullCacheKey }),
      });
    } catch (err) {
      setSpeaking(false);
      reportError("网络请求失败", err);
      return;
    }

    if (!res.ok) {
      let detail: unknown = null;
      try {
        detail = await res.json();
      } catch {
        /* ignore */
      }
      setSpeaking(false);
      reportError(`HTTP ${res.status}`, detail);
      return;
    }

    let audioUrl: string;
    let revoke = () => {};
    try {
      const ctype = res.headers.get("Content-Type") ?? "";
      if (ctype.includes("application/json")) {
        const data = (await res.json()) as { url?: string };
        if (!data.url) throw new Error("response missing url");
        audioUrl = data.url;
      } else {
        const blob = await res.blob();
        if (!blob.size) throw new Error("empty audio blob");
        audioUrl = URL.createObjectURL(blob);
        revoke = () => URL.revokeObjectURL(audioUrl);
      }
    } catch (err) {
      setSpeaking(false);
      reportError("解析响应失败", err);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.onended = () => {
      setSpeaking(false);
      revoke();
    };
    audio.onerror = () => {
      setSpeaking(false);
      revoke();
      reportError("音频解码/播放失败", audio.error);
    };
    try {
      await audio.play();
    } catch (err) {
      setSpeaking(false);
      revoke();
      reportError("audio.play() 被拒", err);
    }
  };

  return (
    <button
      type="button"
      onClick={speak}
      aria-label={`法语播报地址：${text}`}
      title={`点击用法语朗读：${text}`}
      className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors touch-manipulation active:scale-95 ${
        speaking
          ? "bg-red-100 text-red-500 animate-pulse"
          : "bg-sky-100 text-sky-600 hover:bg-sky-200 active:bg-sky-200"
      }`}
    >
      <Volume2 size={16} />
      <span>法语播报地址</span>
    </button>
  );
}

function Row({ icon, text, clamp }: { icon: React.ReactNode; text: string; clamp?: boolean }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-600">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className={clamp ? "line-clamp-1" : ""}>{text}</span>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const empty = !value || !value.trim();
  return (
    <div>
      <p className="text-gray-400 text-xs tracking-wide mb-0.5">{label}</p>
      <p className={`leading-relaxed ${empty ? "text-gray-400 italic" : "text-gray-700"}`}>
        {empty ? "待补充" : value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Submission Modal                                                   */
/* ------------------------------------------------------------------ */
function SubmissionModal({ formKey, onClose }: { formKey: FormKey; onClose: () => void }) {
  const def = FORMS[formKey];
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (name: string, v: string) => setValues((prev) => ({ ...prev, [name]: v }));

  const submit = async () => {
    for (const f of def.fields) {
      if (f.required && !values[f.name]?.trim()) {
        setError(`请填写「${f.label}」`);
        return;
      }
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: formKey, data: values }),
      });
      if (!res.ok) throw new Error("submit failed");
      setDone(true);
    } catch {
      setError("提交失败，请稍后再试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="w-full md:max-w-lg bg-white rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* 标题 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sky-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-800">{def.title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-sky-50 flex items-center justify-center"
            aria-label="关闭"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-12 text-center flex-1">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-4 animate-pulse-red">
              <CheckCircle2 size={36} className="text-red-400" />
            </div>
            <p className="text-lg font-bold text-gray-800 mb-1">提交成功</p>
            <p className="text-sm text-gray-500 mb-2">您的信息已进入</p>
            <p className="inline-block px-3 py-1 rounded-full bg-yellow-50 text-yellow-700 text-sm font-medium">
              ⏳ 审核中
            </p>
            <p className="text-xs text-gray-400 mt-4">审核通过后会展示在对应分类页面</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl"
            >
              完成
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
              {def.fields.map((f) => (
                <FormFieldInput
                  key={f.name}
                  field={f}
                  value={values[f.name] ?? ""}
                  onChange={(v) => update(f.name, v)}
                />
              ))}
              {error && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-sky-100 shrink-0">
              <button
                onClick={submit}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-red-400 hover:to-rose-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 提交中…
                  </>
                ) : (
                  "提交申请"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FormFieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-full px-3 py-2.5 bg-sky-50 border border-sky-100 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:bg-white";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={base}
        />
      ) : field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="">请选择</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={base}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-4">
      <div className="max-w-4xl mx-auto px-4 text-center text-sm space-y-2">
        <p className="text-white font-semibold">刚果金华人生活服务指南</p>
        <p>刚果金本地华人商家与生活服务平台</p>
        <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} 版权所有</p>
      </div>
    </footer>
  );
}

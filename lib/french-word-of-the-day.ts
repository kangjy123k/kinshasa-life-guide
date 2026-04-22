export interface FrenchDailyEntry {
  word: string;
  pos: string;
  zh: string;
  tip: string;
  example: string;
  exampleZh: string;
}

// 常用但不烂大街 — 够"悄悄学"，在刚果金商务/生活场景能用出彩
const BANK: FrenchDailyEntry[] = [
  { word: "impeccable", pos: "adj.", zh: "无可挑剔的 / 完美的", tip: "赞美对方工作或菜品时用，比 très bon 高一档。", example: "Votre service est impeccable, merci.", exampleZh: "您的服务无可挑剔，谢谢。" },
  { word: "incontournable", pos: "adj.", zh: "绕不开的 / 必选的", tip: "推荐人 / 地点 / 方案时用，显得成熟。", example: "C'est un partenaire incontournable ici.", exampleZh: "在这里他是绕不开的合作伙伴。" },
  { word: "débrouillard", pos: "adj.", zh: "机灵会变通的", tip: "夸下属或合作伙伴靠谱，特别接地气。", example: "Mon chauffeur est très débrouillard.", exampleZh: "我的司机很会来事。" },
  { word: "doucement", pos: "adv.", zh: "慢点 / 悠着点", tip: "劝对方放缓速度，比 attention 更柔和。", example: "Doucement, la route est mauvaise.", exampleZh: "慢点开，路况不好。" },
  { word: "tranquille", pos: "adj.", zh: "放心 / 没事", tip: "安抚对方常用，Kinshasa 街头高频词。", example: "Pas de souci, tranquille.", exampleZh: "没事儿，放心。" },
  { word: "volontiers", pos: "adv.", zh: "乐意之至", tip: "被邀请时比 oui 更有礼貌。", example: "— Un café ? — Volontiers !", exampleZh: "——喝咖啡吗？——乐意之至！" },
  { word: "patienter", pos: "v.", zh: "耐心等待", tip: "请对方稍等，比 attendre 更客气。", example: "Veuillez patienter un instant.", exampleZh: "请您稍等片刻。" },
  { word: "ravi", pos: "adj.", zh: "非常高兴", tip: "寒暄开场白：Ravi de vous rencontrer.", example: "Ravi de faire votre connaissance.", exampleZh: "很高兴认识您。" },
  { word: "souci", pos: "n.m.", zh: "烦心事 / 问题", tip: "Pas de souci = 没问题，几乎每天都用。", example: "Pas de souci, on s'en occupe.", exampleZh: "没问题，我们来处理。" },
  { word: "malin", pos: "adj.", zh: "聪明 / 精明", tip: "私下夸人会做生意，比 intelligent 更地道。", example: "Il est malin en affaires.", exampleZh: "他做生意很精。" },
  { word: "franchement", pos: "adv.", zh: "说实话", tip: "表态前加一句，增加可信度。", example: "Franchement, je recommande ce fournisseur.", exampleZh: "说实话，这家供应商我推荐。" },
  { word: "carrément", pos: "adv.", zh: "干脆 / 完全", tip: "年轻人口头禅，表态度坚决。", example: "On y va carrément demain.", exampleZh: "明天直接去就行。" },
  { word: "épatant", pos: "adj.", zh: "惊艳的", tip: "夸对方作品或点子时，比 super 雅致。", example: "Votre proposition est épatante.", exampleZh: "您的方案很惊艳。" },
  { word: "soigné", pos: "adj.", zh: "讲究 / 精心打理的", tip: "夸对方装扮/出品精致时用。", example: "Un travail très soigné.", exampleZh: "做得很讲究。" },
  { word: "chaleureux", pos: "adj.", zh: "热情的", tip: "形容欢迎或氛围，不会太油腻。", example: "Un accueil chaleureux.", exampleZh: "热情的接待。" },
  { word: "entendu", pos: "p.p.", zh: "明白了 / 好的", tip: "C'est entendu. = 就这么定了。", example: "C'est entendu, je reviens lundi.", exampleZh: "就这么定了，周一我再来。" },
  { word: "éventuellement", pos: "adv.", zh: "也许 / 视情况", tip: "留后路的优雅表达，法国人最爱。", example: "On pourra éventuellement revoir le prix.", exampleZh: "价格或许还能再谈。" },
  { word: "quand même", pos: "loc.", zh: "还是 / 毕竟", tip: "加一句 quand même 语气立刻有层次。", example: "C'est cher, mais ça vaut le coup quand même.", exampleZh: "有点贵，但还是值得的。" },
  { word: "du coup", pos: "loc.", zh: "所以 / 那么说", tip: "口语承上启下词，用了显自然。", example: "Du coup, on se voit demain ?", exampleZh: "那我们明天见？" },
  { word: "au fait", pos: "loc.", zh: "顺便说 / 对了", tip: "换话题时用，比 by the way 还地道。", example: "Au fait, tu as reçu mon message ?", exampleZh: "对了，你收到我的信息了吗？" },
  { word: "coup de main", pos: "n.m.", zh: "帮一把", tip: "请人帮忙：Tu peux me donner un coup de main ?", example: "Merci pour le coup de main.", exampleZh: "多谢你帮忙。" },
  { word: "au poil", pos: "loc.", zh: "刚刚好", tip: "俚语，形容完美契合、刚刚好。", example: "C'est au poil, merci !", exampleZh: "刚刚好，谢谢！" },
  { word: "génial", pos: "adj.", zh: "太棒了", tip: "比 super 更热烈的褒扬。", example: "Ton idée est géniale.", exampleZh: "你这主意太棒了。" },
  { word: "formidable", pos: "adj.", zh: "了不起的", tip: "正式赞扬用，上得了台面。", example: "Quel résultat formidable !", exampleZh: "多么了不起的成绩！" },
  { word: "ras-le-bol", pos: "n.m.", zh: "忍无可忍", tip: "倾诉疲惫时用，j'en ai ras-le-bol。", example: "J'en ai ras-le-bol des coupures.", exampleZh: "我受够了停电。" },
  { word: "bosser", pos: "v.", zh: "埋头干 / 干活（口语）", tip: "熟人圈用比 travailler 亲切。", example: "On a bossé dur ce mois-ci.", exampleZh: "这个月我们干得很拼。" },
  { word: "bricoler", pos: "v.", zh: "自己动手捣鼓", tip: "小修小改、DIY，刚果金日常。", example: "Je bricole la climatisation.", exampleZh: "我在自己修空调。" },
  { word: "galérer", pos: "v.", zh: "吃苦受累 / 折腾", tip: "吐槽场合必备，显同理心。", example: "On galère avec les douanes.", exampleZh: "我们为清关折腾得够呛。" },
  { word: "se débrouiller", pos: "v.", zh: "想办法 / 自己搞定", tip: "刚果金生存核心动词。", example: "Je vais me débrouiller.", exampleZh: "我自己想办法。" },
  { word: "faire gaffe", pos: "loc.", zh: "当心 / 注意点", tip: "口语警告，比 fais attention 更顺嘴。", example: "Fais gaffe aux nids-de-poule.", exampleZh: "当心路上的坑。" },
  { word: "bof", pos: "interj.", zh: "一般般 / 不咋地", tip: "被问感觉时低调否定。", example: "— C'était bien ? — Bof…", exampleZh: "——好吗？——一般吧……" },
  { word: "chouette", pos: "adj.", zh: "不错 / 挺好", tip: "日常夸赞，轻柔不过头。", example: "C'est chouette comme endroit.", exampleZh: "这地方不错。" },
  { word: "nickel", pos: "adj.", zh: "妥妥的 / 干净利落", tip: "Tout est nickel. = 都搞定了。", example: "Compte réglé, nickel.", exampleZh: "账结清了，妥。" },
  { word: "top", pos: "adj.", zh: "顶级 / 很好", tip: "C'est top ! 简短有力。", example: "Le chantier avance, c'est top.", exampleZh: "工地进度不错，棒。" },
  { word: "pas mal", pos: "loc.", zh: "还行 / 不少", tip: "既能形容好，也能表数量多。", example: "On a pas mal de commandes.", exampleZh: "我们订单不少。" },
  { word: "carnet", pos: "n.m.", zh: "通讯录 / 资源人脉", tip: "avoir un bon carnet = 人脉广。", example: "Elle a un bon carnet à Kinshasa.", exampleZh: "她在金沙萨人脉很广。" },
  { word: "piston", pos: "n.m.", zh: "靠关系 / 走后门", tip: "谈本地办事潜规则时用。", example: "Sans piston, ça traîne.", exampleZh: "没关系的话事情就拖。" },
  { word: "démarche", pos: "n.f.", zh: "办事流程 / 手续", tip: "行政类场合高频名词。", example: "Les démarches sont longues.", exampleZh: "手续很漫长。" },
  { word: "à l'aise", pos: "loc.", zh: "轻松 / 不成问题", tip: "自信地答应事情。", example: "On livre demain, à l'aise.", exampleZh: "明天就能交货，小菜一碟。" },
  { word: "sans faute", pos: "loc.", zh: "务必 / 一定", tip: "承诺时用，比 promis 更庄重。", example: "Je vous rappelle demain sans faute.", exampleZh: "明天我一定回电。" },
  { word: "serviable", pos: "adj.", zh: "乐于助人的", tip: "夸员工好评价，比 gentil 专业。", example: "Il est très serviable avec les clients.", exampleZh: "他对客户很热心。" },
  { word: "ponctuel", pos: "adj.", zh: "守时的", tip: "在这里是稀缺品质，夸人用这个准对。", example: "Merci d'être toujours ponctuel.", exampleZh: "谢谢您一直这么守时。" },
  { word: "fiable", pos: "adj.", zh: "靠谱的 / 可信赖的", tip: "评价供应商或伙伴的关键词。", example: "C'est un partenaire fiable.", exampleZh: "这是个靠谱的合作伙伴。" },
  { word: "franc", pos: "adj.", zh: "坦率的", tip: "谈判前铺垫：Parlons franc。", example: "Soyons francs sur le prix.", exampleZh: "价格上我们开诚布公。" },
  { word: "honnête", pos: "adj.", zh: "诚实的 / 公道的", tip: "形容价格时特别常用。", example: "Un prix honnête, à mon avis.", exampleZh: "我觉得这价格公道。" },
  { word: "marché conclu", pos: "loc.", zh: "成交 / 一言为定", tip: "握手成交时一句话定乾坤。", example: "Marché conclu, on signe demain.", exampleZh: "成交，明天签字。" },
  { word: "tope là", pos: "loc.", zh: "一言为定（击掌）", tip: "口语版成交，带点江湖味。", example: "D'accord, tope là !", exampleZh: "行，一言为定！" },
  { word: "dépanner", pos: "v.", zh: "帮一把应急", tip: "别人有困难时主动伸手。", example: "Je peux te dépanner de 50 dollars.", exampleZh: "我可以先借你 50 美金应急。" },
  { word: "en vrac", pos: "loc.", zh: "散装 / 一股脑儿", tip: "描述货物或信息都行。", example: "Livré en vrac dans le camion.", exampleZh: "散装直接装卡车送来。" },
  { word: "sur place", pos: "loc.", zh: "现场 / 就地", tip: "谈交易交付地点时用。", example: "Paiement sur place, cash.", exampleZh: "现场结算，现金。" },
  { word: "de confiance", pos: "loc.", zh: "可信赖的", tip: "介绍人选时一句话定位。", example: "C'est un homme de confiance.", exampleZh: "这是个可以信任的人。" },
  { word: "parole", pos: "n.f.", zh: "承诺 / 一言九鼎", tip: "Je tiens parole. = 我说话算数。", example: "Ma parole est ma parole.", exampleZh: "我说出去的话算数。" },
  { word: "à la bonne heure", pos: "loc.", zh: "这就对了 / 好极了", tip: "听到好消息的优雅回应。", example: "À la bonne heure, bien joué !", exampleZh: "这就对了，干得好！" },
  { word: "pas de souci", pos: "loc.", zh: "没问题", tip: "Kinshasa 每日高频，记一次用一年。", example: "Pas de souci, je m'en occupe.", exampleZh: "没问题，我来办。" },
  { word: "faire le point", pos: "loc.", zh: "梳理进展", tip: "开会时优雅开场。", example: "Faisons le point sur le projet.", exampleZh: "我们来梳理一下项目进展。" },
  { word: "tenir au courant", pos: "loc.", zh: "保持告知", tip: "Je te tiens au courant. = 有消息告诉你。", example: "Tiens-moi au courant, merci.", exampleZh: "有消息记得告诉我。" },
  { word: "ça marche", pos: "loc.", zh: "行 / 成", tip: "比 d'accord 更轻松的答应。", example: "Ça marche, à demain !", exampleZh: "行，明天见！" },
  { word: "top chrono", pos: "loc.", zh: "按秒到位", tip: "强调按时，带点得意。", example: "Livré top chrono à 9h.", exampleZh: "九点整准时送达。" },
  { word: "taxer", pos: "v.", zh: "讨要（烟、钱）", tip: "金沙萨街头常见俚语。", example: "Il m'a taxé une clope.", exampleZh: "他蹭了我一根烟。" },
  { word: "palabre", pos: "n.f.", zh: "冗长交涉", tip: "形容谈判/议论没完没了。", example: "Après des palabres, on a signé.", exampleZh: "一番交涉后终于签了。" },
];

function dayIndex(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const doy = Math.floor((now - start) / 86400_000);
  return d.getUTCFullYear() * 1000 + doy;
}

export function pickEntryForDate(d: Date): FrenchDailyEntry {
  return BANK[dayIndex(d) % BANK.length];
}

export function getEntryByOffset(offsetDays: number): FrenchDailyEntry {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return pickEntryForDate(base);
}

export const TOTAL_ENTRIES = BANK.length;

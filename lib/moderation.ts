/**
 * 轻量敏感词过滤 — 用于用户提交的心愿 / 商品名
 *
 * 策略：
 *  1. 归一化：去空格/标点、全角转半角、小写
 *  2. 子串匹配上面词库中任何一项就拒绝
 *  3. 尽量拦"组合词"而不是单字，避免误伤正常商品名
 *
 * 词库按类别分，前端错误消息返回分类即可，不暴露具体命中词。
 */

export type ModerationResult =
  | { ok: true }
  | { ok: false; category: string };

interface BannedGroup {
  category: string;
  hits: string[];
}

const BANNED_GROUPS: BannedGroup[] = [
  {
    category: "粗口",
    hits: [
      // 中文组合
      "操你", "艹你", "草你", "干你", "日你", "干他", "日他",
      "我操", "我草", "我艹", "我日",
      "你妈", "你娘", "你爹", "你爷", "你大爷",
      "尼玛", "泥玛", "妈逼", "他妈的", "他妈", "老母",
      "草泥马", "艹泥马", "操尼玛",
      "操蛋", "操逼", "日逼",
      "傻逼", "傻比", "傻屄", "傻b", "傻x", "撒比", "煞笔",
      "牛逼", "牛比", "牛b", "装逼", "装b",
      // 拼音缩写
      "tmd", "nmsl", "tnnd", "ntmd", "mdzz", "mlgb", "cnm", "cnmb",
    ],
  },
  {
    category: "辱骂",
    hits: [
      "贱货", "贱人", "贱b", "婊子", "臭婊", "骚货", "骚逼",
      "狗娘养", "狗日的", "狗杂种", "杂种",
      "滚蛋", "去死", "找死", "找抽", "该死",
      "畜生", "王八蛋", "王八", "混蛋", "人渣", "垃圾人",
      "废物", "蠢货", "蠢猪",
    ],
  },
  {
    category: "色情",
    hits: [
      "鸡巴", "鸡吧", "jiba",
      "阴茎", "阴道", "阴毛", "屁眼", "肛交", "口交",
      "毛片", "三级片", "黄片", "av片", "avpian", "a片",
      "色情", "做爱", "性爱", "啪啪啪", "淫乱", "淫荡",
      "强奸", "奸淫", "肏",
      "屄", "屌丝", "屌毛",
    ],
  },
  {
    category: "毒品",
    hits: [
      "冰毒", "摇头丸", "大麻", "吸毒", "贩毒",
      "海洛因", "k粉", "kfen", "麻古", "摇滚丸",
    ],
  },
  {
    category: "英文粗口",
    hits: [
      "fuck", "fcuk", "fuking", "fucking", "fucker",
      "shit", "bitch", "cunt", "dick", "asshole",
      "bastard", "nigger", "motherfuck", "whore", "slut",
    ],
  },
];

function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    // 去掉所有空白 + 常见中英文标点，防止 "傻 逼" 或 "傻-逼" 绕过
    .replace(
      /[\s\u3000，。！？、；：""''【】\[\]（）()《》<>\-_=+~!@#$%^&*\/\\.,?;:'"`|]+/g,
      ""
    );
}

export function moderate(input: string): ModerationResult {
  const text = normalize(input);
  if (!text) return { ok: true };
  for (const group of BANNED_GROUPS) {
    for (const hit of group.hits) {
      const needle = normalize(hit);
      if (needle && text.includes(needle)) {
        return { ok: false, category: group.category };
      }
    }
  }
  return { ok: true };
}

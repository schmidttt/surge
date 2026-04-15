/**
 * Sub-Store rename script
 * 更新日期：2026-04-15 
 * 用法：Sub-Store 脚本操作添加
 * =========================
 * 一、脚本效果
 * =========================
 * 最终输出格式：
 *   🇯🇵 日本 01 1x AnyTLS
 *
 * 排序规则：
 *   1. 地区之间按“距离China远近”的预设优先级排序，可根据需要进行调整
 *   2. 同地区内按倍率升序：1x -> 1.5x -> 2x -> 2.5x ...
 *   3. 同倍率内按协议排序：AnyTLS / Trojan / VMess ...
 *   4. 每个地区内重新编号：01 / 02 / 03 ...
 *
 * =========================
 * 二、常用参数说明
 * =========================
 * 1) 显示国家旗帜
 *    flag=true
 *
 * 2) 输出国家中文名
 *    out=zh
 *
 * 3) 是否显示协议
 *    proto=true   显示协议，例如：AnyTLS
 *    proto=false  不显示协议
 *
 * 4) 是否显示倍率
 *    bl=true      显示倍率
 *    bl=false     不显示倍率
 *
 * 5) 是否显示 1x
 *    show1x=true   显示 1x
 *    show1x=false  如果识别到倍率为 1，则不显示
 *
 * 6) 节点名里没写倍率时，是否自动补 1x
 *    default1x=true   自动补 1x
 *    default1x=false  不补
 *
 * 7) 倍率样式
 *    xstyle=x    输出 1x / 2.5x
 *    xstyle=×    输出 1× / 2.5×
 *
 * 8) 国家识别输出格式
 *    out=zh   中文国家名，如：日本 / 香港 / 美国
 *    out=en   两字母国家码，如：JP / HK / US
 *    out=quan 英文国家名，如：Japan / Hong Kong / United States
 *
 * 9) 是否清理信息节点
 *    clear=true   清理“套餐到期、剩余流量、官网地址、测试节点”等信息节点
 *    clear=false  不清理
 *
 * 10) 是否给未识别地区的节点保留原名
 *    nm=true   保留原节点名
 *    nm=false  直接丢弃未识别地区节点
 *
 * 11) 分隔符
 *    fgf=%20   一般就是空格
 *
 * =========================
 * 三、推荐参数
 * =========================
 * 推荐直接使用：
 *   #flag=true&out=zh&proto=true&bl=true&show1x=true&default1x=true&xstyle=x
 *
 * 典型输出：
 *   🇭🇰 香港 01 1x AnyTLS
 *   🇭🇰 香港 02 1x AnyTLS
 *   🇭🇰 香港 03 2.5x Trojan
 *   🇯🇵 日本 01 1x VMess
 *
 * =========================
 * 四、地区优先级说明
 * =========================
 * 本脚本已内置“离中国近的地区优先”排序。
 * 你如果想自己改顺序，只需要修改下面 REGION_DISTANCE_ORDER 数组即可。
 */

const inArg = $arguments;

// —— 布尔参数解析辅助 —— //
function boolArg(v, d = false) {
  if (v === undefined || v === null) return d;
  if (typeof v === "string") {
    const s = v.trim();
    if (s === "") return d;
    if (/^(true|1|on|yes)$/i.test(s)) return true;
    if (/^(false|0|off|no)$/i.test(s)) return false;
    return d;
  }
  return !!v;
}

const nx        = boolArg(inArg.nx, false),
      bl        = boolArg(inArg.bl, true),
      nf        = boolArg(inArg.nf, false),
      key       = boolArg(inArg.key, false),
      blgd      = boolArg(inArg.blgd, false),
      blpx      = boolArg(inArg.blpx, false),
      blnx      = boolArg(inArg.blnx, false),
      debug     = boolArg(inArg.debug, false),
      clear     = boolArg(inArg.clear, true),
      addflag   = boolArg(inArg.flag, false),
      nm        = boolArg(inArg.nm, false),
      proto     = boolArg(inArg.proto, true),
      show1x    = boolArg(inArg.show1x, true),
      default1x = boolArg(inArg.default1x, true);

// 严格边界匹配模式：en(默认，仅 EN 两字母) | all(全部识别词) | off(关闭)
const ABSMODE = (inArg.abs || "en").toLowerCase();

const FGF        = inArg.fgf == undefined ? " " : decodeURI(inArg.fgf),
      FNAME      = inArg.name == undefined ? "" : decodeURI(inArg.name),
      BLKEY      = inArg.blkey == undefined ? "" : decodeURI(inArg.blkey),
      blockquic  = inArg.blockquic == undefined ? "" : decodeURI(inArg.blockquic),
      XSTYLE     = inArg.xstyle == undefined ? "x" : decodeURI(inArg.xstyle),
      nameMap    = { cn: "cn", zh: "cn", us: "us", en: "us", quan: "quan", gq: "gq", flag: "gq" },
      inname     = nameMap[inArg.in] || "",
      outputName = nameMap[inArg.out] || "";

// ==================== 地区优先级（离中国近的优先） ====================
// 这里用“中文国家名”作为内部排序基准。
// 你要调整地区先后顺序，直接改这个数组即可。
const REGION_DISTANCE_ORDER = [
  "香港",
  "澳门",
  "台湾",
  "韩国",
  "日本",
  "朝鲜",
  "蒙古",
  "俄罗斯",
  "新加坡",
  "越南",
  "泰国",
  "老挝",
  "柬埔寨",
  "缅甸",
  "马来",
  "菲律宾",
  "印尼",
  "印度",
  "尼泊尔",
  "不丹",
  "孟加拉国",
  "斯里兰卡",
  "巴基斯坦",
  "阿富汗",
  "哈萨克斯坦",
  "吉尔吉斯斯坦",
  "塔吉克斯坦",
  "乌兹别克斯坦",
  "土库曼斯坦",
  "阿联酋",
  "卡塔尔",
  "阿曼",
  "巴林",
  "科威特",
  "沙特阿拉伯",
  "伊朗",
  "伊拉克",
  "土耳其",
  "格鲁吉亚",
  "亚美尼亚",
  "阿塞拜疆",
  "德国",
  "法国",
  "英国",
  "荷兰",
  "比利时",
  "瑞士",
  "意大利",
  "西班牙",
  "葡萄牙",
  "瑞典",
  "挪威",
  "芬兰",
  "丹麦",
  "波兰",
  "捷克",
  "匈牙利",
  "奥地利",
  "罗马尼亚",
  "希腊",
  "乌克兰",
  "白俄罗斯",
  "加拿大",
  "美国",
  "墨西哥",
  "巴西",
  "阿根廷",
  "智利",
  "秘鲁",
  "澳大利亚",
  "新西兰",
  "南非"
];

const REGION_PRIORITY_MAP = Object.fromEntries(
  REGION_DISTANCE_ORDER.map((name, idx) => [name, idx])
);

// ==================== 数据表 ====================
// prettier-ignore
const FG = ['🇭🇰','🇲🇴','🇹🇼','🇯🇵','🇰🇷','🇸🇬','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇦🇺','🇦🇪','🇦🇫','🇦🇱','🇩🇿','🇦🇴','🇦🇷','🇦🇲','🇦🇹','🇦🇿','🇧🇭','🇧🇩','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇻🇬','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇨🇻','🇰🇾','🇨🇫','🇹🇩','🇨🇱','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇷','🇭🇷','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇴','🇪🇨','🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇪🇹','🇫🇯','🇫🇮','🇬🇦','🇬🇲','🇬🇪','🇬🇭','🇬🇷','🇬🇱','🇬🇹','🇬🇳','🇬🇾','🇭🇹','🇭🇳','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇲','🇮🇱','🇮🇹','🇨🇮','🇯🇲','🇯🇴','🇰🇿','🇰🇪','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸','🇱🇷','🇱🇾','🇱🇹','🇱🇺','🇲🇰','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹','🇲🇷','🇲🇺','🇲🇽','🇲🇩','🇲🇨','🇲🇳','🇲🇪','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇵','🇳🇱','🇳🇿','🇳🇮','🇳🇪','🇳🇬','🇰🇵','🇳🇴','🇴🇲','🇵🇰','🇵🇦','🇵🇾','🇵🇪','🇵🇭','🇵🇹','🇵🇷','🇶🇦','🇷🇴','🇷🇺','🇷🇼','🇸🇲','🇸🇦','🇸🇳','🇷🇸','🇸🇱','🇸🇰','🇸🇮','🇸🇴','🇿🇦','🇪🇸','🇱🇰','🇸🇩','🇸🇷','🇸🇿','🇸🇪','🇨🇭','🇸🇾','🇹🇯','🇹🇿','🇹🇭','🇹🇬','🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲','🇻🇮','🇺🇬','🇺🇦','🇺🇾','🇺🇿','🇻🇪','🇻🇳','🇾🇪','🇿🇲','🇿🇼','🇦🇩','🇷🇪','🇵🇱','🇬🇺','🇻🇦','🇱🇮','🇨🇼','🇸🇨','🇦🇶','🇬🇮','🇨🇺','🇫🇴','🇦🇽','🇧🇲','🇹🇱']
// prettier-ignore
const EN = ['HK','MO','TW','JP','KR','SG','US','GB','FR','DE','AU','AE','AF','AL','DZ','AO','AR','AM','AT','AZ','BH','BD','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','VG','BN','BG','BF','BI','KH','CM','CA','CV','KY','CF','TD','CL','CO','KM','CG','CD','CR','HR','CY','CZ','DK','DJ','DO','EC','EG','SV','GQ','ER','EE','ET','FJ','FI','GA','GM','GE','GH','GR','GL','GT','GN','GY','HT','HN','HU','IS','IN','ID','IR','IQ','IE','IM','IL','IT','CI','JM','JO','KZ','KE','KW','KG','LA','LV','LB','LS','LR','LY','LT','LU','MK','MG','MW','MY','MV','ML','MT','MR','MU','MX','MD','MC','MN','ME','MA','MZ','MM','NA','NP','NL','NZ','NI','NE','NG','KP','NO','OM','PK','PA','PY','PE','PH','PT','PR','QA','RO','RU','RW','SM','SA','SN','RS','SL','SK','SI','SO','ZA','ES','LK','SD','SR','SZ','SE','CH','SY','TJ','TZ','TH','TG','TO','TT','TN','TR','TM','VI','UG','UA','UY','UZ','VE','VN','YE','ZM','ZW','AD','RE','PL','GU','VA','LI','CW','SC','AQ','GI','CU','FO','AX','BM','TL'];
// prettier-ignore
const ZH = ['香港','澳门','台湾','日本','韩国','新加坡','美国','英国','法国','德国','澳大利亚','阿联酋','阿富汗','阿尔巴尼亚','阿尔及利亚','安哥拉','阿根廷','亚美尼亚','奥地利','阿塞拜疆','巴林','孟加拉国','白俄罗斯','比利时','伯利兹','贝宁','不丹','玻利维亚','波斯尼亚和黑塞哥维那','博茨瓦纳','巴西','英属维京群岛','文莱','保加利亚','布基纳法索','布隆迪','柬埔寨','喀麦隆','加拿大','佛得角','开曼群岛','中非共和国','乍得','智利','哥伦比亚','科摩罗','刚果(布)','刚果(金)','哥斯达黎加','克罗地亚','塞浦路斯','捷克','丹麦','吉布提','多米尼加共和国','厄瓜多尔','埃及','萨尔瓦多','赤道几内亚','厄立特里亚','爱沙尼亚','埃塞俄比亚','斐济','芬兰','加蓬','冈比亚','格鲁吉亚','加纳','希腊','格陵兰','危地马拉','几内亚','圭亚那','海地','洪都拉斯','匈牙利','冰岛','印度','印尼','伊朗','伊拉克','爱尔兰','马恩岛','以色列','意大利','科特迪瓦','牙买加','约旦','哈萨克斯坦','肯尼亚','科威特','吉尔吉斯斯坦','老挝','拉脱维亚','黎巴嫩','莱索托','利比里亚','利比亚','立陶宛','卢森堡','马其顿','马达加斯加','马拉维','马来','马尔代夫','马里','马耳他','毛利塔尼亚','毛里求斯','墨西哥','摩尔多瓦','摩纳哥','蒙古','黑山共和国','摩洛哥','莫桑比克','缅甸','纳米比亚','尼泊尔','荷兰','新西兰','尼加拉瓜','尼日尔','尼日利亚','朝鲜','挪威','阿曼','巴基斯坦','巴拿马','巴拉圭','秘鲁','菲律宾','葡萄牙','波多黎各','卡塔尔','罗马尼亚','俄罗斯','卢旺达','圣马力诺','沙特阿拉伯','塞内加尔','塞尔维亚','塞拉利昂','斯洛伐克','斯洛文尼亚','索马里','南非','西班牙','斯里兰卡','苏丹','苏里南','斯威士兰','瑞典','瑞士','叙利亚','塔吉克斯坦','坦桑尼亚','泰国','多哥','汤加','特立尼达和多巴哥','突尼斯','土耳其','土库曼斯坦','美属维尔京群岛','乌干达','乌克兰','乌拉圭','乌兹别克斯坦','委内瑞拉','越南','也门','赞比亚','津巴布韦','安道尔','留尼汪','波兰','关岛','梵蒂冈','列支敦士登','库拉索','塞舌尔','南极','直布罗陀','古巴','法罗群岛','奥兰群岛','百慕达','东帝汶'];
// prettier-ignore
const QC = ['Hong Kong','Macao','Taiwan','Japan','Korea','Singapore','United States','United Kingdom','France','Germany','Australia','Dubai','Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','British Virgin Islands','Brunei','Bulgaria','Burkina-faso','Burundi','Cambodia','Cameroon','Canada','CapeVerde','CaymanIslands','Central African Republic','Chad','Chile','Colombia','Comoros','Congo-Brazzaville','Congo-Kinshasa','CostaRica','Croatia','Cyprus','Czech Republic','Denmark','Djibouti','Dominican Republic','Ecuador','Egypt','EISalvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Fiji','Finland','Gabon','Gambia','Georgia','Ghana','Greece','Greenland','Guatemala','Guinea','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Isle of Man','Israel','Italy','Ivory Coast','Jamaica','Jordan','Kazakstan','Kenya','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Lithuania','Luxembourg','Macedonia','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Mauritania','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar(Burma)','Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','NorthKorea','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Portugal','PuertoRico','Qatar','Romania','Russia','Rwanda','SanMarino','SaudiArabia','Senegal','Serbia','SierraLeone','Slovakia','Slovenia','Somalia','SouthAfrica','Spain','SriLanka','Sudan','Suriname','Swaziland','Sweden','Switzerland','Syria','Tajikstan','Tanzania','Thailand','Togo','Tonga','TrinidadandTobago','Tunisia','Turkey','Turkmenistan','U.S.Virgin Islands','Uganda','Ukraine','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe','Andorra','Reunion','Poland','Guam','Vatican','Liechtensteins','Curacao','Seychelles','Antarctica','Gibraltar','Cuba','Faroe Islands','Ahvenanmaa','Bermuda','Timor-Leste'];

// ==================== 识别/清理配置 ====================
const specialRegex = [
  /(\d\.)?\d+×/,
  /(\d\.)?\d+x/i,
  /IPLC|IEPL|Kern|Edge|Pro|Std|Exp|Biz|Fam|Game|Buy|Zx|LB|Game/,
];

const nameclear =
  /(套餐|到期|有效|剩余|版本|已用|过期|失联|测试|官方|网址|备用|群|TEST|客服|网站|获取|订阅|流量|机场|下次|官址|联系|邮箱|工单|学术|USE|USED|TOTAL|EXPIRE|EMAIL)/i;

// prettier-ignore
const regexArray=[/ˣ²/, /ˣ³/, /ˣ⁴/, /ˣ⁵/, /ˣ⁶/, /ˣ⁷/, /ˣ⁸/, /ˣ⁹/, /ˣ¹⁰/, /ˣ²⁰/, /ˣ³⁰/, /ˣ⁴⁰/, /ˣ⁵⁰/, /专线/, /(IPLC|I-P-L-C)/i, /(IEPL|I-E-P-L)/i, /核心/, /边缘/, /高级/, /标准/, /特殊/, /实验/, /商宽/, /家宽/, /家庭宽带/,/游戏|game/i, /购物/, /LB/, /cloudflare/i, /\budp\b/i, /\bgpt\b/i, /udpn\b/, ];
// prettier-ignore
const valueArray= [ "2×","3×","4×","5×","6×","7×","8×","9×","10×","20×","30×","40×","50×","DL","IPLC","IEPL","Kern","Edge","Pro","Std","Spec","Exp","Biz","Fam","Game","Buy","LB","CF","UDP","GPT","UDPN"];

const nameblnx = /(高倍|(?!1)2+(x|倍)|ˣ²|ˣ³|ˣ⁴|ˣ⁵|ˣ¹⁰)/i;
const namenx   = /(高倍|(?!1)(0\.|\d)+(x|倍)|ˣ²|ˣ³|ˣ⁴|ˣ⁵|ˣ¹⁰)/i;

const keya = /港|Hong|HK|新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR||||||/i;
const keyb = /(((1|2|3|4)\d)|(香港|Hong|HK) 0[5-9]|((新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR) 0[3-9]))/i;

// ==================== 归一化/预处理 ====================
const rurekey = {
  GB: /UK/g,
  "B-G-P": /BGP/g,
  "I-E-P-L": /IEPL/gi,
  "I-P-L-C": /IPLC/gi,

  "Russia Moscow": /Moscow/g,
  "Korea Chuncheon": /Chuncheon|Seoul/g,
  "Hong Kong": /Hongkong|HONG KONG/gi,
  "United Kingdom London": /London|Great Britain/g,

  "Taiwan TW 台湾 ": /(台|Tai\s?wan|TW).*?|.*?(台|Tai\s?wan|TW)/g,
  "United States": /USA|Los Angeles|San Jose|Silicon Valley|Michigan/g,

  澳大利亚: /澳洲|墨尔本|悉尼|土澳|(深|沪|呼|京|广|杭)澳/g,
  德国: /(深|沪|呼|京|广|杭)德|法兰克福|滬德/g,
  香港: /(深|沪|呼|京|广|杭)港/g,
  台湾: /新台|新北|台(?!.*线)/g,
  Taiwan: /Taipei/g,
  日本: /(深|沪|呼|京|广|杭|中|辽)日|东京|大坂/g,
  新加坡: /狮城|(深|沪|呼|京|广|杭)新/g,
  美国: /(深|沪|呼|京|广|杭)美|波特兰|芝加哥|哥伦布|纽约|硅谷|俄勒冈|西雅图|芝加哥/g,
  韩国: /春川|韩|首尔/g,
  Japan: /Tokyo|Osaka/g,
  英国: /伦敦/g,
  India: /Mumbai/g,
  Germany: /Frankfurt/g,
  Switzerland: /Zurich/g,
  俄罗斯: /莫斯科/g,
  土耳其: /伊斯坦布尔/g,
  泰国: /泰國|曼谷/g,
  法国: /巴黎/g,
  波斯尼亚和黑塞哥维那: /波黑共和国/g,
  印尼: /印度尼西亚|雅加达/g,
  印度: /孟买/g,
  孟加拉国: /孟加拉/g,
  捷克: /捷克共和国/g,
  阿联酋: /(🇦🇪|阿联酋|迪拜|UAE|United\s*Arab\s*Emirates|Dubai)/gi,
  沙特阿拉伯: /(🇸🇦|沙特|沙特阿拉伯|Saudi\s*Arabia|KSA|\bSTC\b)/gi,

  家宽: /家庭宽带|家庭|住宅/g,
  G: /\d\s?GB/gi,
  Esnc: /esnc/gi,
};

// ==================== 工具函数 ====================
let GetK = false, AMK = [];

function ObjKA(i) {
  GetK = true;
  AMK = Object.entries(i).filter(([k]) => k && k.trim() !== "");
}

const EN_SET = new Set(EN);

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAsciiWord(s) {
  return /^[A-Za-z0-9]+$/.test(s);
}

function matchWithBoundary(name, key) {
  if (ABSMODE === "off") return name.includes(key);

  if (ABSMODE === "en") {
    if (EN_SET.has(key)) {
      const re = new RegExp(`(?:^|[^A-Za-z])${escapeReg(key)}(?:[^A-Za-z]|$)`, "i");
      return re.test(name);
    }
    return name.includes(key);
  }

  const ascii = isAsciiWord(key);
  const re = ascii
    ? new RegExp(`(?:^|[^A-Za-z0-9])${escapeReg(key)}(?:[^A-Za-z0-9]|$)`, "i")
    : new RegExp(`(?:^|[^\\u4e00-\\u9fffA-Za-z0-9])${escapeReg(key)}(?:[^\\u4e00-\\u9fffA-Za-z0-9]|$)`, "i");
  return re.test(name);
}

function getProtocolName(proxy) {
  const raw = String(proxy.type || proxy.protocol || "").trim().toLowerCase();
  const protoMap = {
    ss: "SS",
    shadowsocks: "SS",
    ssr: "SSR",
    shadowsocksr: "SSR",
    vmess: "VMess",
    vless: "VLESS",
    trojan: "Trojan",
    hysteria: "Hysteria",
    hysteria2: "Hysteria2",
    hy2: "Hysteria2",
    tuic: "TUIC",
    wireguard: "WireGuard",
    wg: "WireGuard",
    snell: "Snell",
    http: "HTTP",
    https: "HTTPS",
    socks: "SOCKS5",
    socks5: "SOCKS5",
    naive: "Naive",
    juicity: "Juicity",
    anytls: "AnyTLS",
    brook: "Brook",
    ssh: "SSH"
  };
  if (!raw) return "";
  return protoMap[raw] || raw.toUpperCase();
}

function getList(arg) {
  switch (arg) {
    case "us": return EN;
    case "gq": return FG;
    case "quan": return QC;
    default: return ZH;
  }
}

function parseMultiplierText(name) {
  const match = name.match(/((倍率|X|x|×)\D?((\d{1,3}\.)?\d+)\D?)|(((\d{1,3}\.)?\d+))(倍|X|x|×)/i);
  if (!match) return "";
  const numMatch = match[0].match(/(\d[\d.]*)/);
  const rev = numMatch ? numMatch[0] : "1";
  if (show1x || rev !== "1") return rev + XSTYLE;
  return "";
}

function parseMultiplierNum(text) {
  if (!text) return default1x ? 1 : Number.POSITIVE_INFINITY;
  const m = String(text).match(/(\d[\d.]*)/);
  return m ? parseFloat(m[0]) : (default1x ? 1 : Number.POSITIVE_INFINITY);
}

function getCanonicalZhByOutput(countryName) {
  const outList = getList(outputName);
  const idx = outList.indexOf(countryName);
  return idx !== -1 ? ZH[idx] : countryName;
}

function getRegionPriority(canonicalZh) {
  return Object.prototype.hasOwnProperty.call(REGION_PRIORITY_MAP, canonicalZh)
    ? REGION_PRIORITY_MAP[canonicalZh]
    : 9999;
}

function sortAndSerialByRegion(pro) {
  const regionMap = {};

  for (const proxy of pro) {
    const regionKey = proxy._countryName || "__UNKNOWN__";
    if (!regionMap[regionKey]) {
      regionMap[regionKey] = [];
    }
    regionMap[regionKey].push(proxy);
  }

  const regionEntries = Object.entries(regionMap);

  regionEntries.sort((a, b) => {
    const aZh = a[1][0]?._canonicalZh || a[0];
    const bZh = b[1][0]?._canonicalZh || b[0];

    const pa = getRegionPriority(aZh);
    const pb = getRegionPriority(bZh);
    if (pa !== pb) return pa - pb;

    return String(aZh).localeCompare(String(bZh), "zh-Hans-CN");
  });

  const out = [];

  regionEntries.forEach(([, group]) => {
    group.sort((a, b) => {
      const multDiff = (a._multiplierNum || 0) - (b._multiplierNum || 0);
      if (multDiff !== 0) return multDiff;

      const protoDiff = String(a._protoSort || "").localeCompare(String(b._protoSort || ""));
      if (protoDiff !== 0) return protoDiff;

      const tagDiff = String(a._tagKey || "").localeCompare(String(b._tagKey || ""));
      if (tagDiff !== 0) return tagDiff;

      const retainDiff = String(a._retainKey || "").localeCompare(String(b._retainKey || ""));
      if (retainDiff !== 0) return retainDiff;

      return (a._origIndex || 0) - (b._origIndex || 0);
    });

    group.forEach((proxy, idx) => {
      const seq = String(idx + 1).padStart(2, "0");
      proxy.name = [
        proxy._flagName,
        proxy._countryName,
        seq,
        bl ? (proxy._multiplier || (default1x ? `1${XSTYLE}` : "")) : "",
        proxy._protoName,
        proxy._retainKey,
        proxy._tagKey
      ].filter(Boolean).join(FGF);

      out.push(proxy);
    });
  });

  pro.splice(0, pro.length, ...out);
  return pro;
}

// ==================== 主流程 ====================
function operator(pro) {
  const Allmap = {};
  const outList = getList(outputName);
  let inputList;

  if (inname !== "") {
    inputList = [getList(inname)];
  } else {
    inputList = [ZH, QC, EN];
  }

  inputList.forEach((arr) => {
    arr.forEach((value, valueIndex) => {
      if (value && String(value).trim() !== "") {
        Allmap[value] = outList[valueIndex];
      }
    });
  });

  if (clear || nx || blnx || key) {
    pro = pro.filter((res) => {
      const resname = res.name;
      const keep =
        !(clear && nameclear.test(resname)) &&
        !(nx && namenx.test(resname)) &&
        !(blnx && !nameblnx.test(resname)) &&
        !(key && !(keya.test(resname) && /2|4|6|7/i.test(resname)));
      return keep;
    });
  }

  const BLKEYS = BLKEY ? BLKEY.split("+") : [];

  pro.forEach((e, idx) => {
    let bktf = false;
    let ens = e.name;
    let retainKey = "";
    e._origIndex = idx;

    Object.keys(rurekey).forEach((ikey) => {
      if (rurekey[ikey].test(e.name)) {
        e.name = e.name.replace(rurekey[ikey], ikey);

        if (BLKEY) {
          bktf = true;
          let BLKEY_REPLACE = "";
          let re = false;

          BLKEYS.forEach((i) => {
            if (i.includes(">") && ens.includes(i.split(">")[0])) {
              if (rurekey[ikey].test(i.split(">")[0])) e.name += " " + i.split(">")[0];
              if (i.split(">")[1]) {
                BLKEY_REPLACE = i.split(">")[1];
                re = true;
              }
            } else {
              if (ens.includes(i)) e.name += " " + i;
            }
            retainKey = re ? BLKEY_REPLACE : BLKEYS.filter((items) => e.name.includes(items)).join(FGF);
          });
        }
      }
    });

    const hadShenGang = /(深|沪|呼|京|广|杭)港/.test(ens) || /(深|沪|呼|京|广|杭)港/.test(e.name);
    if (hadShenGang) {
      e.name = e.name.replace(/(深|沪|呼|京|广|杭)港/gi, "香港");
    }

    if (blockquic == "on") e["block-quic"] = "on";
    else if (blockquic == "off") e["block-quic"] = "off";
    else delete e["block-quic"];

    if (!bktf && BLKEY) {
      let BLKEY_REPLACE = "";
      let re = false;

      BLKEYS.forEach((i) => {
        if (i.includes(">") && e.name.includes(i.split(">")[0])) {
          if (i.split(">")[1]) {
            BLKEY_REPLACE = i.split(">")[1];
            re = true;
          }
        }
      });

      retainKey = re ? BLKEY_REPLACE : BLKEYS.filter((items) => e.name.includes(items)).join(FGF);
    }

    let ikeys = "";
    if (blgd) {
      regexArray.forEach((regex, index) => {
        if (regex.test(e.name)) ikeys = valueArray[index];
      });
    }

    let ikey = "";
    if (bl) {
      ikey = parseMultiplierText(e.name);
      if (!ikey && default1x) ikey = "1" + XSTYLE;
    }

    if (!GetK) ObjKA(Allmap);

    const findKey = AMK.find(([k]) => matchWithBoundary(e.name, k));

    if (findKey?.[1]) {
      const countryName = findKey[1];
      let usflag = "";

      if (addflag) {
        const idx2 = outList.indexOf(countryName);
        if (idx2 !== -1) usflag = FG[idx2] || "";
      }

      const protoSort = getProtocolName(e);
      const canonicalZh = getCanonicalZhByOutput(countryName);

      e._flagName      = usflag;
      e._countryName   = countryName;
      e._canonicalZh   = canonicalZh;
      e._multiplier    = ikey || "";
      e._multiplierNum = parseMultiplierNum(ikey || (default1x ? `1${XSTYLE}` : ""));
      e._protoSort     = protoSort;
      e._protoName     = proto ? protoSort : "";
      e._retainKey     = retainKey || "";
      e._tagKey        = ikeys || "";
      e.name = "__GROUP_READY__";
    } else {
      if (nm) {
        e.name = [FNAME, e.name].filter(Boolean).join(FGF);
      } else {
        e.name = null;
      }
    }
  });

  pro = pro.filter((e) => e.name !== null);
  sortAndSerialByRegion(pro);

  if (key) pro = pro.filter((e) => !keyb.test(e.name));

  return pro;
}

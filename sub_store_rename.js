/**
 * 更新日期：2026-04-16
 * 用法：Sub-Store 脚本操作添加
 *
 * Sub-Store rename script
 *
 * =========================
 * 一、脚本效果
 * =========================
 * 最终输出格式：
 *   🇯🇵 日本 01 1x AT
 * 或带纯净标识：
 *   🇯🇵 日本 01 1x AT 净
 *
 * 排序规则：
 *   1. 地区之间按“国内常用度 + 一般速度体验”预设优先级排序
 *   2. 同地区内按倍率升序：1x -> 1.5x -> 2x -> 2.5x ...
 *   3. 同倍率内按协议优先级排序
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
 *    proto=true   显示协议
 *    proto=false  不显示协议
 *
 * 4) 协议简称模式
 *    protoShort=true   默认开启，显示简称，例如：AT / HY2 / VL / TR / VM
 *    protoShort=false  显示完整协议名，例如：AnyTLS / Hysteria2 / VLESS / Trojan / VMess
 *
 * 5) 是否显示倍率
 *    bl=true      显示倍率
 *    bl=false     不显示倍率
 *
 * 6) 是否显示 1x
 *    show1x=true   显示 1x
 *    show1x=false  如果识别到倍率为 1，则不显示
 *
 * 7) 节点名里没写倍率时，是否自动补 1x
 *    default1x=true   自动补 1x
 *    default1x=false  不补
 *
 * 8) 倍率样式
 *    xstyle=x    输出 1x / 2.5x
 *    xstyle=×    输出 1× / 2.5×
 *
 * 9) 纯净线路尾标
 *    purity=true        默认开启纯净线路标识
 *    purity=false       关闭纯净线路标识
 *    purityMark=净      设置尾标字符，默认“净”
 *    purityKeys=纯净+原生+家宽+住宅+原生IP+解锁+NF
 *    说明：节点名命中 purityKeys 中任一关键词，就在末尾追加 purityMark
 *
 * 10) 国家识别输出格式
 *    out=zh   中文国家名，如：日本 / 香港 / 美国
 *    out=en   两字母国家码，如：JP / HK / US
 *    out=quan 英文国家名，如：Japan / Hong Kong / United States
 *
 * 11) 是否清理信息节点
 *    clear=true   清理“套餐到期、剩余流量、官网地址、测试节点”等信息节点
 *    clear=false  不清理
 *
 * 12) 是否给未识别地区的节点保留原名
 *    nm=true   保留原节点名
 *    nm=false  直接丢弃未识别地区节点
 *
 * 13) 分隔符
 *    fgf=%20   一般就是空格
 *
 * =========================
 * 三、推荐参数
 * =========================
 * 推荐直接使用：
 *   #flag=true&out=zh&proto=true&bl=true&show1x=true&default1x=true&xstyle=x&purityMark=净
 *
 * 典型输出：
 *   🇭🇰 香港 01 1x AT 净
 *   🇭🇰 香港 02 1x TR
 *   🇯🇵 日本 01 2.5x VL 净
 *
 * =========================
 * 四、地区优先级说明
 * =========================
 * 当前采用“国内常用度 + 一般速度体验”排序，不是纯地理距离。
 * 你如果想自己改地区顺序，只需要修改下面 REGION_PREFERENCE_ORDER 数组。
 *
 * =========================
 * 五、协议优先级说明
 * =========================
 * 当前采用“综合优劣 / 现代性 / 常见体验”排序。
 * 你如果想自己改协议顺序，只需要修改下面 PROTOCOL_PREFERENCE_ORDER 数组。
 *
 * =========================
 * 六、地区处理优化说明
 * =========================
 * 本版把地区归一化统一改成“只落到标准中文地区名”，避免混用：
 *   Russia Moscow / Korea Chuncheon / Hong Kong / United Kingdom London / Taiwan TW 台湾
 * 这类非标准键。
 * 现在统一归一到：
 *   香港 / 日本 / 新加坡 / 美国 / 韩国 / 台湾 / 英国 / 德国 / 法国 ...
 * 这样后续排序、分组、输出都更稳定。
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

const nx         = boolArg(inArg.nx, false),
      bl         = boolArg(inArg.bl, true),
      nf         = boolArg(inArg.nf, false),
      key        = boolArg(inArg.key, false),
      blgd       = boolArg(inArg.blgd, false),
      blpx       = boolArg(inArg.blpx, false),
      blnx       = boolArg(inArg.blnx, false),
      debug      = boolArg(inArg.debug, false),
      clear      = boolArg(inArg.clear, true),
      addflag    = boolArg(inArg.flag, false),
      nm         = boolArg(inArg.nm, false),
      proto      = boolArg(inArg.proto, true),
      protoShort = boolArg(inArg.protoShort, true),
      show1x     = boolArg(inArg.show1x, true),
      default1x  = boolArg(inArg.default1x, true),
      purity     = boolArg(inArg.purity, true);

// 严格边界匹配模式：en(默认，仅 EN 两字母) | all(全部识别词) | off(关闭)
const ABSMODE = (inArg.abs || "en").toLowerCase();

const FGF         = inArg.fgf == undefined ? " " : decodeURI(inArg.fgf),
      FNAME       = inArg.name == undefined ? "" : decodeURI(inArg.name),
      BLKEY       = inArg.blkey == undefined ? "" : decodeURI(inArg.blkey),
      blockquic   = inArg.blockquic == undefined ? "" : decodeURI(inArg.blockquic),
      XSTYLE      = inArg.xstyle == undefined ? "x" : decodeURI(inArg.xstyle),
      PURITY_MARK = inArg.purityMark == undefined ? "净" : decodeURI(inArg.purityMark),
      PURITY_KEYS = inArg.purityKeys == undefined
        ? "纯净+原生+家宽+住宅+原生IP+解锁+NF"
        : decodeURI(inArg.purityKeys),
      nameMap     = { cn: "cn", zh: "cn", us: "us", en: "us", quan: "quan", gq: "gq", flag: "gq" },
      inname      = nameMap[inArg.in] || "",
      outputName  = nameMap[inArg.out] || "";

// ==================== 地区优先级（按国内常用度 + 一般速度体验） ====================
const REGION_PREFERENCE_ORDER = [
  "香港",
  "日本",
  "新加坡",
  "韩国",
  "台湾",
  "美国",
  "澳门",
  "俄罗斯",
  "德国",
  "英国",
  "法国",
  "荷兰",
  "加拿大",
  "澳大利亚",
  "新西兰",
  "阿联酋",
  "土耳其",
  "印度",
  "泰国",
  "越南",
  "菲律宾",
  "马来",
  "印尼",
  "瑞士",
  "瑞典",
  "挪威",
  "丹麦",
  "芬兰",
  "比利时",
  "意大利",
  "西班牙",
  "葡萄牙",
  "波兰",
  "捷克",
  "奥地利",
  "匈牙利",
  "罗马尼亚",
  "乌克兰",
  "白俄罗斯",
  "哈萨克斯坦",
  "巴基斯坦",
  "沙特阿拉伯",
  "卡塔尔",
  "阿曼",
  "巴林",
  "科威特",
  "伊朗",
  "伊拉克",
  "蒙古",
  "朝鲜",
  "老挝",
  "柬埔寨",
  "缅甸",
  "尼泊尔",
  "不丹",
  "孟加拉国",
  "斯里兰卡",
  "南非",
  "墨西哥",
  "巴西",
  "阿根廷",
  "智利",
  "秘鲁"
];

const REGION_PRIORITY_MAP = Object.fromEntries(
  REGION_PREFERENCE_ORDER.map((name, idx) => [name, idx])
);

// ==================== 协议优先级（按综合优劣/现代性排序） ====================
const PROTOCOL_PREFERENCE_ORDER = [
  "AnyTLS",
  "Hysteria2",
  "TUIC",
  "Hysteria",
  "VLESS",
  "Trojan",
  "WireGuard",
  "Juicity",
  "Naive",
  "VMess",
  "SS",
  "SSR",
  "SOCKS5",
  "HTTP",
  "HTTPS",
  "Snell",
  "Brook",
  "SSH"
];

const PROTOCOL_PRIORITY_MAP = Object.fromEntries(
  PROTOCOL_PREFERENCE_ORDER.map((name, idx) => [name, idx])
);

// ==================== 协议简称映射 ====================
const PROTOCOL_SHORT_MAP = {
  "AnyTLS": "AT",
  "Hysteria2": "HY2",
  "TUIC": "TUIC",
  "Hysteria": "HY",
  "VLESS": "VL",
  "Trojan": "TR",
  "WireGuard": "WG",
  "Juicity": "JC",
  "Naive": "NV",
  "VMess": "VM",
  "SS": "SS",
  "SSR": "SSR",
  "SOCKS5": "S5",
  "HTTP": "HT",
  "HTTPS": "HS",
  "Snell": "SN",
  "Brook": "BK",
  "SSH": "SSH"
};

// ==================== 数据表 ====================
// prettier-ignore
const FG = ['🇭🇰','🇲🇴','🇹🇼','🇯🇵','🇰🇷','🇸🇬','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇦🇺','🇦🇪','🇦🇫','🇦🇱','🇩🇿','🇦🇴','🇦🇷','🇦🇲','🇦🇹','🇦🇿','🇧🇭','🇧🇩','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇻🇬','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇨🇻','🇰🇾','🇨🇫','🇹🇩','🇨🇱','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇷','🇭🇷','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇴','🇪🇨','🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇪🇹','🇫🇯','🇫🇮','🇬🇦','🇬🇲','🇬🇪','🇬🇭','🇬🇷','🇬🇱','🇬🇹','🇬🇳','🇬🇾','🇭🇹','🇭🇳','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇲','🇮🇱','🇮🇹','🇨🇮','🇯🇲','🇯🇴','🇰🇿','🇰🇪','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸','🇱🇷','🇱🇾','🇱🇹','🇱🇺','🇲🇰','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹','🇲🇷','🇲🇺','🇲🇽','🇲🇩','🇲🇨','🇲🇳','🇲🇪','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇵','🇳🇱','🇳🇿','🇳🇮','🇳🇪','🇳🇬','🇰🇵','🇳🇴','🇴🇲','🇵🇰','🇵🇦','🇵🇾','🇵🇪','🇵🇭','🇵🇹','🇵🇷','🇶🇦','🇷🇴','🇷🇺','🇷🇼','🇸🇲','🇸🇦','🇸🇳','🇷🇸','🇸🇱','🇸🇰','🇸🇮','🇸🇴','🇿🇦','🇪🇸','🇱🇰','🇸🇩','🇸🇷','🇸🇿','🇸🇪','🇨🇭','🇸🇾','🇹🇯','🇹🇿','🇹🇭','🇹🇬','🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲','🇻🇮','🇺🇬','🇺🇦','🇺🇾','🇺🇿','🇻🇪','🇻🇳','🇾🇪','🇿🇲','🇿🇼','🇦🇩','🇷🇪','🇵🇱','🇬🇺','🇻🇦','🇱🇮','🇨🇼','🇸🇨','🇦🇶','🇬🇮','🇨🇺','🇫🇴','🇦🇽','🇧🇲','🇹🇱'];
// prettier-ignore
const EN = ['HK','MO','TW','JP','KR','SG','US','GB','FR','DE','AU','AE','AF','AL','DZ','AO','AR','AM','AT','AZ','BH','BD','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','VG','BN','BG','BF','BI','KH','CM','CA','CV','KY','CF','TD','CL','CO','KM','CG','CD','CR','HR','CY','CZ','DK','DJ','DO','EC','EG','SV','GQ','ER','EE','ET','FJ','FI','GA','GM','GE','GH','GR','GL','GT','GN','GY','HT','HN','HU','IS','IN','ID','IR','IQ','IE','IM','IL','IT','CI','JM','JO','KZ','KE','KW','KG','LA','LV','LB','LS','LR','LY','LT','LU','MK','MG','MW','MY','MV','ML','MT','MR','MU','MX','MD','MC','MN','ME','MA','MZ','MM','NA','NP','NL','NZ','NI','NE','NG','KP','NO','OM','PK','PA','PY','PE','PH','PT','PR','QA','RO','RU','RW','SM','SA','SN','RS','SL','SK','SI','SO','ZA','ES','LK','SD','SR','SZ','SE','CH','SY','TJ','TZ','TH','TG','TO','TT','TN','TR','TM','VI','UG','UA','UY','UZ','VE','VN','YE','ZM','ZW','AD','RE','PL','GU','VA','LI','CW','SC','AQ','GI','CU','FO','AX','BM','TL'];
// prettier-ignore
const ZH = ['香港','澳门','台湾','日本','韩国','新加坡','美国','英国','法国','德国','澳大利亚','阿联酋','阿富汗','阿尔巴尼亚','阿尔及利亚','安哥拉','阿根廷','亚美尼亚','奥地利','阿塞拜疆','巴林','孟加拉国','白俄罗斯','比利时','伯利兹','贝宁','不丹','玻利维亚','波斯尼亚和黑塞哥维那','博茨瓦纳','巴西','英属维京群岛','文莱','保加利亚','布基纳法索','布隆迪','柬埔寨','喀麦隆','加拿大','佛得角','开曼群岛','中非共和国','乍得','智利','哥伦比亚','科摩罗','刚果(布)','刚果(金)','哥斯达黎加','克罗地亚','塞浦路斯','捷克','丹麦','吉布提','多米尼加共和国','厄瓜多尔','埃及','萨尔瓦多','赤道几内亚','厄立特里亚','爱沙尼亚','埃塞俄比亚','斐济','芬兰','加蓬','冈比亚','格鲁吉亚','加纳','希腊','格陵兰','危地马拉','几内亚','圭亚那','海地','洪都拉斯','匈牙利','冰岛','印度','印尼','伊朗','伊拉克','爱尔兰','马恩岛','以色列','意大利','科特迪瓦','牙买加','约旦','哈萨克斯坦','肯尼亚','科威特','吉尔吉斯斯坦','老挝','拉脱维亚','黎巴嫩','莱索托','利比里亚','利比亚','立陶宛','卢森堡','马其顿','马达加斯加','马拉维','马来','马尔代夫','马里','马耳他','毛利塔尼亚','毛里求斯','墨西哥','摩尔多瓦','摩纳哥','蒙古','黑山共和国','摩洛哥','莫桑比克','缅甸','纳米比亚','尼泊尔','荷兰','新西兰','尼加拉瓜','尼日尔','尼日利亚','朝鲜','挪威','阿曼','巴基斯坦','巴拿马','巴拉圭','秘鲁','菲律宾','葡萄牙','波多黎各','卡塔尔','罗马尼亚','俄罗斯','卢旺达','圣马力诺','沙特阿拉伯','塞内加尔','塞尔维亚','塞拉利昂','斯洛伐克','斯洛文尼亚','索马里','南非','西班牙','斯里兰卡','苏丹','苏里南','斯威士兰','瑞典','瑞士','叙利亚','塔吉克斯坦','坦桑尼亚','泰国','多哥','汤加','特立尼达和多巴哥','突尼斯','土耳其','土库曼斯坦','美属维尔京群岛','乌干达','乌克兰','乌拉圭','乌兹别克斯坦','委内瑞拉','越南','也门','赞比亚','津巴布韦','安道尔','留尼汪','波兰','关岛','梵蒂冈','列支敦士登','库拉索','塞舌尔','南极','直布罗陀','古巴','法罗群岛','奥兰群岛','百慕达','东帝汶'];
// prettier-ignore
const QC = ['Hong Kong','Macao','Taiwan','Japan','Korea','Singapore','United States','United Kingdom','France','Germany','Australia','Dubai','Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','British Virgin Islands','Brunei','Bulgaria','Burkina-faso','Burundi','Cambodia','Cameroon','Canada','CapeVerde','CaymanIslands','Central African Republic','Chad','Chile','Colombia','Comoros','Congo-Brazzaville','Congo-Kinshasa','CostaRica','Croatia','Cyprus','Czech Republic','Denmark','Djibouti','Dominican Republic','Ecuador','Egypt','EISalvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Fiji','Finland','Gabon','Gambia','Georgia','Ghana','Greece','Greenland','Guatemala','Guinea','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Isle of Man','Israel','Italy','Ivory Coast','Jamaica','Jordan','Kazakstan','Kenya','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Lithuania','Luxembourg','Macedonia','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Mauritania','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar(Burma)','Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','NorthKorea','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Portugal','PuertoRico','Qatar','Romania','Russia','Rwanda','SanMarino','SaudiArabia','Senegal','Serbia','SierraLeone','Slovakia','Slovenia','Somalia','SouthAfrica','Spain','SriLanka','Sudan','Suriname','Swaziland','Sweden','Switzerland','Syria','Tajikstan','Tanzania','Thailand','Togo','Tonga','TrinidadandTobago','Tunisia','Turkey','Turkmenistan','U.S.Virgin Islands','Uganda','Ukraine','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe','Andorra','Reunion','Poland','Guam','Vatican','Liechtensteins','Curacao','Seychelles','Antarctica','Gibraltar','Cuba','Faroe Islands','Ahvenanmaa','Bermuda','Timor-Leste'];

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

const keya = /港|Hong|HK|新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR/i;
const keyb = /(((1|2|3|4)\d)|(香港|Hong|HK) 0[5-9]|((新加坡|SG|Singapore|日本|Japan|JP|美国|United States|US|韩|土耳其|TR|Turkey|Korea|KR) 0[3-9]))/i;

// ==================== 非地区类预处理 ====================
const BASIC_REPLACE_RULES = {
  GB: /UK/g,
  "B-G-P": /BGP/g,
  "I-E-P-L": /IEPL/gi,
  "I-P-L-C": /IPLC/gi,
  家宽: /家庭宽带|家庭|住宅/g,
  G: /\d\s?GB/gi,
  Esnc: /esnc/gi,
};

// ==================== 地区归一化规则（只归一到标准中文地区名） ====================
const REGION_NORMALIZE_RULES = [
  ["香港", /(深|沪|呼|京|广|杭)港|Hong\s?Kong|Hongkong|香港|港岛|九龙|新界|HKG/gi],
  ["澳门", /Macao|Macau|澳门/gi],
  ["台湾", /Taipei|Taiwan|台湾|台北|新北|高雄|台中|桃园|桃園|TW(?![A-Za-z])/gi],
  ["日本", /Tokyo|Osaka|Nagoya|Japan|日本|东京|大阪|大坂|名古屋|埼玉|横滨|橫濱/gi],
  ["韩国", /Seoul|Chuncheon|Korea|韩国|首尔|首爾|春川/gi],
  ["新加坡", /Singapore|新加坡|狮城|獅城|SIN/gi],
  ["美国", /United\s*States|USA|America|美国|洛杉矶|洛杉磯|Los\s*Angeles|San\s*Jose|Silicon\s*Valley|Portland|Chicago|Columbus|New\s*York|Seattle|俄勒冈|俄勒岡|硅谷|紐約|纽约/gi],
  ["英国", /United\s*Kingdom|Britain|England|英国|伦敦|倫敦|London/gi],
  ["德国", /Germany|德国|德國|Frankfurt|法兰克福|法蘭克福/gi],
  ["法国", /France|法国|法國|Paris|巴黎/gi],
  ["荷兰", /Netherlands|荷兰|荷蘭|Amsterdam|阿姆斯特丹/gi],
  ["加拿大", /Canada|加拿大|Toronto|Vancouver|多伦多|溫哥華|温哥华/gi],
  ["澳大利亚", /Australia|澳大利亚|澳洲|悉尼|雪梨|Sydney|Melbourne|墨尔本|墨爾本/gi],
  ["俄罗斯", /Russia|俄罗斯|俄羅斯|Moscow|莫斯科/gi],
  ["土耳其", /Turkey|土耳其|Istanbul|伊斯坦布尔|伊斯坦堡/gi],
  ["泰国", /Thailand|泰国|泰國|Bangkok|曼谷/gi],
  ["越南", /Vietnam|越南|胡志明|河内|河內|Ho\s*Chi\s*Minh|Hanoi/gi],
  ["菲律宾", /Philippines|菲律宾|菲律賓|Manila|马尼拉/gi],
  ["马来", /Malaysia|马来西亚|馬來西亞|吉隆坡|Kuala\s*Lumpur/gi],
  ["印尼", /Indonesia|印尼|印度尼西亚|印度尼西亞|Jakarta|雅加达|雅加達/gi],
  ["印度", /India|印度|Mumbai|孟买|孟買|Delhi|德里/gi],
  ["阿联酋", /(🇦🇪|阿联酋|阿聯酋|迪拜|Dubai|UAE|United\s*Arab\s*Emirates)/gi],
  ["沙特阿拉伯", /(🇸🇦|沙特|沙特阿拉伯|Saudi\s*Arabia|KSA|\bSTC\b)/gi],
  ["卡塔尔", /Qatar|卡塔尔|卡達爾|Doha|多哈/gi],
  ["阿曼", /Oman|阿曼|Muscat|马斯喀特/gi],
  ["巴林", /Bahrain|巴林/gi],
  ["科威特", /Kuwait|科威特/gi],
  ["伊朗", /Iran|伊朗|Tehran|德黑兰|德黑蘭/gi],
  ["伊拉克", /Iraq|伊拉克|Baghdad|巴格达|巴格達/gi],
  ["哈萨克斯坦", /Kazakhstan|哈萨克斯坦|阿拉木图|阿拉木圖|Almaty/gi],
  ["乌克兰", /Ukraine|乌克兰|基辅|基輔|Kyiv|Kiev/gi],
  ["瑞士", /Switzerland|瑞士|Zurich|苏黎世|蘇黎世|Geneva|日内瓦|日內瓦/gi],
  ["瑞典", /Sweden|瑞典|Stockholm|斯德哥尔摩|斯德哥爾摩/gi],
  ["挪威", /Norway|挪威|Oslo|奥斯陆|奧斯陸/gi],
  ["丹麦", /Denmark|丹麦|丹麥|Copenhagen|哥本哈根/gi],
  ["芬兰", /Finland|芬兰|芬蘭|Helsinki|赫尔辛基|赫爾辛基/gi],
  ["比利时", /Belgium|比利时|比利時|Brussels|布鲁塞尔|布魯塞爾/gi],
  ["意大利", /Italy|意大利|罗马|羅馬|Rome|Milan|米兰|米蘭/gi],
  ["西班牙", /Spain|西班牙|Madrid|马德里|馬德里|Barcelona|巴塞罗那|巴塞羅那/gi],
  ["葡萄牙", /Portugal|葡萄牙|Lisbon|里斯本/gi],
  ["波兰", /Poland|波兰|波蘭|Warsaw|华沙|華沙/gi],
  ["捷克", /Czech|捷克|Prague|布拉格/gi],
  ["奥地利", /Austria|奥地利|奧地利|Vienna|维也纳|維也納/gi],
  ["匈牙利", /Hungary|匈牙利|Budapest|布达佩斯|布達佩斯/gi],
  ["罗马尼亚", /Romania|罗马尼亚|羅馬尼亞|Bucharest|布加勒斯特/gi],
  ["白俄罗斯", /Belarus|白俄罗斯|白俄羅斯|Minsk|明斯克/gi],
  ["蒙古", /Mongolia|蒙古|Ulaanbaatar|乌兰巴托|烏蘭巴托/gi],
  ["朝鲜", /North\s*Korea|朝鲜|朝鮮|Pyongyang|平壤/gi],
  ["老挝", /Laos|老挝|寮國|Vientiane|万象|萬象/gi],
  ["柬埔寨", /Cambodia|柬埔寨|金边|金邊|Phnom\s*Penh/gi],
  ["缅甸", /Myanmar|Burma|缅甸|緬甸|Yangon|仰光/gi],
  ["尼泊尔", /Nepal|尼泊尔|尼泊爾|Kathmandu|加德满都|加德滿都/gi],
  ["不丹", /Bhutan|不丹/gi],
  ["孟加拉国", /Bangladesh|孟加拉国|孟加拉國|Dhaka|达卡|達卡/gi],
  ["斯里兰卡", /Sri\s*Lanka|斯里兰卡|斯里蘭卡|Colombo|科伦坡|科倫坡/gi],
  ["南非", /South\s*Africa|南非|Johannesburg|约翰内斯堡|約翰內斯堡|Cape\s*Town|开普敦|開普敦/gi],
  ["墨西哥", /Mexico|墨西哥|Mexico\s*City|墨西哥城/gi],
  ["巴西", /Brazil|巴西|Sao\s*Paulo|São\s*Paulo|圣保罗|聖保羅|Rio/gi],
  ["阿根廷", /Argentina|阿根廷|Buenos\s*Aires|布宜诺斯艾利斯|布宜諾斯艾利斯/gi],
  ["智利", /Chile|智利|Santiago|圣地亚哥|聖地亞哥/gi],
  ["秘鲁", /Peru|秘鲁|秘魯|Lima|利马|利馬/gi]
];

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

function getProtocolDisplayName(fullName) {
  if (!fullName) return "";
  if (!protoShort) return fullName;
  return PROTOCOL_SHORT_MAP[fullName] || fullName;
}

function getProtocolPriority(protoName) {
  return Object.prototype.hasOwnProperty.call(PROTOCOL_PRIORITY_MAP, protoName)
    ? PROTOCOL_PRIORITY_MAP[protoName]
    : 9999;
}

function getList(arg) {
  switch (arg) {
    case "us": return EN;
    case "gq": return FG;
    case "quan": return QC;
    default: return ZH;
  }
}

function applyBasicReplacement(name) {
  let n = name;
  Object.keys(BASIC_REPLACE_RULES).forEach((key) => {
    const re = BASIC_REPLACE_RULES[key];
    if (re.test(n)) n = n.replace(re, key);
  });
  return n;
}

function applyRegionNormalization(name) {
  let n = name;
  REGION_NORMALIZE_RULES.forEach(([zhName, re]) => {
    if (re.test(n) && !n.includes(zhName)) {
      n += ` ${zhName}`;
    }
  });
  return n;
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

function splitPlusKeys(str) {
  return String(str || "")
    .split("+")
    .map(s => s.trim())
    .filter(Boolean);
}

function hasPurityMark(sourceText) {
  if (!purity) return false;
  const keys = splitPlusKeys(PURITY_KEYS);
  if (!keys.length) return false;
  const text = String(sourceText || "");
  return keys.some(k => text.toLowerCase().includes(k.toLowerCase()));
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

      const ppA = getProtocolPriority(String(a._protoSort || ""));
      const ppB = getProtocolPriority(String(b._protoSort || ""));
      if (ppA !== ppB) return ppA - ppB;

      const protoDiff = String(a._protoSort || "").localeCompare(String(b._protoSort || ""));
      if (protoDiff !== 0) return protoDiff;

      const pureDiff = Number(Boolean(b._purityTail)) - Number(Boolean(a._purityTail));
      if (pureDiff !== 0) return pureDiff;

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
        proxy._tagKey,
        proxy._purityTail
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
    const rawOriginalName = e.name;
    let workingName = e.name;
    let retainKey = "";
    e._origIndex = idx;

    workingName = applyBasicReplacement(workingName);
    workingName = applyRegionNormalization(workingName);

    const hadShenGang = /(深|沪|呼|京|广|杭)港/.test(rawOriginalName) || /(深|沪|呼|京|广|杭)港/.test(workingName);
    if (hadShenGang && !workingName.includes("香港")) {
      workingName += " 香港";
    }

    if (BLKEY) {
      const holder = { value: "", useReplace: false };

      BLKEYS.forEach((i) => {
        if (i.includes(">")) {
          const [from, to] = i.split(">");
          if (from && rawOriginalName.includes(from)) {
            if (to) {
              holder.value = to;
              holder.useReplace = true;
            } else if (!workingName.includes(from)) {
              workingName += " " + from;
            }
          }
        } else if (i && rawOriginalName.includes(i) && !workingName.includes(i)) {
          workingName += " " + i;
        }
      });

      if (holder.useReplace) {
        retainKey = holder.value;
      } else {
        retainKey = BLKEYS.filter((items) => items && !items.includes(">") && workingName.includes(items)).join(FGF);
      }

      bktf = Boolean(retainKey);
    }

    if (!bktf && BLKEY) {
      let replaceVal = "";
      let re = false;

      BLKEYS.forEach((i) => {
        if (i.includes(">")) {
          const [from, to] = i.split(">");
          if (from && workingName.includes(from)) {
            if (to) {
              replaceVal = to;
              re = true;
            }
          }
        }
      });

      retainKey = re ? replaceVal : BLKEYS.filter((items) => items && !items.includes(">") && workingName.includes(items)).join(FGF);
    }

    if (blockquic == "on") e["block-quic"] = "on";
    else if (blockquic == "off") e["block-quic"] = "off";
    else delete e["block-quic"];

    let ikeys = "";
    if (blgd) {
      regexArray.forEach((regex, index) => {
        if (regex.test(workingName)) ikeys = valueArray[index];
      });
    }

    let ikey = "";
    if (bl) {
      ikey = parseMultiplierText(workingName);
      if (!ikey && default1x) ikey = "1" + XSTYLE;
    }

    if (!GetK) ObjKA(Allmap);

    const findKey = AMK.find(([k]) => matchWithBoundary(workingName, k));

    if (findKey?.[1]) {
      const countryName = findKey[1];
      let usflag = "";

      if (addflag) {
        const idx2 = outList.indexOf(countryName);
        if (idx2 !== -1) usflag = FG[idx2] || "";
      }

      const protoFull = getProtocolName(e);
      const protoDisplay = getProtocolDisplayName(protoFull);
      const canonicalZh = getCanonicalZhByOutput(countryName);
      const pureTail = hasPurityMark(`${rawOriginalName} ${workingName}`) ? PURITY_MARK : "";

      e._flagName      = usflag;
      e._countryName   = countryName;
      e._canonicalZh   = canonicalZh;
      e._multiplier    = ikey || "";
      e._multiplierNum = parseMultiplierNum(ikey || (default1x ? `1${XSTYLE}` : ""));
      e._protoSort     = protoFull;
      e._protoName     = proto ? protoDisplay : "";
      e._retainKey     = retainKey || "";
      e._tagKey        = ikeys || "";
      e._purityTail    = pureTail;
      e.name = "__GROUP_READY__";
    } else {
      if (nm) {
        e.name = [FNAME, workingName].filter(Boolean).join(FGF);
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
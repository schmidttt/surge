/**
 * 更新日期：2026-06-29 16:23
 * 用法：Sub-Store 脚本操作添加
 *
 * 稳妥版：常用地区 + 冷门地区兼容
 *
 * 推荐参数：
 *   #flag=true&out=zh&proto=true&bl=true&show1x=true&default1x=true&xstyle=x
 *
 * 典型输出：
 *   🇭🇰 香港 01 1x AT 净
 *   🇯🇵 日本 01 10x AT 星
 *   🇰🇷 韩国 01 10x AT 移
 *   ❓ 未识别 01 原节点名
 *
 * 核心策略：
 *   1. 常用国家、冷门国家、海外属地、特殊地区统一走 REGION_DB
 *   2. 地区别名长词优先，避免短词抢先误判
 *   3. 两字母地区码严格边界匹配
 *   4. 地区识别和尾标识别分离
 *   5. 默认保留未识别节点，便于后续补库
 */

const inArg = $arguments;

// ==================== 参数解析 ====================
function boolArg(v, d) {
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

const bl         = boolArg(inArg.bl, true),
      clear      = boolArg(inArg.clear, true),
      addflag    = boolArg(inArg.flag, false),
      nm         = boolArg(inArg.nm, false),
      unknown    = boolArg(inArg.unknown, true),
      proto      = boolArg(inArg.proto, true),
      protoShort = boolArg(inArg.protoShort, true),
      show1x     = boolArg(inArg.show1x, true),
      default1x  = boolArg(inArg.default1x, true),
      purity     = boolArg(inArg.purity, true),
      star       = boolArg(inArg.star, true),
      mobile     = boolArg(inArg.mobile, true),
      nx         = boolArg(inArg.nx, false),
      blnx       = boolArg(inArg.blnx, false),
      key        = boolArg(inArg.key, false),
      blgd       = boolArg(inArg.blgd, false);

const FGF          = inArg.fgf == undefined ? " " : decodeURI(inArg.fgf),
      XSTYLE       = inArg.xstyle == undefined ? "x" : decodeURI(inArg.xstyle),
      blockquic    = inArg.blockquic == undefined ? "" : decodeURI(inArg.blockquic),
      outputMode   = (inArg.out || "zh").toLowerCase(),
      BLKEY        = inArg.blkey == undefined ? "" : decodeURI(inArg.blkey),
      UNKNOWN_NAME = inArg.unknownName == undefined ? "未识别" : decodeURI(inArg.unknownName),
      UNKNOWN_FLAG = inArg.unknownFlag == undefined ? "❓" : decodeURI(inArg.unknownFlag),

      PURITY_MARK  = inArg.purityMark == undefined ? "净" : decodeURI(inArg.purityMark),
      PURITY_KEYS  = inArg.purityKeys == undefined
        ? "纯净+原生+原生IP+家宽+住宅+家庭宽带+Residential+HomeISP+Home ISP+Native+NativeIP+Clean+CleanIP+Clean IP"
        : decodeURI(inArg.purityKeys),

      STAR_MARK    = inArg.starMark == undefined ? "星" : decodeURI(inArg.starMark),
      STAR_KEYS    = inArg.starKeys == undefined
        ? "星链+Starlink+Satellite+卫星"
        : decodeURI(inArg.starKeys),

      MOBILE_MARK  = inArg.mobileMark == undefined ? "移" : decodeURI(inArg.mobileMark),
      MOBILE_KEYS  = inArg.mobileKeys == undefined
        ? "5G网络+5G+Mobile+移动+蜂窝+LTE"
        : decodeURI(inArg.mobileKeys);

// ==================== 常用地区优先级 ====================
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
  "关岛",
  "北马里亚纳群岛",
  "英属印度洋领地",
  "纽埃",
  "帕劳",
  "萨摩亚",
  "美属萨摩亚",
  "托克劳",
  "图瓦卢",
  "基里巴斯",
  "瓦努阿图",
  "诺福克岛",
  "密克罗尼西亚",
  "法属波利尼西亚",
  "瓦利斯和富图纳",
  "圣皮埃尔和密克隆",
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
  "秘鲁",
  "巴勒斯坦",
  "科索沃",
  "库克群岛",
  "法属圭亚那",
  "荷属加勒比",
  "法属圣马丁",
  "荷属圣马丁",
  "圣巴泰勒米",
  "瓜德罗普",
  "马提尼克",
  "阿鲁巴",
  "福克兰群岛",
  "特克斯和凯科斯群岛",
  "马约特",
  "南苏丹",
  "几内亚比绍",
  "圣多美和普林西比",
  "中国大陆"
];

const REGION_PRIORITY_MAP = {};
REGION_PREFERENCE_ORDER.forEach(function (name, idx) {
  REGION_PRIORITY_MAP[name] = idx;
});

// ==================== 协议优先级 ====================
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

const PROTOCOL_PRIORITY_MAP = {};
PROTOCOL_PREFERENCE_ORDER.forEach(function (name, idx) {
  PROTOCOL_PRIORITY_MAP[name] = idx;
});

// ==================== 基础地区表 ====================
// prettier-ignore
const FG = ['🇭🇰','🇲🇴','🇹🇼','🇯🇵','🇰🇷','🇸🇬','🇺🇸','🇬🇧','🇫🇷','🇩🇪','🇦🇺','🇦🇪','🇦🇫','🇦🇱','🇩🇿','🇦🇴','🇦🇷','🇦🇲','🇦🇹','🇦🇿','🇧🇭','🇧🇩','🇧🇾','🇧🇪','🇧🇿','🇧🇯','🇧🇹','🇧🇴','🇧🇦','🇧🇼','🇧🇷','🇻🇬','🇧🇳','🇧🇬','🇧🇫','🇧🇮','🇰🇭','🇨🇲','🇨🇦','🇨🇻','🇰🇾','🇨🇫','🇹🇩','🇨🇱','🇨🇴','🇰🇲','🇨🇬','🇨🇩','🇨🇷','🇭🇷','🇨🇾','🇨🇿','🇩🇰','🇩🇯','🇩🇴','🇪🇨','🇪🇬','🇸🇻','🇬🇶','🇪🇷','🇪🇪','🇪🇹','🇫🇯','🇫🇮','🇬🇦','🇬🇲','🇬🇪','🇬🇭','🇬🇷','🇬🇱','🇬🇹','🇬🇳','🇬🇾','🇭🇹','🇭🇳','🇭🇺','🇮🇸','🇮🇳','🇮🇩','🇮🇷','🇮🇶','🇮🇪','🇮🇲','🇮🇱','🇮🇹','🇨🇮','🇯🇲','🇯🇴','🇰🇿','🇰🇪','🇰🇼','🇰🇬','🇱🇦','🇱🇻','🇱🇧','🇱🇸','🇱🇷','🇱🇾','🇱🇹','🇱🇺','🇲🇰','🇲🇬','🇲🇼','🇲🇾','🇲🇻','🇲🇱','🇲🇹','🇲🇷','🇲🇺','🇲🇽','🇲🇩','🇲🇨','🇲🇳','🇲🇪','🇲🇦','🇲🇿','🇲🇲','🇳🇦','🇳🇵','🇳🇱','🇳🇿','🇳🇮','🇳🇪','🇳🇬','🇰🇵','🇳🇴','🇴🇲','🇵🇰','🇵🇦','🇵🇾','🇵🇪','🇵🇭','🇵🇹','🇵🇷','🇶🇦','🇷🇴','🇷🇺','🇷🇼','🇸🇲','🇸🇦','🇸🇳','🇷🇸','🇸🇱','🇸🇰','🇸🇮','🇸🇴','🇿🇦','🇪🇸','🇱🇰','🇸🇩','🇸🇷','🇸🇿','🇸🇪','🇨🇭','🇸🇾','🇹🇯','🇹🇿','🇹🇭','🇹🇬','🇹🇴','🇹🇹','🇹🇳','🇹🇷','🇹🇲','🇻🇮','🇺🇬','🇺🇦','🇺🇾','🇺🇿','🇻🇪','🇻🇳','🇾🇪','🇿🇲','🇿🇼','🇦🇩','🇷🇪','🇵🇱','🇬🇺','🇻🇦','🇱🇮','🇨🇼','🇸🇨','🇦🇶','🇬🇮','🇨🇺','🇫🇴','🇦🇽','🇧🇲','🇹🇱'];
// prettier-ignore
const EN = ['HK','MO','TW','JP','KR','SG','US','GB','FR','DE','AU','AE','AF','AL','DZ','AO','AR','AM','AT','AZ','BH','BD','BY','BE','BZ','BJ','BT','BO','BA','BW','BR','VG','BN','BG','BF','BI','KH','CM','CA','CV','KY','CF','TD','CL','CO','KM','CG','CD','CR','HR','CY','CZ','DK','DJ','DO','EC','EG','SV','GQ','ER','EE','ET','FJ','FI','GA','GM','GE','GH','GR','GL','GT','GN','GY','HT','HN','HU','IS','IN','ID','IR','IQ','IE','IM','IL','IT','CI','JM','JO','KZ','KE','KW','KG','LA','LV','LB','LS','LR','LY','LT','LU','MK','MG','MW','MY','MV','ML','MT','MR','MU','MX','MD','MC','MN','ME','MA','MZ','MM','NA','NP','NL','NZ','NI','NE','NG','KP','NO','OM','PK','PA','PY','PE','PH','PT','PR','QA','RO','RU','RW','SM','SA','SN','RS','SL','SK','SI','SO','ZA','ES','LK','SD','SR','SZ','SE','CH','SY','TJ','TZ','TH','TG','TO','TT','TN','TR','TM','VI','UG','UA','UY','UZ','VE','VN','YE','ZM','ZW','AD','RE','PL','GU','VA','LI','CW','SC','AQ','GI','CU','FO','AX','BM','TL'];
// prettier-ignore
const ZH = ['香港','澳门','台湾','日本','韩国','新加坡','美国','英国','法国','德国','澳大利亚','阿联酋','阿富汗','阿尔巴尼亚','阿尔及利亚','安哥拉','阿根廷','亚美尼亚','奥地利','阿塞拜疆','巴林','孟加拉国','白俄罗斯','比利时','伯利兹','贝宁','不丹','玻利维亚','波斯尼亚和黑塞哥维那','博茨瓦纳','巴西','英属维京群岛','文莱','保加利亚','布基纳法索','布隆迪','柬埔寨','喀麦隆','加拿大','佛得角','开曼群岛','中非共和国','乍得','智利','哥伦比亚','科摩罗','刚果(布)','刚果(金)','哥斯达黎加','克罗地亚','塞浦路斯','捷克','丹麦','吉布提','多米尼加共和国','厄瓜多尔','埃及','萨尔瓦多','赤道几内亚','厄立特里亚','爱沙尼亚','埃塞俄比亚','斐济','芬兰','加蓬','冈比亚','格鲁吉亚','加纳','希腊','格陵兰','危地马拉','几内亚','圭亚那','海地','洪都拉斯','匈牙利','冰岛','印度','印尼','伊朗','伊拉克','爱尔兰','马恩岛','以色列','意大利','科特迪瓦','牙买加','约旦','哈萨克斯坦','肯尼亚','科威特','吉尔吉斯斯坦','老挝','拉脱维亚','黎巴嫩','莱索托','利比里亚','利比亚','立陶宛','卢森堡','马其顿','马达加斯加','马拉维','马来','马尔代夫','马里','马耳他','毛利塔尼亚','毛里求斯','墨西哥','摩尔多瓦','摩纳哥','蒙古','黑山共和国','摩洛哥','莫桑比克','缅甸','纳米比亚','尼泊尔','荷兰','新西兰','尼加拉瓜','尼日尔','尼日利亚','朝鲜','挪威','阿曼','巴基斯坦','巴拿马','巴拉圭','秘鲁','菲律宾','葡萄牙','波多黎各','卡塔尔','罗马尼亚','俄罗斯','卢旺达','圣马力诺','沙特阿拉伯','塞内加尔','塞尔维亚','塞拉利昂','斯洛伐克','斯洛文尼亚','索马里','南非','西班牙','斯里兰卡','苏丹','苏里南','斯威士兰','瑞典','瑞士','叙利亚','塔吉克斯坦','坦桑尼亚','泰国','多哥','汤加','特立尼达和多巴哥','突尼斯','土耳其','土库曼斯坦','美属维尔京群岛','乌干达','乌克兰','乌拉圭','乌兹别克斯坦','委内瑞拉','越南','也门','赞比亚','津巴布韦','安道尔','留尼汪','波兰','关岛','梵蒂冈','列支敦士登','库拉索','塞舌尔','南极','直布罗陀','古巴','法罗群岛','奥兰群岛','百慕达','东帝汶'];
// prettier-ignore
const QC = ['Hong Kong','Macao','Taiwan','Japan','Korea','Singapore','United States','United Kingdom','France','Germany','Australia','Dubai','Afghanistan','Albania','Algeria','Angola','Argentina','Armenia','Austria','Azerbaijan','Bahrain','Bangladesh','Belarus','Belgium','Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','British Virgin Islands','Brunei','Bulgaria','Burkina-faso','Burundi','Cambodia','Cameroon','Canada','CapeVerde','CaymanIslands','Central African Republic','Chad','Chile','Colombia','Comoros','Congo-Brazzaville','Congo-Kinshasa','CostaRica','Croatia','Cyprus','Czech Republic','Denmark','Djibouti','Dominican Republic','Ecuador','Egypt','EISalvador','Equatorial Guinea','Eritrea','Estonia','Ethiopia','Fiji','Finland','Gabon','Gambia','Georgia','Ghana','Greece','Greenland','Guatemala','Guinea','Guyana','Haiti','Honduras','Hungary','Iceland','India','Indonesia','Iran','Iraq','Ireland','Isle of Man','Israel','Italy','Ivory Coast','Jamaica','Jordan','Kazakstan','Kenya','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia','Libya','Lithuania','Luxembourg','Macedonia','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta','Mauritania','Mauritius','Mexico','Moldova','Monaco','Mongolia','Montenegro','Morocco','Mozambique','Myanmar(Burma)','Namibia','Nepal','Netherlands','New Zealand','Nicaragua','Niger','Nigeria','NorthKorea','Norway','Oman','Pakistan','Panama','Paraguay','Peru','Philippines','Portugal','PuertoRico','Qatar','Romania','Russia','Rwanda','SanMarino','SaudiArabia','Senegal','Serbia','SierraLeone','Slovakia','Slovenia','Somalia','SouthAfrica','Spain','SriLanka','Sudan','Suriname','Swaziland','Sweden','Switzerland','Syria','Tajikstan','Tanzania','Thailand','Togo','Tonga','TrinidadandTobago','Tunisia','Turkey','Turkmenistan','U.S.Virgin Islands','Uganda','Ukraine','Uruguay','Uzbekistan','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe','Andorra','Reunion','Poland','Guam','Vatican','Liechtensteins','Curacao','Seychelles','Antarctica','Gibraltar','Cuba','Faroe Islands','Ahvenanmaa','Bermuda','Timor-Leste'];

// ==================== 冷门地区增强表 ====================
const EXTRA_REGIONS = [
  { zh: "中国大陆", en: "CN", quan: "China Mainland", flag: "🇨🇳", aliases: ["中国大陆", "中國大陸", "大陆", "大陸", "China Mainland", "Mainland China", "CN"] },
  { zh: "巴勒斯坦", en: "PS", quan: "Palestine", flag: "🇵🇸", aliases: ["巴勒斯坦", "Palestine", "Palestinian", "PS"] },
  { zh: "科索沃", en: "XK", quan: "Kosovo", flag: "🇽🇰", aliases: ["科索沃", "Kosovo", "XK"] },
  { zh: "库克群岛", en: "CK", quan: "Cook Islands", flag: "🇨🇰", aliases: ["库克群岛", "庫克群島", "Cook Islands", "Cook", "CK"] },
  { zh: "根西岛", en: "GG", quan: "Guernsey", flag: "🇬🇬", aliases: ["根西岛", "根西島", "Guernsey", "GG"] },
  { zh: "泽西岛", en: "JE", quan: "Jersey", flag: "🇯🇪", aliases: ["泽西岛", "澤西島", "Jersey", "JE"] },
  { zh: "瑙鲁", en: "NR", quan: "Nauru", flag: "🇳🇷", aliases: ["瑙鲁", "瑙魯", "Nauru", "NR"] },
  { zh: "新喀里多尼亚", en: "NC", quan: "New Caledonia", flag: "🇳🇨", aliases: ["新喀里多尼亚", "新喀里多尼亞", "New Caledonia", "NC"] },
  { zh: "巴哈马", en: "BS", quan: "Bahamas", flag: "🇧🇸", aliases: ["巴哈马", "巴哈馬", "Bahamas", "BS"] },
  { zh: "格林纳达", en: "GD", quan: "Grenada", flag: "🇬🇩", aliases: ["格林纳达", "格林納達", "Grenada", "GD"] },
  { zh: "阿鲁巴", en: "AW", quan: "Aruba", flag: "🇦🇼", aliases: ["阿鲁巴", "阿魯巴", "Aruba", "AW"] },
  { zh: "法属圭亚那", en: "GF", quan: "French Guiana", flag: "🇬🇫", aliases: ["法属圭亚那", "法屬圭亞那", "French Guiana", "GF"] },
  { zh: "蒙特塞拉特", en: "MS", quan: "Montserrat", flag: "🇲🇸", aliases: ["蒙特塞拉特", "Montserrat", "MS"] },
  { zh: "荷属圣马丁", en: "SX", quan: "Sint Maarten", flag: "🇸🇽", aliases: ["荷属圣马丁", "荷屬聖馬丁", "Sint Maarten", "Saint Martin NL", "SX"] },
  { zh: "荷属加勒比", en: "BQ", quan: "Caribbean Netherlands", flag: "🇧🇶", aliases: ["荷属加勒比", "荷屬加勒比", "Caribbean Netherlands", "Bonaire", "博奈尔", "博奈爾", "BQ"] },
  { zh: "法属圣马丁", en: "MF", quan: "Saint Martin", flag: "🇲🇫", aliases: ["法属圣马丁", "法屬聖馬丁", "Saint Martin FR", "Saint-Martin", "MF"] },
  { zh: "圣巴泰勒米", en: "BL", quan: "Saint Barthelemy", flag: "🇧🇱", aliases: ["圣巴泰勒米", "聖巴泰勒米", "Saint Barthelemy", "Saint Barth", "St Bart", "BL"] },
  { zh: "瓜德罗普", en: "GP", quan: "Guadeloupe", flag: "🇬🇵", aliases: ["瓜德罗普", "瓜德羅普", "Guadeloupe", "GP"] },
  { zh: "马提尼克", en: "MQ", quan: "Martinique", flag: "🇲🇶", aliases: ["马提尼克", "馬提尼克", "Martinique", "MQ"] },
  { zh: "安提瓜和巴布达", en: "AG", quan: "Antigua and Barbuda", flag: "🇦🇬", aliases: ["安提瓜和巴布达", "安提瓜和巴布達", "Antigua and Barbuda", "Antigua", "AG"] },
  { zh: "圣基茨和尼维斯", en: "KN", quan: "Saint Kitts and Nevis", flag: "🇰🇳", aliases: ["圣基茨和尼维斯", "聖基茨和尼維斯", "Saint Kitts and Nevis", "St Kitts", "Nevis", "KN"] },
  { zh: "圣文森特和格林纳丁斯", en: "VC", quan: "Saint Vincent and the Grenadines", flag: "🇻🇨", aliases: ["圣文森特和格林纳丁斯", "聖文森特和格林納丁斯", "Saint Vincent and the Grenadines", "Saint Vincent", "VC"] },
  { zh: "多米尼克", en: "DM", quan: "Dominica", flag: "🇩🇲", aliases: ["多米尼克", "Dominica", "DM"] },
  { zh: "巴巴多斯", en: "BB", quan: "Barbados", flag: "🇧🇧", aliases: ["巴巴多斯", "Barbados", "BB"] },
  { zh: "圣卢西亚", en: "LC", quan: "Saint Lucia", flag: "🇱🇨", aliases: ["圣卢西亚", "聖盧西亞", "Saint Lucia", "St Lucia", "LC"] },
  { zh: "福克兰群岛", en: "FK", quan: "Falkland Islands", flag: "🇫🇰", aliases: ["福克兰群岛", "福克蘭群島", "Falkland Islands", "Falklands", "FK"] },
  { zh: "特克斯和凯科斯群岛", en: "TC", quan: "Turks and Caicos Islands", flag: "🇹🇨", aliases: ["特克斯和凯科斯群岛", "特克斯和凱科斯群島", "Turks and Caicos Islands", "Turks Caicos", "TC"] },
  { zh: "马约特", en: "YT", quan: "Mayotte", flag: "🇾🇹", aliases: ["马约特", "馬約特", "Mayotte", "YT"] },
  { zh: "南苏丹", en: "SS", quan: "South Sudan", flag: "🇸🇸", aliases: ["南苏丹", "南蘇丹", "South Sudan", "SS"] },
  { zh: "几内亚比绍", en: "GW", quan: "Guinea-Bissau", flag: "🇬🇼", aliases: ["几内亚比绍", "幾內亞比紹", "Guinea Bissau", "Guinea-Bissau", "GW"] },
  { zh: "圣多美和普林西比", en: "ST", quan: "Sao Tome and Principe", flag: "🇸🇹", aliases: ["圣多美和普林西比", "聖多美和普林西比", "Sao Tome and Principe", "São Tomé and Príncipe", "Sao Tome", "ST"] },
  { zh: "北马里亚纳群岛", en: "MP", quan: "Northern Mariana Islands", flag: "🇲🇵", aliases: ["北马里亚纳群岛", "北馬里亞納群島", "Northern Mariana Islands", "Northern Mariana", "Saipan", "塞班", "MP"] },
  { zh: "英属印度洋领地", en: "IO", quan: "British Indian Ocean Territory", flag: "🇮🇴", aliases: ["英属印度洋领地", "英屬印度洋領地", "British Indian Ocean Territory", "British Indian Ocean", "BIOT", "Diego Garcia", "迪戈加西亚", "迪戈加西亞", "IO"] },

  { zh: "纽埃", en: "NU", quan: "Niue", flag: "🇳🇺", aliases: ["纽埃", "紐埃", "Niue", "NU"] },
  { zh: "帕劳", en: "PW", quan: "Palau", flag: "🇵🇼", aliases: ["帕劳", "帛琉", "帕勞", "Palau", "PW"] },
  { zh: "萨摩亚", en: "WS", quan: "Samoa", flag: "🇼🇸", aliases: ["萨摩亚", "薩摩亞", "Samoa", "Western Samoa", "WS"] },
  { zh: "美属萨摩亚", en: "AS", quan: "American Samoa", flag: "🇦🇸", aliases: ["美属萨摩亚", "美屬薩摩亞", "American Samoa", "AS"] },
  { zh: "托克劳", en: "TK", quan: "Tokelau", flag: "🇹🇰", aliases: ["托克劳", "托克勞", "Tokelau", "TK"] },
  { zh: "图瓦卢", en: "TV", quan: "Tuvalu", flag: "🇹🇻", aliases: ["图瓦卢", "圖瓦盧", "Tuvalu", "TV"] },
  { zh: "基里巴斯", en: "KI", quan: "Kiribati", flag: "🇰🇮", aliases: ["基里巴斯", "Kiribati", "KI"] },
  { zh: "瓦努阿图", en: "VU", quan: "Vanuatu", flag: "🇻🇺", aliases: ["瓦努阿图", "瓦努阿圖", "Vanuatu", "VU"] },
  { zh: "诺福克岛", en: "NF", quan: "Norfolk Island", flag: "🇳🇫", aliases: ["诺福克岛", "諾福克島", "Norfolk Island", "Norfolk", "NF"] },
  { zh: "密克罗尼西亚", en: "FM", quan: "Micronesia", flag: "🇫🇲", aliases: ["密克罗尼西亚", "密克羅尼西亞", "密克罗尼西亚联邦", "密克羅尼西亞聯邦", "Micronesia", "Federated States of Micronesia", "FM"] },
  { zh: "法属波利尼西亚", en: "PF", quan: "French Polynesia", flag: "🇵🇫", aliases: ["法属波利尼西亚", "法屬波利尼西亞", "French Polynesia", "Polynesia", "PF"] },
  { zh: "瓦利斯和富图纳", en: "WF", quan: "Wallis and Futuna", flag: "🇼🇫", aliases: ["瓦利斯和富图纳", "瓦利斯和富圖納", "Wallis and Futuna", "Wallis", "Futuna", "WF"] },
  { zh: "圣皮埃尔和密克隆", en: "PM", quan: "Saint Pierre and Miquelon", flag: "🇵🇲", aliases: ["圣皮埃尔和密克隆", "聖皮埃爾和密克隆", "Saint Pierre and Miquelon", "St Pierre and Miquelon", "PM"] }
];

// ==================== 常用别名增强 ====================
const REGION_ALIAS_EXTRA = {
  "香港": ["香港", "港岛", "港島", "九龙", "九龍", "新界", "Hong Kong", "HongKong", "HKG", "深港", "沪港", "京港", "广港", "杭港", "呼港"],
  "澳门": ["澳门", "澳門", "Macao", "Macau", "MFM"],
  "台湾": ["台湾", "台灣", "台北", "新北", "高雄", "台中", "桃园", "桃園", "Taiwan", "Taipei", "TPE", "TW"],
  "日本": ["日本", "东京", "東京", "大阪", "大坂", "名古屋", "埼玉", "横滨", "橫濱", "Japan", "Tokyo", "Osaka", "Nagoya", "NRT", "HND", "KIX", "JP"],
  "韩国": ["韩国", "韓國", "首尔", "首爾", "春川", "Korea", "South Korea", "Seoul", "Chuncheon", "ICN", "KR"],
  "新加坡": ["新加坡", "狮城", "獅城", "Singapore", "SIN", "SG"],
  "美国": ["美国", "美國", "洛杉矶", "洛杉磯", "硅谷", "纽约", "紐約", "俄勒冈", "俄勒岡", "United States", "USA", "America", "Los Angeles", "San Jose", "Silicon Valley", "Portland", "Chicago", "Columbus", "New York", "Seattle", "US"],
  "英国": ["英国", "英國", "伦敦", "倫敦", "United Kingdom", "Britain", "England", "London", "UK", "GB"],
  "德国": ["德国", "德國", "法兰克福", "法蘭克福", "Germany", "Frankfurt", "DE"],
  "法国": ["法国", "法國", "巴黎", "France", "Paris", "FR"],
  "荷兰": ["荷兰", "荷蘭", "阿姆斯特丹", "Netherlands", "Amsterdam", "NL"],
  "加拿大": ["加拿大", "多伦多", "多倫多", "温哥华", "溫哥華", "Canada", "Toronto", "Vancouver", "CA"],
  "澳大利亚": ["澳大利亚", "澳大利亞", "澳洲", "悉尼", "雪梨", "墨尔本", "墨爾本", "Australia", "Sydney", "Melbourne", "AU"],
  "马来": ["马来西亚", "馬來西亞", "马来", "馬來", "吉隆坡", "Malaysia", "Kuala Lumpur", "MY"],
  "印尼": ["印尼", "印度尼西亚", "印度尼西亞", "雅加达", "雅加達", "Indonesia", "Jakarta", "ID"],
  "俄罗斯": ["俄罗斯", "俄羅斯", "莫斯科", "Russia", "Moscow", "RU"],
  "泰国": ["泰国", "泰國", "曼谷", "Thailand", "Bangkok", "TH"],
  "越南": ["越南", "胡志明", "河内", "河內", "Vietnam", "Ho Chi Minh", "Hanoi", "VN"],
  "菲律宾": ["菲律宾", "菲律賓", "马尼拉", "馬尼拉", "Philippines", "Manila", "PH"],
  "黑山共和国": ["黑山共和国", "黑山共和國", "黑山", "Montenegro", "ME"],
  "百慕达": ["百慕达", "百慕大", "Bermuda", "BM"],
  "孟加拉国": ["孟加拉国", "孟加拉國", "孟加拉", "Bangladesh", "Dhaka", "BD"],
  "刚果(布)": ["刚果布", "剛果布", "刚果(布)", "刚果（布）", "Congo Brazzaville", "Congo-Brazzaville", "CG"],
  "刚果(金)": ["刚果金", "剛果金", "刚果(金)", "刚果（金）", "Congo Kinshasa", "Congo-Kinshasa", "CD"],
  "多米尼加共和国": ["多米尼加共和国", "多米尼加共和國", "Dominican Republic", "DO"],
  "南极": ["南极", "南極", "南极洲", "南極洲", "Antarctica", "AQ"]
};

// ==================== 其他规则 ====================
const nameclear =
  /(套餐|到期|有效|剩余|版本|已用|过期|失联|测试|官方|网址|备用|群|TEST|客服|网站|获取|订阅|流量|机场|下次|官址|联系|邮箱|工单|学术|拉取|拉取于|更新时间|更新于|刷新|刷新时间|USE|USED|TOTAL|EXPIRE|EMAIL|UPDATE|UPDATED|REFRESH)/i;

const nameblnx = /(高倍|(?!1)2+(x|倍)|ˣ²|ˣ³|ˣ⁴|ˣ⁵|ˣ¹⁰)/i;
const namenx   = /(高倍|(?!1)(0\.|\d)+(x|倍)|ˣ²|ˣ³|ˣ⁴|ˣ⁵|ˣ¹⁰)/i;

const regexArray = [
  /ˣ²/, /ˣ³/, /ˣ⁴/, /ˣ⁵/, /ˣ⁶/, /ˣ⁷/, /ˣ⁸/, /ˣ⁹/, /ˣ¹⁰/,
  /专线/, /(IPLC|I-P-L-C)/i, /(IEPL|I-E-P-L)/i, /核心/, /边缘/,
  /高级/, /标准/, /特殊/, /实验/, /商宽/, /游戏|game/i,
  /购物/, /LB/, /cloudflare/i, /\budp\b/i, /\bgpt\b/i
];

const valueArray = [
  "2×", "3×", "4×", "5×", "6×", "7×", "8×", "9×", "10×",
  "DL", "IPLC", "IEPL", "Kern", "Edge",
  "Pro", "Std", "Spec", "Exp", "Biz", "Game",
  "Buy", "LB", "CF", "UDP", "GPT"
];

// ==================== 工具函数 ====================
function escapeReg(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniq(arr) {
  const seen = {};
  const out = [];
  arr.forEach(function (x) {
    const v = String(x || "").trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (!seen[key]) {
      seen[key] = true;
      out.push(v);
    }
  });
  return out;
}

function isAsciiLike(s) {
  return /^[A-Za-z0-9 _.\-]+$/.test(String(s || ""));
}

function isCodeLike(s) {
  return /^[A-Za-z]{2,3}$/.test(String(s || ""));
}

function matchAlias(text, alias) {
  const source = String(text || "");
  const a = String(alias || "").trim();
  if (!a) return false;

  if (/[\u4e00-\u9fff]/.test(a) || /[^\x00-\x7F]/.test(a)) {
    return source.indexOf(a) !== -1;
  }

  const escaped = escapeReg(a).replace(/\\ /g, "\\s*");

  if (isCodeLike(a)) {
    const reCode = new RegExp("(^|[^A-Za-z0-9])" + escaped + "([^A-Za-z0-9]|$)", "i");
    return reCode.test(source);
  }

  if (isAsciiLike(a)) {
    const reAscii = new RegExp("(^|[^A-Za-z0-9])" + escaped + "([^A-Za-z0-9]|$)", "i");
    return reAscii.test(source);
  }

  return source.toLowerCase().indexOf(a.toLowerCase()) !== -1;
}

function splitPlusKeys(str) {
  return String(str || "")
    .split("+")
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}

function hasAnyKey(text, keysText) {
  const keys = splitPlusKeys(keysText);
  for (let i = 0; i < keys.length; i++) {
    if (matchAlias(text, keys[i])) return true;
  }
  return false;
}

function displayRegion(region) {
  if (outputMode === "en" || outputMode === "us") return region.en;
  if (outputMode === "quan") return region.quan;
  if (outputMode === "gq" || outputMode === "flag") return region.flag;
  return region.zh;
}

function regionPriority(zh) {
  return REGION_PRIORITY_MAP.hasOwnProperty(zh) ? REGION_PRIORITY_MAP[zh] : 9999;
}

function getProtocolPriority(protoName) {
  return PROTOCOL_PRIORITY_MAP.hasOwnProperty(protoName) ? PROTOCOL_PRIORITY_MAP[protoName] : 9999;
}

function normalizeProtocolInfo(proxy) {
  const raw = String(proxy.type || proxy.protocol || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[-_]/g, "");

  const m = {
    anytls:       { full: "AnyTLS",    short: "AT",   sort: "AnyTLS" },
    hysteria2:    { full: "Hysteria2", short: "HY2",  sort: "Hysteria2" },
    hy2:          { full: "Hysteria2", short: "HY2",  sort: "Hysteria2" },
    tuic:         { full: "TUIC",      short: "TUIC", sort: "TUIC" },
    hysteria:     { full: "Hysteria",  short: "HY",   sort: "Hysteria" },
    vless:        { full: "VLESS",     short: "VL",   sort: "VLESS" },
    trojan:       { full: "Trojan",    short: "TR",   sort: "Trojan" },
    wireguard:    { full: "WireGuard", short: "WG",   sort: "WireGuard" },
    wg:           { full: "WireGuard", short: "WG",   sort: "WireGuard" },
    juicity:      { full: "Juicity",   short: "JC",   sort: "Juicity" },
    naive:        { full: "Naive",     short: "NV",   sort: "Naive" },
    vmess:        { full: "VMess",     short: "VM",   sort: "VMess" },
    ss:           { full: "SS",        short: "SS",   sort: "SS" },
    shadowsocks:  { full: "SS",        short: "SS",   sort: "SS" },
    ssr:          { full: "SSR",       short: "SSR",  sort: "SSR" },
    shadowsocksr: { full: "SSR",       short: "SSR",  sort: "SSR" },
    socks5:       { full: "SOCKS5",    short: "S5",   sort: "SOCKS5" },
    socks:        { full: "SOCKS5",    short: "S5",   sort: "SOCKS5" },
    http:         { full: "HTTP",      short: "HT",   sort: "HTTP" },
    https:        { full: "HTTPS",     short: "HS",   sort: "HTTPS" },
    snell:        { full: "Snell",     short: "SN",   sort: "Snell" },
    brook:        { full: "Brook",     short: "BK",   sort: "Brook" },
    ssh:          { full: "SSH",       short: "SSH",  sort: "SSH" }
  };

  if (m[raw]) return m[raw];

  const fallback = raw ? raw.toUpperCase() : "";
  return { full: fallback, short: fallback, sort: fallback };
}

function parseMultiplierText(name) {
  const s = String(name || "");
  const match = s.match(/((倍率|X|x|×)\D?((\d{1,3}\.)?\d+)\D?)|(((\d{1,3}\.)?\d+))(倍|X|x|×)/i);
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

// ==================== REGION_DB 构建 ====================
function buildRegionDb() {
  const map = {};

  for (let i = 0; i < ZH.length; i++) {
    const zh = ZH[i];
    map[zh] = {
      zh: zh,
      en: EN[i],
      quan: QC[i],
      flag: FG[i],
      aliases: [zh, EN[i], QC[i], FG[i]]
    };
  }

  EXTRA_REGIONS.forEach(function (r) {
    map[r.zh] = {
      zh: r.zh,
      en: r.en,
      quan: r.quan,
      flag: r.flag,
      aliases: [r.zh, r.en, r.quan, r.flag].concat(r.aliases || [])
    };
  });

  Object.keys(REGION_ALIAS_EXTRA).forEach(function (zh) {
    if (!map[zh]) return;
    map[zh].aliases = map[zh].aliases.concat(REGION_ALIAS_EXTRA[zh]);
  });

  const db = Object.keys(map).map(function (zh) {
    const r = map[zh];
    r.aliases = uniq(r.aliases);

    r.aliases.sort(function (a, b) {
      const ac = isCodeLike(a) ? 1 : 0;
      const bc = isCodeLike(b) ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return String(b).length - String(a).length;
    });

    r.priority = regionPriority(r.zh);
    return r;
  });

  db.sort(function (a, b) {
    if (a.priority !== b.priority) return a.priority - b.priority;

    const aMax = a.aliases.reduce(function (m, x) { return Math.max(m, String(x).length); }, 0);
    const bMax = b.aliases.reduce(function (m, x) { return Math.max(m, String(x).length); }, 0);
    if (aMax !== bMax) return bMax - aMax;

    return String(a.zh).localeCompare(String(b.zh), "zh-Hans-CN");
  });

  return db;
}

const REGION_DB = buildRegionDb();

function matchRegion(name) {
  const text = String(name || "");
  let best = null;

  for (let i = 0; i < REGION_DB.length; i++) {
    const r = REGION_DB[i];

    for (let j = 0; j < r.aliases.length; j++) {
      const a = r.aliases[j];

      if (matchAlias(text, a)) {
        const score = (isCodeLike(a) ? 0 : 10000) + String(a).length;
        if (!best || score > best.score) {
          best = { region: r, alias: a, score: score };
        }
        break;
      }
    }
  }

  return best ? best.region : null;
}

// ==================== 排序与编号 ====================
function sortAndSerial(pro) {
  const groups = {};

  pro.forEach(function (p) {
    const key = p._canonicalZh || "__UNKNOWN__";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const entries = Object.keys(groups).map(function (k) {
    return [k, groups[k]];
  });

  entries.sort(function (a, b) {
    const aKey = a[0];
    const bKey = b[0];

    if (aKey === "__UNKNOWN__" && bKey !== "__UNKNOWN__") return 1;
    if (bKey === "__UNKNOWN__" && aKey !== "__UNKNOWN__") return -1;

    const pa = regionPriority(aKey);
    const pb = regionPriority(bKey);
    if (pa !== pb) return pa - pb;

    return String(aKey).localeCompare(String(bKey), "zh-Hans-CN");
  });

  const out = [];

  entries.forEach(function (entry) {
    const group = entry[1];

    group.sort(function (a, b) {
      const multDiff = (a._multiplierNum || 0) - (b._multiplierNum || 0);
      if (multDiff !== 0) return multDiff;

      const ppA = getProtocolPriority(String(a._protoSort || ""));
      const ppB = getProtocolPriority(String(b._protoSort || ""));
      if (ppA !== ppB) return ppA - ppB;

      const protoDiff = String(a._protoSort || "").localeCompare(String(b._protoSort || ""));
      if (protoDiff !== 0) return protoDiff;

      const tagRank = function (p) {
        if (p._purityTail) return 0;
        if (p._starTail) return 1;
        if (p._mobileTail) return 2;
        return 3;
      };

      const tagDiff = tagRank(a) - tagRank(b);
      if (tagDiff !== 0) return tagDiff;

      return (a._origIndex || 0) - (b._origIndex || 0);
    });

    group.forEach(function (p, idx) {
      const seq = String(idx + 1).padStart(2, "0");

      if (p._isUnknown) {
        p.name = [
          addflag ? UNKNOWN_FLAG : "",
          UNKNOWN_NAME,
          seq,
          p._unknownRawName
        ].filter(Boolean).join(FGF);
      } else {
        p.name = [
          p._flagName,
          p._countryName,
          seq,
          bl ? (p._multiplier || (default1x ? "1" + XSTYLE : "")) : "",
          p._protoName,
          p._retainKey,
          p._tagKey,
          p._purityTail,
          p._starTail,
          p._mobileTail
        ].filter(Boolean).join(FGF);
      }

      out.push(p);
    });
  });

  pro.splice(0, pro.length, ...out);
  return pro;
}

// ==================== 主流程 ====================
function operator(pro) {
  if (clear || nx || blnx || key) {
    pro = pro.filter(function (res) {
      const resname = res.name || "";
      return !(clear && nameclear.test(resname)) &&
             !(nx && namenx.test(resname)) &&
             !(blnx && !nameblnx.test(resname));
    });
  }

  const BLKEYS = BLKEY ? BLKEY.split("+") : [];

  pro.forEach(function (e, idx) {
    const rawName = e.name || "";
    const tagSource = rawName;
    let retainKey = "";
    let tagKey = "";

    e._origIndex = idx;

    if (blockquic == "on") e["block-quic"] = "on";
    else if (blockquic == "off") e["block-quic"] = "off";
    else delete e["block-quic"];

    if (BLKEYS.length) {
      const retainArr = [];

      BLKEYS.forEach(function (i) {
        if (!i) return;

        if (i.indexOf(">") !== -1) {
          const parts = i.split(">");
          const from = parts[0];
          const to = parts[1];
          if (from && rawName.indexOf(from) !== -1 && to) {
            retainArr.push(to);
          }
        } else if (rawName.indexOf(i) !== -1) {
          retainArr.push(i);
        }
      });

      retainKey = uniq(retainArr).join(FGF);
    }

    if (blgd) {
      regexArray.forEach(function (regex, index) {
        regex.lastIndex = 0;
        if (regex.test(rawName)) tagKey = valueArray[index];
        regex.lastIndex = 0;
      });
    }

    let multiplier = "";
    if (bl) {
      multiplier = parseMultiplierText(rawName);
      if (!multiplier && default1x) multiplier = "1" + XSTYLE;
    }

    const protoInfo = normalizeProtocolInfo(e);
    const region = matchRegion(rawName);

    const starHit = star && hasAnyKey(tagSource, STAR_KEYS);
    const mobileHit = mobile && hasAnyKey(tagSource, MOBILE_KEYS);
    const purityHit = purity && hasAnyKey(tagSource, PURITY_KEYS) && !starHit && !mobileHit;

    if (region) {
      e._isUnknown     = false;
      e._flagName      = addflag ? region.flag : "";
      e._countryName   = displayRegion(region);
      e._canonicalZh   = region.zh;
      e._multiplier    = multiplier;
      e._multiplierNum = parseMultiplierNum(multiplier || (default1x ? "1" + XSTYLE : ""));
      e._protoSort     = protoInfo.sort;
      e._protoName     = proto ? (protoShort ? protoInfo.short : protoInfo.full) : "";
      e._retainKey     = retainKey;
      e._tagKey        = tagKey;
      e._purityTail    = purityHit ? PURITY_MARK : "";
      e._starTail      = starHit ? STAR_MARK : "";
      e._mobileTail    = mobileHit ? MOBILE_MARK : "";
    } else {
      if (unknown || nm) {
        e._isUnknown      = true;
        e._flagName       = "";
        e._countryName    = UNKNOWN_NAME;
        e._canonicalZh    = "__UNKNOWN__";
        e._multiplier     = "";
        e._multiplierNum  = Number.POSITIVE_INFINITY;
        e._protoSort      = "";
        e._protoName      = "";
        e._retainKey      = "";
        e._tagKey         = "";
        e._purityTail     = "";
        e._starTail       = "";
        e._mobileTail     = "";
        e._unknownRawName = rawName;
      } else {
        e.name = null;
      }
    }
  });

  pro = pro.filter(function (e) {
    return e.name !== null;
  });

  sortAndSerial(pro);

  return pro;
}

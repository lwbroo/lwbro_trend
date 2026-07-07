/*
 * engine.js — 排盤引擎
 * 包裝 lunar-javascript（八字/農曆/流日干支）與 iztro（紫微斗數/流年流月流日四化）。
 * 依賴 vendor/lunar.js（全域 Solar/Lunar/LunarUtil）與 vendor/iztro.min.js（全域 iztro）。
 */
const Engine = (() => {
  'use strict';

  /* ---------- 簡轉繁（lunar-javascript 輸出為簡體） ---------- */
  const S2T_MAP = {
    '伤': '傷', '财': '財', '杀': '殺', '纳': '納', '剑': '劍', '锋': '鋒',
    '涧': '澗', '炉': '爐', '钗': '釵', '钏': '釧', '灯': '燈', '杨': '楊',
    '雳': '靂', '长': '長', '头': '頭', '蜡': '蠟', '驿': '驛', '泽': '澤',
    '阳': '陽', '阴': '陰', '龙': '龍', '马': '馬', '鸡': '雞', '猪': '豬',
    '实': '實', '闭': '閉', '满': '滿', '执': '執', '经': '經', '历': '曆',
    '腊': '臘', '润': '潤', '闰': '閏'
  };
  function s2t(str) {
    if (!str) return str;
    let out = '';
    for (const ch of String(str)) out += (S2T_MAP[ch] || ch);
    return out;
  }

  /* ---------- 天干地支基礎表 ---------- */
  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const GAN_WUXING = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const ZHI_WUXING = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  // 地支藏干（本氣在前）
  const ZHI_CANG_GAN = {
    子: ['癸'], 丑: ['己', '癸', '辛'], 寅: ['甲', '丙', '戊'], 卯: ['乙'],
    辰: ['戊', '乙', '癸'], 巳: ['丙', '庚', '戊'], 午: ['丁', '己'], 未: ['己', '丁', '乙'],
    申: ['庚', '壬', '戊'], 酉: ['辛'], 戌: ['戊', '辛', '丁'], 亥: ['壬', '甲']
  };
  // 五行生剋：SHENG[a] = a 所生；KE[a] = a 所剋
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

  function ganYinYang(gan) { return GAN.indexOf(gan) % 2 === 0 ? '陽' : '陰'; }

  /** 十神：以 dayGan（日主）論 otherGan */
  function shiShen(dayGan, otherGan) {
    const me = GAN_WUXING[dayGan], other = GAN_WUXING[otherGan];
    const same = ganYinYang(dayGan) === ganYinYang(otherGan);
    if (me === other) return same ? '比肩' : '劫財';
    if (SHENG[me] === other) return same ? '食神' : '傷官';
    if (SHENG[other] === me) return same ? '偏印' : '正印';
    if (KE[me] === other) return same ? '偏財' : '正財';
    if (KE[other] === me) return same ? '七殺' : '正官';
    return '';
  }

  /* ---------- 時辰 ---------- */
  const SHICHEN_NAMES = ['早子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '晚子'];
  /** 由 0-23 時求 iztro 時辰索引（0=早子 … 12=晚子） */
  function hourToTimeIndex(hour) {
    if (hour === 23) return 12;
    return Math.floor((hour + 1) / 2);
  }

  /* ---------- 個人檔案解析 ---------- */
  function parseProfile(profile) {
    const [y, m, d] = profile.birthDate.split('-').map(Number);
    const [hh, mm] = (profile.birthTime || '12:00').split(':').map(Number);
    return { y, m, d, hh, mm };
  }

  /* ---------- 八字本命 ---------- */
  function baziNatal(profile) {
    const { y, m, d, hh, mm } = parseProfile(profile);
    const solar = Solar.fromYmdHms(y, m, d, hh, mm, 0);
    const lunar = solar.getLunar();
    const ec = lunar.getEightChar();
    const dayGan = ec.getDayGan();

    const pillarNames = ['年柱', '月柱', '日柱', '時柱'];
    const raw = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
    const naYin = [ec.getYearNaYin(), ec.getMonthNaYin(), ec.getDayNaYin(), ec.getTimeNaYin()];
    const pillars = raw.map((gz, i) => {
      const gan = gz.charAt(0), zhi = gz.charAt(1);
      return {
        name: pillarNames[i],
        gan, zhi,
        ganWuXing: GAN_WUXING[gan],
        zhiWuXing: ZHI_WUXING[zhi],
        shiShenGan: i === 2 ? '日主' : shiShen(dayGan, gan),
        cangGan: ZHI_CANG_GAN[zhi].map(g => ({ gan: g, shiShen: shiShen(dayGan, g) })),
        naYin: s2t(naYin[i])
      };
    });

    // 五行分佈（八個字，天干地支各計 1）
    const wuxingCount = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
    pillars.forEach(p => { wuxingCount[p.ganWuXing]++; wuxingCount[p.zhiWuXing]++; });

    return {
      pillars,
      dayMaster: dayGan,
      dayMasterWuXing: GAN_WUXING[dayGan],
      dayMasterYinYang: ganYinYang(dayGan),
      wuxingCount,
      lunarDate: s2t(lunar.toString()),
      shengXiao: s2t(lunar.getYearShengXiao()),
      shiChen: SHICHEN_NAMES[hourToTimeIndex(hh)] + '時'
    };
  }

  /* ---------- 紫微本命盤 ---------- */
  function ziweiNatal(profile) {
    const { y, m, d, hh } = parseProfile(profile);
    const dateStr = `${y}-${m}-${d}`;
    const timeIndex = hourToTimeIndex(hh);
    const astrolabe = iztro.astro.bySolar(dateStr, timeIndex, profile.gender, true, 'zh-TW');
    return astrolabe;
  }

  /* ---------- 任一日期的流運（八字視角＋紫微視角） ---------- */
  function daily(profile, date) {
    const natal = baziNatal(profile);
    const dayMaster = natal.dayMaster;
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();

    const yearGz = lunar.getYearInGanZhiByLiChun();   // 以立春換年
    const monthGz = lunar.getMonthInGanZhiExact();    // 以節氣換月
    const dayGz = lunar.getDayInGanZhi();
    const mk = gz => {
      const gan = gz.charAt(0), zhi = gz.charAt(1);
      return {
        ganZhi: gz, gan, zhi,
        ganWuXing: GAN_WUXING[gan],
        zhiWuXing: ZHI_WUXING[zhi],
        shiShen: shiShen(dayMaster, gan),
        zhiShiShen: shiShen(dayMaster, ZHI_CANG_GAN[zhi][0])
      };
    };

    // 當前大運（以目標日期所在年份判斷；起運前為童限）
    let daYun = null;
    try {
      const { y: by, m: bm, d: bd, hh, mm } = parseProfile(profile);
      const ec = Solar.fromYmdHms(by, bm, bd, hh, mm, 0).getLunar().getEightChar();
      const yun = ec.getYun(profile.gender === '男' ? 1 : 0);
      const targetYear = date.getFullYear();
      const hit = yun.getDaYun().find(dy => targetYear >= dy.getStartYear() && targetYear <= dy.getEndYear());
      if (hit && hit.getGanZhi()) {
        daYun = Object.assign(mk(hit.getGanZhi()), {
          startYear: hit.getStartYear(), endYear: hit.getEndYear(), startAge: hit.getStartAge()
        });
      }
    } catch (e) { /* 起運資訊非必要，失敗時略過 */ }

    const bazi = {
      year: mk(yearGz),
      month: mk(monthGz),
      day: mk(dayGz),
      daYun,
      lunarDate: s2t(lunar.toString()),
      jieQi: s2t(lunar.getJieQi() || '')
    };

    // 紫微流運
    const astrolabe = ziweiNatal(profile);
    const h = astrolabe.horoscope(date);
    const layer = (l) => ({
      ganZhi: l.heavenlyStem + l.earthlyBranch,
      mutagen: l.mutagen,            // [祿, 權, 科, 忌] 星名
      palaceIndex: l.index,          // 該層命宮落在本命盤的宮位索引
      palaceName: astrolabe.palaces[l.index] ? astrolabe.palaces[l.index].name : '',
      palaceStars: astrolabe.palaces[l.index]
        ? astrolabe.palaces[l.index].majorStars.map(s => s.name)
        : []
    });

    const ziwei = {
      decadal: layer(h.decadal),
      yearly: layer(h.yearly),
      monthly: layer(h.monthly),
      daily: layer(h.daily)
    };

    return { bazi, ziwei };
  }

  /**
   * 趨勢分析用批次分析器：本命盤只建一次，之後逐日取比對維度。
   * 用法：const keysOf = Engine.createAnalyzer(profile); keysOf('2026-07-07')
   */
  function createAnalyzer(profile) {
    const natal = baziNatal(profile);
    const astrolabe = ziweiNatal(profile);
    const dayMaster = natal.dayMaster;
    const cache = new Map();
    return function trendKeys(dateStr) {
      if (cache.has(dateStr)) return cache.get(dateStr);
      const [y, m, d] = dateStr.split('-').map(Number);
      const lunar = Solar.fromYmd(y, m, d).getLunar();
      const dayGz = lunar.getDayInGanZhi();
      const monthGz = lunar.getMonthInGanZhiExact();
      const gan = dayGz.charAt(0), zhi = dayGz.charAt(1);
      const h = astrolabe.horoscope(new Date(y, m - 1, d, 12, 0, 0));
      const dailyPalace = astrolabe.palaces[h.daily.index];
      const keys = {
        dayGanZhi: dayGz,
        dayGan: gan,
        dayZhi: zhi,
        dayGanWuXing: GAN_WUXING[gan],
        dayZhiWuXing: ZHI_WUXING[zhi],
        shiShen: shiShen(dayMaster, gan),
        monthGanZhi: monthGz,
        monthZhi: monthGz.charAt(1),
        ziweiPalace: dailyPalace ? dailyPalace.name : '',
        ziweiHuaLu: h.daily.mutagen[0],
        ziweiHuaJi: h.daily.mutagen[3]
      };
      cache.set(dateStr, keys);
      return keys;
    };
  }

  return {
    GAN, ZHI, GAN_WUXING, ZHI_WUXING,
    s2t, shiShen, hourToTimeIndex,
    baziNatal, ziweiNatal, daily, createAnalyzer
  };
})();

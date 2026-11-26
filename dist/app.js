(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const WIDTH = 1080, HEIGHT = 1650;
  const MIN_IMAGE_ZOOM = .25, MAX_IMAGE_ZOOM = 3;
  const IMAGE_FRAME = { x: 0, y: 773, width: WIDTH, height: 447 };
  const TRACKS = [
    { id: 'aerospace', name: '航空与航天', en: 'Aerospace & Aviation', color: '#F06838', colorName: '航天橙', code: 'AEROSPACE & AVIATION', majors: '航空航天工程 | Aerospace Engineering\n机械工程 | Mechanical Engineering\n电子工程 | Electronic Engineering\n物理学 | Physics\n材料科学 | Materials Science\n计算机科学 | Computer Science\n商业管理 | Business Management\n创业学 | Entrepreneurship\n工业设计 | Industrial Design' },
    { id: 'cyber', name: '互联网科技与安全', en: 'Cyber-Technology & Security', color: '#8870B0', colorName: '科技紫', code: 'CYBER-TECHNOLOGY & SECURITY', majors: '计算机科学 | Computer Science\n网络安全 | Cybersecurity\n人工智能 | Artificial Intelligence\n软件工程 | Software Engineering\n数据科学 | Data Science\n信息工程 | Information Engineering\n商业管理 | Business Management\n创业学 | Entrepreneurship\n交互设计 | Interaction Design' },
    { id: 'energy', name: '能源与环境', en: 'Energy & Environment', color: '#70A848', colorName: '能源绿', code: 'ENERGY & ENVIRONMENT', majors: '环境科学 | Environmental Science\n环境工程 | Environmental Engineering\n可持续发展 | Sustainable Development\n能源工程 | Energy Engineering\n材料科学 | Materials Science\n化学工程 | Chemical Engineering\n商业管理 | Business Management\n创业学 | Entrepreneurship\n公共政策 | Public Policy' },
    { id: 'health', name: '健康与营养', en: 'Health & Nutrition', color: '#E84030', colorName: '健康红', code: 'HEALTH & NUTRITION', majors: '生物医学工程 | Biomedical Engineering\n营养科学 | Nutrition Science\n公共卫生 | Public Health\n生物科学 | Biological Sciences\n心理学 | Psychology\n食品科学 | Food Science\n商业管理 | Business Management\n创业学 | Entrepreneurship\n产品设计 | Product Design' },
    { id: 'water', name: '水与可持续发展', en: 'The Water Challenge', color: '#1D7DEE', colorName: '水域蓝', code: 'THE WATER CHALLENGE', majors: '环境科学 | Environmental Science\n环境工程 | Environmental Engineering\n可持续发展 | Sustainability / Sustainable Development\n海洋科学 | Marine Science\n计算机科学 | Computer Science\n机器人工程 | Robotics Engineering\n商业管理 | Business Management\n创业学 | Entrepreneurship\n市场营销 | Marketing' }
  ];
  const DEFAULT = {
    track: 'water', projectName: 'MIRA 蓝域',
    subtitle: '基于自主移动机器人与多维水质感知的养殖水体空间测绘研究',
    description: 'MIRA 蓝域面向广东、福建等沿海地区的高密度对虾养殖场，解决人工巡塘和固定传感器采样点少、难以及时发现局部低氧及近塘底风险的问题。\n项目拟研发自主巡航的水质测绘机器人，利用 GPS 定位、路径规划与可升降多参数探头，采集表层、中层及近塘底的溶解氧、温度、pH 等数据，生成水质分布图与风险热力图，呈现异常位置、深度及扩散趋势。未来可联动增氧机与智慧养殖平台，形成监测、预警、干预与复测的管理闭环。',
    majors: TRACKS[4].majors, onlineTime: '4月—6月', offlineTime: '7月—8月', bootcamp: '5 Days Intensive Bootcamp',
    season: '2027–2028', competitionTitle: '康莱德创新者挑战', releaseLabel: 'TEAM招募',
    imageData: '', imageMode: 'template', imageName: '', imageZoom: 1, imageX: 50, imageY: 50,
    showWatermark: true, softBlend: true, bodySize: 20,
    achievements: [
      '连续五年\n入围中国区总决选\nFINALIST',
      '连续两年\n晋级全球站总决赛\nCHAMPIONS',
      '连续多年\n斩获赛道冠军、金银铜奖\n及各单项奖'
    ]
  };
  const clone = obj => JSON.parse(JSON.stringify(obj));
  let state = clone(DEFAULT), activeId = '', db = null, initialized = false;
  let renderGeneration = 0, renderPromise = Promise.resolve(), saveTimer, toastTimer;
  let lastWarnings = [], zoom = null, exportFormat = 'png', exportScale = 3, busy = false;
  let dialogMode = '', restoreFocus = null, readyExport = null;
  const images = new Map();
  const poster = $('#poster-canvas');
  const dialog = $('#main-dialog');
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const trackFor = s => TRACKS.find(t => t.id === s.track) || TRACKS[4];
  const rgb = hex => hex.replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16));
  function mix(a, b, amount) {
    const x = rgb(a), y = rgb(b);
    return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * amount).toString(16).padStart(2, '0')).join('');
  }
  function palette(s) {
    const accent = trackFor(s).color;
    return { accent, dark: mix(accent, '#17354A', .77), mid: mix(accent, '#234760', .42), body: mix(accent, '#3E5367', .73), light: mix(accent, '#FFFFFF', .94), line: mix(accent, '#FFFFFF', .77) };
  }
  function getImage(src) {
    if (!images.has(src)) images.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { images.delete(src); reject(new Error('图片加载失败，请重新上传或刷新页面。')); };
      img.src = src;
    }));
    return images.get(src);
  }
  function font(ctx, size, weight = 400) { ctx.font = `${weight} ${size}px PosterSans, "PingFang SC", "Microsoft YaHei", sans-serif`; }
  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, color, width = 1) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function text(ctx, value, x, y, size, color, weight = 400, align = 'left') {
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top'; font(ctx, size, weight); ctx.fillText(String(value), x, y);
  }
  function fittedLine(ctx, value, x, y, width, size, color, weight = 400, align = 'left', min = 11) {
    font(ctx, size, weight);
    while (size > min && ctx.measureText(value).width > width) { size -= .5; font(ctx, size, weight); }
    text(ctx, value, x, y, size, color, weight, align);
    return ctx.measureText(value).width <= width + .1;
  }
  function wrapText(ctx, value, width) {
    const result = [];
    for (const paragraph of String(value).replace(/\r/g, '').split('\n')) {
      if (!paragraph) { result.push(''); continue; }
      let current = '';
      for (const char of Array.from(paragraph)) {
        if (ctx.measureText(current + char).width > width && current) { result.push(current.trimEnd()); current = char.trimStart(); }
        else current += char;
      }
      result.push(current.trimEnd());
    }
    return result;
  }
  function textBlock(ctx, value, x, y, w, h, size, color, weight = 400, min = 14, spacing = 1.5) {
    let lines = [], chosen = size;
    for (; chosen >= min; chosen -= .5) {
      font(ctx, chosen, weight); lines = wrapText(ctx, value, w);
      if (lines.length * chosen * spacing <= h) break;
    }
    chosen = Math.max(chosen, min); font(ctx, chosen, weight); lines = wrapText(ctx, value, w);
    const fits = lines.length * chosen * spacing <= h + .1;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    lines.forEach((l, i) => text(ctx, l, x, y + i * chosen * spacing, chosen, color, weight));
    ctx.restore(); return fits;
  }
  function parseMajors(raw) {
    return String(raw).split(/\n/).map(x => x.trim()).filter(Boolean).map(x => {
      const parts = x.split(/[|｜]/); return { cn: parts.shift().trim(), en: parts.join('|').trim() };
    });
  }
  function drawWaves(ctx, p) {
    ctx.strokeStyle = mix(p.accent, '#FFFFFF', .9); ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(-20, 93 + i * 16);
      ctx.bezierCurveTo(265, 30 + i * 19, 375, 177 + i * 12, 700, 82 + i * 16);
      ctx.bezierCurveTo(895, 20 + i * 13, 945, 43 + i * 17, 1110, 110 + i * 17); ctx.stroke();
    }
    ctx.strokeStyle = mix(p.accent, '#FFFFFF', .76);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(735 + i * 15, 1566 + i * 21);
      ctx.bezierCurveTo(865 + i * 12, 1552 + i * 13, 885, 1445 + i * 32, 1110, 1427 + i * 25); ctx.stroke();
    }
  }
  function cover(ctx, img, x, y, w, h, scale = 1, px = 50, py = 50) {
    const factor = Math.max(w / img.width, h / img.height) * scale;
    const dw = img.width * factor, dh = img.height * factor;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.drawImage(img, x - (dw - w) * px / 100, y - (dh - h) * py / 100, dw, dh); ctx.restore();
  }
  function drawBlendedImage(ctx, img, s, density) {
    // Keep the existing crop anchor so saved drafts retain their positioning.
    // The photograph can bleed beyond that frame; transparent masks blend it
    // into the same poster background, including behind the adjacent text.
    const top = 550, bottom = HEIGHT, h = bottom - top;
    const factor = Math.max(IMAGE_FRAME.width / img.width, IMAGE_FRAME.height / img.height) * s.imageZoom;
    const w = img.width * factor, imageHeight = img.height * factor;
    const x = IMAGE_FRAME.x + (IMAGE_FRAME.width - w) * s.imageX / 100;
    const y = IMAGE_FRAME.y + (IMAGE_FRAME.height - imageHeight) * s.imageY / 100;
    const layer = document.createElement('canvas');
    layer.width = Math.ceil(WIDTH * density); layer.height = Math.ceil(h * density);
    const photo = layer.getContext('2d'); photo.scale(density, density); photo.translate(0, -top);
    photo.drawImage(img, x, y, w, imageHeight);
    // A reduced image may end above the footer. Continue its lower background
    // to the page edge, cross-fading the tail so the product keeps its shape.
    if (y + imageHeight < bottom) {
      const tailStart = y + imageHeight * .8;
      const tail = document.createElement('canvas'); tail.width = layer.width; tail.height = layer.height;
      const continuation = tail.getContext('2d'); continuation.scale(density, density); continuation.translate(0, -top);
      continuation.drawImage(img, 0, img.height * .8, img.width, img.height * .2, x, tailStart, w, bottom - tailStart);
      continuation.globalCompositeOperation = 'destination-in';
      const join = continuation.createLinearGradient(0, tailStart, 0, y + imageHeight * .96);
      join.addColorStop(0, '#0000'); join.addColorStop(1, '#000');
      continuation.fillStyle = join; continuation.fillRect(0, top, WIDTH, h);
      photo.drawImage(tail, 0, top, WIDTH, h); tail.width = 0; tail.height = 0;
    }
    photo.globalCompositeOperation = 'destination-in';
    function applyMask(gradient) { photo.fillStyle = gradient; photo.fillRect(0, top, WIDTH, h); }
    const vertical = photo.createLinearGradient(0, top, 0, bottom);
    for (const [at, opacity] of [[550, 0], [610, .04], [700, .15], [780, .65], [850, 1], [1040, 1], [1110, .8], [1170, .34], [1240, .28], [1388, .26], [1500, .25], [1650, .24]]) {
      vertical.addColorStop((at - top) / h, `rgba(0,0,0,${opacity})`);
    }
    applyMask(vertical);
    // Shrinking exposes the image's own edges. Feather those too, so a smaller
    // photograph never becomes an opaque rectangle sitting on the poster.
    if (x > 0 || x + w < WIDTH) {
      const sideFade = Math.min(85 / w, .18);
      const horizontal = photo.createLinearGradient(x, 0, x + w, 0);
      horizontal.addColorStop(0, x > 0 ? '#0000' : '#000');
      horizontal.addColorStop(sideFade, '#000'); horizontal.addColorStop(1 - sideFade, '#000');
      horizontal.addColorStop(1, x + w < WIDTH ? '#0000' : '#000');
      applyMask(horizontal);
    }
    if (y > top) {
      const edges = photo.createLinearGradient(0, y, 0, y + Math.min(120, imageHeight * .2));
      edges.addColorStop(0, '#0000'); edges.addColorStop(1, '#000');
      applyMask(edges);
    }
    ctx.drawImage(layer, 0, top, WIDTH, h);
    layer.width = 0; layer.height = 0;
  }
  async function drawPoster(canvas, s, scale = 1, draft = false) {
    const t = trackFor(s), p = palette(s), warnings = [];
    const [brand, mark, visual] = await Promise.all([
      getImage('assets/conrad-brand.png'), getImage(`assets/icon-${t.id}.png`),
      s.imageData ? getImage(s.imageData) : s.imageMode === 'template' ? getImage('assets/template-visual.png') : Promise.resolve(null)
    ]);
    canvas.width = Math.round(WIDTH * scale); canvas.height = Math.round(HEIGHT * scale);
    const ctx = canvas.getContext('2d'); ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT); bg.addColorStop(0, '#FFFFFF'); bg.addColorStop(1, p.light);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.save(); ctx.translate(0, -30);
    if (visual) {
      if (!s.imageData && s.imageMode === 'template') {
        ctx.drawImage(visual, 0, 0, WIDTH, 1845);
        const top = ctx.createLinearGradient(0, 0, 0, 922);
        top.addColorStop(0, '#FFFFFF'); top.addColorStop(.76, '#FFFFFF'); top.addColorStop(.86, '#FFFFFFF7'); top.addColorStop(1, '#FFFFFF00');
        ctx.fillStyle = top; ctx.fillRect(0, 0, WIDTH, 922);
        const bot = ctx.createLinearGradient(0, 1070, 0, 1650);
        bot.addColorStop(0, '#FFFFFF00'); bot.addColorStop(.21, '#FFFFFFC2'); bot.addColorStop(.46, '#FFFFFFED'); bot.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = bot; ctx.fillRect(0, 1070, WIDTH, 580);
        if (t.id !== 'water') { ctx.fillStyle = mix(p.accent, '#FFFFFF', .92) + '40'; ctx.fillRect(0, 780, WIDTH, 420); }
      } else {
        if (s.softBlend) drawBlendedImage(ctx, visual, s, scale);
        else cover(ctx, visual, IMAGE_FRAME.x, IMAGE_FRAME.y, IMAGE_FRAME.width, IMAGE_FRAME.height, s.imageZoom, s.imageX, s.imageY);
      }
    } else {
      const vg = ctx.createLinearGradient(0, 780, WIDTH, 1220); vg.addColorStop(0, '#FFFFFF'); vg.addColorStop(.5, p.light); vg.addColorStop(1, '#FFFFFF');
      ctx.fillStyle = vg; ctx.fillRect(0, 780, WIDTH, 440);
      ctx.strokeStyle = p.line; ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(650, 990, 110 + i * 40, 70 + i * 24, -.3, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = .2; ctx.drawImage(mark, 430, 860, 220, 220); ctx.globalAlpha = 1;
      text(ctx, '上传项目主视觉', 540, 1116, 19, mix(p.accent, '#FFFFFF', .5), 500, 'center');
    }
    ctx.restore();
    // Anchor the fade to the poster so the white footer reaches the canvas edge.
    const fade = ctx.createLinearGradient(0, 1020, 0, 1180);
    fade.addColorStop(0, '#FFFFFF00');
    fade.addColorStop(.75, '#FFFFFFDF');
    fade.addColorStop(1, '#FFFFFF');
    ctx.fillStyle = fade; ctx.fillRect(0, 1020, WIDTH, HEIGHT - 1020);
    drawWaves(ctx, p);
    if (s.showWatermark) {
      ctx.save(); ctx.globalAlpha = t.id === 'water' ? .14 : .065;
      ctx.drawImage(mark, 724, 102, 291, 291); ctx.restore();
    }
    rr(ctx, 60, 37, 59, 4, 2, p.accent); rr(ctx, 126, 37, 17, 4, 2, mix(p.accent, '#FFFFFF', .4));
    fittedLine(ctx, s.season, 60, 51, 540, 35, p.dark, 750);
    ctx.drawImage(brand, 708.75, 32.92, 312, 73.67);
    if (!textBlock(ctx, s.competitionTitle, 60, 103, 960, 90, 69, p.dark, 850, 34, 1.2)) warnings.push('赛事主标题过长');
    const cardWidth = Math.max(310, Math.min(648, ctx.measureText(s.competitionTitle).width));
    const trophy = new Path2D('M5 3 H17 V7 Q17 13 11 15 Q5 13 5 7 Z M5 5 H2 V7 Q2 11 7 11 M17 5 H20 V7 Q20 11 15 11 M11 15 V19 M7 20 H15');
    for (let i = 0; i < 3; i++) {
      const y = 202 + i * 44;
      rr(ctx, 60, y, cardWidth, 38, 7, p.light + 'E8', p.line);
      ctx.save(); ctx.translate(72, y + 8); ctx.strokeStyle = p.accent;
      ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(trophy); ctx.restore();
      const achievement = String(s.achievements[i] || '').trim().replace(/\s*\n\s*/g, '  ');
      const lead = achievement.match(/^连续.{2}/u)?.[0] || '';
      let size = 19;
      font(ctx, size, 700);
      while (size > 11 && ctx.measureText(achievement).width > cardWidth - 54) font(ctx, --size, 700);
      if (ctx.measureText(achievement).width > cardWidth - 54) warnings.push('成绩卡片文字过长');
      ctx.save(); ctx.beginPath(); ctx.rect(100, y, cardWidth - 52, 38); ctx.clip();
      text(ctx, lead, 100, y + (38 - size) / 2, size, p.mid, 700);
      text(ctx, achievement.slice(lead.length), 100 + ctx.measureText(lead).width, y + (38 - size) / 2, size, p.dark, 700);
      ctx.restore();
    }
    function baseline(label, x, y, width, size, color, weight, align = 'left') {
      font(ctx, size, weight);
      while (size > 12 && ctx.measureText(label).width > width) { size--; font(ctx, size, weight); }
      ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
      ctx.fillText(label, x, y, width);
      return Math.min(width, ctx.measureText(label).width);
    }
    const team = s.projectName || '你的课题名称';
    const teamX = s.releaseLabel ? 220 : 60;
    const teamWidth = 790 - teamX;
    let teamSize = 65, teamLines;
    do {
      font(ctx, teamSize, 850);
      teamLines = wrapText(ctx, team, teamWidth);
      if (teamLines.length === 1 || (teamSize <= 38 && teamLines.length * teamSize * 1.2 <= 118) || teamSize <= 19) break;
      teamSize--;
    } while (true);
    ctx.textBaseline = 'alphabetic';
    const metrics = teamLines.map(line => ctx.measureText(line));
    const bottom = 454;
    const lastBaseline = bottom - metrics.at(-1).actualBoundingBoxDescent;
    const firstBaseline = lastBaseline - (teamLines.length - 1) * teamSize * 1.2;
    const top = firstBaseline - metrics[0].actualBoundingBoxAscent;
    teamLines.forEach((line, i) => baseline(line, teamX, firstBaseline + i * teamSize * 1.2, teamWidth, teamSize, p.dark, 850));
    if (s.releaseLabel) {
      const gradient = ctx.createLinearGradient(60, 0, 205, 0);
      gradient.addColorStop(0, p.mid); gradient.addColorStop(1, p.accent);
      rr(ctx, 60, top, 145, bottom - top, 5, gradient);
      font(ctx, 25, 750);
      const label = ctx.measureText(s.releaseLabel);
      ctx.textAlign = 'center'; ctx.fillStyle = '#FFFFFF';
      ctx.fillText(s.releaseLabel, 132.5, (top + bottom + label.actualBoundingBoxAscent - label.actualBoundingBoxDescent) / 2, 130);
    }
    baseline(t.name, 1020, bottom - 20, 220, 20, p.dark, 750, 'right');
    font(ctx, 11.5, 750);
    baseline(t.code, 1020, bottom - ctx.measureText(t.code).actualBoundingBoxDescent, 230, 11.5, p.accent, 750, 'right');
    ctx.save(); ctx.translate(0, -30);
    if (!textBlock(ctx, s.subtitle, 60, 516, 960, 46, 22, p.mid, 750, 16, 1.35)) warnings.push('研究方向过长，请缩短');
    function section(title, y) { rr(ctx, 60, y + 4, 4, 22, 1, p.accent); text(ctx, title, 75, y, 22, p.dark, 750); }
    section('课题介绍', 574);
    if (!textBlock(ctx, s.description || '填写课题背景、核心方案与预期价值，让创新从这里开始。', 60, 612, 960, 158, s.bodySize, p.body, 400, 14, 1.5)) warnings.push('课题介绍超出模板范围，请精简文字');
    section('适配专业', 1171);
    const majors = parseMajors(s.majors), visible = majors.slice(0, 12);
    if (majors.length > 12) warnings.push('适配专业最多支持 12 个');
    const rows = Math.max(1, Math.ceil(visible.length / 3)), rowHeight = Math.min(45, 141 / rows);
    if (rows > 0) { line(ctx, 379, 1226, 379, 1354, p.line); line(ctx, 706, 1226, 706, 1354, p.line); }
    visible.forEach((major, i) => {
      const col = Math.floor(i / rows), row = i % rows, x = [74, 400, 728][col], y = 1220 + row * rowHeight;
      text(ctx, '•', x - 2, y + 1, 17, p.accent, 600);
      if (!fittedLine(ctx, major.cn, x + 14, y, 276, rows > 3 ? 16.5 : 18, p.dark, 650, 'left', 12)) warnings.push('专业名称过长');
      fittedLine(ctx, major.en, x + 14, y + 24, 278, rows > 3 ? 11 : 13.5, mix(p.body, '#FFFFFF', .16), 400, 'left', 8);
    });
    line(ctx, 60, 1388, 1020, 1388, mix(p.accent, '#FFFFFF', .88));
    section('赛季队伍集训时间轴', 1405);
    text(ctx, 'PROGRAM TIMELINE', 1017, 1411, 14, mix(p.body, '#FFFFFF', .27), 750, 'right');
    line(ctx, 76, 1447, 998, 1447, p.line, 1.2);
    [76, 464].forEach(x => { ctx.beginPath(); ctx.arc(x, 1447, 3.5, 0, Math.PI * 2); ctx.fillStyle = p.accent; ctx.fill(); });
    [['01', 80, '线上基础课程', 'Online Foundation', '工程基础 + 商业基础模块', 'Engineering & Business Fundamentals', s.onlineTime], ['02', 468, '线下项目孵化', 'Offline Incubation', '项目调研、设计、开发与测试', s.bootcamp, s.offlineTime]].forEach(([n, x, cn, en, desc, enDesc, when]) => {
      text(ctx, n, x, 1450, 44, p.accent, 800); text(ctx, cn, x + 80, 1456, 22, p.dark, 750);
      text(ctx, en, x + 80, 1486, 18, mix(p.body, '#FFFFFF', .12), 700);
      fittedLine(ctx, desc, x - 4, 1552, 294, 17, p.body, 400);
      baseline(enDesc, x - 4, 1612, 190, 13, mix(p.body, '#FFFFFF', .22), 400);
      baseline(when || '待定', x + 322, 1612, 130, 26, p.accent, 750, 'right');
    });
    rr(ctx, 903, 1470, 114, 114, 4, '#FFFFFF', p.line);
    text(ctx, '二维码', 960, 1518, 14, p.body, 450, 'center');
    text(ctx, '扫码了解更多', 1017, 1597, 16, p.dark, 650, 'right');
    ctx.restore();
    line(ctx, 60, 1623, 1020, 1623, p.line);
    if (draft) return warnings;
    return [...new Set(warnings)];
  }
  function fitPreview() {
    const stage = $('#preview-stage'), wrap = $('#poster-wrap');
    const style = getComputedStyle(stage), padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight), padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const fitted = Math.max(.08, Math.min((stage.clientWidth - padX) / WIDTH, (stage.clientHeight - padY) / HEIGHT));
    const ratio = zoom ?? fitted;
    wrap.style.width = `${Math.round(WIDTH * ratio)}px`; wrap.style.height = `${Math.round(HEIGHT * ratio)}px`;
    $('#zoom-value').textContent = `${Math.round(ratio * 100)}%`;
  }
  function updateTheme() {
    const t = trackFor(state), light = mix(t.color, '#FFFFFF', .95);
    document.documentElement.style.setProperty('--track', t.color);
    document.documentElement.style.setProperty('--track-soft', light);
    $$('.track-option').forEach(el => { el.setAttribute('aria-checked', String(el.dataset.track === t.id)); el.tabIndex = el.dataset.track === t.id ? 0 : -1; });
    $('#palette-label').textContent = t.colorName; $('#palette-code').textContent = t.color;
    $('#caption-theme').textContent = t.name;
  }
  function updateCounts() {
    $('#name-counter').textContent = `${state.projectName.length} / 40`;
    $('#description-counter').textContent = `${state.description.length} / 900`;
    $('#image-zoom-value').textContent = `${Number(state.imageZoom).toFixed(2).replace(/0$/, '')}×`;
    $('#image-x-value').textContent = `${state.imageX}%`;
    $('#image-y-value').textContent = `${state.imageY}%`;
    $('#body-size-value').textContent = `${state.bodySize}px`;
  }
  function syncForm() {
    $$('[data-field]').forEach(el => {
      const v = state[el.dataset.field];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = v ?? '';
    });
    $$('#achievement-fields textarea').forEach((el, i) => el.value = state.achievements[i]);
    $('#image-thumb').src = state.imageData || 'assets/template-visual.png';
    $('#image-thumb').hidden = state.imageMode === 'empty' && !state.imageData;
    $('#image-filename').textContent = state.imageData ? state.imageName || '已上传主视觉' : state.imageMode === 'empty' ? '添加项目图片' : '模板原始主视觉';
    $('#image-detail').textContent = '点击或拖拽图片替换 · 最大 15 MB';
    $('#image-controls').hidden = !state.imageData;
    updateTheme(); updateCounts();
  }
  function requestRender() {
    if (readyExport) { URL.revokeObjectURL(readyExport.url); readyExport = null; }
    const generation = ++renderGeneration, snapshot = clone(state);
    renderPromise = (async () => {
      const temporary = document.createElement('canvas');
      const warnings = await drawPoster(temporary, snapshot, 2);
      if (generation !== renderGeneration) return;
      poster.width = temporary.width; poster.height = temporary.height; poster.getContext('2d').drawImage(temporary, 0, 0);
      lastWarnings = warnings;
      $('#description-counter').style.color = warnings.some(x => x.includes('课题介绍')) ? '#D45C50' : '';
      const caption = $('.preview-caption');
      caption.title = warnings.join('；') || '海报内容已同步';
      let warning = $('#layout-warning');
      if (warnings.length && !warning) { warning = document.createElement('div'); warning.id = 'layout-warning'; warning.className = 'layout-warning'; $('.preview-header').after(warning); }
      if (warning) { warning.hidden = !warnings.length; warning.textContent = warnings.join('；'); }
      poster.setAttribute('aria-label', `${trackFor(snapshot).name}赛道海报：${snapshot.projectName || '未命名课题'}，${snapshot.offlineTime}。${warnings.join('；')}`);
      fitPreview();
    })();
    renderPromise.catch(reportError); return renderPromise;
  }
  function changed() { updateCounts(); requestRender(); scheduleSave(); }
  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('visible');
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3500);
  }
  function reportError(err) { toast(err?.message || '操作未完成，请重试。'); }
  function setSaveStatus(message, error = false) {
    $('#save-status').innerHTML = icon(error ? 'help' : 'check') + esc(message);
    $('#save-status').style.color = error ? '#CE6C62' : '';
  }
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('此浏览器不支持草稿保存，请下载工程文件。')); return; }
      const req = indexedDB.open('conrad-poster-studio', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('drafts', { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(new Error('无法访问草稿存储，请使用下载工程功能备份。'));
    });
  }
  function dbOperation(mode, action) {
    return new Promise((resolve, reject) => {
      if (!db) return reject(new Error('草稿存储不可用，请下载工程文件保存。'));
      const tx = db.transaction('drafts', mode), store = tx.objectStore('drafts');
      const req = action(store); let result;
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result); tx.onerror = tx.onabort = () => reject(new Error('草稿未能保存，可能存储空间不足。请下载工程文件备份。'));
    });
  }
  async function listDrafts() { return (await dbOperation('readonly', s => s.getAll())).sort((a, b) => b.updatedAt - a.updatedAt); }
  async function updateDraftCount() { if (db) $('#draft-count').textContent = (await listDrafts()).length; }
  function newId() { return window.crypto?.randomUUID ? crypto.randomUUID() : `poster-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  function rememberActive() { try { localStorage.setItem('conrad-active-draft', activeId); } catch (_) {} }
  async function saveDraft(announce = false) {
    clearTimeout(saveTimer); if (!initialized) return;
    const id = activeId, snapshot = clone(state);
    setSaveStatus('正在保存…');
    try {
      const small = document.createElement('canvas'); await drawPoster(small, snapshot, .2, true);
      await dbOperation('readwrite', s => s.put({ id, state: snapshot, thumbnail: small.toDataURL('image/jpeg', .7), updatedAt: Date.now() }));
      if (id === activeId) { rememberActive(); setSaveStatus('已保存到此浏览器'); }
      await updateDraftCount(); if (announce) toast('草稿已保存到当前浏览器');
    } catch (err) { setSaveStatus('草稿未保存', true); if (announce) throw err; }
  }
  function scheduleSave() { clearTimeout(saveTimer); setSaveStatus('有待保存的修改'); saveTimer = setTimeout(() => saveDraft().catch(reportError), 850); }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('工程文件格式不正确。');
    const value = clone(DEFAULT), limits = { projectName: 40, subtitle: 120, description: 900, majors: 1000, onlineTime: 30, offlineTime: 50, bootcamp: 65, season: 24, competitionTitle: 28, releaseLabel: 12, imageName: 150 };
    for (const [key, limit] of Object.entries(limits)) if (typeof raw[key] === 'string') value[key] = raw[key].slice(0, limit);
    if (value.competitionTitle === '康莱德创新挑战') value.competitionTitle = DEFAULT.competitionTitle;
    if (value.releaseLabel === '课题发布') value.releaseLabel = DEFAULT.releaseLabel;
    if (TRACKS.some(t => t.id === raw.track)) value.track = raw.track;
    if (typeof raw.imageData === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(raw.imageData) && raw.imageData.length < 28_000_000) value.imageData = raw.imageData;
    if (['template', 'upload', 'empty'].includes(raw.imageMode)) value.imageMode = raw.imageMode;
    for (const [key, min, max] of [['imageZoom', MIN_IMAGE_ZOOM, MAX_IMAGE_ZOOM], ['imageX', 0, 100], ['imageY', 0, 100], ['bodySize', 17, 23]]) if (Number.isFinite(Number(raw[key]))) value[key] = Math.min(max, Math.max(min, Number(raw[key])));
    for (const key of ['showWatermark', 'softBlend']) if (typeof raw[key] === 'boolean') value[key] = raw[key];
    if (Array.isArray(raw.achievements) && raw.achievements.length === 3) value.achievements = raw.achievements.map(x => String(x).slice(0, 150));
    return value;
  }
  function showDialog(mode, title, eyebrow = '') {
    dialogMode = mode; restoreFocus = document.activeElement;
    $('#dialog-title').textContent = title; $('#dialog-eyebrow').textContent = eyebrow;
    dialog.style.width = mode === 'export' ? 'min(700px, calc(100vw - 36px))' : '';
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog() { dialog.close(); restoreFocus?.focus?.(); dialogMode = ''; }
  async function showTemplates(mode = 'templates') {
    $('#dialog-body').innerHTML = `<p class="dialog-description">${mode === 'new' ? '选择一个赛道，开始制作新的课题海报。当前海报会先保存为草稿。' : '五个赛道，共用你确定的年度版式。选择模板即可将当前海报切换为对应主题。'}</p><div class="template-grid">${TRACKS.map(t => `<article class="template-card" style="--card-accent:${t.color}"><canvas data-template-preview="${t.id}" width="216" height="330" aria-label="${t.name}海报模板"></canvas><strong><span class="template-color"></span>${t.name}</strong><button class="btn" data-action="use-template" data-track="${t.id}" data-new="${mode === 'new'}">${mode === 'new' ? '新建海报' : '使用此模板'}</button></article>`).join('')}</div><p class="source-note">版式：你提供的「27年海报模板.pdf」。橙、紫、绿、红配色取自<a href="https://conrad.spacecenter.org/wp-content/uploads/2025/09/2025-2026-Conrad-Challenge-China-Student-Guide.pdf" target="_blank" rel="noopener">康莱德官方学生手册的赛道标识</a>；水域蓝取自上传模板中的水滴标识。文字使用同色系深色，提高可读性。</p>`;
    showDialog(mode, mode === 'new' ? '从一个新课题开始' : '为每个赛道，找到它的颜色', 'FIVE TRACKS · ONE STANDARD');
    await Promise.all(TRACKS.map(t => {
      const s = clone(DEFAULT); Object.assign(s, { track: t.id, projectName: '你的课题名称', subtitle: '在这里，开启下一个创新课题', description: '用科技与商业的力量，回应真实世界的问题。填写课题背景、研究方案与预期价值，生成属于这个课题的年度海报。', majors: t.majors, imageMode: 'empty' });
      const cv = $(`[data-template-preview="${t.id}"]`); return cv ? drawPoster(cv, s, .3) : Promise.resolve();
    }));
  }
  async function useTemplate(id, createNew = false) {
    if (!TRACKS.some(t => t.id === id)) return;
    if (createNew) {
      await saveDraft(); activeId = newId();
      state = { ...clone(DEFAULT), track: id, projectName: '', subtitle: '', description: '', majors: TRACKS.find(t => t.id === id).majors, imageMode: 'empty' };
      rememberActive();
    } else state.track = id;
    closeDialog(); syncForm(); await requestRender(); scheduleSave();
    toast(createNew ? '新海报已创建，可以填写课题内容了' : `已应用${trackFor(state).name}模板`);
    if (createNew) { switchTab('content'); $('#projectName').focus(); }
  }
  function switchTab(which) {
    $$('.tab').forEach(btn => { const selected = btn.dataset.tab === which; btn.classList.toggle('active', selected); btn.setAttribute('aria-selected', String(selected)); btn.tabIndex = selected ? 0 : -1; });
    $('#content-editor').hidden = which !== 'content'; $('#style-editor').hidden = which !== 'style'; $('#editor-scroll').scrollTop = 0;
  }
  async function showDrafts() {
    await saveDraft(); const drafts = db ? await listDrafts() : [];
    const body = $('#dialog-body');
    body.innerHTML = `<p class="dialog-description">课题与图片保存在当前浏览器。下载工程文件后，也可以在其他设备继续编辑。</p>${drafts.length ? `<div class="draft-grid">${drafts.map(d => `<article class="draft-card"><button class="draft-thumbnail" style="border:0;width:100%" data-action="open-draft" data-id="${esc(d.id)}" aria-label="编辑${esc(d.state.projectName || '未命名课题')}"><img src="${esc(d.thumbnail)}" alt="海报缩略图"></button><div class="draft-info"><h3>${esc(d.state.projectName || '未命名课题')}${d.id === activeId ? ' · 当前' : ''}</h3><p>${esc(trackFor(d.state).name)}<br>${new Date(d.updatedAt).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p><div class="draft-actions"><button class="btn" data-action="open-draft" data-id="${esc(d.id)}">继续编辑</button><button class="icon-btn" data-action="copy-draft" data-id="${esc(d.id)}" title="复制海报" aria-label="复制海报">${icon('copy')}</button><button class="icon-btn" data-action="delete-draft" data-id="${esc(d.id)}" title="删除海报" aria-label="删除海报">${icon('trash')}</button></div></div></article>`).join('')}</div>` : `<div class="empty-state">${icon('folder')}还没有保存的海报<br>创建一个新课题，开始你的第一张海报。</div>`}`;
    showDialog('drafts', '每个课题，都在这里', 'MY POSTERS');
  }
  async function openDraft(id) {
    const draft = await dbOperation('readonly', s => s.get(id)); if (!draft) throw new Error('这份草稿已不存在。');
    state = normalize(draft.state); activeId = id; rememberActive(); syncForm(); closeDialog(); await requestRender(); setSaveStatus('已载入本地草稿');
  }
  async function copyDraft(id) {
    const draft = await dbOperation('readonly', s => s.get(id)); if (!draft) return;
    const copied = normalize(draft.state); copied.projectName = ((copied.projectName || '未命名课题') + ' 副本').slice(0, 40);
    const cv = document.createElement('canvas'); await drawPoster(cv, copied, .2);
    await dbOperation('readwrite', s => s.put({ id: newId(), state: copied, thumbnail: cv.toDataURL('image/jpeg', .7), updatedAt: Date.now() }));
    await showDrafts(); toast('海报副本已创建');
  }
  async function confirmDelete(id) {
    const draft = await dbOperation('readonly', s => s.get(id)); if (!draft) return;
    $('#dialog-body').innerHTML = `<p class="confirm-copy">删除「${esc(draft.state.projectName || '未命名课题')}」的本地草稿？已下载的图片与工程文件不受影响。</p><div class="dialog-footer"><button class="btn" data-action="drafts">保留草稿</button><button class="btn btn-danger" data-action="delete-confirm" data-id="${esc(id)}">删除草稿</button></div>`;
    showDialog('delete', '删除这份草稿', 'LOCAL DRAFT');
  }
  function requiredErrors() {
    const errors = [];
    if (!state.projectName.trim()) errors.push('课题名称');
    if (!state.description.trim()) errors.push('课题介绍');
    if (!state.majors.trim()) errors.push('适配专业');
    if (!state.offlineTime.trim()) errors.push('线下孵化时间');
    if (!state.imageData && state.imageMode === 'empty') errors.push('项目主视觉');
    return errors;
  }
  async function showExport() {
    await renderPromise;
    const missing = requiredErrors(), errors = [...(missing.length ? [`请补齐：${missing.join('、')}`] : []), ...lastWarnings];
    $('#dialog-body').innerHTML = `<div class="export-layout"><div class="export-image"><img src="${poster.toDataURL('image/jpeg', .8)}" alt="即将导出的海报"></div><div><p class="dialog-description">画布已就绪，选择适合你的导出方式。</p><span class="export-label">文件格式</span><div class="format-options"><button class="choice ${exportFormat === 'png' ? 'active' : ''}" data-action="format" data-format="png"><strong>PNG 图片</strong><small>分享、社群与屏幕展示</small></button><button class="choice ${exportFormat === 'pdf' ? 'active' : ''}" data-action="format" data-format="pdf"><strong>PDF 文档</strong><small>高清图片版 · 便于传阅</small></button></div><span class="export-label">导出精度</span><div class="scale-options">${[1, 2, 3].map(n => `<button class="choice ${exportScale === n ? 'active' : ''}" data-action="scale" data-scale="${n}"><strong>${n === 1 ? '标准' : n === 2 ? '高清' : '超清'} ${n}×</strong><small>${WIDTH * n} × ${HEIGHT * n}</small></button>`).join('')}</div><div class="export-summary"><span>赛道主题</span><strong>${esc(trackFor(state).name)}</strong></div>${errors.length ? `<div class="export-errors">${errors.map(esc).join('<br>')}</div>` : ''}<button class="btn btn-primary full-width" data-action="download" ${errors.length ? 'disabled' : ''}>${icon('down')}<span id="download-label">下载${exportFormat.toUpperCase()}海报</span></button><p class="export-note">无水印 · 中文字体已内置<br>PDF 使用与预览一致的高清图像。可编辑内容请下载工程文件。</p></div></div>`;
    if (readyExport && !errors.length) {
      const result = document.createElement('p'); result.className = 'download-ready';
      const link = document.createElement('a'); link.href = readyExport.url; link.download = readyExport.name; link.textContent = `${readyExport.format.toUpperCase()} 文件已就绪 · 再次下载`;
      result.append(link); $('#dialog-body .export-note').before(result);
    }
    showDialog('export', '让好课题，正式亮相', 'EXPORT YOUR POSTER');
  }
  function filename(extension) { return `${state.projectName || '康莱德海报'}-${trackFor(state).name}`.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').slice(0, 100) + '.' + extension; }
  function downloadBlob(blob, name, retain = false) {
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove(); if (!retain) setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return url;
  }
  function canvasBlob(cv, type = 'image/png', quality = .96) {
    return new Promise((resolve, reject) => cv.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片生成失败，请降低导出精度后重试。')), type, quality));
  }
  function fileDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('文件生成失败，请重试。')); reader.readAsDataURL(blob);
    });
  }
  async function createPDF(cv) {
    const jpg = new Uint8Array(await (await canvasBlob(cv, 'image/jpeg', .97)).arrayBuffer());
    const encoder = new TextEncoder(), chunks = [], offsets = [0]; let length = 0;
    const add = data => { const b = typeof data === 'string' ? encoder.encode(data) : data; chunks.push(b); length += b.length; };
    const object = (num, content) => { offsets[num] = length; add(`${num} 0 obj\n${content}\nendobj\n`); };
    add('%PDF-1.4\n'); add(new Uint8Array([37, 226, 227, 207, 211, 10]));
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${WIDTH} ${HEIGHT}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    offsets[4] = length; add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`); add(jpg); add('\nendstream\nendobj\n');
    const stream = `q\n${WIDTH} 0 0 ${HEIGHT} 0 0 cm\n/Im0 Do\nQ\n`;
    object(5, `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`);
    const xref = length; add('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) add(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  async function downloadPoster() {
    if (busy) return;
    if (requiredErrors().length || lastWarnings.length) { await showExport(); return; }
    busy = true; const button = $('[data-action="download"]'); if (button) { button.disabled = true; button.innerHTML = '<span class="spinner small-spinner"></span>正在生成高清海报…'; }
    try {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const cv = document.createElement('canvas'), warnings = await drawPoster(cv, clone(state), exportScale);
      if (warnings.length) throw new Error(warnings.join('；'));
      const blob = exportFormat === 'pdf' ? await createPDF(cv) : await canvasBlob(cv);
      if (readyExport) URL.revokeObjectURL(readyExport.url);
      const name = filename(exportFormat);
      let url;
      if (exportFormat === 'pdf') {
        url = await fileDataURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = name;
        document.body.append(link); link.click(); link.remove();
      } else url = downloadBlob(blob, name, true);
      readyExport = { url, name, format: exportFormat }; await saveDraft(); toast(`${exportFormat.toUpperCase()} 海报已生成，下载已开始`);
    } finally { busy = false; if (dialog.open && dialogMode === 'export') await showExport(); }
  }
  function showPaste() {
    const example = '赛道：水与可持续发展\n课题名称：MIRA 蓝域\n研究方向：基于自主移动机器人的水质测绘研究\n课题介绍：在这里粘贴项目背景、核心方案和预期价值，可分为多个段落。\n适配专业：环境科学、海洋科学、机器人工程\n线下孵化时间：2027年7月—8月';
    $('#dialog-body').innerHTML = `<p class="dialog-description">把准备好的资料粘贴在这里，按字段名称自动填入。图片可在编辑器中单独上传。</p><label class="field"><span class="sr-only">课题资料</span><textarea class="paste-area" id="paste-data" placeholder="${esc(example)}" maxlength="12000"></textarea></label><p class="field-tip">支持赛道、课题名称、研究方向、课题介绍、适配专业、线上时间、线下孵化时间；每个字段从新行开始。</p><div class="dialog-footer"><button class="btn" data-action="paste-example">填入格式示例</button><button class="btn btn-primary" data-action="apply-paste">识别并填入</button></div>`;
    showDialog('paste', '把课题资料，一次填好', 'QUICK INPUT');
    $('#paste-data').dataset.example = example;
  }
  function resolveTrack(value) {
    const normalized = value.toLowerCase().replace(/[\s&与和·-]/g, '');
    const aliases = { aerospace: ['航空', '航天', 'aerospace', 'aviation'], cyber: ['互联网', '网络', '科技安全', 'cyber', 'security'], energy: ['能源', '环境', 'energy', 'environment'], health: ['健康', '营养', 'health', 'nutrition'], water: ['水', 'water', '可持续发展'] };
    return TRACKS.find(t => aliases[t.id].some(a => normalized.includes(a)))?.id;
  }
  function parseInput(raw) {
    if (!raw.trim()) throw new Error('请先粘贴课题资料。');
    const aliases = { '赛道':'track', '所属赛道':'track', '课题名称':'projectName', '项目名称':'projectName', '课题名':'projectName', '研究方向':'subtitle', '副标题':'subtitle', '课题介绍':'description', '项目介绍':'description', '适配专业':'majors', '推荐专业':'majors', '线上时间':'onlineTime', '线上基础课程':'onlineTime', '线下孵化时间':'offlineTime', '线下时间':'offlineTime', '线下项目孵化':'offlineTime', '队伍集训时间':'offlineTime', '产品孵化时间':'offlineTime', '孵化时间':'offlineTime', '赛季':'season' };
    const result = {}; let key = '';
    for (const line of raw.replace(/\r/g, '').split('\n')) {
      const match = line.match(/^\s*(?:[-*•]\s*)?([^:：]{2,12})\s*[:：]\s*(.*)$/);
      if (match && aliases[match[1].trim()]) { key = aliases[match[1].trim()]; result[key] = match[2].trim(); }
      else if (key) result[key] += '\n' + line;
    }
    if (!Object.keys(result).length) throw new Error('没有找到可识别字段，请参考格式示例。');
    for (const k of Object.keys(result)) result[k] = result[k].trim();
    if ('track' in result) { const id = resolveTrack(result.track); if (!id) throw new Error('未识别赛道，请填写康莱德五个赛道之一。'); result.track = id; }
    if (result.majors && !result.majors.includes('|')) result.majors = result.majors.replace(/[，、；;]/g, '\n');
    const merged = { ...state, ...result }; return { value: normalize(merged), count: Object.keys(result).length };
  }
  function showHelp() {
    $('#dialog-body').innerHTML = `<p class="dialog-description">从一份课题资料，到一张可以直接分享的年度海报。</p><div class="help-steps"><div class="help-step">${icon('palette')}<h3>选择赛道</h3><p>五个主题自动调整标题、背景色块、装饰线和水印，保持年度模板统一。</p></div><div class="help-step">${icon('text')}<h3>填写课题内容</h3><p>输入名称、介绍、适配专业和孵化时间，也可用「粘贴课题资料」一次填入。</p></div><div class="help-step">${icon('image')}<h3>上传项目图片</h3><p>支持 JPG、PNG 和 WebP，可调缩放与左右、上下位置。推荐清晰的横向图片。</p></div><div class="help-step">${icon('down')}<h3>预览与导出</h3><p>检查实时预览，导出标准、高清或超清 PNG / PDF。工程文件可再次导入编辑。</p></div></div><div class="help-bottom">草稿自动保存在当前浏览器，图片不上传到服务器。跨设备使用时，请在「样式设置」下载工程文件，并在另一设备导入。所有海报沿用你提供的 1080 × 1650 版式；赛季年份可自行编辑。</div><div class="dialog-footer"><button class="btn" data-action="original">${icon('file')}查看原始模板</button><button class="btn btn-primary" data-action="close-dialog">开始创作</button></div>`;
    showDialog('help', '创作，其实很简单', 'YOUR STUDIO GUIDE');
  }
  async function uploadImage(file) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('请上传 JPG、PNG 或 WebP 图片。');
    if (file.size > 15 * 1024 * 1024) throw new Error('图片超过 15 MB，请压缩后再上传。');
    toast('正在处理项目图片…');
    const url = URL.createObjectURL(file);
    try {
      const img = await getImage(url);
      if (!img.width || !img.height || img.width * img.height > 100_000_000) throw new Error('图片尺寸过大，请缩小到 10000 像素以内后重试。');
      const factor = Math.min(1, 3200 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * factor)); cv.height = Math.max(1, Math.round(img.height * factor));
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(img, 0, 0, cv.width, cv.height);
      state.imageData = cv.toDataURL('image/jpeg', .94); state.imageMode = 'upload'; state.imageName = file.name;
      state.imageZoom = 1; state.imageX = 50; state.imageY = 50;
      syncForm(); await requestRender(); scheduleSave(); toast('主视觉已更新，可继续调整画面位置');
    } finally { URL.revokeObjectURL(url); images.delete(url); $('#image-input').value = ''; }
  }
  async function backupProject() {
    downloadBlob(new Blob([JSON.stringify({ format: 'conrad-poster-studio', version: 1, exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' }), filename('json'));
    toast('工程文件已下载，包含文字、配色和图片');
  }
  async function importProject(file) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) throw new Error('工程文件超过 30 MB，无法导入。');
    let input; try { input = JSON.parse(await file.text()); } catch (_) { throw new Error('无法读取工程文件，请选择本站导出的 JSON 文件。'); }
    if (input.format !== 'conrad-poster-studio' || input.version !== 1) throw new Error('这不是兼容的海报工坊工程文件。');
    const imported = normalize(input.state);
    if (imported.imageData) await getImage(imported.imageData);
    await saveDraft(); activeId = newId(); state = imported; rememberActive(); syncForm(); await requestRender(); scheduleSave(); toast('工程已导入并创建为新草稿'); $('#project-input').value = '';
  }
  function fullscreen() {
    $('#preview-panel').classList.toggle('is-fullscreen');
    const button = $('[data-action="fullscreen"]'); button.setAttribute('aria-label', $('#preview-panel').classList.contains('is-fullscreen') ? '退出放大预览' : '放大预览');
    zoom = null; fitPreview();
  }
  async function handleAction(button) {
    const action = button.dataset.action;
    switch (action) {
      case 'new': await showTemplates('new'); break;
      case 'editor': $('#sidebar').classList.remove('open'); if (dialog.open) closeDialog(); switchTab('content'); $('.editor-panel').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); break;
      case 'templates': await showTemplates(); break;
      case 'use-template': await useTemplate(button.dataset.track, button.dataset.new === 'true'); break;
      case 'drafts': await showDrafts(); break;
      case 'save': await saveDraft(true); break;
      case 'help': showHelp(); break;
      case 'export': await showExport(); break;
      case 'close-dialog': if (!busy) closeDialog(); break;
      case 'original': window.open('assets/original-template.pdf', '_blank', 'noopener'); break;
      case 'paste': showPaste(); break;
      case 'paste-example': $('#paste-data').value = $('#paste-data').dataset.example; break;
      case 'apply-paste': { const parsed = parseInput($('#paste-data').value); state = parsed.value; syncForm(); closeDialog(); await requestRender(); scheduleSave(); toast(`已填入 ${parsed.count} 个课题字段`); break; }
      case 'sample': {
        $('#dialog-body').innerHTML = '<p class="confirm-copy">将课题内容和主视觉恢复为你提供的 MIRA 蓝域示例。当前内容会保留为一份草稿。</p><div class="dialog-footer"><button class="btn" data-action="close-dialog">取消</button><button class="btn btn-primary" data-action="sample-confirm">载入模板示例</button></div>'; showDialog('sample', '载入模板示例', 'ORIGINAL TEMPLATE'); break;
      }
      case 'sample-confirm': await saveDraft(); activeId = newId(); state = clone(DEFAULT); rememberActive(); syncForm(); closeDialog(); await requestRender(); scheduleSave(); toast('已载入 PDF 中的 MIRA 蓝域示例'); break;
      case 'recommended': state.majors = trackFor(state).majors; $('#majors').value = state.majors; changed(); toast('已应用该赛道的推荐专业，可继续修改'); break;
      case 'upload': $('#image-input').click(); break;
      case 'reset-image': state.imageZoom = 1; state.imageX = 50; state.imageY = 50; syncForm(); changed(); break;
      case 'remove-image': state.imageData = ''; state.imageName = ''; state.imageMode = 'empty'; syncForm(); changed(); break;
      case 'backup': await backupProject(); break;
      case 'import': $('#project-input').click(); break;
      case 'fullscreen': fullscreen(); break;
      case 'fit': zoom = null; fitPreview(); break;
      case 'zoom-in': zoom = Math.min(1.5, (zoom ?? $('#poster-wrap').clientWidth / WIDTH) + .1); fitPreview(); break;
      case 'zoom-out': zoom = Math.max(.1, (zoom ?? $('#poster-wrap').clientWidth / WIDTH) - .1); fitPreview(); break;
      case 'format': exportFormat = button.dataset.format; $$('.format-options .choice').forEach(el => el.classList.toggle('active', el.dataset.format === exportFormat)); $('#download-label').textContent = `下载${exportFormat.toUpperCase()}海报`; break;
      case 'scale': exportScale = Number(button.dataset.scale); $$('.scale-options .choice').forEach(el => el.classList.toggle('active', Number(el.dataset.scale) === exportScale)); break;
      case 'download': await downloadPoster(); break;
      case 'open-draft': await openDraft(button.dataset.id); break;
      case 'copy-draft': await copyDraft(button.dataset.id); break;
      case 'delete-draft': await confirmDelete(button.dataset.id); break;
      case 'delete-confirm': {
        await dbOperation('readwrite', s => s.delete(button.dataset.id));
        if (activeId === button.dataset.id) { activeId = newId(); state = { ...clone(DEFAULT), projectName: '', subtitle: '', description: '', imageMode: 'empty' }; rememberActive(); syncForm(); await requestRender(); }
        await showDrafts(); toast('草稿已删除'); break;
      }
      case 'menu': $('#sidebar').classList.toggle('open'); break;
    }
  }
  function bindEvents() {
    document.addEventListener('click', event => {
      const tab = event.target.closest('[data-tab]'); if (tab) { switchTab(tab.dataset.tab); return; }
      const track = event.target.closest('.track-option');
      if (track) { state.track = track.dataset.track; updateTheme(); changed(); return; }
      const button = event.target.closest('[data-action]');
      if (button && !button.disabled) handleAction(button).catch(reportError);
      if ($('#sidebar').classList.contains('open') && !event.target.closest('#sidebar,[data-action="menu"]')) $('#sidebar').classList.remove('open');
    });
    document.addEventListener('input', event => {
      const el = event.target;
      if (el.matches('[data-field]')) {
        const key = el.dataset.field;
        state[key] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
        changed();
      }
      if (el.matches('[data-achievement]')) { state.achievements[Number(el.dataset.achievement)] = el.value; changed(); }
    });
    $('#image-input').addEventListener('change', e => uploadImage(e.target.files[0]).catch(reportError));
    $('#project-input').addEventListener('change', e => importProject(e.target.files[0]).catch(reportError));
    $('#upload-zone').addEventListener('click', e => { if (!e.target.closest('button')) $('#image-input').click(); });
    const zone = $('#upload-zone');
    ['dragenter', 'dragover'].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.remove('drag-over'); if (type === 'drop') uploadImage(e.dataTransfer.files[0]).catch(reportError); }));
    $('#track-options').addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault(); const index = TRACKS.findIndex(t => t.id === state.track), delta = ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1;
      state.track = TRACKS[(index + delta + TRACKS.length) % TRACKS.length].id; updateTheme(); changed(); $(`.track-option[data-track="${state.track}"]`).focus();
    });
    $('.editor-tabs').addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); const which = $('#content-editor').hidden ? 'content' : 'style'; switchTab(which); $(`[data-tab="${which}"]`).focus(); } });
    dialog.addEventListener('click', e => { if (e.target === dialog && !busy) { const rect = dialog.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeDialog(); } });
    dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { $('#sidebar').classList.remove('open'); if ($('#preview-panel').classList.contains('is-fullscreen') && !dialog.open) fullscreen(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDraft(true).catch(reportError); }
    });
    new ResizeObserver(fitPreview).observe($('#preview-stage'));
    window.addEventListener('pagehide', () => { if (initialized) saveDraft(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && initialized) saveDraft(); });
  }
  async function init() {
    $('#track-options').innerHTML = TRACKS.map(t => `<button type="button" class="track-option" role="radio" aria-checked="${t.id === state.track}" tabindex="${t.id === state.track ? 0 : -1}" data-track="${t.id}" title="${t.name} · ${t.en}" style="--option-accent:${t.color};--option-bg:${mix(t.color, '#FFFFFF', .955)}"><img src="assets/icon-${t.id}.png" class="track-icon" alt=""><span class="track-copy"><strong>${t.name}</strong><small>${t.en}</small></span><span class="track-radio" aria-hidden="true"></span></button>`).join('');
    $('#achievement-fields').innerHTML = DEFAULT.achievements.map((_, i) => `<label class="field"><span>成绩卡片 ${i + 1}<span class="optional">主句 / 副句 / 补充说明</span></span><textarea data-achievement="${i}" maxlength="150" rows="3"></textarea></label>`).join('');
    bindEvents();
    try {
      db = await openDB();
      let id; try { id = localStorage.getItem('conrad-active-draft'); } catch (_) {}
      if (id) { const saved = await dbOperation('readonly', s => s.get(id)); if (saved) { state = normalize(saved.state); activeId = saved.id; } }
      if (!activeId) activeId = newId();
      await updateDraftCount();
    } catch (err) { activeId = newId(); setSaveStatus('本地存储不可用', true); toast(err.message); }
    syncForm(); fitPreview();
    try {
      await Promise.all([document.fonts.load('400 20px PosterSans', '康莱德课题介绍'), document.fonts.load('800 65px PosterSans', '康莱德创新挑战')]);
      await requestRender(); initialized = true; $('#loading-state').hidden = true;
      document.documentElement.dataset.ready = 'true';
      if (db) await saveDraft();
    } catch (err) {
      $('#loading-state').innerHTML = `<strong>画布加载未完成</strong><span>${esc(err.message)}</span><button class="btn" id="retry-load">重新加载</button>`;
      $('#retry-load').addEventListener('click', () => location.reload()); reportError(err);
    }
  }
  init().catch(reportError);
})();

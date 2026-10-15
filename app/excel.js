/* ════════════════════ 엑셀 내보내기 ════════════════════ */
function exportXLSX(data) {
  const lineById = Object.fromEntries(data.lines.map((l) => [l.id, l]));
  const parentById = Object.fromEntries(data.parents.map((p) => [p.id, p]));
  const sheet1 = data.individuals.map((ind) => {
    const L = lineById[ind.lineId] || {};
    const fa = parentById[L.fatherId] || {}, mo = parentById[L.motherId] || {};
    return {
      "라인": L.code || "", "관리번호": ind.code, "종": L.species || "", "산지": L.origin || "",
      "성별": ind.sex, "상태": ind.status,
      "산란셋팅일": L.setDate || "", "산란해체일": L.breakdownDate || "",
      "부 관리번호": fa.code || "", "부 총장(mm)": fa.totalLength || "", "부 턱길이(mm)": fa.jawLength || "", "부 흉폭(mm)": fa.thoraxWidth || "",
      "모 관리번호": mo.code || "", "모 총장(mm)": mo.totalLength || "",
      "페어링일": L.pairDate || "",
      "최대 유충무게(g)": maxWeight(ind) ?? "", "교체 횟수": (ind.bottleRecords || []).length,
      "전용일": ind.pupation?.prepupaDate || "", "용화일": ind.pupation?.pupaDate || "", "번데기 무게(g)": ind.pupation?.pupaWeight || "",
      "우화일": ind.eclosion?.date || "", "총장(mm)": ind.eclosion?.totalLength || "", "턱 길이(mm)": ind.eclosion?.jawLength || "",
      "악폭(mm)": ind.eclosion?.jawWidth || "", "악후(mm)": ind.eclosion?.jawThick || "",
      "두폭(mm)": ind.eclosion?.headWidth || "", "흉폭(mm)": ind.eclosion?.thoraxWidth || "", "배 길이(mm)": ind.eclosion?.abdomenLength || "",
      "우화부전": ind.eclosion ? (ind.eclosion.defect ? "O" : "X") : "",
      "환원율(mm/g)": reduction(ind) != null ? Math.round(reduction(ind) * 100) / 100 : "",
      "로스율(%)": lossRate(ind) != null ? Math.round(lossRate(ind) * 10) / 10 : "",
      "유충기간(일)": larvaDays(ind) ?? "", "메모": ind.memo || "",
    };
  });
  const sheet2 = [];
  data.individuals.forEach((ind) => {
    const L = lineById[ind.lineId] || {};
    sortedRecs(ind).forEach((r) => sheet2.push({
      "라인": L.code || "", "관리번호": ind.code, "종": L.species || "", "날짜": r.date, "령": r.instar,
      "유충무게(g)": r.weight, "두폭(mm)": r.headWidth, "먹이종류": r.feedType, "브랜드": r.feedBrand,
      "병용량": ccLabel(r.bottleSize), "푸딩컵": r.pudding ? "O" : "", "다음 예정일": r.nextDate, "특이사항": (r.flags || []).join(", "), "메모": r.memo,
    }));
  });
  const sheetP = data.parents.map((p) => ({
    "관리번호": p.code, "성별": p.sex, "종": p.species, "혈통": p.line, "누대수": p.gen, "산지": p.origin,
    "총장(mm)": p.totalLength, "턱 길이(mm)": p.jawLength, "악폭(mm)": p.jawWidth || "", "악후(mm)": p.jawThick || "", "두폭(mm)": p.headWidth || "", "흉폭(mm)": p.thoraxWidth,
    "우화일": p.eclosionDate, "입수처": p.source, "상태": p.status || "생존", "메모": p.memo,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet1), "개체정보");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet2), "병갈이기록");
  if (sheetP.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetP), "성충");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const xmime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return deliverFile(`사육기록_${today()}.xlsx`, new Blob([out], { type: xmime }), xmime);
}

/* ════════════════════ 엑셀 가져오기 양식 다운로드 ════════════════════ */
async function downloadTemplate() {
  /* 드롭다운 목록 준비 */
  const speciesOpts = SPECIES;
  const sexParent = ["수컷", "암컷"];
  const sexLarva = ["수컷", "암컷", "미구분"];
  const statusOpts = ["유충", "용화", "우화", "사망", "분양"];
  const instarOpts = INSTARS;
  const feedTypeOpts = FEED_TYPES;
  const bottleOpts = BOTTLES;
  /* 균사+톱밥 브랜드를 "샵 제품" 형태로 합치기 */
  const brandOpts = [];
  Object.keys(FEED_PRODUCTS || {}).forEach((cat) => {
    (FEED_PRODUCTS[cat] || []).forEach((g) => {
      (g.items || []).forEach((it) => brandOpts.push(`${g.shop} ${it}`));
    });
  });
  /* 엑셀 드롭다운은 목록 문자열이 255자를 넘으면 깨지므로, 숨김 시트에 목록을 넣고 범위로 참조 */
  const wb = new ExcelJS.Workbook();

  /* 숨김 시트: 드롭다운 원본 목록 */
  const listSheet = wb.addWorksheet("목록");
  const lists = {
    종: speciesOpts, 성별P: sexParent, 성별L: sexLarva, 상태: statusOpts,
    령: instarOpts, 먹이종류: feedTypeOpts, 병용량: bottleOpts, 브랜드: brandOpts,
    누대수: GENS, 생존: ["생존", "사망"],
  };
  const colNames = Object.keys(lists);
  colNames.forEach((name, ci) => {
    const colLetter = String.fromCharCode(65 + ci); /* A, B, C... */
    listSheet.getCell(`${colLetter}1`).value = name;
    lists[name].forEach((v, ri) => { listSheet.getCell(`${colLetter}${ri + 2}`).value = v; });
  });
  const rangeOf = (name) => {
    const ci = colNames.indexOf(name);
    const colLetter = String.fromCharCode(65 + ci);
    return `목록!$${colLetter}$2:$${colLetter}$${lists[name].length + 1}`;
  };
  listSheet.state = "veryHidden"; /* 사용자에게 안 보이게 */

  /* 드롭다운을 특정 열에 N행까지 적용하는 헬퍼 */
  const ROWS = 200;
  const applyDV = (ws, colLetter, listName) => {
    for (let r = 2; r <= ROWS; r++) {
      ws.getCell(`${colLetter}${r}`).dataValidation = {
        type: "list", allowBlank: true, formulae: [rangeOf(listName)],
      };
    }
  };

  /* 헤더만 채우고 시트 만들기 */
  const makeSheet = (name, headers) => {
    const ws = wb.addWorksheet(name);
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true };
    headers.forEach((h, i) => { ws.getColumn(i + 1).width = Math.max(12, Math.min(22, h.length + 4)); });
    return ws;
  };
  const colL = (i) => String.fromCharCode(65 + i); /* 0→A */
  /* 헤더 이름 → 값 매핑으로 예시행 생성 (열 개수 자동 정렬) */
  const rowFor = (headers, obj) => headers.map((h) => (obj[h] !== undefined ? obj[h] : ""));

  /* 사용법 */
  const guide = wb.addWorksheet("사용법");
  [
    ["이 파일의 각 시트(성충/라인/유충/병갈이기록)를 채운 뒤, 앱 ⚙️설정 → '엑셀 불러오기'로 올리세요."],
    ["색 있는 칸(종·성별·상태·령·먹이종류·브랜드·병용량)은 셀을 누르면 ▼ 목록에서 고를 수 있어요. (PC 엑셀 권장)"],
    ["라인의 '부/모 관리번호'는 성충 시트의 관리번호와 같아야 연결됩니다."],
    ["유충의 '소속 라인명'은 라인 시트의 라인명과 같아야 연결됩니다."],
    ["병갈이기록: 한 유충이 여러 번 병갈이했으면 줄을 여러 개 적으세요(관리번호+소속라인으로 찾음)."],
    ["같은 항목은 최신 정보로 갱신됩니다. 병갈이는 같은 날짜면 건너뜁니다."],
    ["날짜는 2026-03-15 형식으로 적어주세요."],
    ["누대수: 와일드는 WD. 라인 누대수는 앱에서 부·모를 고르면 자동 계산되니 비워둬도 됩니다."],
    ["병갈이 '특이사항'은 거식, 원더링, 조기용화, 전용 중에서 쉼표로 구분해 적어주세요."],
  ].forEach((r) => guide.addRow(r));
  guide.getColumn(1).width = 80;

  /* 성충 */
  const pHeaders = ["관리번호", "성별(수컷/암컷)", "종", "혈통", "누대수", "산지", "총장(mm)", "턱길이(mm)", "악폭(mm)", "악후(mm)", "두폭(mm)", "흉폭(mm)", "우화일(YYYY-MM-DD)", "입수처", "상태(생존/사망)", "메모"];
  const pWs = makeSheet("성충", pHeaders);
  pWs.addRow(rowFor(pHeaders, { "관리번호": "P-01", "성별(수컷/암컷)": "수컷", "종": "왕사슴벌레(극태)", "누대수": "WD", "총장(mm)": 85.5, "입수처": "샵명", "상태(생존/사망)": "생존" }));
  pWs.addRow(rowFor(pHeaders, { "관리번호": "P-02", "성별(수컷/암컷)": "암컷", "종": "왕사슴벌레(극태)", "누대수": "WD", "총장(mm)": 52.0, "상태(생존/사망)": "생존" }));
  applyDV(pWs, colL(pHeaders.indexOf("성별(수컷/암컷)")), "성별P");
  applyDV(pWs, colL(pHeaders.indexOf("종")), "종");
  applyDV(pWs, colL(pHeaders.indexOf("누대수")), "누대수");
  applyDV(pWs, colL(pHeaders.indexOf("상태(생존/사망)")), "생존");

  /* 라인 */
  const lHeaders = ["라인명", "부 관리번호", "모 관리번호", "종", "누대수", "산지", "페어링일(YYYY-MM-DD)", "산란셋팅일(YYYY-MM-DD)", "산란해체일(YYYY-MM-DD)", "메모"];
  const lWs = makeSheet("라인", lHeaders);
  lWs.addRow(rowFor(lHeaders, { "라인명": "26-A", "부 관리번호": "P-01", "모 관리번호": "P-02", "종": "왕사슴벌레(극태)", "누대수": "WF1" }));
  applyDV(lWs, colL(lHeaders.indexOf("종")), "종");
  applyDV(lWs, colL(lHeaders.indexOf("누대수")), "누대수");

  /* 유충 */
  const gHeaders = ["관리번호", "소속 라인명", "성별(수컷/암컷/미구분)", "상태(유충/용화/우화/사망/분양)", "메모",
    "전용일(YYYY-MM-DD)", "용화일(YYYY-MM-DD)", "번데기무게(g)",
    "우화일(YYYY-MM-DD)", "성충총장(mm)", "턱길이(mm)", "악폭(mm)", "악후(mm)", "두폭(mm)", "흉폭(mm)", "배길이(mm)", "우화부전(O/X)"];
  const gWs = makeSheet("유충", gHeaders);
  gWs.addRow(rowFor(gHeaders, { "관리번호": "A-01", "소속 라인명": "26-A", "성별(수컷/암컷/미구분)": "미구분", "상태(유충/용화/우화/사망/분양)": "유충" }));
  gWs.addRow(rowFor(gHeaders, { "관리번호": "A-02", "소속 라인명": "26-A", "성별(수컷/암컷/미구분)": "미구분", "상태(유충/용화/우화/사망/분양)": "유충" }));
  applyDV(gWs, colL(gHeaders.indexOf("성별(수컷/암컷/미구분)")), "성별L");
  applyDV(gWs, colL(gHeaders.indexOf("상태(유충/용화/우화/사망/분양)")), "상태");

  /* 병갈이기록 */
  const bHeaders = ["관리번호", "소속 라인명", "병갈이날짜(YYYY-MM-DD)", "령", "유충무게(g)", "두폭(mm)", "먹이종류(균사/발효톱밥)", "브랜드", "병용량(cc)", "푸딩컵(O/X)", "다음예정일(YYYY-MM-DD)", "특이사항(쉼표로 구분)", "메모"];
  const bWs = makeSheet("병갈이기록", bHeaders);
  bWs.addRow(rowFor(bHeaders, { "관리번호": "A-01", "소속 라인명": "26-A", "병갈이날짜(YYYY-MM-DD)": "2026-03-15", "령": "3령 초기", "유충무게(g)": 18.5, "먹이종류(균사/발효톱밥)": "균사", "브랜드": "뿔샵 오오히라", "병용량(cc)": "1400" }));
  bWs.addRow(rowFor(bHeaders, { "관리번호": "A-01", "소속 라인명": "26-A", "병갈이날짜(YYYY-MM-DD)": "2026-05-20", "령": "3령 중기", "유충무게(g)": 28.0, "먹이종류(균사/발효톱밥)": "균사", "브랜드": "뿔샵 오오히라", "병용량(cc)": "2000", "특이사항(쉼표로 구분)": "거식" }));
  applyDV(bWs, colL(bHeaders.indexOf("령")), "령");
  applyDV(bWs, colL(bHeaders.indexOf("먹이종류(균사/발효톱밥)")), "먹이종류");
  applyDV(bWs, colL(bHeaders.indexOf("브랜드")), "브랜드");
  applyDV(bWs, colL(bHeaders.indexOf("병용량(cc)")), "병용량");

  const buf = await wb.xlsx.writeBuffer();
  const xmime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return deliverFile(`사육기록_양식.xlsx`, new Blob([buf], { type: xmime }), xmime);
}

/* 엑셀 파일 → 데이터 객체로 파싱 (성충/라인/유충 추가) */
function parseImportXLSX(arrayBuffer, data) {
  const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheet = (name) => { const ws = wb.Sheets[name]; return ws ? XLSX.utils.sheet_to_json(ws, { defval: "" }) : []; };
  const str = (v) => String(v == null ? "" : v).trim();
  /* 엑셀은 날짜를 숫자(일련번호)로 저장하므로 YYYY-MM-DD로 변환.
     Date 객체 · 45860 같은 숫자 · 2025.07.22 / 2025/7/2 표기까지 모두 처리 */
  const dstr = (v) => {
    if (v == null || v === "") return "";
    const pad2 = (n) => String(n).padStart(2, "0");
    const fromDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    if (v instanceof Date && !isNaN(v)) return fromDate(v);
    const s = String(v).trim();
    /* 엑셀 일련번호(1900 체계)는 20000~60000 범위(1954~2064)일 때만 날짜로 간주.
       "2025"처럼 연도만 적은 값을 엉뚱한 날짜로 바꾸지 않도록 함 */
    if (/^\d+(\.\d+)?$/.test(s)) {
      const n = parseFloat(s);
      if (n >= 20000 && n <= 60000) {
        const d = new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);
        if (!isNaN(d)) return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
      }
      return s;
    }
    const m = s.match(/^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})/);
    if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
    return s;
  };
  const sexNorm = (v) => { const s = str(v); if (s.includes("수")) return "수컷 ♂"; if (s.includes("암")) return "암컷 ♀"; return "미구분"; };
  /* 엑셀 칸이 비어있으면 기존 값 유지, 값이 있으면 새 값으로 (빈칸이 기존 데이터를 지우지 않게) */
  const keep = (newV, oldV) => { const s = str(newV); return s !== "" ? s : (oldV || ""); };
  const keepD = (newV, oldV) => { const s = dstr(newV); return s !== "" ? s : (oldV || ""); };

  let parents = [...data.parents];
  let lines = [...data.lines];
  let individuals = [...data.individuals];
  const report = { parentsNew: 0, parentsUpd: 0, linesNew: 0, linesUpd: 0, larvaeNew: 0, larvaeUpd: 0, skipped: 0 };

  /* 1) 성충 — 종+관리번호가 같으면 덮어쓰기, 없으면 추가 */
  const findParent = (code, species) => parents.find((p) => p.code === code && (p.species || "") === species);
  sheet("성충").forEach((row) => {
    const code = str(row["관리번호"]);
    if (!code) return;
    const species = str(row["종"]);
    const existing = findParent(code, species);
    if (existing) {
      Object.assign(existing, {
        sex: keep(row["성별(수컷/암컷)"], existing.sex) || sexNorm(row["성별(수컷/암컷)"]),
        line: keep(row["혈통"], existing.line), gen: keep(row["누대수"], existing.gen), origin: keep(row["산지"], existing.origin),
        totalLength: keep(row["총장(mm)"], existing.totalLength), jawLength: keep(row["턱길이(mm)"], existing.jawLength),
        jawWidth: keep(row["악폭(mm)"], existing.jawWidth), jawThick: keep(row["악후(mm)"], existing.jawThick),
        headWidth: keep(row["두폭(mm)"], existing.headWidth),
        thoraxWidth: keep(row["흉폭(mm)"], existing.thoraxWidth), eclosionDate: keepD(row["우화일(YYYY-MM-DD)"], existing.eclosionDate),
        status: str(row["상태(생존/사망)"]) === "사망" ? "사망" : str(row["상태(생존/사망)"]) === "생존" ? "생존" : existing.status,
        source: keep(row["입수처"], existing.source), memo: keep(row["메모"], existing.memo),
      });
      if (str(row["성별(수컷/암컷)"])) existing.sex = sexNorm(row["성별(수컷/암컷)"]);
      report.parentsUpd++;
    } else {
      parents.push({
        id: uid(), code, sex: sexNorm(row["성별(수컷/암컷)"]), species,
        line: str(row["혈통"]), gen: str(row["누대수"]), origin: str(row["산지"]),
        totalLength: str(row["총장(mm)"]), jawLength: str(row["턱길이(mm)"]),
        jawWidth: str(row["악폭(mm)"]), jawThick: str(row["악후(mm)"]), headWidth: str(row["두폭(mm)"]), thoraxWidth: str(row["흉폭(mm)"]),
        eclosionDate: dstr(row["우화일(YYYY-MM-DD)"]), source: str(row["입수처"]), memo: str(row["메모"]),
        status: str(row["상태(생존/사망)"]) === "사망" ? "사망" : "생존", photo: "", growthRecords: [],
      });
      report.parentsNew++;
    }
  });
  /* 부/모 연결용: 관리번호 → id (덮어쓰기 후 최신 상태로) */
  const codeToParentId = {};
  parents.forEach((p) => { codeToParentId[p.code] = p.id; });

  /* 2) 라인 — 라인명+종이 같으면 덮어쓰기, 없으면 추가 */
  const findLine = (code, species) => lines.find((l) => l.code === code && (l.species || "") === species);
  sheet("라인").forEach((row) => {
    const code = str(row["라인명"]);
    if (!code) return;
    const species = str(row["종"]);
    const fid = codeToParentId[str(row["부 관리번호"])] || "";
    const mid = codeToParentId[str(row["모 관리번호"])] || "";
    const existing = findLine(code, species);
    if (existing) {
      Object.assign(existing, {
        fatherId: fid || existing.fatherId, motherId: mid || existing.motherId,
        gen: keep(row["누대수"], existing.gen), origin: keep(row["산지"], existing.origin),
        setDate: keepD(row["산란셋팅일(YYYY-MM-DD)"], existing.setDate), breakdownDate: keepD(row["산란해체일(YYYY-MM-DD)"], existing.breakdownDate),
        pairDate: keepD(row["페어링일(YYYY-MM-DD)"], existing.pairDate), memo: keep(row["메모"], existing.memo),
      });
      report.linesUpd++;
    } else {
      lines.push({
        id: uid(), code, fatherId: fid, motherId: mid, species, gen: str(row["누대수"]), origin: str(row["산지"]),
        setDate: dstr(row["산란셋팅일(YYYY-MM-DD)"]), breakdownDate: dstr(row["산란해체일(YYYY-MM-DD)"]),
        pairDate: dstr(row["페어링일(YYYY-MM-DD)"]), memo: str(row["메모"]),
      });
      report.linesNew++;
    }
  });
  const codeToLineId = {};
  lines.forEach((l) => { codeToLineId[l.code] = l.id; });

  /* 3) 유충 — 관리번호+소속라인이 같으면 덮어쓰기(병갈이 기록은 보존), 없으면 추가 */
  const VALID_STATUS = ["유충", "용화", "우화", "사망", "분양"];
  /* 용화/우화 정보를 행에서 뽑아오기 (값 있는 것만) */
  const readPupation = (row, old) => {
    const pre = dstr(row["전용일(YYYY-MM-DD)"]), pup = dstr(row["용화일(YYYY-MM-DD)"]), pw = str(row["번데기무게(g)"]);
    if (!pre && !pup && !pw) return old || null;
    return { prepupaDate: pre || (old && old.prepupaDate) || "", pupaDate: pup || (old && old.pupaDate) || "", pupaWeight: pw || (old && old.pupaWeight) || "", memo: (old && old.memo) || "" };
  };
  const readEclosion = (row, old) => {
    const d = dstr(row["우화일(YYYY-MM-DD)"]), tl = str(row["성충총장(mm)"]);
    const jl = str(row["턱길이(mm)"]), jw = str(row["악폭(mm)"]), jt = str(row["악후(mm)"]);
    const hw = str(row["두폭(mm)"]), tw = str(row["흉폭(mm)"]), ab = str(row["배길이(mm)"]), df = str(row["우화부전(O/X)"]);
    if (!d && !tl && !jl && !jw && !jt && !hw && !tw && !ab) return old || null;
    return {
      date: d || (old && old.date) || "", totalLength: tl || (old && old.totalLength) || "",
      jawLength: jl || (old && old.jawLength) || "", jawWidth: jw || (old && old.jawWidth) || "", jawThick: jt || (old && old.jawThick) || "",
      headWidth: hw || (old && old.headWidth) || "", thoraxWidth: tw || (old && old.thoraxWidth) || "", abdomenLength: ab || (old && old.abdomenLength) || "",
      defect: df ? /O/i.test(df) : (old ? old.defect : false), memo: (old && old.memo) || "",
    };
  };
  sheet("유충").forEach((row) => {
    const code = str(row["관리번호"]);
    const lineCode = str(row["소속 라인명"]);
    if (!code) return;
    const lineId = codeToLineId[lineCode];
    if (!lineId) { report.skipped++; return; } /* 라인 못 찾으면 건너뜀 */
    const st = str(row["상태(유충/용화/우화/사망/분양)"]);
    const existing = individuals.find((i) => i.lineId === lineId && i.code === code);
    if (existing) {
      if (str(row["성별(수컷/암컷/미구분)"])) existing.sex = sexNorm(row["성별(수컷/암컷/미구분)"]);
      existing.memo = keep(row["메모"], existing.memo);
      if (VALID_STATUS.includes(st)) existing.status = st;
      existing.pupation = readPupation(row, existing.pupation);
      existing.eclosion = readEclosion(row, existing.eclosion);
      /* bottleRecords 는 병갈이기록 시트에서 따로 처리 */
      report.larvaeUpd++;
    } else {
      individuals.push({
        id: uid(), code, lineId, sex: sexNorm(row["성별(수컷/암컷/미구분)"]),
        status: VALID_STATUS.includes(st) ? st : "유충", memo: str(row["메모"]),
        bottleRecords: [], pupation: readPupation(row, null), eclosion: readEclosion(row, null),
      });
      report.larvaeNew++;
    }
  });

  /* 4) 병갈이기록 — 관리번호+소속라인으로 유충 찾아서, 없는 날짜만 추가 */
  report.bottleNew = 0;
  sheet("병갈이기록").forEach((row) => {
    const code = str(row["관리번호"]);
    const lineCode = str(row["소속 라인명"]);
    const date = dstr(row["병갈이날짜(YYYY-MM-DD)"]);
    if (!code || !date) return;
    const lineId = codeToLineId[lineCode];
    if (!lineId) { report.skipped++; return; }
    const ind = individuals.find((i) => i.lineId === lineId && i.code === code);
    if (!ind) { report.skipped++; return; }
    if (!Array.isArray(ind.bottleRecords)) ind.bottleRecords = [];
    if (ind.bottleRecords.some((r) => r.date === date)) return; /* 같은 날짜 이미 있으면 건너뜀 */
    ind.bottleRecords.push({
      id: uid(), date, instar: str(row["령"]), weight: str(row["유충무게(g)"]), headWidth: str(row["두폭(mm)"]),
      feedType: str(row["먹이종류(균사/발효톱밥)"]) || "균사", feedBrand: str(row["브랜드"]),
      bottleSize: str(row["병용량(cc)"]), pudding: /^O$/i.test(str(row["푸딩컵(O/X)"])), nextDate: dstr(row["다음예정일(YYYY-MM-DD)"]), memo: str(row["메모"]),
      flags: str(row["특이사항(쉼표로 구분)"]).split(/[,·]/).map((x) => x.trim()).filter((x) => FLAGS.includes(x)),
    });
    report.bottleNew++;
  });

  return { next: { ...data, parents, lines, individuals }, report };
}


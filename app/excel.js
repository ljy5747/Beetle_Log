/* ════════════════════ 엑셀 내보내기 ════════════════════ */
/* 라인당 1개 시트: KML 스타일 유충 사육표. 앱의 가져오기 양식과는 별도인 읽기용 내보내기. */
async function exportXLSX(data) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "BeetleLog";
  wb.created = new Date();
  const parents = new Map((data.parents || []).map(p => [p.id, p]));
  const lines = Array.isArray(data.lines) ? data.lines : [];
  const individuals = Array.isArray(data.individuals) ? data.individuals : [];
  const usedNames = new Set();
  const safeName = raw => {
    const base = (String(raw || "미지정").replace(/[\\/?*\[\]:]/g, "_").trim() || "미지정").slice(0, 31);
    let name = base, n = 2;
    while (usedNames.has(name.toLowerCase())) {
      const suffix = "_" + n++;
      name = base.slice(0, 31 - suffix.length) + suffix;
    }
    usedNames.add(name.toLowerCase());
    return name;
  };
  const text = v => v == null ? "" : String(v);
  const numeric = v => {
    if (v == null || v === "") return null;
    const n = Number(String(v).replace(/(?:mm|g|cc)\s*$/i, "").trim());
    return Number.isFinite(n) ? n : null;
  };
  const parentLabel = p => {
    if (!p) return "—";
    const size = numeric(p.totalLength);
    return [p.code || "", size == null ? "" : size + "mm"].filter(Boolean).join(" · ") || "—";
  };
  const palette = { navy:"243B50", pale:"EEF4F6", teal:"3B6B70", white:"FFFFFF", border:"CCD6D9", muted:"586875" };
  const border = { style:"thin", color:{argb:"FF"+palette.border} };
  const writeCell = (ws, row, col, value, kind) => {
    const cell = ws.getCell(row, col);
    cell.value = value == null ? "" : value;
    cell.alignment = { horizontal:kind==="weight"?"right":"center", vertical:"middle", wrapText:true, indent:kind==="weight"?1:0 };
    cell.border = {top:border,bottom:border,left:border,right:border};
    if (kind==="weight" && typeof value==="number") cell.numFmt = "0.##";
    return cell;
  };
  const lineGroups = lines.map(line => ({line, members:individuals.filter(ind => ind.lineId === line.id)}));
  // Unknown/missing line references are preserved instead of silently omitted.
  const assigned = new Set(lines.map(l => l.id));
  const orphans = individuals.filter(ind => !assigned.has(ind.lineId));
  if (orphans.length) lineGroups.push({line:{code:"미분류",species:"",origin:"",gen:""},members:orphans});
  if (!lineGroups.length) lineGroups.push({line:{code:"라인 없음"},members:[]});
  for (const {line, members} of lineGroups) {
    const numberOfBottles = Math.max(1, ...members.map(ind => (ind.bottleRecords || []).length));
    const cols = 4 + numberOfBottles * 4 + 5;
    const last = cols;
    const ws = wb.addWorksheet(safeName(line.code), {
      views:[{state:"frozen",xSplit:4,ySplit:9}],
      pageSetup:{orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0}
    });
    ws.properties.defaultRowHeight = 23;
    ws.mergeCells(1,1,1,last);
    const title = ws.getCell(1,1);
    title.value = text(line.code || "미분류") + "  |  라인별 유충 사육기록";
    title.font = {name:"맑은 고딕",size:16,bold:true,color:{argb:"FF"+palette.white}};
    title.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"FF"+palette.navy}};
    title.alignment = {horizontal:"center",vertical:"middle"};
    ws.getRow(1).height = 39;
    ws.mergeCells(3,1,3,last);
    ws.getCell(3,1).value = "BeetleLog · 라인별 사육 기록";
    ws.getCell(3,1).font = {name:"맑은 고딕",size:10,color:{argb:"FF"+palette.muted}};
    ws.getCell(3,1).alignment = {horizontal:"center",vertical:"middle"};
    ws.getRow(3).height = 25;
    // Hidden IDs enable safe round-trip editing without adding visible worksheets.
    ws.getCell(2,1).value = "BL_LINE_ID:" + (line.id || "");
    ws.getRow(2).hidden = true;

    const father = parents.get(line.fatherId), mother = parents.get(line.motherId);
    const info = [
      ["라인",line.code || "미분류","종",line.species || "","혈통 / 산지",[line.gen,line.origin].filter(Boolean).join(" · ")],
      ["부모 수컷",parentLabel(father),"부모 암컷",parentLabel(mother),"유충 수",members.length + "마리"]
    ];
    for (let i=0;i<2;i++) {
      const row=5+i;
      info[i].forEach((value,j)=>{
        const cell=writeCell(ws,row,j+1,value);
        if(j%2===0) {
          cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+palette.pale}};
          cell.font={bold:true,color:{argb:"FF"+palette.teal}};
        }
      });
      ws.getRow(row).height=27;
    }
    ws.getRow(7).height=12;
    const mainHeads = ["관리번호","성별","상태","두폭(mm)"];
    mainHeads.forEach((h,j)=>{ws.mergeCells(8,j+1,9,j+1);writeCell(ws,8,j+1,h);});
    for(let b=0;b<numberOfBottles;b++){
      const start=5+b*4;
      ws.mergeCells(8,start,8,start+3);
      writeCell(ws,8,start,(b+1)+"병 기록");
      ["투입일","먹이원","용량(cc)","무게(g)"].forEach((h,j)=>writeCell(ws,9,start+j,h));
    }
    const finalStart=5+numberOfBottles*4;
    ws.mergeCells(8,finalStart,8,last);
    writeCell(ws,8,finalStart,"최종 / 관리 상태");
    ["전용일","용화일","우화일","총장(mm)","비고"].forEach((h,j)=>writeCell(ws,9,finalStart+j,h));
    for(let row=8;row<=9;row++){
      ws.getRow(row).height=29;
      for(let col=1;col<=last;col++){
        const c=ws.getCell(row,col);
        c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+(row===8?palette.navy:palette.teal)}};
        c.font={name:"맑은 고딕",bold:true,color:{argb:"FF"+palette.white},size:10};
        c.alignment={horizontal:"center",vertical:"middle",wrapText:true};
      }
    }
    const identityCol = last + 1, recordsCol = last + 2;
    ws.getColumn(identityCol).hidden = true;
    ws.getColumn(recordsCol).hidden = true;
    ws.getCell(9,identityCol).value = "__BL_INDIVIDUAL_ID";
    ws.getCell(9,recordsCol).value = "__BL_BOTTLE_IDS";
    for(let idx=0;idx<members.length;idx++){
      const ind=members[idx], recs=sortedRecs(ind), row=10+idx;
      const latestWithWidth=[...recs].reverse().find(r => numeric(r.headWidth)!=null);
      const width=numeric(latestWithWidth?.headWidth) ?? numeric(ind.eclosion?.headWidth);
      const sex=String(ind.sex||"");
      const shortSex=sex.includes("수")?"♂":sex.includes("암")?"♀":sex||"미구분";
      const basics=[ind.code||"",shortSex,ind.status||"",width];
      ws.getCell(row,identityCol).value = ind.id || "";
      ws.getCell(row,recordsCol).value = JSON.stringify(recs.map(r=>r.id || ""));
      basics.forEach((v,j)=>writeCell(ws,row,j+1,v));
      for(let b=0;b<numberOfBottles;b++){
        const r=recs[b]||{},start=5+b*4;
        writeCell(ws,row,start,r.date||"");
        writeCell(ws,row,start+1,r.feedBrand||r.feedType||"");
        writeCell(ws,row,start+2,numeric(r.bottleSize) ?? ccLabel(r.bottleSize || ""));
        writeCell(ws,row,start+3,numeric(r.weight), "weight");
      }
      const out=[ind.pupation?.prepupaDate||"",ind.pupation?.pupaDate||"",ind.eclosion?.date||"",numeric(ind.eclosion?.totalLength),ind.memo||""];
      out.forEach((v,j)=>writeCell(ws,row,finalStart+j,v));
      if(idx%2===1) for(let col=1;col<=last;col++) ws.getCell(row,col).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF7FAFB"}};
      ws.getRow(row).height=27;
    }
    const colWidths=[18,9,11,13];
    for(let b=0;b<numberOfBottles;b++)colWidths.push(15,19,12,12);
    colWidths.push(15,15,15,13,32);
    colWidths.forEach((w,i)=>{ws.getColumn(i+1).width=w;});
    // Column groups have a merged first header row; avoid invalid table structures.
    ws.printOptions = {horizontalCentered:true};
    ws.pageSetup.printTitlesRow = "1:9";
  }
  const out = await wb.xlsx.writeBuffer();
  const mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return deliverFile("BeetleLog_라인별_사육기록_"+today()+".xlsx",new Blob([out],{type:mime}),mime);
}


/* Import the exact grouped, per-line XLSX emitted by exportXLSX.
 * A2 and trailing hidden columns contain optional stable IDs. Existing v3 files without IDs are supported.
 * This parser is transactional in memory: validation errors leave the input data untouched.
 */
function parseLineXLSXWorkbook(workbook, current) {
  const rowsOf = name => XLSX.utils.sheet_to_json(workbook.Sheets[name], {header:1,defval:"",raw:true,blankrows:true});
  const str = v => v == null ? "" : String(v).trim();
  const blanks = v => str(v)==="" || str(v)==="—" || str(v)==="-";
  const days = v => {
    if (blanks(v)) return "";
    let result = "";
    if (v instanceof Date && !isNaN(v.getTime())) result = v.toISOString().slice(0,10);
    else if (typeof v === "number" || /^\d{5}(?:\.\d+)?$/.test(str(v))) {
      const n = Number(v);
      if (n < 20000 || n > 90000) throw Error("날짜 일련번호가 올바르지 않습니다: "+n);
      result = new Date(Date.UTC(1899,11,30)+Math.floor(n)*86400000).toISOString().slice(0,10);
    } else {
      const m = str(v).match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
      if (!m) throw Error("날짜는 YYYY-MM-DD 형식으로 입력해 주세요: "+str(v));
      result = m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0");
    }
    if (new Date(result+"T00:00:00Z").toISOString().slice(0,10)!==result) throw Error("유효하지 않은 날짜: "+result);
    return result;
  };
  const number = (v, field) => {
    if (blanks(v)) return "";
    const raw = str(v).replace(/,/g,"").replace(/\s*(mm|g|cc)$/i,"").trim();
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 100000) throw Error(field+" 숫자가 올바르지 않습니다: "+str(v));
    return String(n);
  };
  const nonblank = v => !blanks(v);
  const update = (obj, field, value) => {
    if (value === "" || value == null) return;
    if (str(obj[field]) !== str(value)) obj[field] = value;
  };
  const groups = [];
  for (const name of workbook.SheetNames) {
    if (["성충","라인","유충","병갈이기록","사용법","목록"].includes(name)) continue;
    const rows = rowsOf(name);
    const a = rows[7] || [], b = rows[8] || [];
    if (str(a[0]) !== "관리번호" || str(a[1]) !== "성별" || str(a[2]) !== "상태" || str(a[3]) !== "두폭(mm)") continue;
    let count=0, cursor=4;
    while(str(b[cursor])==="투입일" && str(b[cursor+1])==="먹이원" && str(b[cursor+2])==="용량(cc)" && str(b[cursor+3])==="무게(g)") {
      count++;cursor+=4;
      if(count>60)throw Error(name+": 병 기록은 최대 60개까지 가져올 수 있어요.");
    }
    if (!count || ["전용일","용화일","우화일","총장(mm)","비고"].some((h,i)=>str(b[cursor+i])!==h)) {
      throw Error(name+": 병 기록이나 최종 기록의 열 제목을 확인해 주세요.");
    }
    groups.push({name,rows,count,final:cursor});
  }
  if (!groups.length) return null; // Old four-sheet workbook: use legacy parser.
  if (groups.length !== workbook.SheetNames.filter(n=>!["사용법","목록"].includes(n)).length) {
    throw Error("새 라인별 엑셀과 다른 형식의 시트가 섞여 있습니다.");
  }
  if(groups.length>200)throw Error("한 파일에 포함할 수 있는 라인은 최대 200개입니다.");
  const data = JSON.parse(JSON.stringify(current));
  data.lines = Array.isArray(data.lines)?data.lines:[];
  data.individuals = Array.isArray(data.individuals)?data.individuals:[];
  const report = {parentsNew:0,parentsUpd:0,linesNew:0,linesUpd:0,larvaeNew:0,larvaeUpd:0,bottleNew:0,bottleUpd:0,skipped:0};
  const usedLines=new Set(),usedIndividuals=new Set(),usedRecords=new Set();
  for(const {name,rows,count,final} of groups) {
    const rawLineId=str(rows[1]?.[0]).replace(/^BL_LINE_ID:/,"");
    const lineName=str(rows[4]?.[1]) || name;
    if (!lineName || lineName==="라인 없음") throw Error(name+": 라인명을 입력해 주세요.");
    let line = rawLineId ? data.lines.find(l=>l.id===rawLineId) : null;
    if(rawLineId && !line)throw Error(name+": 원본 라인을 찾을 수 없습니다. 다른 계정의 파일인지 확인해 주세요.");
    if(!line) {
      const matches=data.lines.filter(l=>l.code===lineName);
      if(matches.length>1)throw Error(name+": 라인명이 중복되어 대상을 찾을 수 없어요.");
      line=matches[0]||null;
    }
    if(line && usedLines.has(line.id)) throw Error(name+": 같은 라인이 다른 시트에도 있습니다.");
    const lineSpecies=str(rows[4]?.[3]);
    if(line) {
      if(lineName!==line.code && data.lines.some(l=>l!==line && l.code===lineName))throw Error(name+": 다른 라인과 이름이 중복돼요.");
      const before=JSON.stringify(line);
      update(line,"code",lineName);
      update(line,"species",lineSpecies);
      if(JSON.stringify(line)!==before)report.linesUpd++;
    } else {
      if(data.lines.some(l=>l.code===lineName))throw Error(name+": 중복 라인명입니다.");
      line={id:uid(),code:lineName,species:lineSpecies,gen:"",origin:"",fatherId:"",motherId:"",memo:""};
      data.lines.push(line);report.linesNew++;
    }
    usedLines.add(line.id);
    const idxId = (rows[8]||[]).findIndex(v=>str(v)==="__BL_INDIVIDUAL_ID");
    const idxRecords = (rows[8]||[]).findIndex(v=>str(v)==="__BL_BOTTLE_IDS");
    if((idxId>=0)!==(idxRecords>=0))throw Error(name+": 엑셀의 내부 연결 열이 손상되었습니다.");
    if(idxId>=0 && (idxId!==final+5||idxRecords!==final+6))throw Error(name+": 내부 연결 열 위치가 변경되었습니다.");
    if(rows.length>1510)throw Error(name+": 한 시트에는 1500개체까지 등록할 수 있습니다.");
    for(let rowNum=9;rowNum<rows.length;rowNum++){
      const row=rows[rowNum]||[],code=str(row[0]);
      if (!code) {
        if(row.slice(1,final+5).some(nonblank))throw Error(name+" "+(rowNum+1)+"행: 관리번호가 비어 있습니다.");
        continue;
      }
      if(code.length>100)throw Error(name+" "+(rowNum+1)+"행: 관리번호가 너무 깁니다.");
      const originalId=idxId>=0 ? str(row[idxId]) : "";
      let originalIds=[];
      if(idxRecords>=0 && nonblank(row[idxRecords])) {
        try {originalIds=JSON.parse(str(row[idxRecords]));}catch{throw Error(name+" "+(rowNum+1)+"행: 병 기록 연결 정보가 손상됐습니다.");}
        if(!Array.isArray(originalIds)||originalIds.length>60)throw Error(name+" "+(rowNum+1)+"행: 병 기록 ID 형식 오류");
      }
      let ind=originalId ? data.individuals.find(i=>i.id===originalId) : null;
      if(originalId && (!ind||ind.lineId!==line.id))throw Error(name+" "+(rowNum+1)+"행: 기존 개체 연결 정보가 맞지 않습니다.");
      if(!ind) {
        const match=data.individuals.filter(i=>i.lineId===line.id && i.code===code);
        if(match.length>1)throw Error(name+" "+code+": 중복 관리번호를 먼저 정리해 주세요.");
        ind=match[0]||null;
      }
      if(ind&&usedIndividuals.has(ind.id))throw Error(name+" "+code+": 파일 안에서 개체가 중복됐습니다.");
      if(ind&&code!==ind.code&&data.individuals.some(i=>i.lineId===line.id&&i!==ind&&i.code===code))throw Error(name+": 수정한 관리번호가 기존 개체와 중복됩니다.");
      const sex=str(row[1]),status=str(row[2]),width=number(row[3],"두폭");
      if(sex && !["♂","♀","수컷","암컷","미구분","수컷 ♂","암컷 ♀"].includes(sex))throw Error(name+" "+code+": 성별은 수컷·암컷·미구분 중 선택해 주세요.");
      if(status && !["유충","용화","우화","사망","분양"].includes(status))throw Error(name+" "+code+": 상태가 올바르지 않습니다.");
      const wasExisting=!!ind;
      const before=ind?JSON.stringify(ind):"";
      if(!ind) {
        ind={id:uid(),lineId:line.id,code,sex:"미구분",status:"유충",memo:"",bottleRecords:[],pupation:null,eclosion:null};
        data.individuals.push(ind);
      }
      update(ind,"code",code);
      if(sex)update(ind,"sex",sex.includes("♂")||sex==="수컷"?"수컷 ♂":sex.includes("♀")||sex==="암컷"?"암컷 ♀":"미구분");
      update(ind,"status",status);
      ind.bottleRecords=Array.isArray(ind.bottleRecords)?ind.bottleRecords:[];
      const originalRecs=[...ind.bottleRecords].sort((a,b)=>String(a?.date||"").localeCompare(String(b?.date||"")));
      let lastWithWidth = null;
      for(let b=0;b<count;b++){
        const start=4+4*b;
        const values=row.slice(start,start+4);
        if(!values.some(nonblank))continue; // Empty exported bottle group never removes records.
        const date=days(values[0]),feed=str(values[1]),capacity=number(values[2],"용량"),weight=number(values[3],"무게");
        const recordId=str(originalIds[b]);
        let rec=recordId?ind.bottleRecords.find(r=>r.id===recordId):null;
        if(recordId&&!rec)throw Error(name+" "+code+" "+(b+1)+"병: 기록 ID가 현재 데이터와 일치하지 않습니다.");
        if(!rec&&!recordId){
          rec = ind.bottleRecords.find(r=>r.date===date&&date);
          if(!rec&&!originalId)rec=originalRecs[b]||null; // Accept older v3 exports without IDs.
        }
        const isNew=!rec;
        if(isNew&&!date)throw Error(name+" "+code+" "+(b+1)+"병: 새 병 기록에는 투입일이 필요합니다.");
        if(!rec) {
          if(ind.bottleRecords.some(r=>r.date===date))throw Error(name+" "+code+": 같은 날짜의 병 기록이 중복됩니다.");
          rec={id:uid(),date,instar:"",weight:"",headWidth:"",feedType:"균사",feedBrand:"",bottleSize:"",pudding:false,nextDate:"",flags:[],memo:""};
          ind.bottleRecords.push(rec);
        }
        if(usedRecords.has(rec.id))throw Error(name+" "+code+": 동일 병 기록이 중복 입력됐습니다.");
        usedRecords.add(rec.id);
        const recBefore=isNew?"":JSON.stringify(rec);
        update(rec,"date",date);
        update(rec,"feedBrand",feed);
        update(rec,"bottleSize",capacity);
        update(rec,"weight",weight);
        if(JSON.stringify(rec)!==recBefore) {
          if(isNew)report.bottleNew++;else report.bottleUpd++;
        }
        lastWithWidth=rec;
      }
      if(width) {
        const previouslyMeasured=[...originalRecs].reverse().find(r=>nonblank(r.headWidth));
        // An unedited export must round-trip without moving head width to a newer bottle record.
        const widthChanged = str(previouslyMeasured?.headWidth)!==str(width);
        if(!widthChanged) { /* preserve the original measurement position */ }
        else if(lastWithWidth)update(lastWithWidth,"headWidth",width);
        else if(ind.bottleRecords.length) {
          const last=[...ind.bottleRecords].sort((a,b)=>String(a.date||"").localeCompare(String(b.date||""))).at(-1);
          if(last)update(last,"headWidth",width);
        } else throw Error(name+" "+code+": 두폭을 입력하려면 병 기록이 1건 이상 필요합니다.");
      }
      const prepupa=days(row[final]),pupa=days(row[final+1]),emerge=days(row[final+2]),length=number(row[final+3],"총장"),memo=str(row[final+4]);
      if(prepupa||pupa){
        ind.pupation=ind.pupation||{};
        update(ind.pupation,"prepupaDate",prepupa);
        update(ind.pupation,"pupaDate",pupa);
      }
      if(emerge||length) {
        ind.eclosion=ind.eclosion||{};
        update(ind.eclosion,"date",emerge);
        update(ind.eclosion,"totalLength",length);
      }
      update(ind,"memo",memo);
      if(wasExisting) {
        // Updating head width on existing records also counts as a modified larva.
        if(JSON.stringify(ind)!==before) report.larvaeUpd++;
      } else report.larvaeNew++;
      usedIndividuals.add(ind.id);
    }
  }
  return {next:data,report,format:"line"};
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
  const lineFormat = parseLineXLSXWorkbook(wb, data);
  if (lineFormat) return lineFormat;
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


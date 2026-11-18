
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
        if(lastWithWidth)update(lastWithWidth,"headWidth",width);
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

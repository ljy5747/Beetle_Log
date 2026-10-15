/* ════════════════════ 유충 카드 (라인 목록 / 교체 대상 목록에서 공용) ════════════════════ */
function LarvaCard({ ind, crownM, crownF, lineCode, onOpen, onBottle }) {
  const lr = latestRec(ind), mw = maxWeight(ind), dl = lastDelta(ind);
  const dd = ind.status === "유충" && lr?.nextDate ? dday(lr.nextDate) : null;
  const red = reduction(ind);
  const dead = ind.status === "사망";
  const isCrown = ind.id === crownM || ind.id === crownF;
  return (
    <div id={"larva-" + ind.id} className={"card" + (dead ? " dead" : "") + (isCrown ? " crown" : "")} onClick={onOpen}>
      <div className="card-l">
        <div className="tagrow">
          {isCrown && <span className="crown-ic" title="기대주">👑</span>}
          <span className={"tag mono" + (dead ? " strike" : "")}>{ind.code}</span>
          <span className="chip" style={{ color: STATUS_COLOR[ind.status], borderColor: STATUS_COLOR[ind.status] + "55" }}>{ind.status}</span>
          {dd != null && <span className={"chip dd" + ddClass(dd)}>{dd <= 0 ? `D+${-dd} 지남` : `D-${dd}`}</span>}
          {allFlags(ind).map((fl) => <span key={fl} className="chip flag-mini">{fl}</span>)}
        </div>
        <div className="card-sub">
          {lineCode && <><b style={{ color: "var(--dim)", fontWeight: 700 }}>{lineCode}</b> · </>}
          {ind.sex !== "미구분" && (
            <><span className={ind.sex.includes("수") ? "sx-m" : "sx-f"}>{ind.sex.includes("수") ? "♂︎" : "♀︎"}</span>
            <b style={{ color: "var(--text)", fontWeight: 700, marginLeft: 3 }}>{ind.sex.includes("수") ? "수컷" : "암컷"}</b>
            {lr && " · "}</>
          )}
          {lr ? `최근 ${shortDate(lr.date)}` : (ind.sex === "미구분" ? "기록 전" : "")}
        </div>
        {lr && (lr.feedBrand || lr.feedType || lr.bottleSize) && (
          <div className="card-feed">{[lr.feedBrand || lr.feedType, ccLabel(lr.bottleSize), lr.pudding ? "푸딩컵" : null].filter(Boolean).join(" · ")}</div>
        )}
        <div className="card-val mono">
          {ind.status === "우화" && num(ind.eclosion?.totalLength) ? (
            <>{n1(num(ind.eclosion.totalLength))}<small>mm</small>{red && <em> 환원율 {n2(red)}</em>}</>
          ) : lr && num(lr.weight) ? (
            <>{n1(num(lr.weight))}<small>g</small>
              {dl != null && <em className={dl >= 0 ? "up" : "down"}> {dl >= 0 ? "▲" : "▼"}{n1(Math.abs(dl))}</em>}
              {mw && num(lr.weight) < mw && <em> 최대 {n1(mw)}g</em>}
              {lastHeadWidth(ind) && <em> 두폭 {n1(lastHeadWidth(ind))}</em>}</>
          ) : <span className="dim">기록 없음</span>}
        </div>
      </div>
      <div className="card-r">
        <Spark ind={ind} />
        {ind.status === "유충" && (
          <button className="btn tiny" onClick={(e) => { e.stopPropagation(); onBottle(); }}>+ 교체</button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════ 라인 부모(부·모) 정보 카드 ════════════════════ */
function LineParentCard({ p, role, onOpen }) {
  const male = role === "부";
  if (!p) return (
    <div className="pcard empty">
      <div className="pcard-ph sp-ph"><span>{male ? "부 미지정" : "모 미지정"}</span></div>
      <div className="pcard-r"><div className="pcard-role dim"><span className={male ? "sx-m" : "sx-f"}>{male ? "♂︎" : "♀︎"}</span> 종충 미지정</div>
        <div className="pcard-sub">라인 수정에서 종충을 골라주세요</div></div>
    </div>
  );
  const ratio = num(p.totalLength) && num(p.jawLength) ? num(p.jawLength) / num(p.totalLength) * 100 : null;
  const meas = [
    num(p.totalLength) && ["총장", n1(num(p.totalLength)) + "mm"],
    num(p.jawLength) && ["턱", n1(num(p.jawLength)) + "mm"],
    num(p.jawWidth) && ["악폭", n1(num(p.jawWidth)) + "mm"],
    num(p.jawThick) && ["악후", n1(num(p.jawThick)) + "mm"],
    num(p.headWidth) && ["두폭", n1(num(p.headWidth)) + "mm"],
    num(p.thoraxWidth) && ["흉폭", n1(num(p.thoraxWidth)) + "mm"],
    ratio && ["턱비율", n1(ratio) + "%"],
  ].filter(Boolean);
  return (
    <div className={"pcard" + (male ? " male" : " female")} onClick={onOpen}>
      <SpeciesPhoto photo={p.photo} species={p.species} className="pcard-ph" />
      <div className="pcard-r">
        <div className="pcard-top">
          <span className="pcard-role"><span className={male ? "sx-m" : "sx-f"}>{male ? "♂︎" : "♀︎"}</span> 종충</span>
          <span className="tag mono">{p.code}</span>
          {p.gen && <span className="chip gen mono">{p.gen}</span>}
          {p.status === "사망" && <span className="chip" style={{ color: "#9A9088", borderColor: "#9A908855" }}>사망</span>}
        </div>
        <div className="pcard-sub">{[p.species, p.line, p.origin].filter(Boolean).join(" · ") || "정보 미입력"}</div>
        {meas.length > 0 ? (
          <div className="pcard-meas mono">
            {meas.map(([k, v]) => <span key={k}><i>{k}</i> <b>{v}</b></span>)}
          </div>
        ) : <div className="pcard-sub dim">측정값 미입력</div>}
      </div>
    </div>
  );
}

/* ════════════════════ 라인 암수 통계 ════════════════════ */
function LineSexStats({ kids }) {
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const rows = [
    { key: "수", label: "♂︎ 수컷", color: "#5A7A9A" },
    { key: "암", label: "♀︎ 암컷", color: "#A8884F" },
  ].map((r) => {
    const mine = kids.filter((i) => isActive(i) && (i.sex || "").includes(r.key));
    const ws = mine.filter((i) => i.status === "유충").map((i) => num(latestRec(i)?.weight)).filter(Boolean);
    const pw = mine.map((i) => num(i.pupation?.pupaWeight)).filter(Boolean);
    const tl = mine.map((i) => num(i.eclosion?.totalLength)).filter(Boolean);
    return { ...r, n: mine.length, w: avg(ws), wN: ws.length, p: avg(pw), pN: pw.length, t: avg(tl), tN: tl.length };
  }).filter((r) => r.n > 0);
  if (!rows.length) return null;
  const cell = { flex: 1, textAlign: "right" };
  const cnt = (n) => n > 0 ? <small style={{ color: "var(--dim)", fontWeight: 600 }}> ({n})</small> : null;
  return (
    <div className="panel">
      <div className="p-t">암수 통계 <small style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>· 괄호 = 마릿수</small></div>
      <div style={{ display: "flex", fontSize: 11, color: "var(--dim)", fontWeight: 700, marginBottom: 6 }}>
        <span style={{ flex: 1.1 }}></span>
        <span style={cell}>유충무게</span><span style={cell}>번데기</span><span style={cell}>성충길이</span>
      </div>
      {rows.map((r) => (
        <div key={r.key} className="mono" style={{ display: "flex", alignItems: "baseline", padding: "4px 0", fontSize: 14 }}>
          <span style={{ flex: 1.1, color: r.color, fontWeight: 800, fontSize: 13 }}>{r.label} <small style={{ color: "var(--dim)", fontWeight: 600 }}>{r.n}</small></span>
          <span style={cell}>{r.w ? <><b>{n1(r.w)}</b><small style={{ color: "var(--dim)" }}>g</small>{cnt(r.wN)}</> : <span className="dim">—</span>}</span>
          <span style={cell}>{r.p ? <><b>{n1(r.p)}</b><small style={{ color: "var(--dim)" }}>g</small>{cnt(r.pN)}</> : <span className="dim">—</span>}</span>
          <span style={cell}>{r.t ? <><b>{n1(r.t)}</b><small style={{ color: "var(--dim)" }}>mm</small>{cnt(r.tN)}</> : <span className="dim">—</span>}</span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════ 라인 무게 그래프 (병갈이 회차 기준 꺾은선) ════════════════════ */
function LineWeightChart({ kids }) {
  /* 투입한 병이 1번 병. 푸딩컵 기록은 병 번호에서 제외 (푸딩 다음 병이 1병) */
  const series = kids.filter(isActive).map((ind) => {
    const ws = sortedRecs(ind).filter((r) => !isPudding(r)).map((r) => num(r.weight)).filter(Boolean);
    return { ind, pts: [{ n: 1, w: 0 }, ...ws.map((w, i) => ({ n: i + 2, w }))], recN: ws.length };
  }).filter((s) => s.recN >= 1);
  if (!series.length) return null;
  const maxN = Math.max(...series.map((s) => s.recN + 1)); /* 마지막 병 번호 */
  const maxW = Math.max(...series.flatMap((s) => s.pts.map((p) => p.w)));
  if (!maxN || !maxW) return null;
  const W = 340, H = 230, pl = 30, pr = 34, pt = 14, pb = 24;
  const X = (n) => pl + ((n - 1) / Math.max(1, maxN - 1)) * (W - pl - pr);
  const Y = (w) => pt + (1 - w / maxW) * (H - pt - pb);
  const colorOf = (ind) => (ind.sex || "").includes("수") ? "#5A7A9A" : (ind.sex || "").includes("암") ? "#A8884F" : "#B8B2A6";
  /* 유충 번호 끝자리 (예: 26SA01 → 01) */
  const tail = (code) => { const m = String(code).match(/(\d+)\s*$/); return m ? m[1] : String(code).slice(-3); };
  /* 암수 평균 (살아있는 유충의 최근 무게) — 가로 점선 */
  const avgOf = (sexKey) => {
    const ws = kids.filter((i) => isActive(i) && (i.sex || "").includes(sexKey) && i.status === "유충")
      .map((i) => num(latestRec(i)?.weight)).filter(Boolean);
    return ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
  };
  const avgM = avgOf("수"), avgF = avgOf("암");
  const nM = series.filter((s) => (s.ind.sex || "").includes("수")).length;
  const nF = series.filter((s) => (s.ind.sex || "").includes("암")).length;
  const nU = series.length - nM - nF;
  /* 암수 1등(최근 무게 최대)만 번호 라벨 */
  const topOf = (sexKey) => {
    const mine = series.filter((s) => (s.ind.sex || "").includes(sexKey));
    if (!mine.length) return null;
    return mine.reduce((best, s) => (s.pts[s.pts.length - 1].w > best.pts[best.pts.length - 1].w ? s : best));
  };
  const topM = topOf("수"), topF = topOf("암");
  const topIds = [topM, topF].filter(Boolean).map((s) => s.ind.id);
  return (
    <>
    <div className="panel" style={{ marginBottom: 6 }}>
      <div className="p-t">무게 그래프
        <small style={{ fontWeight: 700, textTransform: "none", letterSpacing: 0, marginLeft: 8 }}>
          {nM > 0 && <span style={{ color: "#5A7A9A" }}>♂︎{nM} </span>}
          {nF > 0 && <span style={{ color: "#A8884F" }}>♀︎{nF} </span>}
          {nU > 0 && <span style={{ color: "#B8B2A6" }}>미구분{nU}</span>}
        </small>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* 가로 눈금선 + Y축 라벨 (0 / 중간 / 최대) */}
        {[0, maxW / 2, maxW].map((w, i) => (
          <g key={i}>
            <line x1={pl} y1={Y(w)} x2={W - pr} y2={Y(w)} stroke="#E7E3DC" strokeWidth="1" />
            <text x={pl - 4} y={Y(w) + 3.5} fontSize="9.5" fill="#8A8378" textAnchor="end" fontFamily="ui-monospace,monospace">{n1(w)}</text>
          </g>
        ))}
        {/* X축 회차 라벨 (0 ~ maxN) */}
        {Array.from({ length: maxN }, (_, i) => i + 1).map((n) => (
          <text key={n} x={X(n)} y={H - 8} fontSize="9.5" fill="#8A8378" textAnchor="middle" fontFamily="ui-monospace,monospace">{n}병</text>
        ))}
        {/* 암수 평균 가로 점선 (라벨은 왼쪽에) */}
        {avgM && (
          <g>
            <line x1={pl} y1={Y(avgM)} x2={W - pr} y2={Y(avgM)} stroke="#5A7A9A" strokeWidth="1.3" strokeDasharray="5 4" opacity="0.8" />
            <text x={pl + 3} y={Y(avgM) - 4} fontSize="9" fill="#5A7A9A" fontWeight="700" fontFamily="ui-monospace,monospace">♂︎평균 {n1(avgM)}</text>
          </g>
        )}
        {avgF && (
          <g>
            <line x1={pl} y1={Y(avgF)} x2={W - pr} y2={Y(avgF)} stroke="#A8884F" strokeWidth="1.3" strokeDasharray="5 4" opacity="0.8" />
            <text x={pl + 3} y={Y(avgF) - 4} fontSize="9" fill="#A8884F" fontWeight="700" fontFamily="ui-monospace,monospace">♀︎평균 {n1(avgF)}</text>
          </g>
        )}
        {/* 각 유충 꺾은선 (1등은 진하게) */}
        {series.map((s) => {
          const last = s.pts[s.pts.length - 1];
          const isTop = topIds.includes(s.ind.id);
          return (
            <g key={s.ind.id}>
              <polyline points={s.pts.map((p) => `${X(p.n)},${Y(p.w)}`).join(" ")}
                fill="none" stroke={colorOf(s.ind)} strokeWidth={isTop ? 2.2 : 1.4} strokeLinejoin="round" opacity={isTop ? 0.95 : 0.45} />
              {s.pts.slice(1).map((p, i) => (
                <circle key={i} cx={X(p.n)} cy={Y(p.w)} r={p.n === last.n ? (isTop ? 3.2 : 2.4) : 1.6} fill={colorOf(s.ind)} opacity={isTop ? 0.95 : 0.5} />
              ))}
            </g>
          );
        })}
        {/* 번호 라벨 — 암수 1등만 (오른쪽 끝이면 점 왼쪽에 표시) */}
        {[topM, topF].filter(Boolean).map((s) => {
          const last = s.pts[s.pts.length - 1];
          const nearRight = X(last.n) > W - 92;
          return (
            <text key={s.ind.id} x={nearRight ? X(last.n) - 7 : X(last.n) + 7} y={Y(last.w) + 3.5}
              fontSize="10" fill={colorOf(s.ind)} fontWeight="800" fontFamily="ui-monospace,monospace"
              textAnchor={nearRight ? "end" : "start"}>👑{tail(s.ind.code)} ({n1(last.w)}g)</text>
          );
        })}
      </svg>
    </div>
    <div className="hint" style={{ margin: "0 4px 14px" }}>👑번호 = 암수 1등(최근 무게) · 점선 = 암수 평균 · 가로축 = 병 번호(투입한 병이 1병)</div>
    </>
  );
}

/* ════════════════════ 사진 (본인 사진 → 종 디폴트 → 종 이름 빈칸) ════════════════════
   종 디폴트 사진: icons/species/<종이름>.png 로 올리면 자동 표시됩니다 */
function SpeciesPhoto({ photo, species, className }) {
  const [err, setErr] = useState(false);
  if (photo) return <img src={photo} alt="" className={className} />;
  if (!species || err) return (
    <div className={(className || "") + " sp-ph"}><span>{species || "종 미입력"}</span></div>
  );
  return <img src={"icons/species/" + encodeURIComponent(species) + ".png"} alt={species} className={className} onError={() => setErr(true)} />;
}

/* ════════════════════ 누대수(세대) 계산 ════════════════════
   WD(와일드) → WF1 → F2 → F3 …  /  혈통·산지가 다르면 CBF1
   레벨: WD=0, WF1·F1·CBF1=1, F2·CBF2=2 … */
function genLevel(g) {
  const s = String(g || "").trim().toUpperCase();
  if (!s) return null;
  if (s === "WD") return 0;
  const m = s.match(/(\d+)\s*$/);
  return m ? parseInt(m[1]) : null;
}
const isWD = (g) => String(g || "").trim().toUpperCase() === "WD";
const norm = (v) => String(v || "").trim();

/* 부·모 성충을 받아 자식 라인의 누대수를 계산 */
function calcGen(fa, mo) {
  if (!fa || !mo) return "";
  const gf = norm(fa.gen), gm = norm(mo.gen);
  if (!gf || !gm) return "";
  const sameOrigin = norm(fa.origin) !== "" && norm(fa.origin) === norm(mo.origin);
  const sameLine = norm(fa.line) !== "" && norm(fa.line) === norm(mo.line);
  /* 와일드끼리 */
  if (isWD(gf) && isWD(gm)) return sameOrigin ? "WF1" : "CBF1";
  /* 한쪽만 와일드 → 이종교배 */
  if (isWD(gf) || isWD(gm)) return "CBF1";
  const lf = genLevel(gf), lm = genLevel(gm);
  if (lf == null || lm == null) return "";
  /* 같은 혈통이면서 산지도 같아야 세대가 올라감 */
  if (sameLine && sameOrigin) {
    const next = Math.min(lf, lm) + 1;
    /* 접두어(WF/CBF/F)는 부모가 같은 계통일 때 그대로 이어감 — WF1×WF1 → WF2 */
    const pre = (g) => (g.toUpperCase().match(/^(CBF|WF|F)/) || ["F"])[0];
    const pf = pre(gf), pm = pre(gm);
    return (pf === pm ? pf : "F") + next;
  }
  return "CBF1"; /* 혈통 또는 산지가 다름 */
}

/* ════════════════════ 자동 백업 스냅샷 (최근 5개 순환 보관) ════════════════════ */
const SNAP_KEY = "beetle-snapshots", SNAP_MAX = 1;
async function snapList() {
  try { const raw = await idbGet(SNAP_KEY); const a = raw ? JSON.parse(raw) : []; return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
}
/* 사진(base64)은 용량이 커서 스냅샷에는 항상 제외 — 되돌릴 때 현재 사진을 다시 붙여줍니다 */
function snapShrink(data) {
  const lite = JSON.parse(JSON.stringify(data));
  let had = false;
  (lite.parents || []).forEach((p) => { if (p.photo) { p.photo = ""; had = true; } });
  /* 교체 기록 사진도 제외 (개수가 많아 백업이 커짐) */
  (lite.individuals || []).forEach((i) => {
    (i.bottleRecords || []).forEach((r) => { if (r.photo) { r.photo = ""; had = true; } });
  });
  return { data: lite, noPhoto: had };
}
/* 되돌릴 때: 스냅샷에 없는 사진을 현재 데이터에서 같은 개체끼리 복원 */
function snapMergePhotos(snapData, current) {
  const byId = {}, byCode = {};
  const ck = (p) => (p.code || "") + "\u0000" + (p.species || ""); /* 종이 다르면 같은 번호도 별개 */
  (current.parents || []).forEach((p) => { if (p.photo) { byId[p.id] = p.photo; if (p.code) byCode[ck(p)] = p.photo; } });
  const out = JSON.parse(JSON.stringify(snapData));
  (out.parents || []).forEach((p) => { if (!p.photo) p.photo = byId[p.id] || byCode[ck(p)] || ""; });
  /* 교체 기록 사진도 현재 데이터에서 같은 기록끼리 복원 */
  const recPhoto = {};
  (current.individuals || []).forEach((i) => {
    (i.bottleRecords || []).forEach((r) => { if (r.photo) recPhoto[i.id + "|" + r.id] = r.photo; });
  });
  (out.individuals || []).forEach((i) => {
    (i.bottleRecords || []).forEach((r) => { if (!r.photo) r.photo = recPhoto[i.id + "|" + r.id] || ""; });
  });
  return out;
}
async function snapSave(data, reason) {
  try {
    const w = dataWeight(data);
    if (!w) return; /* 빈 데이터는 보관하지 않음 */
    const list = await snapList();
    const last = list[list.length - 1];
    /* 같은 날 이미 있고 내용이 비슷하면 갱신, 아니면 새로 추가 */
    const { data: body, noPhoto } = snapShrink(data);
    const entry = { at: Date.now(), weight: w, reason: reason || "자동", noPhoto, data: body };
    const sameDay = last && new Date(last.at).toDateString() === new Date().toDateString() && last.reason === entry.reason;
    const next = sameDay ? [...list.slice(0, -1), entry] : [...list, entry];
    while (next.length > SNAP_MAX) next.shift();
    await idbSet(SNAP_KEY, JSON.stringify(next));
  } catch (e) { /* 용량 초과 등은 조용히 무시 */ }
}


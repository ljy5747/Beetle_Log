      {/* ───── 유충 상세 ───── */}
      {view.name === "detail" && cur && (() => {
        const L = lineById[cur.lineId] || {};
        const recs = sortedRecs(cur);
        const mw = maxWeight(cur), red = reduction(cur), ld = larvaDays(cur);
        return (
          <>
            <div className="topbar">
              <button className="hbtn" onClick={() => goView(L.id ? { name: "lineDetail", id: L.id } : { name: "list" }, true)}>‹ {L.code || "목록"}</button>
              <div className="tagrow">
                <span className="tag mono big">{cur.code}</span>
                <span className="chip" style={{ color: STATUS_COLOR[cur.status], borderColor: STATUS_COLOR[cur.status] + "55" }}>{cur.status}</span>
              </div>
              <button className="hbtn" onClick={() => setModal({ type: "larvaEdit", indId: cur.id })}>수정</button>
            </div>
            <div className="d-sub">{[L.code, L.species, cur.sex !== "미구분" ? cur.sex : null].filter(Boolean).join(" · ")}</div>

            <div className="stats">
              <div className="stat"><div className="s-l">최대 유충무게</div><div className="s-v mono">{mw ? n1(mw) + "g" : "—"}</div></div>
              <div className="stat"><div className="s-l">번데기 무게</div><div className="s-v mono">{num(cur.pupation?.pupaWeight) ? n1(num(cur.pupation.pupaWeight)) + "g" : "—"}</div></div>
              <div className="stat"><div className="s-l">성충 총장</div><div className="s-v mono">{num(cur.eclosion?.totalLength) ? n1(num(cur.eclosion.totalLength)) + "mm" : "—"}</div></div>
              <div className="stat hl"><div className="s-l">환원율</div><div className="s-v mono">{red ? n2(red) : "—"}</div></div>
              <div className="stat"><div className="s-l">두폭</div><div className="s-v mono">{lastHeadWidth(cur) ? n1(lastHeadWidth(cur)) + "mm" : "—"}</div></div>
              <div className="stat"><div className="s-l">유충 기간{ld != null && !larvaDaysDone(cur) ? " (진행)" : ""}</div><div className="s-v mono">{ld != null ? ld + "일" : "—"}</div></div>
            </div>

            {sortedRecs(cur).filter((r) => num(r.weight)).length >= 2 && (
              <div className="panel"><div className="p-t">성장 곡선</div><Spark ind={cur} w={300} h={64} big /></div>
            )}

            <div className="acts">
              <button className="btn primary" onClick={() => setModal({ type: "bottle", indId: cur.id })}>+ 교체</button>
              <button className="btn" onClick={() => setModal({ type: "pupation", indId: cur.id })}>{cur.pupation ? "용화 수정" : "용화 기록"}</button>
              <button className="btn" onClick={() => setModal({ type: "eclosion", indId: cur.id })}>{cur.eclosion ? "우화 수정" : "우화 기록"}</button>
            </div>

            {/* 개체 특이사항 — 눌러서 켜고 끄기 */}
            <div className="chiprow" style={{ marginBottom: 16 }}>
              {["원더링", "성장불량"].map((fl) => {
                const on = (cur.flags || []).includes(fl);
                return (
                  <button key={fl} className={"chipbtn" + (on ? " on" : "")}
                    onClick={() => {
                      const now = cur.flags || [];
                      const next = on ? now.filter((x) => x !== fl) : [...now, fl];
                      updateInd(cur.id, { flags: next });
                      say(on ? `${fl} 해제` : `${fl} 표시됨`);
                    }}>{on ? "✓ " : "+ "}{fl}</button>
                );
              })}
            </div>

            {cur.eclosion && (
              cur.promotedToParentId && data.parents.find((p) => p.id === cur.promotedToParentId) ? (
                <button className="btn sm" style={{ width: "100%", marginBottom: 16, borderColor: "#A8884F66", color: "#937640" }}
                  onClick={() => goView({ name: "parentDetail", id: cur.promotedToParentId }, false)}>
                  🪲 등록된 성충 보기 ›
                </button>
              ) : (
                <button className="btn primary sm" style={{ width: "100%", marginBottom: 16 }}
                  onClick={() => promoteToParent(cur)}>
                  ⬆ 성충으로 등록 (사육 이력 자동 이관)
                </button>
              )
            )}

            {(cur.status === "사망" || cur.status === "분양") ? (
              <button className="btn ghost sm" style={{ width: "100%", marginBottom: 16 }}
                onClick={() => { updateInd(cur.id, { status: "유충" }); say(`${cur.status} 처리를 해제했어요`); }}>
                ↩ {cur.status} 처리 해제 (유충으로 되돌리기)
              </button>
            ) : (
              <div className="row" style={{ marginBottom: 16 }}>
                <ConfirmBtn className="btn danger sm" label="✕ 사망 처리"
                  onConfirm={() => { updateInd(cur.id, { status: "사망" }); say("사망 처리됐어요"); }} />
                <ConfirmBtn className="btn sm" label="→ 분양 처리"
                  onConfirm={() => { updateInd(cur.id, { status: "분양" }); say("분양 처리됐어요"); }} />
              </div>
            )}

            {cur.eclosion && (
              <div className="panel">
                <div className="p-t">우화 · {cur.eclosion.date}{cur.eclosion.defect && <span className="warn"> 우화부전</span>}</div>
                <div className="meas mono">
                  {[["총장", cur.eclosion.totalLength], ["턱", cur.eclosion.jawLength], ["악폭", cur.eclosion.jawWidth], ["악후", cur.eclosion.jawThick], ["두폭", cur.eclosion.headWidth], ["흉폭", cur.eclosion.thoraxWidth], ["배", cur.eclosion.abdomenLength]]
                    .filter(([, v]) => num(v)).map(([k, v]) => <span key={k}>{k} <b>{v}</b>mm</span>)}
                </div>
                {cur.eclosion.memo && <div className="r-memo">{cur.eclosion.memo}</div>}
              </div>
            )}
            {cur.pupation && (
              <div className="panel">
                <div className="p-t">용화</div>
                <div className="meas mono">
                  {cur.pupation.prepupaDate && <span>전용 <b>{shortDate(cur.pupation.prepupaDate)}</b></span>}
                  {cur.pupation.pupaDate && <span>용화 <b>{shortDate(cur.pupation.pupaDate)}</b></span>}
                  {num(cur.pupation.pupaWeight) && <span>번데기 <b>{cur.pupation.pupaWeight}</b>g</span>}
                </div>
                {cur.pupation.memo && <div className="r-memo">{cur.pupation.memo}</div>}
              </div>
            )}

            <div className="p-t lt">교체 기록 {recs.length ? `· ${recs.length}회` : ""}</div>
            {recs.length === 0 && <div className="empty sm"><div className="empty-d">아직 기록이 없어요. + 교체로 첫 기록을 남겨보세요.</div></div>}
            {recs.map((r, idx) => {
              const prev = recs[idx - 1];
              const d = num(r.weight) && num(prev?.weight) ? num(r.weight) - num(prev.weight) : null;
              const isLast = idx === recs.length - 1;
              /* 이 병을 먹은 기간 = 이 기록일 ~ 다음 교체일 (마지막 병은 오늘까지 진행 중) */
              const next = recs[idx + 1];
              const eaten = next ? daysBetween(r.date, next.date)
                : (cur.status === "유충" ? daysBetween(r.date, today()) : null);
              const eating = !next && cur.status === "유충";
              return (
                <div key={r.id} className="rec" onClick={() => setModal({ type: "bottle", indId: cur.id, editId: r.id, initial: r })}>
                  <div className="r-top">
                    <span className="mono r-date">{r.date}</span>
                    {r.instar && <span className="r-ins">{r.instar}</span>}
                    {eaten != null && eaten >= 0 && (
                      <span className={"r-gap" + (eating ? " on" : "")}>{eating ? `${eaten}일째 섭식 중` : `${eaten}일 섭식`}</span>
                    )}
                    {num(r.weight) && <span className="mono r-w">{n1(num(r.weight))}g{d != null && <em className={d >= 0 ? "up" : "down"}> {d >= 0 ? "▲" : "▼"}{n1(Math.abs(d))}</em>}</span>}
                  </div>
                  <div className="r-mid">{[r.feedType, r.feedBrand, ccLabel(r.bottleSize), r.pudding ? "푸딩컵" : null, num(r.headWidth) ? `두폭 ${r.headWidth}` : null].filter(Boolean).join(" · ")}</div>
                  {r.photo && <img src={r.photo} alt="" className="r-photo" onClick={(e) => { e.stopPropagation(); setModal({ type: "photo", src: r.photo }); }} />}
                  {(r.flags || []).length > 0 && (
                    <div className="flag-show">
                      {r.flags.map((fl) => <span key={fl} className="flag-tag">{fl}</span>)}
                    </div>
                  )}
                  {r.nextDate && (
                    <div className="r-next">
                      다음 예정 <b className="mono">{r.nextDate}</b>{isLast && cur.status === "유충" && <span className="dim"> ({dday(r.nextDate) <= 0 ? `${-dday(r.nextDate)}일 지남` : `D-${dday(r.nextDate)}`})</span>}
                    </div>
                  )}
                  {r.memo && <div className="r-memo">{r.memo}</div>}
                </div>
              );
            })}

            <div className="p-t lt" onClick={() => setInfoOpen(!infoOpen)} style={{ cursor: "pointer" }}>기본 정보 {infoOpen ? "▾" : "▸"}</div>
            {infoOpen && (
              <div className="panel">
                <div className="kv">
                  {[["라인", L.code], ["종", L.species], ["산지", L.origin],
                    ["♂︎ 종충", parentById[L.fatherId] ? `${parentById[L.fatherId].code}${num(parentById[L.fatherId].totalLength) ? ` / ${parentById[L.fatherId].totalLength}mm` : ""}` : ""],
                    ["♀︎ 종충", parentById[L.motherId] ? `${parentById[L.motherId].code}${num(parentById[L.motherId].totalLength) ? ` / ${parentById[L.motherId].totalLength}mm` : ""}` : ""],
                    ["해체일", L.breakdownDate],
                    ["페어링일", L.pairDate], ["메모", cur.memo],
                  ].filter(([, v]) => v).map(([k, v]) => <div key={k} className="kv-row"><span className="kv-k">{k}</span><span className="kv-v">{v}</span></div>)}
                </div>
              </div>
            )}
            <div style={{ marginTop: 22, textAlign: "center" }}>
              <ConfirmBtn className="btn danger sm" label="이 유충 삭제"
                onConfirm={() => { const lid = cur.lineId; persist({ ...data, individuals: data.individuals.filter((i) => i.id !== cur.id) }); setView(lid ? { name: "lineDetail", id: lid } : { name: "list" }); say("삭제됐어요"); }} />
            </div>
            <div style={{ height: 40 }} />
          </>
        );
      })()}


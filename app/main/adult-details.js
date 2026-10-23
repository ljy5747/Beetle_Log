      {/* ───── 성충 상세 (분양카드) ───── */}
      {view.name === "parentDetail" && curP && (() => {
        const p = curP;
        const myLines = data.lines.filter((l) => l.fatherId === p.id || l.motherId === p.id);
        return (
          <>
            <div className="topbar">
              <button className="hbtn" onClick={() => goView({ name: "list" }, true)}>‹ 목록</button>
              <div className="tagrow"><span className="tag mono big">{p.code}</span></div>
              <button className="hbtn" onClick={() => setModal({ type: "parent", editId: p.id })}>수정</button>
            </div>

            <div className="bcard">
              <SpeciesPhoto photo={p.photo} species={p.species} sex={p.sex} className="bc-photo" />
              <div className="bc-head serif">BREEDING CARD</div>
              <div className="bc-species serif">{p.species || "종 미입력"}</div>
              <div className="bc-sub">{[p.line, p.gen, p.origin, p.sex].filter(Boolean).join(" · ")}</div>
              {p.status === "사망" && <div className="bc-dead">사망 · 계보 보존</div>}
              {p.bornLineId && lineById[p.bornLineId] && (() => {
                const bl = lineById[p.bornLineId];
                const gf = parentById[bl.fatherId], gm = parentById[bl.motherId];
                return (
                  <div className="bc-lineage">
                    출신 <b>{bl.code}</b>
                    {(gf || gm) && <> · {gf ? gf.code : "?"}♂︎ × {gm ? gm.code : "?"}♀︎</>}
                  </div>
                );
              })()}
              {(p.sireId && parentById[p.sireId]) || (p.damId && parentById[p.damId]) ? (
                <div className="bc-lineage">
                  부모 {p.sireId && parentById[p.sireId] ? `${parentById[p.sireId].code}♂︎` : "?♂︎"} × {p.damId && parentById[p.damId] ? `${parentById[p.damId].code}♀︎` : "?♀︎"}
                </div>
              ) : null}
              <div className="bc-line" />
              {(() => {
                /* 체장·우화일은 기본 표시, 나머지는 값이 있을 때만 */
                const ratio = num(p.totalLength) && num(p.jawLength) ? n1(num(p.jawLength) / num(p.totalLength) * 100) + "%" : null;
                const cells = [
                  ["체장", num(p.totalLength) ? n1(num(p.totalLength)) + "mm" : "—"],
                  num(p.jawLength) && ["턱 길이", n1(num(p.jawLength)) + "mm"],
                  num(p.headWidth) && ["두폭", n1(num(p.headWidth)) + "mm"],
                  num(p.thoraxWidth) && ["흉폭", n1(num(p.thoraxWidth)) + "mm"],
                  ratio && ["턱 비율", ratio],
                  num(p.jawWidth) && ["악폭", n1(num(p.jawWidth)) + "mm"],
                  num(p.jawThick) && ["악후", n1(num(p.jawThick)) + "mm"],
                  ["우화일", p.eclosionDate ? shortDate(p.eclosionDate) : "—"],
                ].filter(Boolean);
                return (
                  <div className="bc-grid">
                    {cells.map(([k, v]) => (
                      <div key={k}><div className="s-l">{k}</div><div className="s-v mono">{v}</div></div>
                    ))}
                  </div>
                );
              })()}
              {(p.source || p.memo) && <div className="bc-line" />}
              {p.source && <div className="bc-foot">입수처 · {p.source}</div>}
              {p.memo && <div className="bc-foot">{p.memo}</div>}
              <div className="bc-qr">QR 인증카드는 웹사이트 오픈 시 제공 예정</div>
            </div>

            {/* 사육 이력 표 (라벨지 스타일) */}
            <div className="p-t lt" style={{ display: "flex", alignItems: "center" }}>
              사육 이력 {(p.growthRecords || []).length ? `· ${p.growthRecords.length}건` : ""}
              <button className="btn tiny" style={{ marginLeft: "auto" }} onClick={() => setModal({ type: "growthRow", parentId: p.id })}>+ 추가</button>
            </div>
            {(p.growthRecords || []).length === 0 ? (
              <div className="empty sm"><div className="empty-d">사육 이력이 없어요.<br />+ 추가로 교체/측정 기록을 직접 넣거나,<br />나중에 유충이 우화하면 자동으로 채워져요.</div></div>
            ) : (
              <div className="dtable">
                <div className="dt-head">
                  <span className="dt-date">날짜</span>
                  <span className="dt-feed">먹이/병</span>
                  <span className="dt-w">무게</span>
                </div>
                {[...p.growthRecords].sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => (
                  <div key={r.id} className="dt-row" onClick={() => setModal({ type: "growthRow", parentId: p.id, editId: r.id, initial: r })}>
                    <span className="dt-date mono">{shortDate(r.date)}{r.instar && <em className="dt-ins">{r.instar}</em>}</span>
                    <span className="dt-feed">{[r.feedBrand || r.feedType, ccLabel(r.bottleSize), r.pudding ? "푸딩컵" : ""].filter(Boolean).join(" · ")}</span>
                    <span className="dt-w mono">{num(r.weight) ? n1(num(r.weight)) + "g" : "—"}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="p-t lt">이 성충의 라인 {myLines.length ? `· ${myLines.length}개` : ""}</div>
            {myLines.length === 0 && (
              <div className="empty sm"><div className="empty-d">이 성충으로 만든 라인이 아직 없어요.<br />라인 탭에서 + 버튼으로 조합을 만들어보세요.</div></div>
            )}
            {myLines.map((L) => {
              const kids = larvaeOf(L.id);
              return (
                <div key={L.id} className="card" onClick={() => goView({ name: "lineDetail", id: L.id }, false)}>
                  <div className="card-l">
                    <div className="tagrow"><span className="tag mono">{L.code}</span></div>
                    <div className="card-sub">{[L.species, L.origin].filter(Boolean).join(" · ")}</div>
                    {pairLabel(L) && <div className="card-pair">{pairLabel(L)}</div>}
                    <div className="card-val mono" style={{ fontSize: 17 }}>{kids.length}<small>마리</small></div>
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop: 18 }}>
              {p.status === "사망" ? (
                <button className="btn ghost sm" style={{ width: "100%", marginBottom: 10 }}
                  onClick={() => { persist({ ...data, parents: data.parents.map((x) => x.id === p.id ? { ...x, status: "생존" } : x) }); say("사망 처리를 해제했어요"); }}>
                  ↩ 사망 처리 해제
                </button>
              ) : (
                <div style={{ marginBottom: 10 }}>
                  <ConfirmBtn className="btn sm" label="✕ 사망 처리 (정보는 계보에 보존)"
                    onConfirm={() => { persist({ ...data, parents: data.parents.map((x) => x.id === p.id ? { ...x, status: "사망" } : x) }); say("사망 처리됐어요 — 계보 정보는 유지돼요"); }} />
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <ConfirmBtn className="btn danger sm" label="이 성충 완전 삭제"
                  onConfirm={() => { persist({ ...data, parents: data.parents.filter((x) => x.id !== p.id) }); setView({ name: "list" }); say("성충이 삭제됐어요"); }} />
              </div>
            </div>
            <div style={{ height: 40 }} />
          </>
        );
      })()}


      {/* ───── 라인 상세 ───── */}
      {/* ───── 교체 대상 유충 목록 ───── */}
      {view.name === "dueList" && (() => {
        /* 예정일이 지났거나 3일 내인 유충 (가까운 순) */
        const items = data.individuals
          .filter((i) => i.status === "유충")
          .map((i) => ({ ind: i, next: latestRec(i)?.nextDate }))
          .filter((x) => x.next && dday(x.next) <= 3)
          .sort((a, b) => dday(a.next) - dday(b.next));
        const over = items.filter((x) => dday(x.next) <= 0).length;
        return (
          <>
            <div className="topbar">
              <button className="hbtn" onClick={() => goView({ name: "list" }, true)}>‹ 목록</button>
              <div className="mtitle">교체할 유충</div>
              <span style={{ width: 44 }} />
            </div>
            <div className="d-sub">
              {items.length}마리{over > 0 && <> · <b style={{ color: "var(--red)" }}>{over}마리 지남</b></>}
            </div>
            {items.length === 0 && (
              <div className="empty"><div className="empty-t">교체할 유충이 없어요</div>
                <div className="empty-d">예정일이 다가오면 여기에 표시돼요.</div></div>
            )}
            {items.map(({ ind }) => (
              <LarvaCard key={ind.id} ind={ind} lineCode={(lineById[ind.lineId] || {}).code}
                onOpen={() => goView({ name: "detail", id: ind.id }, false)}
                onBottle={() => setModal({ type: "bottle", indId: ind.id })} />
            ))}
            <div style={{ height: 40 }} />
          </>
        );
      })()}

      {view.name === "lineDetail" && curL && (() => {
        const L = curL;
        const kids = larvaeOf(L.id).sort((a, b) => {
          const ad = a.status === "사망" ? 1 : 0, bd = b.status === "사망" ? 1 : 0;
          if (ad !== bd) return ad - bd;
          return a.code.localeCompare(b.code, "ko", { numeric: true });
        });
        const shown = kids.filter((i) => filter === "전체" || i.status === filter);
        const counts = STATUSES.reduce((a, s) => ({ ...a, [s]: kids.filter((i) => i.status === s).length }), {});
        /* 성별별 기대주(👑): 살아있는 개체 중 우화한 게 있으면 총장 최대, 없으면 유충무게 최대 */
        const topOf = (sexKey) => {
          const pool = kids.filter((i) => isActive(i) && i.sex && i.sex.includes(sexKey));
          if (pool.length === 0) return null;
          const eclosed = pool.filter((i) => num(i.eclosion?.totalLength));
          if (eclosed.length) {
            return eclosed.reduce((best, i) => (num(i.eclosion.totalLength) > num(best.eclosion.totalLength) ? i : best)).id;
          }
          const weighed = pool.filter((i) => maxWeight(i));
          if (weighed.length) {
            return weighed.reduce((best, i) => (maxWeight(i) > maxWeight(best) ? i : best)).id;
          }
          return null;
        };
        const crownM = topOf("수"), crownF = topOf("암");
        return (
          <>
            <div className="topbar">
              <button className="hbtn" onClick={() => { setFilter("전체"); goView({ name: "list" }, true); }}>‹ 목록</button>
              <div className="tagrow"><span className="tag mono big">{L.code}</span></div>
              <button className="hbtn" onClick={() => setModal({ type: "line", editId: L.id })}>수정</button>
            </div>
            <div className="d-sub">{[L.species, L.gen, L.origin].filter(Boolean).join(" · ")}</div>

            {/* 부·모 종충 정보 카드 */}
            <LineParentCard p={parentById[L.fatherId]} role="부"
              onOpen={() => parentById[L.fatherId] && goView({ name: "parentDetail", id: L.fatherId }, false)} />
            <LineParentCard p={parentById[L.motherId]} role="모"
              onOpen={() => parentById[L.motherId] && goView({ name: "parentDetail", id: L.motherId }, false)} />

            <div className="p-t lt">라인 정보</div>
            <div className="panel">
              <div className="meas mono">
                {L.pairDate && <span>페어링 <b>{shortDate(L.pairDate)}</b></span>}
                {L.setDate && <span>셋팅 <b>{shortDate(L.setDate)}</b></span>}
                {L.breakdownDate && <span>해체 <b>{shortDate(L.breakdownDate)}</b></span>}
                {L.setDate && !L.breakdownDate && <span className="dim">해체 예정 <b>{shortDate(addDays(L.setDate, 30))}</b></span>}
                {!L.pairDate && !L.setDate && !L.breakdownDate && <span className="dim">라인 정보 미입력 — 우측 상단 '수정'</span>}
              </div>
              {L.memo && <div className="r-memo">{L.memo}</div>}
            </div>

            <LineSexStats kids={kids} />
            <LineWeightChart kids={kids} />

            <div className="acts">
              <button className="btn primary" onClick={() => setModal({ type: "larvaAdd", lineId: L.id })}>+ 유충 추가</button>
              {kids.some((i) => i.status === "유충") && (
                <button className="btn" onClick={() => setModal({ type: "bulkBottle", lineId: L.id })}>+ 일괄 교체</button>
              )}
            </div>

            {kids.length > 0 && (
              <div className="filters">
                {["전체", ...STATUSES.filter((s) => counts[s] > 0)].map((s) => (
                  <button key={s} className={"fchip" + (filter === s ? " on" : "")} onClick={() => setFilter(s)}
                    style={filter === s && s !== "전체" ? { borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s] } : {}}>
                    {s}{s !== "전체" ? ` ${counts[s]}` : ` ${kids.length}`}
                  </button>
                ))}
              </div>
            )}

            {kids.length === 0 && (
              <div className="empty sm"><div className="empty-d">아직 유충이 없어요.<br />+ 유충 추가로 한 번에 여러 마리를 등록할 수 있어요.</div></div>
            )}

            {shown.map((ind) => (
              <LarvaCard key={ind.id} ind={ind} crownM={crownM} crownF={crownF}
                onOpen={() => goView({ name: "detail", id: ind.id }, false)}
                onBottle={() => setModal({ type: "bottle", indId: ind.id })} />
            ))}

            <div style={{ marginTop: 18, textAlign: "center" }}>
              <ConfirmBtn className="btn danger sm" label={`라인 삭제${kids.length ? ` (유충 ${kids.length}마리 포함)` : ""}`}
                onConfirm={() => {
                  persist({ ...data, lines: data.lines.filter((l) => l.id !== L.id), individuals: data.individuals.filter((i) => i.lineId !== L.id) });
                  setFilter("전체"); setView({ name: "list" }); say("라인이 삭제됐어요");
                }} />
            </div>
            <div style={{ height: 40 }} />
          </>
        );
      })()}


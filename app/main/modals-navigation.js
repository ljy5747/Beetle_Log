      {/* ───── 모달 ───── */}
      {modal?.type === "parent" && (
        <ParentForm
          initial={modal.editId ? data.parents.find((p) => p.id === modal.editId) : null}
          existingCodes={data.parents.map((p) => p.code)}
          allParents={data.parents}
          preset={!modal.editId ? {
            year: parentYear,
            ...(speciesFolder && !speciesFolder.endsWith("미지정")
              ? (folderBy === "line" ? { line: speciesFolder } : { species: speciesFolder }) : {}),
          } : null}
          onSave={saveParent} onClose={() => setModal(null)} />
      )}
      {modal?.type === "growthRow" && (
        <GrowthRowForm initial={modal.initial || null} brands={data.feedBrands} individuals={data.individuals} onSave={saveGrowthRow} onClose={() => setModal(null)}
          onDelete={modal.editId ? deleteGrowthRow : null} />
      )}
      {modal?.type === "line" && (
        <LineForm
          initial={modal.editId ? data.lines.find((l) => l.id === modal.editId) : null}
          defaultYear={lineYear}
          parents={data.parents}
          existingCodes={data.lines.map((l) => l.code)}
          hasLarvae={modal.editId ? larvaeOf(modal.editId).length > 0 : false}
          onRenumber={() => setModal({ type: "renumber", lineId: modal.editId })}
          onSave={saveLine} onClose={() => setModal(null)} />
      )}
      {modal?.type === "larvaAdd" && (
        <LarvaAddForm
          line={lineById[modal.lineId]}
          existingCodes={larvaeOf(modal.lineId).map((i) => i.code)}
          onSave={addLarvae} onClose={() => setModal(null)} />
      )}
      {modal?.type === "bulkBottle" && (
        <BulkBottleForm
          larvae={larvaeOf(modal.lineId)}
          brands={data.feedBrands}
          individuals={data.individuals}
          onSave={saveBulkBottle} onClose={() => setModal(null)} />
      )}
      {modal?.type === "renumber" && (
        <RenumberForm
          line={lineById[modal.lineId]}
          larvae={larvaeOf(modal.lineId)}
          onSave={saveRenumber} onClose={() => setModal(null)} />
      )}
      {modal?.type === "larvaEdit" && (
        <LarvaEditForm
          initial={data.individuals.find((i) => i.id === modal.indId)}
          lines={data.lines}
          onSave={saveLarvaEdit} onClose={() => setModal(null)} />
      )}
      {modal?.type === "photo" && (
        <div className="overlay" onClick={() => setModal(null)} style={{ alignItems: "center" }}>
          <img src={modal.src} alt="" className="photo-full" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {modal?.type === "bottle" && (
        <BottleForm initial={modal.initial || null} brands={data.feedBrands} individuals={data.individuals} onSave={saveBottle} onClose={() => setModal(null)}
          onDelete={modal.editId ? () => {
            persist({ ...data, individuals: data.individuals.map((i) => i.id !== modal.indId ? i : { ...i, bottleRecords: i.bottleRecords.filter((r) => r.id !== modal.editId) }) });
            setModal(null); say("기록이 삭제됐어요");
          } : null} />
      )}
      {modal?.type === "pupation" && (
        <PupationForm initial={data.individuals.find((i) => i.id === modal.indId)?.pupation} onSave={savePupation} onClose={() => setModal(null)} />
      )}
      {modal?.type === "eclosion" && (() => {
        const ind = data.individuals.find((i) => i.id === modal.indId);
        const species = (lineById[ind?.lineId]?.species) || "";
        return <EclosionForm initial={ind?.eclosion} species={species} onSave={saveEclosion} onClose={() => setModal(null)} />;
      })()}

      {settingsOpen && (
        <div className="overlay ov-set" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <button className="hbtn" onClick={() => setSettingsOpen(false)}>닫기</button>
              <div className="mtitle">설정</div>
              <span style={{ width: 40 }} />
            </div>
            <div className="mbody">
              <div className="sect">화면 색상</div>
              <div className="thm-row">
                {[
                  { k: "brown", n: "브라운", c: ["#F4F0E8", "#B28C6A", "#382C2A"] },
                  { k: "green", n: "그린", c: ["#FBF8F3", "#7D8B71", "#3E362E"] },
                  { k: "blue", n: "블루", c: ["#F5F3EE", "#7A96AD", "#38352F"] },
                ].map((t) => (
                  <button key={t.k} className={"thm" + (theme === t.k ? " on" : "")} onClick={() => pickTheme(t.k)}>
                    <span className="thm-dots">{t.c.map((c, i) => <i key={i} style={{ background: c }} />)}</span>
                    <span className="thm-n">{t.n}{theme === t.k ? " ✓" : ""}</span>
                  </button>
                ))}
              </div>

              <div className="sect">클라우드 동기화 (폰 ↔ PC)</div>
              {authUser ? (
                <div className="auth-box">
                  <div className="auth-me">
                    <span className="auth-dot" />
                    <div>
                      <div className="auth-email">{authUser.email}</div>
                      <div className="auth-stat">구글 로그인됨 · 자동 동기화 켜짐 ✓</div>
                    </div>
                  </div>
                  <button className="btn ghost sm mt" onClick={doLogout}>로그아웃</button>
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--line)" }}>
                    <ConfirmBtn className="btn danger sm" label="계정 삭제 (클라우드 데이터 포함)" onConfirm={async () => {
                      /* 자동 동기화 먼저 끄기 (삭제 후 재업로드 방지) */
                      autoSyncRef.current.on = false; autoSyncRef.current.key = ""; clearTimeout(autoSyncRef.current.timer);
                      try { if (syncKey) await cloudUpload(syncKey, { parents: [], lines: [], individuals: [], customEvents: [], feedBrands: [] }); } catch (e) {}
                      await authSignOut(); setAuthUser(null); setSyncKey("");
                      try { await idbSet("beetle-sync-key", ""); } catch (e) {}
                      say("계정 연결 해제 · 클라우드 데이터 삭제됨");
                    }} />
                    <div className="set-desc" style={{ marginTop: 8 }}>클라우드에 저장된 데이터가 삭제되고 로그아웃돼요. 이 기기 안의 기록은 남아있어요.</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="set-desc">구글로 로그인하면 이 계정으로 안전하게 동기화돼요. 기기가 바뀌어도 같은 계정으로 로그인하면 데이터를 그대로 볼 수 있어요.</div>
                  <button className="btn mt" style={{ width: "100%" }} onClick={authStartGoogle}>구글로 로그인</button>
                  <div className="set-desc" style={{ marginTop: 14 }}>또는 동기화 키를 직접 정해서 쓸 수도 있어요 (로그인 없이):</div>
                  <input className="in mt" value={syncKey} onChange={(e) => setSyncKey(e.target.value)} placeholder="나만의 동기화 키 (예: beetlelog-2026)" />
                </>
              )}
              <div className="row mt">
                <button className="btn" style={{ flex: 1 }} disabled={syncBusy} onClick={doUpload}>{syncBusy ? "처리 중…" : "☁︎ 올리기"}</button>
                <button className="btn primary" style={{ flex: 1 }} disabled={syncBusy} onClick={doDownload}>{syncBusy ? "처리 중…" : "⤓ 불러오기"}</button>
              </div>
              <div className="set-desc" style={{ marginTop: 8 }}>
                {authUser ? "기록하면 자동으로 서버에 저장돼요. 다른 기기에서 같은 계정으로 열면 최신 데이터를 자동으로 받아와요. (아래 버튼으로 수동으로도 가능)" : "⚠️ 키 방식은 같은 키를 다른 기기에 입력하면 그 데이터를 받아올 수 있어요. 비밀번호처럼 관리하세요."}
              </div>

              <div className="sect" style={{ marginTop: 24 }}>엑셀로 한 번에 등록</div>
              <div className="set-desc">양식을 받아 성충·라인·유충을 정리한 뒤 불러오면 한 번에 등록돼요. 같은 항목(종+관리번호, 라인명+종)은 최신 정보로 갱신하고, 새 항목은 추가해요. 유충의 교체 기록은 보존돼요.</div>
              <button className="btn mt" style={{ width: "100%" }} onClick={async () => { try { await downloadTemplate(); } catch (e) { say("⚠️ 양식 생성 실패 — 새로고침 후 다시 시도"); } }}>① 엑셀 양식 다운로드</button>
              <button className="btn primary mt" style={{ width: "100%" }} onClick={() => xlsxRef.current?.click()}>② 엑셀 불러오기</button>
              <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={importXLSX} />

              <div className="sect" style={{ marginTop: 24 }}>자동 백업 · 되돌리기</div>
              <button className="btn mt" style={{ width: "100%" }} onClick={async () => {
                const list = await snapList();
                const sn = list[list.length - 1];
                if (!sn) return say("아직 저장된 백업이 없어요");
                const curW = dataWeight(data);
                if (!confirm(`직전 기록으로 되돌립니다.\n\n저장 시각: ${new Date(sn.at).toLocaleString()}\n${curW}건 → ${sn.weight}건\n\n진행할까요?`)) return;
                await persist(snapMergePhotos(sn.data, data));
                setSnaps(await snapList());
                say(`✓ ${sn.weight}건으로 되돌렸어요`);
              }}>⏪ 직전 기록으로 되돌리기</button>
              <div className="set-desc" style={{ marginTop: 6 }}>
                앱을 켤 때와 동기화 직전에 이 기기 안에 자동으로 저장돼요 (직전 1개, 사진 제외).
                {snaps.length > 0 && <> 마지막 저장 <b>{new Date(snaps[snaps.length - 1].at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</b> · {snaps[snaps.length - 1].weight}건</>}
              </div>

              <div className="sect" style={{ marginTop: 24 }}>내보내기 / 백업</div>
              <button className="btn mt" style={{ width: "100%" }} onClick={() => (data.individuals.length || data.parents.length) ? exportXLSX(data) : say("내보낼 기록이 아직 없어요")}>전체 기록 엑셀로 내보내기</button>
              <button className="btn mt" style={{ width: "100%" }} onClick={async () => { const how = await deliverFile(`사육기록_백업_${today()}.json`, JSON.stringify(data, null, 1), "application/json"); say(how === "fail" ? "⚠️ Safari에서 시도해주세요" : "백업 파일 저장됨"); }}>JSON 백업 (사진 포함)</button>
              <button className="btn mt" style={{ width: "100%" }} onClick={() => fileRef.current?.click()}>JSON 백업 복원</button>
              <input ref={fileRef} type="file" accept=".json" style={{ display: "none" }} onChange={importJSON} />
              <div className="set-desc" style={{ marginTop: 12 }}>데이터는 이 기기에만 저장돼요. 가끔 백업해두면 안전해요.</div>
            </div>
          </div>
        </div>
      )}

      {/* ───── 하단 탭바 (직접 그린 아이콘 + 설정) ───── */}
      <div className="bnav">
        {[["lines", "라인"], ["parents", "성충"], ["calendar", "캘린더"]].map(([k, label]) => (
          <button key={k} className={"bnav-b" + (!settingsOpen && view.name === "list" && tab === k ? " on" : "")}
            onClick={() => { setSettingsOpen(false); setFilter("전체"); setTab(k); if (k === "parents") setSpeciesFolder(null); setView({ name: "list" }); }}>
            <span className="bnav-ic"><img src={"icons/tab-" + k + ".png?v=2"} alt={label} /></span>
            <span className="bnav-l">{label}</span>
          </button>
        ))}
        <button className={"bnav-b" + (settingsOpen ? " on" : "")} onClick={async () => { setSettingsOpen(true); setSnaps(await snapList()); }}>
          <span className="bnav-ic"><img src="icons/tab-settings.png?v=2" alt="설정" /></span>
          <span className="bnav-l">설정</span>
        </button>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

/* ════════════════════ 스타일 ════════════════════ */

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);



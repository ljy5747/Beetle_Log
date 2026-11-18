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
        <div className="overlay ov-set" onClick={() => { if (!autoSyncRef.current.importing) setSettingsOpen(false); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="mhead">
              <button className="hbtn" disabled={legacyImportBusy} onClick={() => setSettingsOpen(false)}>닫기</button>
              <div className="mtitle">설정</div>
              <span style={{ width: 40 }} />
            </div>
            <div className="mbody" inert={legacyImportBusy ? "" : undefined} aria-busy={legacyImportBusy}>
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

              <div className="sect">푸시 알림 설정</div>
              {authUser ? (
                <div className="auth-box">
                  <div className="set-desc">계정별 알림 수신 설정입니다. 실제 기기 푸시 수신은 서버 발송 기능 연결 후 사용할 수 있어요.</div>
                  {[
                    ["push_enabled", "전체 푸시 알림"],
                    ["breeding_enabled", "사육 일정 알림"],
                    ["reminder_enabled", "사용자 지정 알림"],
                    ["record_change_enabled", "기록 변경 알림"]
                  ].map(([key, label]) => (
                    <label key={key} className="row mt" style={{alignItems:"center",justifyContent:"space-between",gap:12}}>
                      <span>{label}</span>
                      <input type="checkbox" checked={!!notificationPrefs[key]}
                        disabled={notificationSaving || (key !== "push_enabled" && !notificationPrefs.push_enabled)}
                        onChange={e => saveNotificationPref(key, e.target.checked)} />
                    </label>
                  ))}
                  <button className="btn mt" style={{width:"100%"}} disabled={!notificationPrefs.push_enabled}
                    onClick={async () => {
                      try { await beetleTestDeviceNotification(); say("기기 테스트 알림을 표시했어요."); }
                      catch (e) { say(e?.message || "기기 알림 테스트에 실패했어요."); }
                    }}>🔔 이 기기에서 테스트 알림 표시</button>
                  <div className="set-desc" style={{marginTop:6}}>휴대폰 알림 표시 테스트입니다. 서버에서 보내는 원격 푸시와는 별개예요. 아이폰은 홈 화면 앱에서 실행해야 해요.</div>
                  <button className="btn mt" style={{width:"100%"}} disabled={!notificationPrefs.push_enabled||notificationSaving}
                    onClick={async () => {
                      try { await beetleRegisterRemotePush(); say("원격 푸시 수신 기기를 등록했어요."); }
                      catch(e){ say(e?.message||"기기 등록 실패"); }
                    }}>📲 원격 푸시 수신 기기 등록</button>
                  <button className="btn mt" style={{width:"100%"}} disabled={!notificationPrefs.push_enabled||notificationSaving}
                    onClick={async () => {
                      try { const result=await beetleSendRemoteTest(); say("서버가 "+result.sent+"대의 기기에 테스트 알림을 전송했어요."); }
                      catch(e){say(e?.message||"원격 테스트 전송 실패");}
                    }}>📨 서버에서 테스트 푸시 보내기</button>
                  <div className="set-desc" style={{marginTop:6}}>처음 한 번은 '원격 푸시 수신 기기 등록'을 눌러주세요. 이후 앱을 닫은 뒤 다른 기기에서 테스트 푸시를 보내면 백그라운드 수신을 확인할 수 있어요.</div>
                  <label className="row mt" style={{alignItems:"center",justifyContent:"space-between",gap:12}}>
                    <span>알림 시간 (한국 시간)</span>
                    <select className="in" style={{width:120}} value={notificationPrefs.notification_hour ?? 9}
                      disabled={notificationSaving || !notificationPrefs.push_enabled}
                      onChange={e=>saveNotificationPref("notification_hour",Number(e.target.value))}>
                      {Array.from({length:24},(_,h)=><option key={h} value={h}>{String(h).padStart(2,"0")}:00</option>)}
                    </select>
                  </label>
                  <label className="row mt" style={{alignItems:"center",justifyContent:"space-between"}}>
                    <span>사육 일정 사전 알림</span>
                    <select className="in" style={{width:120}} value={notificationPrefs.advance_days}
                      disabled={notificationSaving || !notificationPrefs.push_enabled || !notificationPrefs.breeding_enabled}
                      onChange={e => saveNotificationPref("advance_days", Number(e.target.value))}>
                      <option value={0}>당일</option>
                      <option value={1}>1일 전</option>
                      <option value={3}>3일 전</option>
                    </select>
                  </label>
                </div>
              ) : <div className="set-desc">구글 로그인 후 계정별 푸시 알림을 설정할 수 있어요.</div>}
              <div className="sect">국균연구소 KML 연동</div>
              <div className="set-desc">승인된 Google 계정으로 로그인하면 KML 웹과 동일한 성충·라인 DB를 조회하고 등록할 수 있습니다. 개인 BeetleLog 사육기록은 그대로 유지됩니다.</div>
              <button className="btn primary mt" style={{width:"100%"}} disabled={!authUser}
                onClick={()=>window.KMLHub?.open(authUser)}>국균연구소 KML 성충·라인 열기</button>
              {!authUser && <div className="set-desc">먼저 아래에서 Google 로그인을 해주세요.</div>}
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
                  <div className="set-desc mt">기존 동기화 키로 저장한 기록을 이 구글 계정에 가져올 수 있어요.</div>
                  <input className="in mt" type="password" autoComplete="off" aria-label="기존 동기화 키"
                    placeholder="기존 동기화 키" value={legacySyncKey} onChange={(e) => setLegacySyncKey(e.target.value)} />
                  <button className="btn mt" style={{ width: "100%" }} disabled={syncBusy || legacyImportBusy || !legacySyncKey.trim()} onClick={importLegacySync}>
                    {legacyImportBusy ? "가져오는 중…" : "기존 코드 불러오기"}
                  </button>
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
              {cloudConflict && (
                <div className="auth-box mt" style={{border:"1px solid #B8744D",padding:12}}>
                  <div style={{fontWeight:700}}>⚠️ 클라우드 기록 충돌</div>
                  <div className="set-desc mt">폰과 PC가 같은 기록을 각각 수정했습니다. 어느 쪽도 자동으로 삭제하지 않았습니다.</div>
                  <div className="set-desc">이 기기에서 수정한 항목을 우선하되, 충돌하지 않는 다른 기기 기록은 함께 병합합니다. 실행 전 양쪽 기록을 기기에 백업합니다.</div>
                  <button className="btn primary mt" style={{width:"100%"}} disabled={syncBusy||autoSyncRef.current.uploading} onClick={resolveCloudConflict}>
                    {syncBusy?"처리 중…":"충돌 해결 · 이 기기 기록 우선"}
                  </button>
                </div>
              )}
              <button className="btn ghost sm mt" style={{width:"100%"}} disabled={syncBusy} onClick={downloadCloudConflictBackup}>
                마지막 충돌 백업 파일 저장 (기록 데이터)
              </button>
              <div className="set-desc" style={{ marginTop: 8 }}>
                {authUser ? "기록하면 자동으로 서버에 저장돼요. 다른 기기에서 같은 계정으로 열면 최신 데이터를 자동으로 받아와요. (아래 버튼으로 수동으로도 가능)" : "⚠️ 키 방식은 같은 키를 다른 기기에 입력하면 그 데이터를 받아올 수 있어요. 비밀번호처럼 관리하세요."}
              </div>

              <div className="sect" style={{ marginTop: 24 }}>라인별 엑셀 ↔ BeetleLog</div>
              <div className="set-desc">라인당 시트 하나로 내보낸 엑셀을 수정한 뒤 그대로 다시 올릴 수 있어요. 관리번호·기록 ID로 기존 데이터를 찾아 갱신하며 새 개체와 병 기록은 추가돼요. 적용 전 변경 건수를 확인하고 자동 백업합니다.</div>
              <button className="btn mt" style={{ width: "100%" }} onClick={() => (data.lines.length || data.individuals.length) ? exportXLSX(data) : say("먼저 앱에 사육 라인을 등록해 주세요.")}>① 현재 라인별 엑셀 내려받기</button>
              <button className="btn primary mt" style={{ width: "100%" }} disabled={syncBusy} onClick={() => xlsxRef.current?.click()}>② 수정한 엑셀 업로드 · 반영</button>
              <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={importXLSX} />
              <div className="set-desc mt">빈칸은 기존 값을 유지하고, 셀·행 삭제만으로 기록은 지워지지 않아요. 기존 4시트 엑셀 업로드도 계속 지원해요. 시트당 최대 1500개체·60병까지 지원합니다.</div>

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



/* KML shared Supabase workspace, without modifying personal BeetleLog records. */
(function installKMLHub(){
  'use strict';
  const base='https://qybgsztoegkzqsdipili.supabase.co/rest/v1/';
  let user=null, box=null, adults=[], lines=[], tab='mineAdults';
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isMine=x=>x===user?.id;
  async function api(path,method='GET',payload=null){
    const headers=await cloudAuthHeaders('user:'+user.email,false);
    const res=await fetch(base+path,{method,headers:{...headers,'Content-Type':'application/json',...(method==='POST'?{'Prefer':'return=representation'}:{})},body:payload?JSON.stringify(payload):undefined});
    const raw=await res.text();let data=null;
    try{data=raw?JSON.parse(raw):null;}catch(_){}
    if(!res.ok)throw Error(data?.message||('서버 오류 '+res.status));
    return data;
  }
  const body=()=>box?.querySelector('#kmlhub-body');
  const show=x=>{if(body())body().innerHTML=x;};
  const warn=x=>{const el=document.createElement('div');el.className='kmlhub-warn';el.textContent=x;body()?.prepend(el)};
  const byId=x=>adults.find(a=>a.id===x);
  function render(){
    const isAdult=tab.endsWith('Adults'), mine=tab.startsWith('mine'), items=(isAdult?adults:lines).filter(x=>!mine||(isAdult?isMine(x.owner_id):isMine(x.created_by)));
    show(`<div class="kmlhub-note">KML과 BeetleLog가 동일한 성충·라인 데이터베이스에 연결됐습니다. 기존 개인 사육기록은 별도로 유지됩니다.</div>
    <div class="kmlhub-tabs">${[['mineAdults','내 성충'],['mineLines','내 라인'],['allAdults','전체 성충'],['allLines','전체 라인']].map(([k,t])=>`<button type="button" class="${tab===k?'sel':''}" data-kmtab="${k}">${t}</button>`).join('')}</div>
    <div class="kmlhub-tools"><b>${mine?'내 ':'전체 '}${isAdult?'성충':'라인'} ${items.length}건</b><button data-kmaction="refresh">새로고침</button>${mine?`<button data-kmaction="${isAdult?'addAdult':'addLine'}">+ ${isAdult?'성충':'라인'} 등록</button>`:''}</div>
    ${items.length?items.map(x=>isAdult?`<div class="kmlhub-item"><strong>${esc(x.code)}　<span class="${x.sex==='M'?'male':'female'}">${x.sex==='M'?'♂':'♀'}</span> ${x.size??'—'} mm</strong><div>혈통 ${esc(x.lineage)} · ${esc(x.emerged||'우화일 미등록')}</div></div>`:`<div class="kmlhub-item"><strong>${esc(x.name)}</strong><div>♂ ${esc(byId(x.father_id)?.code||'—')} × ♀ ${esc(byId(x.mother_id)?.code||'—')} · ${esc(x.year||'')}</div></div>`).join(''):'<div class="kmlhub-empty">등록된 기록이 없습니다.</div>'}
    <p><a href="https://ljy5747.github.io/KML/" target="_blank" rel="noopener noreferrer">KML 웹에서 개체 상세·계통도 확인 ↗</a></p>`);
  }
  async function reload(){
    const [a,l]=await Promise.all([
      api('kml_adults?select=id,code,lineage,sex,size,owner_id,breeder_id,emerged&order=created_at.desc'),
      api('kml_lines?select=id,name,year,father_id,mother_id,created_by&order=created_at.desc')
    ]);
    adults=a||[];lines=l||[];render();
  }
  function form(kind){
    const adult=kind==='adult';
    show(`<button data-kmaction="back">← 목록</button><form id="kmlhub-form" data-kind="${kind}" class="kmlhub-form"><h3>${adult?'KML 성충':'KML 라인'} 등록</h3>
    ${adult?`<label>관리번호 *<input required maxlength="60" name="code" placeholder="예: YG26-001"></label>
    <label>혈통 *<input required maxlength="80" name="lineage" placeholder="예: YG26"></label>
    <label>성별<select name="sex"><option value="M">♂ 수컷</option><option value="F">♀ 암컷</option></select></label>
    <label>체장(mm)<input type="number" name="size" min="0" max="200" step="0.1"></label>
    <label>우화일<input type="date" name="emerged"></label>`:
    `<label>라인명 *<input required maxlength="80" name="name" placeholder="예: YG26-A"></label>
    <label>연도<input type="number" name="year" min="1980" max="2200" value="${new Date().getFullYear()}"></label>
    <label>부 ♂<select required name="father_id"><option value="">선택</option>${adults.filter(x=>x.sex==='M').map(x=>`<option value="${esc(x.id)}">${esc(x.code)}</option>`).join('')}</select></label>
    <label>모 ♀<select required name="mother_id"><option value="">선택</option>${adults.filter(x=>x.sex==='F').map(x=>`<option value="${esc(x.id)}">${esc(x.code)}</option>`).join('')}</select></label>`}
    <button type="submit">KML DB에 저장</button><p id="kmlhub-error" role="alert"></p></form>`);
  }
  async function save(form){
    const f=Object.fromEntries(new FormData(form).entries()), btn=form.querySelector('[type=submit]'), err=form.querySelector('#kmlhub-error');
    btn.disabled=true;err.textContent='';
    try {
      if(form.dataset.kind==='adult'){
        if(adults.some(x=>x.code.toLowerCase()===String(f.code).trim().toLowerCase()))throw Error('중복 관리번호입니다.');
        await api('kml_adults','POST',{id:crypto.randomUUID(),code:String(f.code).trim(),lineage:String(f.lineage).trim(),sex:f.sex,size:f.size===''?null:Number(f.size),emerged:f.emerged||null,breeder_id:user.id,owner_id:user.id,created_by:user.id,status:'보유',source:'자체 우화'});
        tab='mineAdults';
      }else{
        if(!f.father_id||!f.mother_id)throw Error('부모 성충을 선택해주세요.');
        await api('kml_lines','POST',{id:crypto.randomUUID(),name:String(f.name).trim(),year:f.year?Number(f.year):null,father_id:f.father_id,mother_id:f.mother_id,created_by:user.id});
        tab='mineLines';
      }
      await reload();
      warn('KML DB에 등록했습니다. KML 웹에서도 동일하게 표시됩니다.');
    }catch(e){err.textContent=e.message||String(e);}
    finally{btn.disabled=false;}
  }
  function close(){box?.remove();box=null;document.body.style.removeProperty('overflow');}
  async function open(me){
    if(!me?.id||!me.email)return alert('Google 로그인 후 이용해주세요.');
    close();user=me;tab='mineAdults';
    box=document.createElement('div');box.id='kmlhub';
    box.innerHTML=`<style>
      #kmlhub{position:fixed;inset:0;z-index:2147483000;background:#161615;color:#25221f;overflow:auto;padding:12px;font-family:system-ui,sans-serif}
      #kmlhub *{box-sizing:border-box}#kmlhub .wrap{max-width:850px;min-height:80vh;background:#fbfaf7;margin:auto;border-radius:13px;overflow:hidden}
      #kmlhub header{display:flex;align-items:center;gap:14px;justify-content:space-between;background:#24211e;color:#e9dac2;padding:15px 18px}
      #kmlhub header strong{font-size:17px}#kmlhub button{font:inherit;cursor:pointer;border-radius:8px;padding:9px 12px;border:1px solid #c7bba9;background:white;color:#302b24;font-size:12px}
      #kmlhub header button{background:transparent;color:white;border-color:#8c7d68}
      #kmlhub-body{padding:20px}#kmlhub .kmlhub-warn,#kmlhub .kmlhub-note{padding:13px;border-radius:8px;background:#f0e5d3;margin-bottom:14px;font-size:12px;line-height:1.7}
      #kmlhub .kmlhub-tabs,#kmlhub .kmlhub-tools{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin:13px 0}
      #kmlhub .kmlhub-tabs .sel{background:#25221e;color:white}#kmlhub .kmlhub-item{padding:15px;margin:8px 0;background:white;border:1px solid #ded6c7;border-radius:8px}
      #kmlhub .kmlhub-item strong{display:block;margin-bottom:7px}#kmlhub .kmlhub-item div{color:#766e63;font-size:12px}
      #kmlhub .male{color:#277bd0}#kmlhub .female{color:#d45695}#kmlhub a{color:#89693b}
      #kmlhub .kmlhub-empty{padding:30px;text-align:center;color:#8a8174}#kmlhub .kmlhub-form{max-width:520px;padding:20px;border:1px solid #ded6c7;border-radius:10px;background:white;margin-top:15px}
      #kmlhub .kmlhub-form label{display:block;font-size:12px;margin:12px 0;color:#655c50}#kmlhub .kmlhub-form input,#kmlhub .kmlhub-form select{display:block;width:100%;padding:10px;border-radius:7px;border:1px solid #ded6c7;background:white;margin-top:5px}
      #kmlhub-error{color:#bd3434;font-size:12px}#kmlhub .kmlhub-form [type=submit]{background:#24211e;color:white;width:100%;margin-top:15px}
      @media(max-width:600px){#kmlhub{padding:0}#kmlhub .wrap{min-height:100vh;border-radius:0}#kmlhub-body{padding:14px}}
      </style><div class="wrap"><header><strong>국균연구소 KML · 공통 데이터</strong><button data-kmaction="close">닫기</button></header><div id="kmlhub-body">서버 연결 중…</div></div>`;
    document.body.appendChild(box);document.body.style.overflow='hidden';
    box.addEventListener('click',async e=>{
      const b=e.target.closest('[data-kmtab],[data-kmaction]');if(!b)return;
      if(b.dataset.kmtab){tab=b.dataset.kmtab;render();return;}
      const a=b.dataset.kmaction;
      if(a==='close')close();else if(a==='back')render();
      else if(a==='addAdult')form('adult');else if(a==='addLine')form('line');
      else if(a==='refresh')try{await reload()}catch(err){warn(err.message||String(err))}
    });
    box.addEventListener('submit',async e=>{if(e.target.id!=='kmlhub-form')return;e.preventDefault();await save(e.target)});
    try{
      const email=encodeURIComponent(String(me.email).toLowerCase());
      const allowed=await api(`kml_allowed_emails?select=email&email=eq.${email}&active=eq.true`);
      if(!allowed?.length){show('<div class="kmlhub-empty">KML 승인 목록에 없는 계정입니다. 관리자에게 승인을 요청하세요.</div>');return;}
      await reload();
    }catch(e){show('<div class="kmlhub-empty">서버 연결에 실패했습니다.</div>');warn(e.message||String(e));}
  }
  window.KMLHub={open,close};
})();


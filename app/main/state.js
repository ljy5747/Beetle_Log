/* ════════════════════ 메인 앱 ════════════════════ */
function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState({ name: "list" });
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("전체");
  const [tab, setTab] = useState("lines");
  const [speciesFolder, setSpeciesFolder] = useState(null);
  const [orderEdit, setOrderEdit] = useState(false);
  /* 라인 탭·성충 탭이 각자 연도를 기억 (기본: 당해 연도) */
  const [lineYear, setLineYear] = useState(defaultYear);
  const [parentYear, setParentYear] = useState(defaultYear);
  const [theme, setTheme] = useState("brown");
  const [snaps, setSnaps] = useState([]);
  const [folderBy, setFolderBy] = useState("species");
  const [infoOpen, setInfoOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncKey, setSyncKey] = useState("");
  const [syncBusy, setSyncBusy] = useState(false);
  const [cloudConflict, setCloudConflict] = useState(null);
  const [legacySyncKey, setLegacySyncKey] = useState("");
  const [legacyImportBusy, setLegacyImportBusy] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPreferences);
  const [notificationSaving, setNotificationSaving] = useState(false);
  useEffect(() => {
    if (!authUser?.id) { setNotificationPrefs(defaultNotificationPreferences); return; }
    let active = true;
    notificationPreferencesRequest("GET", authUser.id).then(p => {
      if (active) setNotificationPrefs({ ...defaultNotificationPreferences, ...(p || {}) });
    }).catch(() => { if (active) say("알림 설정을 불러오지 못했어요."); });
    return () => { active = false; };
  }, [authUser?.id]);
  const saveNotificationPref = async (key, value) => {
    if (!authUser?.id || notificationSaving) return;
    const next = { ...notificationPrefs, [key]: value };
    setNotificationSaving(true);
    try {
      await notificationPreferencesRequest("POST", authUser.id, next);
      setNotificationPrefs(next);
      say("알림 설정이 저장됐어요.");
    } catch (e) { say(e.message || "알림 설정 저장 실패"); }
    finally { setNotificationSaving(false); }
  };

  const autoSyncRef = useRef({ on: false, key: "", timer: null, dirty:false, revision:0, uploading:false, importing:false, loadingAccount:false });
  const liveSyncRef = useRef({data:null,modal:null,settingsOpen:false});
  liveSyncRef.current={data,modal,settingsOpen};
  const fileRef = useRef(null);
  const xlsxRef = useRef(null);
  const toastT = useRef(null);

  /* ── 테마 (브라운/그린/블루) ── */
  useEffect(() => {
    (async () => {
      try { const t = await idbGet("beetle-theme"); if (t === "green" || t === "blue" || t === "brown") setTheme(t); } catch (e) {}
    })();
  }, []);
  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
      const meta = document.querySelector('meta[name="theme-color"]');
      const bg = { brown: "#F4F0E8", green: "#FBF8F3", blue: "#F5F3EE" }[theme];
      if (meta && bg) meta.setAttribute("content", bg);
      document.body.style.background = bg || "";
    } catch (e) {}
  }, [theme]);
  const pickTheme = async (t) => { setTheme(t); try { await idbSet("beetle-theme", t); } catch (e) {} };

  /* 로그아웃: 이 기기의 기록도 비워 초기 화면으로 (다른 계정으로 로그인해도 섞이지 않게) */
  const doLogout = async () => {
    const w = dataWeight(data);
    const msg = w > 0
      ? `로그아웃하면 이 기기의 기록(${w}건)을 비우고 처음 상태로 돌아갑니다.\n\n클라우드에 먼저 저장한 뒤 비우므로, 같은 계정으로 다시 로그인하면 그대로 복구됩니다.\n\n계속할까요?`
      : "로그아웃할까요?";
    if (!confirm(msg)) return;
    /* 1) 마지막 상태를 클라우드에 저장 (실패해도 아래 스냅샷으로 복구 가능) */
    const key = autoSyncRef.current.key || syncKey;
    clearTimeout(autoSyncRef.current.timer);
    if (w > 0 && key) { try { await cloudUpload(key, data); } catch (e) { say("⚠️ "+e.message); return; } }
    /* 2) 기기 안 백업 스냅샷 (되돌리기용) */
    if (w > 0) await snapSave(data, "로그아웃 직전");
    /* 3) 로그아웃 + 로컬 비우기 */
    await authSignOut();
    autoSyncRef.current.on = false; autoSyncRef.current.key = ""; autoSyncRef.current.dirty=false; cloudSnapshots.clear();
    setAuthUser(null); setSyncKey("");
    try { await idbSet("beetle-sync-key", ""); await idbSet("beetle-owner", ""); await idbSet("beetle-cloud-baseline", ""); } catch (e) {}
    const empty = { individuals: [], lines: [], parents: [], customEvents: [], feedBrands: [] };
    setData(empty);
    try { await idbSet(KEY, JSON.stringify(empty)); } catch (e) {}
    /* 4) 화면도 처음 상태로 */
    setSettingsOpen(false); setModal(null); setFilter("전체");
    setTab("lines"); setSpeciesFolder(null); setView({ name: "list" });
    say("로그아웃됨 · 기기 기록을 비웠어요");
  };

  /* ── 뒤로가기 (갤럭시 시스템 뒤로가기 + 아이폰 엣지 스와이프) ── */
  const backRef = useRef({});
  backRef.current = { modal, view, settingsOpen, data };
  /* 모달·설정이 열릴 때도 히스토리를 한 칸 쌓아, 뒤로가기로 닫히게 함 */
  const layerRef = useRef({ modal: false, settings: false });
  useEffect(() => {
    const openNow = !!modal, was = layerRef.current.modal;
    if (openNow && !was) { try { history.pushState({ bl: 1, layer: "modal" }, ""); } catch (e) {} }
    layerRef.current.modal = openNow;
  }, [modal]);
  useEffect(() => {
    const openNow = !!settingsOpen, was = layerRef.current.settings;
    if (openNow && !was) { try { history.pushState({ bl: 1, layer: "settings" }, ""); } catch (e) {} }
    layerRef.current.settings = openNow;
  }, [settingsOpen]);
  /* ── 화면별 스크롤 위치 기억 (뒤로 가면 보던 자리로) ── */
  const scrollMem = useRef({});
  const viewKey = (v) => v.name + (v.id ? ":" + v.id : "") + (v.name === "list" ? ":" + tab : "");
  /* 화면을 떠나기 전 현재 위치 저장 */
  const rememberScroll = () => {
    try { scrollMem.current[viewKey(view)] = window.scrollY || 0; } catch (e) {}
  };
  /* 새 화면으로 이동. fromBack=true면 뒤로가기로 온 것이라 히스토리를 쌓지 않음 */
  const goView = (next, restore, fromBack) => {
    setOrderEdit(false); /* 화면 이동 시 편집 모드 해제 */
    rememberScroll();
    /* 화면마다 히스토리를 정직하게 한 칸씩 쌓아 브라우저 뒤로가기가 그대로 동작하게 */
    if (!fromBack) { try { history.pushState({ bl: 1, view: next }, ""); } catch (e) {} }
    setView(next);
    const y = restore ? (scrollMem.current[viewKey(next)] || 0) : 0;
    let tries = 0;
    const tick = () => {
      /* 화면이 그려져 스크롤이 가능해지면 이동 */
      if (document.body.scrollHeight > y + window.innerHeight * 0.5 || tries > 10) {
        window.scrollTo({ top: y, behavior: "auto" });
        return;
      }
      tries++; setTimeout(tick, 50);
    };
    setTimeout(tick, 50);
  };

  const goBackStep = () => {
    const b = backRef.current;
    if (b.modal) { setModal(null); return true; }
    if (b.settingsOpen) { if (!autoSyncRef.current.importing) setSettingsOpen(false); return true; }
    if (b.view.name === "detail") {
      const ind = b.data && b.data.individuals.find((i) => i.id === b.view.id);
      goView(ind && ind.lineId ? { name: "lineDetail", id: ind.lineId } : { name: "list" }, true, true);
      return true;
    }
    if (b.view.name === "dueList") { goView({ name: "list" }, true, true); return true; }
    if (b.view.name === "lineDetail" || b.view.name === "parentDetail") {
      setFilter("전체"); goView({ name: "list" }, true, true); return true;
    }
    return false; /* 이미 맨 처음 화면 */
  };
  useEffect(() => {
    /* 첫 화면을 히스토리의 뿌리로 표시. 이후 화면 진입마다 goView가 한 칸씩 쌓음 */
    try { history.replaceState({ bl: 1, root: 1 }, ""); } catch (e) {}
    window.__blAppReady = true; /* index.html의 조기 핸들러는 이제 물러남 */
    /* 중복 방지: iOS가 자체 뒤로가기 + 우리 감지를 둘 다 실행해 두 번 가는 것 차단 */
    const gate = { t: 0 };
    const doBack = () => {
      const now = Date.now(); if (now - gate.t < 300) return; gate.t = now;
      goBackStep();
    };
    /* 브라우저가 히스토리를 한 칸 되돌리면 우리도 화면을 한 단계 되돌림 (다시 밀어넣지 않음) */
    const onPop = () => { doBack(); };
    window.addEventListener("popstate", onPop);
    /* 아이폰 홈화면 앱(standalone)은 좌측 엣지 스와이프 제스처가 없어서 직접 감지 */
    let sx = null, sy = null;
    const ts = (e) => { const t = e.touches[0]; if (t.clientX < 28) { sx = t.clientX; sy = t.clientY; } else { sx = null; } };
    /* 손을 떼기 전이라도 기준 넘는 순간 바로 실행 (빠른 반응) */
    const tm = (e) => {
      if (sx == null) return;
      const t = e.touches[0];
      if (Math.abs(t.clientY - sy) > 60) { sx = null; return; } /* 세로로 새면 취소 */
      if (t.clientX - sx > 70) { sx = null; doBack(); }
    };
    const te = (e) => {
      if (sx == null) return;
      const t = e.changedTouches[0];
      if (t.clientX - sx > 70 && Math.abs(t.clientY - sy) < 60) doBack();
      sx = null;
    };
    const standalone = !!window.navigator.standalone;
    if (standalone) {
      document.addEventListener("touchstart", ts, { passive: true });
      document.addEventListener("touchmove", tm, { passive: true });
      document.addEventListener("touchend", te, { passive: true });
    }
    return () => {
      window.removeEventListener("popstate", onPop);
      if (standalone) { document.removeEventListener("touchstart", ts); document.removeEventListener("touchmove", tm); document.removeEventListener("touchend", te); }
    };
  }, []);

  useEffect(() => {
    (async () => {
      let d = null;
      try { const r = await idbGet(KEY); if (r) d = JSON.parse(r); } catch (e) { /* 첫 실행 */ }
      const base = d && Array.isArray(d.individuals) ? d : { individuals: [], feedBrands: [] };
      if (!Array.isArray(base.parents)) base.parents = [];
      if (!Array.isArray(base.lines)) base.lines = [];
      if (!Array.isArray(base.customEvents)) base.customEvents = [];
      /* 기존 데이터 마이그레이션: 라인 없는 유충은 '미분류' 라인으로 */
      const legacy = base.individuals.filter((i) => !i.lineId);
      if (legacy.length) {
        let misc = base.lines.find((l) => l.code === "미분류");
        if (!misc) {
          misc = { id: uid(), code: "미분류", fatherId: "", motherId: "", species: legacy[0].species || "", origin: legacy[0].origin || "", breakdownDate: "", memo: "기존 기록 자동 이동" };
          base.lines.push(misc);
        }
        base.individuals = base.individuals.map((i) => (i.lineId ? i : { ...i, lineId: misc.id }));
      }
      setData(base);
      /* 앱 켤 때 현재 상태를 자동 백업 (하루 1개, 최근 5개 보관) */
      snapSave(base, "자동");
      try { const sk = await idbGet("beetle-sync-key"); if (sk) setSyncKey(sk); } catch (e) { /* 없으면 무시 */ }
      /* 구글 로그인 처리: 복귀(주소에 토큰) → 아니면 저장된 세션 */
      try {
        let session = await authHandleRedirect();
        const fromRedirect = !!session;
        if (!session) session = await authLoadSession();
        /* 저장된 세션은 액세스 토큰이 만료됐을 수 있으니, 갱신 토큰으로 새로 발급 */
        if (session && session.refresh && !fromRedirect) {
          const fresh = await authRefresh(session.refresh);
          if (fresh) session = fresh;
        }
        if (session && session.access) {
          let u = await authGetUser(session.access);
          /* 그래도 실패하면(만료 등) 갱신 한 번 더 시도 */
          if (!u && session.refresh) {
            const fresh = await authRefresh(session.refresh);
            if (fresh) { session = fresh; u = await authGetUser(session.access); }
          }
          if (u && u.email) {
            const myKey = "user:" + u.email;
            autoSyncRef.current.loadingAccount = true;
            setAuthUser(u);
            setSyncKey(myKey);
            try { await idbSet("beetle-sync-key", myKey); } catch (e) {}
            /* 이 기기에 남아있는 기록의 '주인'이 다른 계정이면 절대 올리지 않음 (데이터 섞임 방지) */
            let owner = "";
            try { owner = (await idbGet("beetle-owner")) || ""; } catch (e) {}
            const foreign = !!owner && owner !== u.email && dataWeight(base) > 0;
            if (foreign) {
              await snapSave(base, "다른 계정 기록");
              setTimeout(() => say("다른 계정의 기록이 남아있어 이 계정 데이터로 교체했어요"), 1200);
            }
            try { await idbSet("beetle-owner", u.email); } catch (e) {}
            /* 자동 동기화 켜기 */
            autoSyncRef.current.on = true;
            autoSyncRef.current.key = myKey;
            /* 앱 켤 때: 서버에 더 최신 데이터가 있으면 받아오기 (안전장치 포함) */
            try {
              let savedBase=null;try{savedBase=JSON.parse((await idbGet("beetle-cloud-baseline"))||"null");}catch(e){}
              const row = await cloudDownload(myKey);
              if (row && row.data && Array.isArray(row.data.individuals)) {
                /* 남의 기록이면 로컬 분량을 0으로 취급 → 서버 것으로 무조건 교체 */
                const serverW = dataWeight(row.data), localW = foreign ? 0 : dataWeight(base);
                /* ⚠️ 덮어쓰기 전에 현재 로컬 데이터를 반드시 스냅샷으로 보관 (복구용) */
                if (localW > 0) {
                  try { await idbSet("beetle-local-backup", JSON.stringify({ at: Date.now(), weight: localW, data: base })); } catch (e) {}
                  await snapSave(base, "동기화 직전");
                }
                /* Merge offline edits against the last confirmed server snapshot. */
                if (row.data) {
                  const server = {
                    ...row.data,individuals: row.data.individuals,
                    lines: Array.isArray(row.data.lines) ? row.data.lines : [],
                    parents: Array.isArray(row.data.parents) ? row.data.parents : [],
                    customEvents: Array.isArray(row.data.customEvents) ? row.data.customEvents : [],
                    feedBrands: Array.isArray(row.data.feedBrands) ? row.data.feedBrands : [],
                  };
                  let merged=server;
                  if(!foreign&&((savedBase?.key===myKey&&savedBase.row?.data)||autoSyncRef.current.dirty)){
                    try{merged=mergeCloudData(savedBase?.key===myKey?savedBase.row.data:base,autoSyncRef.current.dirty?liveSyncRef.current.data:base,server);}
                    catch(error){if(savedBase?.row)await rememberCloudSnapshot(myKey,savedBase.row);autoSyncRef.current.dirty=true;if(error?.code==="BEETLE_SYNC_CONFLICT")setCloudConflict({path:error.conflictPath});say(error?.code==="BEETLE_SYNC_CONFLICT"?"⚠️ 동기화 충돌: 설정에서 해결해 주세요.":"⚠️ "+error.message);throw error;}
                  }
                  liveSyncRef.current.data=merged;setData(merged);
                  try { await idbSet(KEY, JSON.stringify(merged)); } catch (e) {}
                  if(!cloudEqual(merged,row.data))await persist(merged);
                }
              } else if (foreign) {
                /* 서버도 비어있고 로컬은 남의 기록 → 올리지 말고 비움 */
                const empty = { individuals: [], lines: [], parents: [], customEvents: [], feedBrands: [] };
                setData(empty);
                try { await idbSet(KEY, JSON.stringify(empty)); } catch (e) {}
              } else {
                /* 서버에 아무것도 없으면 내 로컬을 올려둠 */
                if (dataWeight(base) > 0) await cloudUpload(myKey, base);
              }
            } catch (e) { /* 네트워크 문제면 조용히 — 로컬로 계속 */ }
            finally { autoSyncRef.current.loadingAccount = false; }
          }
        }
      } catch (e) { /* 로그인 안 했으면 무시 */ }
    })();
  }, []);

  /* 저장 후 해당 유충 카드로 스크롤 (목록이 다시 그려진 뒤 실행) */
  const scrollToLarva = (id) => {
    if (!id) return;
    let tries = 0;
    const tick = () => {
      const el = document.getElementById("larva-" + id);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        el.classList.add("just-saved");
        setTimeout(() => el.classList.remove("just-saved"), 1600);
        return;
      }
      if (tries++ < 12) setTimeout(tick, 60); /* 아직 안 그려졌으면 잠시 후 재시도 */
    };
    setTimeout(tick, 60);
  };

  const say = (msg) => { setToast(msg); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToast(null), 2400); };

  const applyCloudUpload = async () => {
    const as=autoSyncRef.current;if(as.uploading||as.importing||!as.on||!as.key||!as.dirty)return;
    const next=liveSyncRef.current.data,revision=as.revision,key=as.key;let succeeded=false;as.uploading=true;
    try{
      const merged=await cloudUpload(key,next);
      if(!as.on||as.key!==key)return;
      const current=liveSyncRef.current.data;
      const result=as.revision===revision?merged:mergeCloudData(next,current,merged);
      liveSyncRef.current.data=result;setData(result);await idbSet(KEY,JSON.stringify(result));
      if(as.revision===revision)as.dirty=false;
      setCloudConflict(null);
      succeeded=true;
    }catch(e){if(e?.code==="BEETLE_SYNC_CONFLICT")setCloudConflict({path:e.conflictPath});say(e?.code==="BEETLE_SYNC_CONFLICT"?"⚠️ 동기화 충돌: 설정에서 안전하게 해결할 수 있어요.":"⚠️ "+(e.message||"클라우드 저장 실패 — 기기 기록은 유지됩니다"));}
    finally{as.uploading=false;if(succeeded&&as.dirty){clearTimeout(as.timer);as.timer=setTimeout(()=>applyCloudUpload(),2000);}}
  };
  const persist = async (next) => {
    liveSyncRef.current.data=next;setData(next);
    const as=autoSyncRef.current;as.dirty=true;as.revision++;
    try { await idbSet(KEY,JSON.stringify(next)); }catch(e){say("⚠️ 기기 저장 실패 — 저장 공간을 확인해 주세요");}
    if(as.on&&as.key){clearTimeout(as.timer);as.timer=setTimeout(()=>applyCloudUpload(),2000);}
  };
  // Pull KML edits while idle, and never replace an open form or unsaved local edits.
  useEffect(()=>{
    let busy=false,stopped=false;
    const pull=async()=>{
      const as=autoSyncRef.current,live=liveSyncRef.current;
      if(stopped||busy||!as.on||!as.key||as.loadingAccount||as.dirty||as.uploading||as.importing||live.modal||live.settingsOpen||document.hidden||!live.data)return;
      if(document.activeElement?.matches?.('input,select,textarea,[contenteditable="true"]'))return;
      const revision=as.revision,key=as.key;busy=true;
      try{
        const row=await cloudDownload(key,{remember:false});
        if(!row||stopped||as.key!==key||as.dirty||as.revision!==revision||liveSyncRef.current.modal||liveSyncRef.current.settingsOpen)return;
        const remembering=rememberCloudSnapshot(key,row);
        if(!cloudEqual(liveSyncRef.current.data,row.data)){
          liveSyncRef.current.data=row.data;setData(row.data);await idbSet(KEY,JSON.stringify(row.data));
        }
        await remembering;
      }catch(e){}finally{busy=false;}
    };
    const timer=setInterval(pull,8000);window.addEventListener("focus",pull);document.addEventListener("visibilitychange",pull);
    return()=>{stopped=true;clearInterval(timer);window.removeEventListener("focus",pull);document.removeEventListener("visibilitychange",pull);};
  },[]);

  const updateInd = (id, patch) =>
    persist({ ...data, individuals: data.individuals.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  const rememberBrand = (d, brand) => {
    const b = (brand || "").trim();
    if (b && !d.feedBrands.includes(b)) return { ...d, feedBrands: [...d.feedBrands, b] };
    return d;
  };

  if (!data) return <div className="app"><style>{CSS}</style><div className="loading">불러오는 중…</div></div>;

  const lineById = Object.fromEntries(data.lines.map((l) => [l.id, l]));
  const parentById = Object.fromEntries(data.parents.map((p) => [p.id, p]));

  const cur = view.name === "detail" ? data.individuals.find((i) => i.id === view.id) : null;
  if (view.name === "detail" && !cur) { setView({ name: "list" }); return null; }
  const curL = view.name === "lineDetail" ? data.lines.find((l) => l.id === view.id) : null;
  if (view.name === "lineDetail" && !curL) { setView({ name: "list" }); return null; }
  const curP = view.name === "parentDetail" ? data.parents.find((x) => x.id === view.id) : null;
  if (view.name === "parentDetail" && !curP) { setView({ name: "list" }); return null; }

  /* ── 핸들러 ── */
  const saveParent = (f) => {
    if (modal.editId) persist({ ...data, parents: data.parents.map((p) => (p.id === modal.editId ? { ...p, ...f } : p)) });
    else persist({ ...data, parents: [...data.parents, { ...f, id: uid(), year: f.year || parentYear }] });
    setModal(null); say("✓ 성충 저장됨");
  };
  const saveGrowthRow = (f) => {
    let d = rememberBrand(data, f.feedBrand);
    d = {
      ...d, parents: d.parents.map((p) => {
        if (p.id !== modal.parentId) return p;
        const rows = modal.editId
          ? (p.growthRecords || []).map((r) => (r.id === modal.editId ? { ...r, ...f } : r))
          : [...(p.growthRecords || []), { ...f, id: uid() }];
        return { ...p, growthRecords: rows };
      }),
    };
    persist(d); setModal(null); say("✓ 사육 이력 저장됨");
  };
  const deleteGrowthRow = () => {
    persist({ ...data, parents: data.parents.map((p) => p.id !== modal.parentId ? p : { ...p, growthRecords: (p.growthRecords || []).filter((r) => r.id !== modal.editId) }) });
    setModal(null); say("이력이 삭제됐어요");
  };
  const saveLine = (f) => {
    if (modal.editId) persist({ ...data, lines: data.lines.map((l) => (l.id === modal.editId ? { ...l, ...f } : l)) });
    else {
      const nl = { ...f, id: uid(), year: f.year || lineYear };
      persist({ ...data, lines: [...data.lines, nl] });
      setModal(null); say("✓ 라인 생성됨"); goView({ name: "lineDetail", id: nl.id }, false);
      return;
    }
    setModal(null); say("✓ 저장됨");
  };
  const addLarvae = (items) => {
    const news = items.map((it) => ({ ...it, id: uid(), lineId: modal.lineId, status: "유충", bottleRecords: [], pupation: null, eclosion: null }));
    persist({ ...data, individuals: [...data.individuals, ...news] });
    setModal(null); say(`✓ ${news.length}마리 추가됨`);
  };
  const saveLarvaEdit = (f) => { updateInd(modal.indId, f); setModal(null); say("✓ 저장됨"); };
  const saveRenumber = (changes) => {
    if (!changes.length) { setModal(null); say("바뀐 번호가 없어요"); return; }
    const map = Object.fromEntries(changes.map((c) => [c.id, c.code]));
    persist({ ...data, individuals: data.individuals.map((i) => (map[i.id] ? { ...i, code: map[i.id] } : i)) });
    setModal(null); say(`✓ ${changes.length}마리 번호 변경됨`);
  };
  const saveBottle = (f) => {
    let d = rememberBrand(data, f.feedBrand);
    d = {
      ...d, individuals: d.individuals.map((i) => {
        if (i.id !== modal.indId) return i;
        const recs = modal.editId
          ? i.bottleRecords.map((r) => (r.id === modal.editId ? { ...r, ...f } : r))
          : [...(i.bottleRecords || []), { ...f, id: uid() }];
        return { ...i, bottleRecords: recs };
      }),
    };
    persist(d);
    const backTo = modal.indId;
    setModal(null);
    say(f.nextDate ? "✓ 저장됨 — 캘린더 탭에서 확인" : "✓ 저장됨");
    /* 목록에서 기록한 경우, 방금 그 유충 자리로 되돌아가기 */
    scrollToLarva(backTo);
  };
  const saveBulkBottle = (ids, f) => {
    let d = rememberBrand(data, f.feedBrand);
    const idset = new Set(ids);
    d = {
      ...d, individuals: d.individuals.map((i) => {
        if (!idset.has(i.id)) return i;
        return { ...i, bottleRecords: [...(i.bottleRecords || []), { ...f, weight: "", headWidth: "", id: uid() }] };
      }),
    };
    persist(d); setModal(null);
    say(`✓ ${ids.length}마리 일괄 교체 기록됨`);
  };
  const savePupation = (f) => {
    const ind = data.individuals.find((i) => i.id === modal.indId);
    updateInd(modal.indId, { pupation: f, status: ind.status === "유충" ? "용화" : ind.status });
    setModal(null); say("✓ 용화 기록 저장됨");
  };
  const saveEclosion = (f) => {
    const ind = data.individuals.find((i) => i.id === modal.indId);
    updateInd(modal.indId, { eclosion: f, status: ["유충", "용화"].includes(ind.status) ? "우화" : ind.status });
    setModal(null); say("✓ 우화 기록 저장됨");
  };
  const promoteToParent = (ind) => {
    const L = lineById[ind.lineId] || {};
    const ec = ind.eclosion || {};
    /* 병갈이 기록 → 성충 사육 이력으로 복사 */
    const growthRecords = sortedRecs(ind).map((r) => ({
      id: uid(), date: r.date, instar: r.instar || "", feedType: r.feedType || "",
      feedBrand: r.feedBrand || "", bottleSize: r.bottleSize || "", weight: r.weight || "", memo: r.memo || "",
    }));
    /* 우화일 행도 이력에 추가 */
    if (ec.date) growthRecords.push({ id: uid(), date: ec.date, instar: "우화", feedType: "", feedBrand: "", bottleSize: "", weight: "", memo: num(ec.totalLength) ? `우화 ${ec.totalLength}mm` : "우화" });
    /* 성충 관리번호: 라인코드+유충번호 조합으로 자동 생성, 중복 시 뒤에 숫자 */
    let baseCode = `${L.code ? L.code + "-" : ""}${ind.code}`;
    let code = baseCode, n = 2;
    const exist = new Set(data.parents.map((p) => p.code));
    while (exist.has(code)) { code = `${baseCode}-${n++}`; }
    const newParent = {
      id: uid(), code,
      sex: ind.sex && ind.sex !== "미구분" ? ind.sex : "수컷 ♂",
      species: L.species || "", line: L.code || "", origin: L.origin || "",
      totalLength: ec.totalLength || "", jawLength: ec.jawLength || "", jawWidth: ec.jawWidth || "", jawThick: ec.jawThick || "", thoraxWidth: ec.thoraxWidth || "", headWidth: ec.headWidth || "",
      eclosionDate: ec.date || "", source: "자가", memo: ind.memo || "",
      /* 우화한 해의 성충으로 편입 (27년 1월 우화 → 2027 성충 목록) */
      year: (() => {
        const y = (String(ec.date || "").match(/^(\d{4})/) || [])[1];
        if (!y) return defaultYear();
        return parseInt(y) < BASE_YEAR ? PAST_YEAR : y; /* 2026 이전 우화는 ~2025 칸으로 */
      })(),
      status: "생존", photo: "", growthRecords,
      bornLineId: ind.lineId || "", bornLarvaId: ind.id,
    };
    persist({
      ...data,
      parents: [...data.parents, newParent],
      individuals: data.individuals.map((i) => i.id === ind.id ? { ...i, promotedToParentId: newParent.id } : i),
    });
    setParentYear(itemYear(newParent)); /* 그 성충이 보이는 연도로 맞춰둠 */
    say(`✓ ${itemYear(newParent)}년 성충으로 등록됐어요 — 사육 이력도 옮겨졌어요`);
    goView({ name: "parentDetail", id: newParent.id }, false);
  };
  const importJSON = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!Array.isArray(d.individuals)) throw new Error();
        persist({ individuals: d.individuals, lines: Array.isArray(d.lines) ? d.lines : [], parents: Array.isArray(d.parents) ? d.parents : [], customEvents: Array.isArray(d.customEvents) ? d.customEvents : [], feedBrands: d.feedBrands || [] });
        say(`✓ ${d.individuals.length}개체 복원 완료`);
      } catch { say("⚠️ 올바른 백업 파일이 아니에요"); }
    };
    reader.readAsText(file); e.target.value = "";
  };
  const importXLSX = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { next, report } = parseImportXLSX(reader.result, data);
        const totalNew = report.parentsNew + report.linesNew + report.larvaeNew;
        const totalUpd = report.parentsUpd + report.linesUpd + report.larvaeUpd;
        const bottleNew = report.bottleNew || 0;
        if (totalNew + totalUpd + bottleNew === 0) {
          say(report.skipped > 0 ? "라인/유충을 못 찾아 건너뛴 항목만 있어요" : "⚠️ 양식에서 데이터를 찾지 못했어요");
          return;
        }
        persist(next);
        const parts = [];
        if (totalNew) parts.push(`신규 ${totalNew}`);
        if (totalUpd) parts.push(`갱신 ${totalUpd}`);
        if (bottleNew) parts.push(`교체 ${bottleNew}`);
        say(`✓ ${parts.join(" · ")}${report.skipped ? ` · ${report.skipped} 건너뜀` : ""}`);
        setSettingsOpen(false);
      } catch (err) { say("⚠️ 엑셀을 읽지 못했어요 — 양식 파일이 맞는지 확인해주세요"); }
    };
    reader.readAsArrayBuffer(file); e.target.value = "";
  };
  const saveSyncKey = async (k) => { setSyncKey(k); try { await idbSet("beetle-sync-key", k); } catch (e) {} };
  /* Never silently overwrite a concurrent phone/PC edit.
     Preserve BOTH device and cloud states before an explicitly confirmed field-level resolution. */
  const resolveCloudConflict = async () => {
    const as=autoSyncRef.current;
    const key=as.key||syncKey.trim();
    if (!key||!cloudConflict||syncBusy||as.uploading||as.importing) return;
    const match=String(cloudConflict.path||"").match(/individuals\[([^\]]+)\]/);
    const ind=match&&liveSyncRef.current.data?.individuals?.find(i=>i.id===match[1]);
    const item=ind?.code?ind.code+" 개체":"해당 기록";
    if (!confirm(item+"의 기기와 서버 기록이 모두 수정됐어요.\n\n충돌한 항목만 이 기기의 값을 우선 적용할까요? 다른 항목은 두 기기 기록을 병합합니다.\n\n먼저 양쪽 기록을 기기에 백업합니다. 백업이 실패하면 업로드를 중단합니다.")) return;
    setSyncBusy(true);
    as.importing=true;
    const revision=as.revision;
    try {
      const local=cloudCopy(liveSyncRef.current.data);
      const remote=await readCloudRow(key);
      if (!remote?.data) throw new Error("클라우드 원본을 확인하지 못해 중단했어요.");
      // Mandatory backup: do not proceed if storage is full / private mode blocks IndexedDB.
      const localSlim=snapShrink(local).data,remoteSlim=snapShrink(remote.data).data;
      await idbSet("beetle-sync-conflict-pair",JSON.stringify({key,at:Date.now(),local:localSlim,remote:remoteSlim,path:cloudConflict.path}));
      const merged=await cloudUpload(key,local,null,{resolveConflicts:"local"});
      const current=liveSyncRef.current.data;
      const result=as.revision===revision?merged:mergeCloudData(local,current,merged);
      liveSyncRef.current.data=result;setData(result);
      await idbSet(KEY,JSON.stringify(result));
      if(as.revision===revision)as.dirty=false;
      setCloudConflict(null);
      say("✓ 충돌을 해결했어요. 기기·서버 기록을 백업하고 병합했습니다.");
    }catch(e){setCloudConflict({path:e?.conflictPath||cloudConflict.path});say("⚠️ "+(e?.message||"충돌 해결 실패 — 원본은 유지됩니다."));}
    finally{as.importing=false;setSyncBusy(false);if(as.dirty){clearTimeout(as.timer);as.timer=setTimeout(()=>applyCloudUpload(),2000);}}
  };
  const doUpload = async () => {
    const k = syncKey.trim();
    if (!k) return say("먼저 동기화 키를 입력해주세요");
    setSyncBusy(true);
    try {
      await saveSyncKey(k);
      const merged=await cloudUpload(k, data);
      liveSyncRef.current.data=merged;setData(merged);await idbSet(KEY,JSON.stringify(merged));
      autoSyncRef.current.dirty=false;
      setCloudConflict(null);
      say("☁︎ 클라우드에 올렸어요");
    } catch (e) {
      if(e?.code==="BEETLE_SYNC_CONFLICT")setCloudConflict({path:e.conflictPath});
      say(e?.code==="BEETLE_SYNC_CONFLICT"?"⚠️ 같은 기록을 다른 기기에서도 수정했어요. 아래 충돌 해결 버튼을 이용해 주세요.":"⚠️ "+(e.message||"업로드 실패"));
    }
    setSyncBusy(false);
  };
  const importLegacySync = async () => {
    const sourceKey = legacySyncKey.trim();
    const accountKey = authUser?.email ? "user:" + authUser.email : "";
    const sync = autoSyncRef.current;
    if (!accountKey || syncBusy || sync.importing) return;
    if (!sourceKey || isAccountKey(sourceKey)) return say("로그인 없이 사용하던 동기화 키를 입력해 주세요.");
    if (sync.loadingAccount || sync.uploading || !sync.on || sync.key !== accountKey) {
      return say("계정 동기화가 끝나면 다시 시도해 주세요.");
    }

    sync.importing = true;
    setLegacyImportBusy(true);
    try {
      const row = await cloudDownload(sourceKey, { remember: false });
      const legacy = row?.data;
      if (!Array.isArray(legacy?.individuals)) return say("이 키로 저장된 기록이 없어요.");
      const counts = `성충 ${legacy.parents?.length || 0} · 라인 ${legacy.lines?.length || 0} · 유충 ${legacy.individuals.length} · 일정 ${legacy.customEvents?.length || 0}`;
      if (!confirm(`${counts}\n\n이 기록을 ${authUser.email} 계정으로 가져올까요? 같은 ID의 항목은 구글 계정 기록을 유지합니다.`)) return;

      await snapSave(liveSyncRef.current.data, "기존 동기화 키 가져오기 직전");
      const local = liveSyncRef.current.data;
      const revision = sync.revision;
      const saved = await cloudUpload(accountKey, local, legacy);
      const editedDuringImport = sync.revision !== revision;
      const merged = editedDuringImport ? mergeCloudData(local, liveSyncRef.current.data, saved) : saved;
      liveSyncRef.current.data = merged;
      setData(merged);
      setLegacySyncKey("");
      if (!editedDuringImport) sync.dirty = false;
      try {
        await idbSet(KEY, JSON.stringify(merged));
      } catch (error) {
        return say("구글 계정에 저장했어요. 기기 저장에 실패해 다시 열면 서버 기록을 불러와요.");
      }

      if (!legacyRecordsCopied(saved, legacy)) {
        return say("구글 계정에 저장했어요. 계정 기록과 다른 내용이 있어 기존 코드는 보관했어요.");
      }
      if (!confirm("구글 계정에 동기화했어요. 기존 코드에 저장된 중복 기록을 삭제할까요?\n\n삭제하면 기존 코드로는 이 기록을 불러올 수 없어요.")) {
        return say("✓ 구글 계정에 저장했고 기존 코드의 기록도 보관했어요.");
      }
      try {
        const account = await cloudDownload(accountKey, { remember: false });
        if (!legacyRecordsCopied(account?.data, legacy)) {
          return say("구글 계정 기록이 바뀌어 기존 코드의 기록을 보관했어요.");
        }
        const cleared = await clearLegacyCloudRecords(sourceKey, row);
        say(cleared ? "✓ 구글 계정에 저장했고 기존 코드의 기록을 삭제했어요." : "기존 코드의 기록이 바뀌어 삭제하지 않았어요.");
      } catch (error) {
        say("구글 계정에 저장했어요. 기존 코드의 기록 삭제는 확인하지 못했어요.");
      }
    } catch (error) {
      say(error.message || "기존 기록을 가져오지 못했어요.");
    } finally {
      sync.importing = false;
      setLegacyImportBusy(false);
      if (sync.dirty) {
        clearTimeout(sync.timer);
        sync.timer = setTimeout(() => applyCloudUpload(), 2000);
      }
    }
  };
  const doDownload = async () => {
    if(autoSyncRef.current.dirty||cloudConflict)return say("⚠️ 동기화되지 않은 기기 기록이 있습니다. 먼저 올리기 또는 충돌 해결을 이용해 주세요.");
    const k = syncKey.trim();
    if (!k) return say("먼저 동기화 키를 입력해주세요");
    setSyncBusy(true);
    try {
      if(autoSyncRef.current.dirty&&dataWeight(liveSyncRef.current.data)>0)await snapSave(liveSyncRef.current.data,"클라우드 불러오기 직전");
      const row = await cloudDownload(k);
      if (!row || !row.data || !Array.isArray(row.data.individuals)) {
        say("이 키로 저장된 데이터가 없어요");
        setSyncBusy(false);
        return;
      }
      await saveSyncKey(k);
      const d = row.data;
      persist({
        individuals: d.individuals,
        lines: Array.isArray(d.lines) ? d.lines : [],
        parents: Array.isArray(d.parents) ? d.parents : [],
        customEvents: Array.isArray(d.customEvents) ? d.customEvents : [],
        feedBrands: Array.isArray(d.feedBrands) ? d.feedBrands : [],
      });
      say(`☁︎ 불러왔어요 — 유충 ${d.individuals.length}`);
      setSettingsOpen(false);
    } catch (e) { say("⚠️ 불러오기 실패 — 인터넷을 확인해주세요"); }
    setSyncBusy(false);
  };

  /* ── 라인 통계 ── */
  const larvaeOf = (lineId) => data.individuals.filter((i) => i.lineId === lineId);
  const lineDday = (lineId) => {
    const ds = larvaeOf(lineId).filter((i) => i.status === "유충").map((i) => latestRec(i)?.nextDate).filter(Boolean).map(dday);
    return ds.length ? Math.min(...ds) : null;
  };
  /* 부·모 표기: "수 74.5 관리번호" 형식, 성별 기호를 앞에 색으로 강조 */
  const pairLabel = (L) => {
    const fa = parentById[L.fatherId], mo = parentById[L.motherId];
    if (!fa && !mo) return null;
    const one = (p, male) => (
      <span className="pl-one">
        <b className={male ? "sx-m" : "sx-f"}>{male ? "♂︎" : "♀︎"}</b>
        {p ? <>{num(p.totalLength) ? <span className="pl-sz mono">{n1(num(p.totalLength))}</span> : null} <span className="pl-code mono">{p.code}</span></> : <span className="dim"> 미지정</span>}
      </span>
    );
    return <span className="pl-wrap">{one(fa, true)}<i className="pl-x">×</i>{one(mo, false)}</span>;
  };



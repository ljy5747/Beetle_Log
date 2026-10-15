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
  const [authUser, setAuthUser] = useState(null);
  const autoSyncRef = useRef({ on: false, key: "", timer: null });
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
    if (w > 0 && key) { try { await cloudUpload(key, data); } catch (e) { say("⚠️ 클라우드 저장 실패 — 되돌리기로 복구할 수 있어요"); } }
    /* 2) 기기 안 백업 스냅샷 (되돌리기용) */
    if (w > 0) await snapSave(data, "로그아웃 직전");
    /* 3) 로그아웃 + 로컬 비우기 */
    await authSignOut();
    autoSyncRef.current.on = false; autoSyncRef.current.key = "";
    setAuthUser(null); setSyncKey("");
    try { await idbSet("beetle-sync-key", ""); await idbSet("beetle-owner", ""); } catch (e) {}
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
    if (b.settingsOpen) { setSettingsOpen(false); return true; }
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
              const row = await cloudDownload(myKey);
              if (row && row.data && Array.isArray(row.data.individuals)) {
                /* 남의 기록이면 로컬 분량을 0으로 취급 → 서버 것으로 무조건 교체 */
                const serverW = dataWeight(row.data), localW = foreign ? 0 : dataWeight(base);
                /* ⚠️ 덮어쓰기 전에 현재 로컬 데이터를 반드시 스냅샷으로 보관 (복구용) */
                if (localW > 0) {
                  try { await idbSet("beetle-local-backup", JSON.stringify({ at: Date.now(), weight: localW, data: base })); } catch (e) {}
                  await snapSave(base, "동기화 직전");
                }
                /* 서버가 로컬보다 적으면(사고 의심) 자동 덮어쓰기 안 함 — 기준 강화 */
                if (serverW >= localW || localW === 0) {
                  const merged = {
                    individuals: row.data.individuals,
                    lines: Array.isArray(row.data.lines) ? row.data.lines : [],
                    parents: Array.isArray(row.data.parents) ? row.data.parents : [],
                    customEvents: Array.isArray(row.data.customEvents) ? row.data.customEvents : [],
                    feedBrands: Array.isArray(row.data.feedBrands) ? row.data.feedBrands : [],
                  };
                  setData(merged);
                  try { await idbSet(KEY, JSON.stringify(merged)); } catch (e) {}
                } else {
                  /* 서버가 로컬보다 적음 → 로컬(최신)을 지키고, 서버를 로컬로 덮어씀 */
                  cloudUpload(myKey, base).catch(() => {});
                  setTimeout(() => say("이 기기 기록이 더 최신이라 그대로 두고 서버에 올렸어요"), 1200);
                }
              } else if (foreign) {
                /* 서버도 비어있고 로컬은 남의 기록 → 올리지 말고 비움 */
                const empty = { individuals: [], lines: [], parents: [], customEvents: [], feedBrands: [] };
                setData(empty);
                try { await idbSet(KEY, JSON.stringify(empty)); } catch (e) {}
              } else {
                /* 서버에 아무것도 없으면 내 로컬을 올려둠 */
                if (dataWeight(base) > 0) cloudUpload(myKey, base).catch(() => {});
              }
            } catch (e) { /* 네트워크 문제면 조용히 — 로컬로 계속 */ }
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

  const persist = async (next) => {
    setData(next);
    try { await idbSet(KEY, JSON.stringify(next)); }
    catch (e) { say("⚠️ 저장 실패 — 네트워크를 확인해주세요"); }
    /* 자동 동기화 켜져 있으면 2초 뒤 서버에 올림 (연속 변경은 묶어서 한 번만) */
    const as = autoSyncRef.current;
    if (as.on && as.key) {
      clearTimeout(as.timer);
      as.timer = setTimeout(() => {
        cloudUpload(as.key, next).catch(() => {/* 실패해도 조용히 — 다음 변경 때 재시도 */});
      }, 2000);
    }
  };

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
  const doUpload = async () => {
    const k = syncKey.trim();
    if (!k) return say("먼저 동기화 키를 입력해주세요");
    setSyncBusy(true);
    try {
      await saveSyncKey(k);
      await cloudUpload(k, data);
      say("☁︎ 클라우드에 올렸어요");
    } catch (e) { say("⚠️ 업로드 실패 — 인터넷을 확인해주세요"); }
    setSyncBusy(false);
  };
  const doDownload = async () => {
    const k = syncKey.trim();
    if (!k) return say("먼저 동기화 키를 입력해주세요");
    setSyncBusy(true);
    try {
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

  /* ════════ 렌더 ════════ */
  return (
    <div className="app">
      <style>{CSS}</style>
      <datalist id="dl-species">{SPECIES.map((s) => <option key={s} value={s} />)}</datalist>

      {/* ───── 목록 화면 ───── */}
      {view.name === "list" && (
        <>
          <div className="topbar">
            <div>
              <div className="brand">BeetleLog</div>
              <div className="brand-sub">라인 {data.lines.length} · 유충 {data.individuals.length} · 성충 {data.parents.length}</div>
            </div>
          </div>

          {tab === "calendar" && (
            <CalendarView data={data}
              onOpenLine={(id) => setView({ name: "lineDetail", id })}
              onOpenLarva={(id) => setView({ name: "detail", id })}
              onAddEvent={(ev) => { persist({ ...data, customEvents: [...(data.customEvents || []), { ...ev, id: uid() }] }); say("✓ 일정 추가됨"); }}
              onEditEvent={(id, ev) => { persist({ ...data, customEvents: (data.customEvents || []).map((c) => c.id === id ? { ...c, ...ev, id } : c) }); say("✓ 일정 수정됨"); }}
              onDeleteEvent={(id) => { persist({ ...data, customEvents: (data.customEvents || []).filter((c) => c.id !== id) }); say("일정 삭제됨"); }} />
          )}

          {tab === "lines" && <>
            {(() => {
              const ev = collectEvents(data);
              const due = Object.keys(ev).filter((k) => k <= today() && ev[k].some((e) => e.type === "bottle"))
                .reduce((a, k) => a + ev[k].filter((e) => e.type === "bottle").length, 0);
              const soon = (ev[addDays(today(), 1)] || []).filter((e) => e.type === "bottle").length
                + (ev[addDays(today(), 2)] || []).filter((e) => e.type === "bottle").length;
              if (!due && !soon) return null;
              return (
                <div className="alert" onClick={() => goView({ name: "dueList" }, false)}>
                  <span className="alert-dot" />
                  {due > 0 ? <b>교체할 유충 {due}마리</b> : <b>곧 교체 {soon}마리</b>}
                  {due > 0 && soon > 0 && <span className="dim"> · 2일 내 {soon}마리 더</span>}
                  <span className="alert-go">보기 ›</span>
                </div>
              );
            })()}

            {/* 직접 추가한 일정 중 오늘~3일 내 임박 알림 (기록일 + 알림일 모두) */}
            {(() => {
              const items = [];
              (data.customEvents || []).forEach((c) => {
                const dd = dday(c.date);
                if (dd >= 0 && dd <= 3) items.push({ id: c.id + "_d", title: c.title, dd });
                if (c.remindDate) {
                  const rd = dday(c.remindDate);
                  if (rd >= 0 && rd <= 3) items.push({ id: c.id + "_r", title: c.remindTitle || `${c.title} 알림`, dd: rd });
                }
              });
              items.sort((a, b) => a.dd - b.dd);
              if (items.length === 0) return null;
              return items.map((it) => (
                <div key={it.id} className="alert custom" onClick={() => setTab("calendar")}>
                  <span className="alert-dot" style={{ background: "#C2705F" }} />
                  <b>{it.title}</b>
                  <span className="alert-go">{it.dd === 0 ? "오늘" : `D-${it.dd}`} ›</span>
                </div>
              ));
            })()}

            {data.lines.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🪲</div>
                <div className="empty-t">첫 라인을 만들어보세요</div>
                <div className="empty-d">라인 = ♂︎ 종충 × ♀︎ 종충 조합이에요.<br />성충 탭에서 종충을 먼저 등록한 뒤<br />+ 버튼으로 라인을 만들고 유충을 일괄 추가하세요.</div>
              </div>
            )}

            {data.lines.length > 1 && (
              <div className="order-bar">
                <button className={"btn tiny" + (orderEdit ? " primary" : "")} onClick={() => setOrderEdit(!orderEdit)}>
                  {orderEdit ? "✓ 순서 편집 완료" : "↕ 순서 편집"}
                </button>
              </div>
            )}

            <YearNav value={lineYear} onChange={(y) => { setLineYear(y); setOrderEdit(false); }}
              count={data.lines.filter((l) => itemYear(l) === lineYear).length} />

            <Sortable items={byOrder(data.lines.filter((l) => itemYear(l) === lineYear))} editing={orderEdit} onReorder={(ids) => {
              const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
              persist({ ...data, lines: data.lines.map((l) => ({ ...l, ord: idx[l.id] })) });
              say("순서가 바뀌었어요");
            }}>{(L) => {
              const kids = larvaeOf(L.id);
              const cnt = STATUSES.map((s) => [s, kids.filter((i) => i.status === s).length]).filter(([, n]) => n > 0);
              const dd = lineDday(L.id);
              const avgOf = (sexKey) => {
                const ws = kids.filter(isActive).filter((i) => sexKey === "수" ? i.sex?.includes("수") : sexKey === "암" ? i.sex?.includes("암") : !i.sex?.includes("수") && !i.sex?.includes("암"))
                  .map((i) => num(latestRec(i)?.weight)).filter(Boolean);
                return ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : null;
              };
              const avgM = avgOf("수"), avgF = avgOf("암"), avgU = avgOf("미");
              return (
                <div key={L.id} className="card" onClick={() => goView({ name: "lineDetail", id: L.id }, false)}>
                  <div className="card-l">
                    <div className="tagrow">
                      <span className="tag mono">{L.code}</span>
                      {L.gen && <span className="chip gen mono">{L.gen}</span>}
                      {dd != null && <span className={"chip dd" + ddClass(dd)}>{dd <= 0 ? `교체 D+${-dd}` : `교체 D-${dd}`}</span>}
                    </div>
                    <div className="card-sub">{[L.species, L.origin].filter(Boolean).join(" · ") || "정보 미입력"}</div>
                    {pairLabel(L) && <div className="card-pair">{pairLabel(L)}</div>}
                    <div className="card-val mono" style={{ fontSize: 17 }}>
                      {kids.length ? <>{kids.length}<small>마리</small></> : <span className="dim">유충 없음</span>}
                    </div>
                    {(avgM || avgF || avgU) && (
                      <div className="avg-row">
                        {avgM && <span className="avg-m"><span className="sx-m">♂︎</span> 평균 {n1(avgM)}g</span>}
                        {avgF && <span className="avg-f"><span className="sx-f">♀︎</span> 평균 {n1(avgF)}g</span>}
                        {avgU && <span className="avg-u">미구분 {n1(avgU)}g</span>}
                      </div>
                    )}
                    {cnt.length > 0 && (
                      <div className="lstat">
                        {cnt.map(([s, n]) => <span key={s} style={{ color: STATUS_COLOR[s] }}>{s} {n}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            }}</Sortable>
          </>}

          {tab === "parents" && <>
            {data.parents.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🪲</div>
                <div className="empty-t">성충을 등록해보세요</div>
                <div className="empty-d">부모 개체를 먼저 등록해두면<br />라인 생성 시 혈통·산지가 자동으로 채워져요.</div>
              </div>
            )}
            {data.parents.length > 0 && (() => {
              /* 연도로 먼저 거른 뒤, 폴더 기준(종/혈통)으로 그룹핑. 미입력은 '미지정'으로 */
              const yearPool = data.parents.filter((p) => itemYear(p) === parentYear);
              const byLabel = folderBy === "line" ? "혈통" : "종";
              const noneKey = byLabel + " 미지정";
              const groups = {};
              yearPool.forEach((p) => {
                const key = (folderBy === "line" ? (p.line || "") : (p.species || "")).trim() || noneKey;
                (groups[key] = groups[key] || []).push(p);
              });
              const groupNames = Object.keys(groups).sort((a, b) => {
                if (a === noneKey) return 1;
                if (b === noneKey) return -1;
                return a.localeCompare(b, "ko");
              });

              /* 종을 선택하지 않았으면 → 폴더 목록 */
              if (!speciesFolder || !groups[speciesFolder]) {
                return (
                  <>
                    <YearNav value={parentYear} onChange={(y) => { setParentYear(y); setSpeciesFolder(null); setOrderEdit(false); }}
                      count={yearPool.length} />
                    <div className="view-toggle">
                      <button className={"vt-btn" + (folderBy === "species" ? " on" : "")} onClick={() => { setFolderBy("species"); setSpeciesFolder(null); }}>종별</button>
                      <button className={"vt-btn" + (folderBy === "line" ? " on" : "")} onClick={() => { setFolderBy("line"); setSpeciesFolder(null); }}>혈통별</button>
                    </div>
                  <div className="sp-grid">
                    {groupNames.map((gname) => {
                      const list = groups[gname];
                      const males = list.filter((p) => p.sex.includes("수")).length;
                      const females = list.filter((p) => p.sex.includes("암")).length;
                      const alive = list.filter((p) => p.status !== "사망").length;
                      return (
                        <div key={gname} className="sp-card" onClick={() => setSpeciesFolder(gname)}>
                          <div className="sp-card-l">
                            <div className="sp-name serif" title={gname}>{gname}</div>
                            <div className="sp-meta">{list.length}마리 · ♂︎{males} ♀︎{females}</div>
                          </div>
                          <div className="sp-go">보기 ›</div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                );
              }

              /* 종을 선택했으면 → 그 종의 성충 리스트 */
              const list = groups[speciesFolder].sort((a, b) => {
                const ad = a.status === "사망" ? 1 : 0, bd = b.status === "사망" ? 1 : 0;
                if (ad !== bd) return ad - bd;
                return a.code.localeCompare(b.code, "ko", { numeric: true });
              });
              const males = list.filter((p) => p.sex.includes("수")).length;
              const females = list.filter((p) => p.sex.includes("암")).length;
              return (
                <>
                  <div className="sp-back" onClick={() => setSpeciesFolder(null)}>‹ {folderBy === "line" ? "혈통" : "종"} 목록</div>
                  <div className="grp-head">
                    <span className="grp-name serif">{speciesFolder}</span>
                    <span className="grp-cnt">{list.length}마리 · ♂︎{males} ♀︎{females}</span>
                  </div>
                  {list.length > 1 && (
                    <div className="order-bar">
                      <button className={"btn tiny" + (orderEdit ? " primary" : "")} onClick={() => setOrderEdit(!orderEdit)}>
                        {orderEdit ? "✓ 순서 편집 완료" : "↕ 순서 편집"}
                      </button>
                    </div>
                  )}
                  <Sortable items={byOrder(list)} editing={orderEdit} onReorder={(ids) => {
                    const idx = Object.fromEntries(ids.map((id, i) => [id, i]));
                    persist({ ...data, parents: data.parents.map((x) => (idx[x.id] != null ? { ...x, ord: idx[x.id] } : x)) });
                    say("순서가 바뀌었어요");
                  }}>{(p) => {
                    const myLines = data.lines.filter((l) => l.fatherId === p.id || l.motherId === p.id).length;
                    const dead = p.status === "사망";
                    return (
                      <div key={p.id} className={"card" + (dead ? " dead" : "")} onClick={() => goView({ name: "parentDetail", id: p.id }, false)}>
                        <div className="card-l">
                          <div className="tagrow">
                            <span className={"tag mono" + (dead ? " strike" : "")}>{p.code}</span>
                            <span className={p.sex.includes("수") ? "sx-m" : "sx-f"}>{p.sex.includes("수") ? "♂︎" : "♀︎"}</span>
                            {p.gen && <span className="chip gen mono">{p.gen}</span>}
                            {dead && <span className="chip" style={{ color: "#9A9088", borderColor: "#9A908855" }}>사망</span>}
                          </div>
                          <div className="card-sub">{[p.line, p.origin].filter(Boolean).join(" · ") || "정보 미입력"}</div>
                          <div className="card-val mono">
                            {num(p.totalLength) ? <>{n1(num(p.totalLength))}<small>mm</small></> : <span className="dim">사이즈 미입력</span>}
                            {myLines > 0 && <em> 라인 {myLines}</em>}
                          </div>
                        </div>
                        <SpeciesPhoto photo={p.photo} species={p.species} className="card-thumb" />
                      </div>
                    );
                  }}</Sortable>
                </>
              );
            })()}
          </>}

          {tab !== "calendar" && (
            <button className="fab" onClick={() => setModal(tab === "parents" ? { type: "parent" } : { type: "line" })}>＋</button>
          )}
        </>
      )}

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
              <SpeciesPhoto photo={p.photo} species={p.species} className="bc-photo" />
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


/* ════════════════════ 공용 UI ════════════════════ */
const F = ({ label, children, half }) => (
  <div className={"field" + (half ? " half" : "")}>
    <div className="label">{label}</div>
    {children}
  </div>
);

/* 균사/톱밥 브랜드 선택: 탭하면 샵별 제품 목록이 펼쳐지고, 맨 아래 직접 입력 */
/* 최근 90일간 그 먹이 종류에서 많이 쓴 제품 상위 5개 */
function topFeeds(individuals, feedType, limit = 5) {
  const since = addDays(today(), -90);
  const cnt = {};
  (individuals || []).forEach((i) => {
    (i.bottleRecords || []).forEach((r) => {
      if (!r.feedBrand || (r.feedType || "균사") !== feedType) return;
      if (r.date && r.date < since) return;
      cnt[r.feedBrand] = (cnt[r.feedBrand] || 0) + 1;
    });
  });
  return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b, "ko"))
    .slice(0, limit).map((name) => ({ name, n: cnt[name] }));
}

function FeedPicker({ feedType, value, brands, onChange, placeholder, individuals }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const groups = (FEED_PRODUCTS && FEED_PRODUCTS[feedType]) || [];
  const pick = (shop, item) => { onChange(`${shop} ${item}`); setOpen(false); setManual(false); };
  /* 직접 입력 모드거나, 목록에 없는 값이 이미 들어있으면 입력창 표시 */
  if (manual) {
    return (
      <div>
        <input className="in" list="dl-brands" value={value} autoFocus
          onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "직접 입력"} />
        <button className="btn tiny mt" onClick={() => { setManual(false); setOpen(true); }}>← 목록에서 선택</button>
        <datalist id="dl-brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
      </div>
    );
  }
  return (
    <div>
      <button className="picker-btn" onClick={() => setOpen(!open)}>
        <span className={value ? "" : "dim"}>{value || placeholder || "탭하여 선택"}</span>
        <span className="picker-arrow">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="picker-panel">
          {(() => {
            const tops = topFeeds(individuals, feedType);
            if (tops.length === 0) return null;
            return (
              <div className="picker-group">
                <div className="picker-shop">자주 쓰는 {feedType}</div>
                <div className="picker-items">
                  {tops.map((t) => (
                    <button key={t.name} className={"picker-item" + (value === t.name ? " on" : "")}
                      onClick={() => { onChange(t.name); setOpen(false); setManual(false); }}>
                      {t.name}<span className="picker-n">{t.n}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}
          {groups.length === 0 && <div className="picker-empty">등록된 제품이 없어요. 직접 입력해주세요.</div>}
          {groups.map((g) => (
            <div key={g.shop} className="picker-group">
              <div className="picker-shop">{g.shop}</div>
              <div className="picker-items">
                {g.items.map((item) => {
                  const full = `${g.shop} ${item}`;
                  return (
                    <button key={item} className={"picker-item" + (value === full ? " on" : "")} onClick={() => pick(g.shop, item)}>{item}</button>
                  );
                })}
              </div>
            </div>
          ))}
          <button className="picker-manual" onClick={() => { setManual(true); setOpen(false); }}>✏️ 직접 입력</button>
        </div>
      )}
    </div>
  );
}

function ConfirmBtn({ label, onConfirm, className }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (armed) { const t = setTimeout(() => setArmed(false), 2600); return () => clearTimeout(t); } }, [armed]);
  return (
    <button className={className} onClick={() => { if (armed) { onConfirm(); setArmed(false); } else setArmed(true); }}>
      {armed ? "한 번 더 누르면 실행됩니다" : label}
    </button>
  );
}

function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="overlay">
      <div className="modal">
        <div className="mhead">
          <button className="hbtn" onClick={onClose}>취소</button>
          <div className="mtitle">{title}</div>
          <button className="hbtn primary" onClick={onSave}>저장</button>
        </div>
        <div className="mbody">{children}</div>
      </div>
    </div>
  );
}

/* 단순 목록 펼침 선택 (종 등): 탭하면 목록 펼침, 맨 아래 직접 입력 */
/* ════════════════════ 종 선택 (중분류 2단계) ════════════════════
   왕사슴벌레·넓적사슴벌레는 체장/극태/와일드/미분류를 한 번 더 고름 */
function SpeciesPicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState(null); /* 중분류 고르는 중인 종 */
  const [manual, setManual] = useState(false);
  if (manual) {
    return (
      <div>
        <input className="in" value={value} autoFocus onChange={(e) => onChange(e.target.value)} placeholder="직접 입력" />
        <button className="btn tiny mt" onClick={() => { setManual(false); setOpen(true); }}>← 목록에서 선택</button>
      </div>
    );
  }
  const pick = (v) => { onChange(v); setOpen(false); setGroup(null); };
  return (
    <div>
      <button className="picker-btn" onClick={() => { setOpen(!open); setGroup(null); }}>
        <span className={value ? "" : "dim"}>{value || placeholder || "탭하여 선택"}</span>
        <span className="picker-arrow">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="picker-panel">
          <div className="picker-items" style={{ padding: "11px 12px" }}>
            {group ? (
              <>
                <button className="picker-item back" onClick={() => setGroup(null)}>‹ {group.name}</button>
                {group.sub.map((sv) => {
                  const full = `${group.name}(${sv})`;
                  return <button key={sv} className={"picker-item" + (value === full ? " on" : "")} onClick={() => pick(full)}>{sv}</button>;
                })}
              </>
            ) : (
              SPECIES_TREE.map((sp) => (
                <button key={sp.name} className={"picker-item" + (value === sp.name ? " on" : "") + (sp.sub ? " has-sub" : "")}
                  onClick={() => (sp.sub ? setGroup(sp) : pick(sp.name))}>
                  {sp.name}{sp.sub && <span className="picker-more">›</span>}
                </button>
              ))
            )}
          </div>
          <button className="picker-manual" onClick={() => { setManual(true); setOpen(false); }}>직접 입력하기</button>
        </div>
      )}
    </div>
  );
}

function SimplePicker({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  if (manual) {
    return (
      <div>
        <input className="in" value={value} autoFocus onChange={(e) => onChange(e.target.value)} placeholder={placeholder || "직접 입력"} />
        <button className="btn tiny mt" onClick={() => { setManual(false); setOpen(true); }}>← 목록에서 선택</button>
      </div>
    );
  }
  return (
    <div>
      <button className="picker-btn" onClick={() => setOpen(!open)}>
        <span className={value ? "" : "dim"}>{value || placeholder || "탭하여 선택"}</span>
        <span className="picker-arrow">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="picker-panel">
          <div className="picker-items" style={{ padding: "11px 12px" }}>
            {options.map((opt) => (
              <button key={opt} className={"picker-item" + (value === opt ? " on" : "")} onClick={() => { onChange(opt); setOpen(false); }}>{opt}</button>
            ))}
          </div>
          <button className="picker-manual" onClick={() => { setManual(true); setOpen(false); }}>✏️ 직접 입력</button>
        </div>
      )}
    </div>
  );
}


import * as React from "react";

const COURIER_PRODUCTS = [
  "Perfume",
  "Clothes",
  "Documents",
  "Medicine",
  "Shoes",
  "Artificial Jewellery",
  "Mobile Accessories",
  "Food Items",
  "Gifts",
  "Electronics",
  "Cosmetics",
  "Books",
  "Sports Equipment",
  "Toys",
  "Home Decor",
  "Stationery",
  "Watches",
  "Sunglasses",
  "Bags",
  "Leather Goods",
  "Auto Parts",
  "Computer Parts",
  "Fabric",
  "Spices",
  "Dry Fruits",
  "Herbal Products",
  "Carpets",
  "Handicrafts",
  "Textile",
  "Software (CD/DVD)",
  "Tools and Equipment",
];

interface ProductSuggestProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}

export function ProductSuggest({ value, onChange, className = "", placeholder = "Type to search..." }: ProductSuggestProps) {
  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(-1);
  const ref = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const q = value.toLowerCase().trim();
    if (!q) return [];
    return COURIER_PRODUCTS.filter(p => p.toLowerCase().includes(q));
  }, [value]);

  // Close on outside click
  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function select(product: string) {
    onChange(product);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && filtered[activeIdx]) {
        e.preventDefault();
        select(filtered[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative w-full">
      <input
        type="text"
        autoComplete="off"
        className={`h-7 text-[11px] bg-[#fdfdfd] border border-slate-300 px-2 rounded-sm shadow-inner uppercase w-full outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300 ${className}`}
        value={value}
        placeholder={placeholder}
        onChange={e => { onChange(e.target.value); setOpen(true); setActiveIdx(-1); }}
        onFocus={() => { if (filtered.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-[200] mt-[2px] w-full max-h-48 overflow-y-auto bg-white border border-slate-300 rounded-sm shadow-lg text-[11px]">
          {filtered.map((p, i) => (
            <li
              key={p}
              className={`px-3 py-[5px] cursor-pointer uppercase tracking-wide ${
                i === activeIdx ? "bg-blue-100 text-blue-800 font-semibold" : "hover:bg-slate-100"
              }`}
              onMouseDown={() => select(p)}
              onMouseEnter={() => setActiveIdx(i)}
            >
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useMemo } from "react";
import { Check, Minus, Plus } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { normalizeFoodQuantity } from "@/lib/foodQuantity";

function buildQuantitySuggestions(whole, defaultQuantity) {
  const def = Number(defaultQuantity);
  if (whole) {
    const base = [1, 2, 3, 4, 5];
    if (Number.isFinite(def) && def >= 1) {
      const r = Math.round(def);
      if (!base.includes(r)) {
        return [...base, r].sort((a, b) => a - b);
      }
    }
    return base;
  }
  const base = [0.5, 1, 1.5, 2, 2.5, 3];
  if (Number.isFinite(def) && def >= 0.5) {
    const h = Math.round(def * 2) / 2;
    if (!base.includes(h)) {
      return [...base, h].sort((a, b) => a - b);
    }
  }
  return base;
}

function qtyLabel(n, whole) {
  if (whole) return String(Math.round(n));
  return Number.isInteger(n * 2) ? String(n) : n.toFixed(1);
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {object | null} props.item
 * @param {number} props.tempQuantity
 * @param {(n: number) => void} props.onTempQuantityChange
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onClose
 * @param {boolean} props.isDarkMode
 * @param {boolean} [props.isAdjusting] true when entry already exists for today
 */
export default function FoodQuantityModal({
  open,
  item,
  tempQuantity,
  onTempQuantityChange,
  onConfirm,
  onClose,
  isDarkMode,
  isAdjusting = false,
}) {
  const whole = Boolean(item?.quantity_whole_numbers);
  const step = whole ? 1 : 0.5;
  const min = whole ? 1 : 0.5;
  const preview = item ? normalizeFoodQuantity(tempQuantity, item) : min;

  const suggestions = useMemo(
    () => buildQuantitySuggestions(whole, item?.default_quantity),
    [whole, item?.default_quantity],
  );

  const isPillActive = (s) => {
    const q = Number(tempQuantity);
    if (!Number.isFinite(q)) return false;
    return Math.abs(q - s) < 0.001;
  };

  const dec = () => {
    const q = Number(tempQuantity) || min;
    onTempQuantityChange(Math.max(min, whole ? q - 1 : q - 0.5));
  };

  const inc = () => {
    const q = Number(tempQuantity) || min;
    onTempQuantityChange(whole ? q + 1 : q + 0.5);
  };

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()}>
      <ModalContent className={isDarkMode ? "bg-iron-900 border-iron-800" : "bg-white border-slate-200"}>
        <ModalHeader>
          <ModalTitle className={isDarkMode ? "text-iron-100" : "text-slate-800"}>
            {isAdjusting ? "Adjust quantity" : "How much did you have?"}
          </ModalTitle>
          {item && (
            <p className={`text-sm font-medium mt-1 ${isDarkMode ? "text-iron-400" : "text-slate-600"}`}>
              {item.icon} {item.name}
            </p>
          )}
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div>
            <label
              htmlFor="food-qty-input"
              className={`block text-xs font-medium uppercase tracking-wider mb-2 ${
                isDarkMode ? "text-iron-500" : "text-slate-500"
              }`}
            >
              Quantity ({item?.unit || "units"})
              {whole ? (
                <span className={`ml-1 normal-case font-normal ${isDarkMode ? "text-iron-600" : "text-slate-400"}`}>
                  (whole numbers only)
                </span>
              ) : null}
            </label>
            <input
              id="food-qty-input"
              type="number"
              inputMode={whole ? "numeric" : "decimal"}
              step={step}
              min={min}
              value={tempQuantity}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  onTempQuantityChange(min);
                  return;
                }
                if (whole) {
                  const n = parseInt(v, 10);
                  onTempQuantityChange(Number.isFinite(n) ? n : min);
                } else {
                  onTempQuantityChange(parseFloat(v) || min);
                }
              }}
              className={`w-full text-center text-3xl font-bold tabular-nums py-3 rounded-card border ${
                isDarkMode
                  ? "bg-iron-800 border-iron-700 text-iron-100"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            />
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider mt-3 mb-1.5 ${
                isDarkMode ? "text-iron-500" : "text-slate-400"
              }`}
            >
              Quick
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onTempQuantityChange(s)}
                  className={`min-w-[2.5rem] px-3 py-1.5 rounded-full text-sm font-semibold tabular-nums transition-colors ${
                    isPillActive(s)
                      ? isDarkMode
                        ? "bg-lift-primary text-iron-950"
                        : "bg-amber-500 text-white"
                      : isDarkMode
                        ? "bg-iron-800 text-iron-300 hover:bg-iron-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {qtyLabel(s, whole)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={dec}
              className={`w-14 h-14 rounded-card flex items-center justify-center ${
                isDarkMode ? "bg-iron-800" : "bg-slate-100"
              }`}
            >
              <Minus className={`w-6 h-6 ${isDarkMode ? "text-iron-300" : "text-slate-600"}`} />
            </button>
            <button
              type="button"
              onClick={inc}
              className={`w-14 h-14 rounded-card flex items-center justify-center ${
                isDarkMode ? "bg-iron-800" : "bg-slate-100"
              }`}
            >
              <Plus className={`w-6 h-6 ${isDarkMode ? "text-iron-300" : "text-slate-600"}`} />
            </button>
          </div>
        </ModalBody>
        <ModalFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full py-4 rounded-card font-bold flex items-center justify-center gap-2 ${
              isDarkMode ? "bg-lift-primary text-iron-950" : "bg-amber-500 text-white"
            }`}
          >
            <Check className="w-5 h-5" />
            Save {preview} {item?.unit || ""}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-3 rounded-card font-medium ${
              isDarkMode ? "bg-iron-800 text-iron-300" : "bg-slate-100 text-slate-600"
            }`}
          >
            Cancel
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

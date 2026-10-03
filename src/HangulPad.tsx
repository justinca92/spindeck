import { DialogButton, Focusable, ModalRoot, showModal } from "@decky/ui";
import { useState } from "react";
import { composeHangul, toJamo } from "./hangul";

// Steam's on-screen keyboard sends Korean to the Quick Access panel as empty
// key events (key U+0000, keyCode 0 — confirmed on device), so the letters
// can't be recovered. This is a small 2-beolsik keypad of our own instead.
const ROWS = [
  ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"],
  ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"],
  ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"],
];
const SHIFT: Record<string, string> = { ㅂ: "ㅃ", ㅈ: "ㅉ", ㄷ: "ㄸ", ㄱ: "ㄲ", ㅅ: "ㅆ", ㅐ: "ㅒ", ㅔ: "ㅖ" };

function Pad({ title, initial, onDone, closeModal }: { title: string; initial: string; onDone: (v: string) => void; closeModal?: () => void }) {
  const [buf, setBuf] = useState(() => Array.from(toJamo(initial)));
  const [shift, setShift] = useState(false);
  const text = composeHangul(buf.join(""));
  const key = (k: string) => {
    setBuf((b) => [...b, shift && SHIFT[k] ? SHIFT[k] : k]);
    setShift(false);
  };
  const btn = { minWidth: 0, width: 52, height: 44, padding: 0, fontSize: 20 } as const;
  return (
    <ModalRoot closeModal={closeModal} onCancel={closeModal}>
      <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 26, fontWeight: 700, minHeight: 36, marginBottom: 12, borderBottom: "1px solid #ffffff33" }}>
        {text || " "}
        <span style={{ opacity: 0.5 }}>|</span>
      </div>
      <Focusable style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        {ROWS.map((row, r) => (
          <Focusable key={r} flow-children="row" style={{ display: "flex", gap: 6 }}>
            {row.map((k) => (
              <DialogButton key={k} style={btn} onClick={() => key(k)}>
                {shift && SHIFT[k] ? SHIFT[k] : k}
              </DialogButton>
            ))}
          </Focusable>
        ))}
        <Focusable flow-children="row" style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <DialogButton style={{ ...btn, width: 90, fontSize: 15, opacity: shift ? 1 : 0.7 }} onClick={() => setShift((v) => !v)}>
            ⇧ 쌍자음
          </DialogButton>
          <DialogButton style={{ ...btn, width: 140, fontSize: 15 }} onClick={() => setBuf((b) => [...b, " "])}>
            띄어쓰기
          </DialogButton>
          <DialogButton style={{ ...btn, width: 70, fontSize: 15 }} onClick={() => setBuf((b) => b.slice(0, -1))}>
            ⌫
          </DialogButton>
          <DialogButton
            style={{ ...btn, width: 90, fontSize: 15 }}
            onClick={() => {
              onDone(text);
              closeModal?.();
            }}
          >
            완료
          </DialogButton>
        </Focusable>
      </Focusable>
    </ModalRoot>
  );
}

export function openHangulPad(title: string, initial: string, onDone: (v: string) => void) {
  showModal(<Pad title={title} initial={initial} onDone={onDone} />);
}

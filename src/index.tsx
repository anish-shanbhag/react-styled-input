import { useState, useRef, useLayoutEffect } from "react";
import styles from "./index.module.css";
console.log(styles.styledInput);

// TODO: properly type props
export default function StyledInput({
  onChange,
  onEnter,
}: {
  onChange: any;
  onEnter: any;
}) {
  const [focused, setFocused] = useState(false);
  const [value, setValue] = useState("initial value");

  const editable = useRef<HTMLDivElement>(null);
  const caretIndex = useRef(0);
  const oldLength = useRef(0);

  // TODO: properly type parameter
  function changeValue(e: any) {
    const range = window.getSelection()?.getRangeAt(0);
    if (!range) return;

    const clonedRange = range.cloneRange();
    clonedRange.selectNodeContents(editable.current as Node);
    clonedRange.setEnd(range.startContainer, range.startOffset);
    let start = clonedRange.toString().length;
    clonedRange.setEnd(range.endContainer, range.endOffset);
    let end = clonedRange.toString().length;
    if (start === end) {
      start -= e.key === "Backspace" ? 1 : 0;
      end += e.key === "Delete" ? 1 : 0;
    }
    const text = editable.current?.textContent as string;
    start = Math.max(0, start);
    end = Math.min(text.length, end);

    const newText =
      e.key === "Backspace" || e.key === "Delete"
        ? ""
        : e.key ?? e.clipboardData.getData("text/plain").replace(/\n/g, "");
    caretIndex.current = end;

    const newValue = text.slice(0, start) + newText + text.slice(end);
    setValue(newValue);
    onChange(newValue);
    e.preventDefault();
  }

  useLayoutEffect(() => {
    if (!focused || !editable.current) return;
    const range = document.createRange();
    range.setStart(editable.current, 0);
    range.selectNode(editable.current);
    const newLength = value.length;
    let chars = caretIndex.current + newLength - oldLength.current;
    oldLength.current = newLength;

    // TODO: properly type this
    async function addToRange(node: any) {
      if (chars === 0) range.setEnd(node, 0);
      else if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent.length < chars) {
          chars -= node.textContent.length;
        } else {
          range.setEnd(node, chars);
          chars = 0;
        }
      } else {
        for (const child of node.childNodes) {
          addToRange(child);
          if (chars === 0) break;
        }
      }
    }

    addToRange(editable.current);
    range.collapse(false);
    const selection = window.getSelection() as Selection;
    selection.removeAllRanges();
    selection.addRange(range);

    const caretPosition = range.getBoundingClientRect().right;
    const inputRightEdge = editable.current.getBoundingClientRect().right;
    if (caretPosition > inputRightEdge) {
      editable.current.scrollLeft += caretPosition - inputRightEdge + 2;
    }
  }, [focused, value]);

  return (
    <div
      ref={editable}
      contentEditable
      suppressContentEditableWarning
      className={styles.styledInput}
      spellCheck={false}
      onKeyDown={(e) => {
        if (e.key === "Backspace" || e.key === "Delete") changeValue(e);
        else if (e.key === "Enter") {
          onEnter();
          e.preventDefault();
        }
      }}
      onKeyPress={changeValue}
      onPaste={changeValue}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
    >
      {value.split(" ").map((a, i) => (
        <span
          key={Math.random()}
          style={{ color: Math.random() > 0.5 ? "#fd0" : "0df" }}
        >
          {a}
          {i != value.split(" ").length - 1 && " "}
        </span>
      ))}
    </div>
  );
}

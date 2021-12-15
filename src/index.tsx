import { useState, useRef, useLayoutEffect, KeyboardEvent, ClipboardEvent, ReactNode } from "react";

import styles from "./index.module.css";

export interface StyledInputProps {
  children: ReactNode;
  onChange?: (newValue: string) => void;
  onEnter?: () => void;
}

// TODO: fix incorrect initial caret position on Firefox

// TODO: since newLength is controlled by the children textContent, maybe throw an error if the textContent length unexpectedly changes

export function StyledInput({ children, onChange, onEnter }: StyledInputProps) {
  const [focused, setFocused] = useState(false);

  const editable = useRef<HTMLDivElement>(null);
  const caretIndex = useRef(0);
  const oldLength = useRef(0);

  function changeValue(e: KeyboardEvent | ClipboardEvent) {
    const selection = window.getSelection();
    if (!selection || !editable.current) return;
    const range = selection.getRangeAt(0);
    const clonedRange = range.cloneRange();
    clonedRange.selectNodeContents(editable.current);
    clonedRange.setEnd(range.startContainer, range.startOffset);
    let start = clonedRange.toString().length;
    clonedRange.setEnd(range.endContainer, range.endOffset);
    let end = clonedRange.toString().length;
    const key = (e as KeyboardEvent).key;
    if (start === end) {
      if (key === "Backspace") start--;
      else if (key === "Delete") end++;
    }
    const text = editable.current.textContent as string;
    start = Math.max(0, start);
    end = Math.min(text.length, end);

    const newText =
      key === "Backspace" || key === "Delete"
        ? ""
        : key || (e as ClipboardEvent).clipboardData.getData("text/plain").replace(/\n|\r/g, "");
    caretIndex.current = end;

    const newValue = text.slice(0, start) + newText + text.slice(end);
    if (onChange) onChange(newValue);
    e.preventDefault();
  }

  useLayoutEffect(() => {
    if (!focused || !editable.current) return;
    const range = document.createRange();
    range.setStart(editable.current, 0);
    range.selectNode(editable.current);
    const newLength = (editable.current.textContent as string).length;
    let chars = caretIndex.current + newLength - oldLength.current;
    oldLength.current = newLength;

    function addToRange(node: Node) {
      if (chars === 0) range.setEnd(node, 0);
      else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
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
  }, [focused, children]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Backspace" || e.key === "Delete") changeValue(e);
    else if (e.key === "Enter") {
      if (onEnter) onEnter();
      e.preventDefault();
    }
  }

  return (
    <div
      ref={editable}
      contentEditable
      suppressContentEditableWarning
      className={styles.styledInput}
      spellCheck={false}
      onKeyDown={onKeyDown}
      onKeyPress={changeValue}
      onPaste={changeValue}
      onBlur={() => setFocused(false)}
      onFocus={() => setFocused(true)}
    >
      {children}
    </div>
  );
}

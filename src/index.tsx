import {
  useRef,
  useLayoutEffect,
  KeyboardEvent,
  ClipboardEvent,
  ReactNode,
  HTMLAttributes,
  ReactElement,
  MutableRefObject,
} from "react";

export interface StyledInputProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    | "onChange"
    | "contentEditable"
    | "suppressContentEditableWarning"
    | "onKeyDown"
    | "onKeyPress"
    | "onPaste"
    | "placeholder"
  > {
  children: ReactNode;
  caretPosition?: MutableRefObject<number>;
  placeholder?: ReactNode;
  onChange?: (value: string) => void;
  onEnter?: () => void;
}

// shared flag between all StyledInput components which keeps track of whether CSS has been injected
// into the document already
let styleInjected = false;

// returns the text content of a JSX element
function getNodeText(node: ReactNode): string {
  return typeof node === "string"
    ? node
    : Array.isArray(node)
    ? node.map(getNodeText).join("")
    : typeof node === "object"
    ? getNodeText((node as ReactElement).props.children)
    : "";
}

export function StyledInput({
  children,
  placeholder,
  onChange,
  onEnter,
  style,
  className,
  ...props
}: StyledInputProps) {
  const editable = useRef<HTMLDivElement>(null);
  const caretPosition = useRef(0);
  const oldLength = useRef(0);
  const valueChanged = useRef(false);
  const childrenTextContent = getNodeText(children);

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
        : key ??
          (e as ClipboardEvent).clipboardData.getData("text/plain").replace(/\r?\n|\r/g, " ");
    caretPosition.current = end;

    const newValue = text.slice(0, start) + newText + text.slice(end);
    valueChanged.current = true;
    if (onChange) onChange(newValue);
    e.preventDefault();
  }

  useLayoutEffect(() => {
    if (!styleInjected) {
      styleInjected = true;
      const style = document.head.appendChild(document.createElement("style"));
      style.textContent = ".g0b4zwthie8::-webkit-scrollbar{display:none}";
    }

    if (!valueChanged.current) return;

    const range = document.createRange();
    range.setStart(editable.current!, 0);
    range.selectNode(editable.current!);
    const newLength = editable.current!.textContent!.length;
    let chars = caretPosition.current + newLength - oldLength.current;
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

    addToRange(editable.current!);
    range.collapse(false);
    const selection = window.getSelection() as Selection;
    selection.removeAllRanges();
    selection.addRange(range);

    const selectionPosition = range.getBoundingClientRect().right;
    const inputRightEdge = editable.current!.getBoundingClientRect().right;
    if (selectionPosition > inputRightEdge) {
      editable.current!.scrollLeft += selectionPosition - inputRightEdge + 2;
    }

    valueChanged.current = false;
  }, [children]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Backspace" || e.key === "Delete") changeValue(e);
    else if (e.key === "Enter") {
      if (onEnter) onEnter();
      e.preventDefault();
    }
  }

  return (
    <span style={{ position: "relative" }}>
      {placeholder && !childrenTextContent && (
        <span
          style={{
            position: "absolute",
            width: "162px",
            color: "grey",
            overflowX: "hidden",
            pointerEvents: "none",
            paddingTop: style?.paddingTop,
            paddingRight: style?.paddingRight,
            paddingBottom: style?.paddingBottom,
            paddingLeft: style?.paddingLeft,
            padding: style?.padding ?? "3px 4px 2.5px 5px",
          }}
        >
          {placeholder}
        </span>
      )}
      <div
        ref={editable}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onKeyDown={onKeyDown}
        onKeyPress={changeValue}
        onPaste={changeValue}
        style={{
          display: "inline-block",
          width: "162px",
          border: ".1px solid #767676",
          whiteSpace: "pre",
          overflowX: "auto",
          scrollbarWidth: "none",
          caretColor: "black",
          padding: "2.8px 4px 2.5px 4px",
          ...style,
        }}
        className={"g0b4zwthie8 " + (className ?? "")}
        {...props}
      >
        {childrenTextContent && children}
      </div>
    </span>
  );
}
